import type { IApiAuthorizationIamDialect, IApiAuthorizationIamPredicateIn, IApiAuthorizationIamPredicateLike, IApiAuthorizationIamPredicateLowered, IApiAuthorizationIamToken } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamPredicate, TApiAuthorizationIamPredicateAtom, TApiAuthorizationIamPredicateValue } from "@type/class/api/authorization/iam";
import type { FindOptionsWhere } from "typeorm";

import { createHash } from "node:crypto";

import { ApiAuthorizationIamPredicateBuilder } from "@class/api/authorization/iam/predicate/builder.class";
import { ApiAuthorizationIamPredicateNormalForm } from "@class/api/authorization/iam/predicate/normal-form.class";
import { EApiAuthorizationIamColumnFamily, EApiAuthorizationIamDialect, EApiAuthorizationIamPredicateComparison, EApiAuthorizationIamPredicateKind, EApiAuthorizationIamTokenType } from "@enum/class/authorization";
import { And, Equal, FindOperator, In, IsNull, Not, Raw } from "typeorm";

// Column families a resource placeholder compares natively: SQL compares their values, which the rendered text names.
const IAM_LOWERER_NATIVE_FAMILIES: ReadonlySet<EApiAuthorizationIamColumnFamily> = new Set<EApiAuthorizationIamColumnFamily>([EApiAuthorizationIamColumnFamily.DATE, EApiAuthorizationIamColumnFamily.NUMERIC]);

// Length of the hash in a parameter name: 96 bits, so two different values never share a name in practice.
const IAM_LOWERER_PARAMETER_HASH_LENGTH: number = 24;

/**
 * Lowers the IAM predicate IR to TypeORM `where` branches for a database whose dialect has no lowering of its own.
 * It emits only what every SQL database evaluates alike, which is what 5.1.0 emitted: equality, `IN`, `IS NULL`, and a
 * negated `LIKE` with an explicit `ESCAPE`. Every other atom is not exact here, and an atom that is not exact fails the
 * whole scope closed: a Deny then denies the request and an Allow grants nothing. It never approximates.
 *
 * A dialect lowerer extends it and replaces the lowering of the atoms its database compares differently; the normal
 * form, the branch accounting and the WHERE building stay here.
 */
export class ApiAuthorizationIamPortableLowerer {
	public constructor(protected readonly dialect: IApiAuthorizationIamDialect) {}

	/**
	 * Lowers a predicate to `where` branches.
	 * @template E - Entity type.
	 * @param {TApiAuthorizationIamPredicate} predicate - Predicate.
	 * @param {number} maxBranches - Most branches the result may hold.
	 * @returns {{ branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean }} The OR branches (one empty branch for every row, none for no row), or a non-compilable result when the branches exceed the cap or an atom is not exact.
	 */
	public lower<E>(predicate: TApiAuthorizationIamPredicate, maxBranches: number): { branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean } {
		const atomBranches: Array<Array<TApiAuthorizationIamPredicateAtom>> | undefined = ApiAuthorizationIamPredicateNormalForm.toBranches(this.refinePredicate(predicate), maxBranches);

		if (!atomBranches) {
			return { isCompilable: false };
		}

		const branches: Array<FindOptionsWhere<E>> = [];

		for (const atomBranch of atomBranches) {
			const conditions: Array<[string, unknown]> = [];

			for (const atom of atomBranch) {
				const lowered: IApiAuthorizationIamPredicateLowered = this.lowerAtom(atom);

				if (!lowered.isExact) {
					return { isCompilable: false };
				}

				conditions.push([atom.column.queryPath, lowered.operand]);
			}

			branches.push(this.createBranchWhere<E>(conditions));
		}

		return { branches, isCompilable: true };
	}

	/**
	 * Names a bound parameter after a hash of the dialect, the purpose and the value, so equal values share one name
	 * and different values never collide when TypeORM merges the parameters of every branch.
	 * @param {string} purpose - What the parameter binds, such as `in` or `like`.
	 * @param {unknown} value - Bound value.
	 * @returns {string} Parameter name.
	 */
	protected createParameterName(purpose: string, value: unknown): string {
		return `iam${createHash("sha256")
			.update(JSON.stringify([this.dialect.type, purpose, value]))
			.digest("hex")
			.slice(0, IAM_LOWERER_PARAMETER_HASH_LENGTH)}`;
	}

	/**
	 * Lowers a comparison with SQL built around the column expression, for a dialect that must wrap the column: the
	 * values bind as one parameter, and NULL is in neither set, as the atom says. `Raw` bypasses a TypeORM value
	 * transformer, so a column that declares one is not exact here.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom.
	 * @param {(columnAlias: string) => string} expression - Builds the compared expression from the column alias TypeORM passes.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected createRawIn(atom: IApiAuthorizationIamPredicateIn, expression: (columnAlias: string) => string): IApiAuthorizationIamPredicateLowered {
		if (atom.column.field.column?.hasTransformer !== false) {
			return { isExact: false };
		}

		const parameterName: string = this.createParameterName("in", atom.values);

		if (atom.values.length === 1) {
			return { isExact: true, operand: Raw((columnAlias: string): string => `${expression(columnAlias)} ${atom.isNegated ? "<>" : "="} :${parameterName}`, { [parameterName]: atom.values[0] }) };
		}

		return { isExact: true, operand: Raw((columnAlias: string): string => `${expression(columnAlias)} ${atom.isNegated ? "NOT IN" : "IN"} (:...${parameterName})`, { [parameterName]: [...atom.values] }) };
	}

	/**
	 * Lowers a glob with SQL `LIKE` and an explicit `ESCAPE '!'`, because databases disagree on the default escape
	 * character: `*` becomes `%`, `?` becomes `_`, and `!`, `%` and `_` of a literal are escaped. `Raw` bypasses a
	 * TypeORM value transformer, so a column that declares one is not exact here.
	 * @param {IApiAuthorizationIamPredicateLike} atom - `LIKE` atom.
	 * @param {(columnAlias: string) => string} expression - Builds the compared expression from the column alias TypeORM passes.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected createRawLike(atom: IApiAuthorizationIamPredicateLike, expression: (columnAlias: string) => string): IApiAuthorizationIamPredicateLowered {
		if (atom.column.field.column?.hasTransformer !== false) {
			return { isExact: false };
		}

		const pattern: string = atom.pattern.map((token: IApiAuthorizationIamToken): string => this.readLikeToken(token)).join("");
		const parameterName: string = this.createParameterName("like", pattern);

		return { isExact: true, operand: Raw((columnAlias: string): string => `${expression(columnAlias)} ${atom.isNegated ? "NOT LIKE" : "LIKE"} :${parameterName} ESCAPE '!'`, { [parameterName]: pattern }) };
	}

	/**
	 * Tells whether a `LIKE` atom reads a column that holds text a glob can match: a text column, not a UUID or an enum.
	 * @param {IApiAuthorizationIamPredicateLike} atom - `LIKE` atom.
	 * @returns {boolean} Whether the column is a text column.
	 */
	protected isLikeColumn(atom: IApiAuthorizationIamPredicateLike): boolean {
		return !atom.column.field.isBoolean && atom.column.field.column?.family === EApiAuthorizationIamColumnFamily.TEXT;
	}

	/**
	 * Lowers a boolean comparison: TypeORM binds the boolean in each driver's stored form (`1`/`0` on SQLite and MySQL).
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom with a `BOOLEAN` comparison.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected lowerBooleanIn(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		return atom.column.field.isBoolean && atom.values.every((value: TApiAuthorizationIamPredicateValue): boolean => typeof value === "boolean") ? this.lowerNativeIn(atom) : { isExact: false };
	}

	/**
	 * Lowers a glob on text. A portable `LIKE` follows the column collation, which may ignore letter case, so a
	 * negated one can only hide more rows than the glob says, and a positive one could show more: only the negated one
	 * lowers.
	 * @param {IApiAuthorizationIamPredicateLike} atom - `LIKE` atom.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected lowerLike(atom: IApiAuthorizationIamPredicateLike): IApiAuthorizationIamPredicateLowered {
		return atom.isNegated && this.isLikeColumn(atom) ? this.createRawLike(atom, (columnAlias: string): string => columnAlias) : { isExact: false };
	}

	/**
	 * Lowers an `IN` atom with the column's own TypeORM conditions: a plain value for one value, so the scope
	 * normalization converts it to the column type as before, `Not(Equal())`, `In()` or `Not(In())` otherwise.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected lowerNativeIn(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		if (atom.values.length === 1) {
			return { isExact: true, operand: atom.isNegated ? Not(Equal(atom.values[0])) : atom.values[0] };
		}

		return { isExact: true, operand: atom.isNegated ? Not(In([...atom.values])) : In([...atom.values]) };
	}

	/**
	 * Lowers a text comparison. Portable SQL compares with the column collation; the dialect-free lowering keeps the
	 * equality 5.1.0 used.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom with a `TEXT` comparison on a text column.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected lowerTextIn(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		return this.lowerNativeIn(atom);
	}

	/**
	 * Rewrites one atom before the normal form, for a dialect whose column type refuses some values instead of
	 * comparing them: the rewrite may replace the atom with a constant or another atom that holds for the same rows.
	 * Portable SQL compares every value it binds, so the atom stays as it is.
	 * @param {TApiAuthorizationIamPredicateAtom} atom - Atom.
	 * @returns {TApiAuthorizationIamPredicate} The atom, or the node that replaces it.
	 */
	protected refineAtom(atom: TApiAuthorizationIamPredicateAtom): TApiAuthorizationIamPredicate {
		return atom;
	}

	/**
	 * Writes a condition at a nested query path of a WHERE branch.
	 * @param {Record<string, unknown>} where - WHERE branch.
	 * @param {string} queryPath - Entity query path such as `status` or `operator.id`.
	 * @param {unknown} value - Value or find operator.
	 */
	private assignWhereValue(where: Record<string, unknown>, queryPath: string, value: unknown): void {
		const pathSegments: Array<string> = queryPath.split(".").filter(Boolean);
		const lastSegment: string | undefined = pathSegments.at(-1);

		if (!lastSegment) {
			return;
		}

		let currentValue: Record<string, unknown> = where;

		for (const segment of pathSegments.slice(0, -1)) {
			const next: unknown = currentValue[segment];

			if (!next || typeof next !== "object" || Array.isArray(next) || next instanceof FindOperator) {
				currentValue[segment] = {};
			}

			currentValue = currentValue[segment] as Record<string, unknown>;
		}

		currentValue[lastSegment] = value;
	}

	/**
	 * Builds one WHERE branch from the column conditions it ANDs. Conditions on one query path combine with `And`; a
	 * plain value becomes `Equal` only when it meets another condition.
	 * @template E - Entity type.
	 * @param {Array<[string, unknown]>} conditions - Query paths with their values or find operators.
	 * @returns {FindOptionsWhere<E>} WHERE branch.
	 */
	private createBranchWhere<E>(conditions: Array<[string, unknown]>): FindOptionsWhere<E> {
		const pathConditions: Map<string, Array<unknown>> = new Map<string, Array<unknown>>();

		for (const [queryPath, value] of conditions) {
			pathConditions.set(queryPath, [...(pathConditions.get(queryPath) ?? []), value]);
		}

		const where: Record<string, unknown> = {};

		for (const [queryPath, values] of pathConditions) {
			const operand: unknown = values.length === 1 ? values[0] : And(...values.map((value: unknown): FindOperator<unknown> => (value instanceof FindOperator ? (value as FindOperator<unknown>) : Equal(value))));

			this.assignWhereValue(where, queryPath, operand);
		}

		return where as FindOptionsWhere<E>;
	}

	/**
	 * Lowers one atom. A text comparison needs a text column: on a numeric or date column SQL compares by value and the
	 * in-memory evaluator by text, so the two disagree and the atom is not exact. A native comparison, which only the
	 * `fails` of an exact resource placeholder holds, lowers only negated and only on a numeric or date column: SQL may
	 * then keep fewer rows than the text comparison would, never more. An unresolved dialect lowers no atom.
	 * @param {TApiAuthorizationIamPredicateAtom} atom - Atom.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	private lowerAtom(atom: TApiAuthorizationIamPredicateAtom): IApiAuthorizationIamPredicateLowered {
		if (this.dialect.type === EApiAuthorizationIamDialect.UNRESOLVED) {
			return { isExact: false };
		}

		switch (atom.kind) {
			case EApiAuthorizationIamPredicateKind.IN: {
				switch (atom.comparison) {
					case EApiAuthorizationIamPredicateComparison.BOOLEAN: {
						return this.lowerBooleanIn(atom);
					}

					case EApiAuthorizationIamPredicateComparison.NATIVE: {
						return atom.isNegated && atom.column.field.column !== undefined && IAM_LOWERER_NATIVE_FAMILIES.has(atom.column.field.column.family) ? this.lowerNativeIn(atom) : { isExact: false };
					}

					case EApiAuthorizationIamPredicateComparison.TEXT: {
						return ApiAuthorizationIamPredicateBuilder.isTextColumn(atom.column.field) ? this.lowerTextIn(atom) : { isExact: false };
					}

					default: {
						return { isExact: false };
					}
				}
			}

			case EApiAuthorizationIamPredicateKind.IS_NULL: {
				return { isExact: true, operand: IsNull() };
			}

			case EApiAuthorizationIamPredicateKind.LIKE: {
				return this.lowerLike(atom);
			}

			case EApiAuthorizationIamPredicateKind.NOT_NULL: {
				return { isExact: true, operand: Not(IsNull()) };
			}

			default: {
				return { isExact: false };
			}
		}
	}

	/**
	 * Writes one glob token as SQL `LIKE` text.
	 * @param {IApiAuthorizationIamToken} token - Literal, `*` or `?` token.
	 * @returns {string} `LIKE` text.
	 */
	private readLikeToken(token: IApiAuthorizationIamToken): string {
		switch (token.type) {
			case EApiAuthorizationIamTokenType.LITERAL:
			// falls through

			case EApiAuthorizationIamTokenType.VARIABLE: {
				return (token.value ?? "").replaceAll(/[!%_]/g, "!$&");
			}

			case EApiAuthorizationIamTokenType.QUESTION_MARK: {
				return "_";
			}

			case EApiAuthorizationIamTokenType.STAR: {
				return "%";
			}
		}
	}

	/**
	 * Rewrites every atom of a predicate with `refineAtom`, folding the constants a rewrite yields.
	 * @param {TApiAuthorizationIamPredicate} predicate - Predicate.
	 * @returns {TApiAuthorizationIamPredicate} The rewritten predicate.
	 */
	private refinePredicate(predicate: TApiAuthorizationIamPredicate): TApiAuthorizationIamPredicate {
		if (predicate.kind === EApiAuthorizationIamPredicateKind.AND || predicate.kind === EApiAuthorizationIamPredicateKind.OR) {
			const children: Array<TApiAuthorizationIamPredicate> = predicate.children.map((child: TApiAuthorizationIamPredicate): TApiAuthorizationIamPredicate => this.refinePredicate(child));

			return predicate.kind === EApiAuthorizationIamPredicateKind.AND ? ApiAuthorizationIamPredicateBuilder.and(children) : ApiAuthorizationIamPredicateBuilder.or(children);
		}

		// Every atom reads a column; a constant reads none.
		return "column" in predicate ? this.refineAtom(predicate) : predicate;
	}
}
