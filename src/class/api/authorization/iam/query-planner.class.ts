import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationIamDenyExclusion, IApiAuthorizationIamQueryField, IApiAuthorizationIamResourceConstraint, IApiAuthorizationPrincipal, IApiAuthorizationRequestMetadata, IApiAuthorizationResourceDefinition, IApiAuthorizationScope, IApiPolicyStatement } from "@interface/class/api/authorization";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { FindOptionsWhere } from "typeorm";

import { Buffer } from "node:buffer";

import { MetadataStorage } from "@class/metadata-storage.class";
import { AUTHORIZATION_IAM_SCOPE_CONSTANT } from "@constant/class/authorization";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiPolicyConditionOperator } from "@enum/class/authorization";
import { EApiPropertyDescribeType, EApiPropertyStringType } from "@enum/decorator/api";
import { Injectable } from "@nestjs/common";
import { ApiControllerGetListQueryParseValue } from "@utility/api/controller/get-list/query/parse-value.utility";
import { AuthorizationScopeMergeWhere } from "@utility/authorization";
import { AuthorizationIamReadQueryField } from "@utility/authorization/iam-query-field.utility";
import { EnumIsValue } from "@utility/enum/is-value.utility";
import { LoggerUtility } from "@utility/logger.utility";
import { And, Equal, FindOperator, IsNull, Not, Raw } from "typeorm";

const iamQueryPlannerLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationIamQueryPlanner");

// Resolved query paths, per resource entity class, so TypeORM metadata is walked once per path.
const iamQueryPlannerFieldCache: WeakMap<object, Map<string, IApiAuthorizationIamQueryField>> = new WeakMap<object, Map<string, IApiAuthorizationIamQueryField>>();

@Injectable()
export class ApiAuthorizationIamQueryPlanner {
	public plan<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(options: { principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E>; statements: ReadonlyArray<IApiPolicyStatement> }): { isFullyCompilable: boolean; scope?: IApiAuthorizationScope<E> } {
		iamQueryPlannerLogger.verbose(`Planning IAM query scope for resource type "${options.resourceDefinition.resourceType}" using ${options.statements.length} statements.`);

		const branches: Array<FindOptionsWhere<E>> = [];

		for (const statement of options.statements) {
			const compiledStatement: { branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean } = this.compileStatementWhere({
				condition: statement.Condition,
				principal: options.principal,
				requestMetadata: options.requestMetadata,
				resource: options.resource,
				resourceDefinition: options.resourceDefinition,
			});

			if (!compiledStatement.isCompilable) {
				iamQueryPlannerLogger.verbose(`IAM query scope is not fully compilable for resource type "${options.resourceDefinition.resourceType}".`);

				return { isFullyCompilable: false };
			}

			if (!compiledStatement.branches) {
				continue;
			}

			if (compiledStatement.branches.some((branch: FindOptionsWhere<E>): boolean => Object.keys(branch).length === 0)) {
				return { isFullyCompilable: true, scope: undefined };
			}

			branches.push(...compiledStatement.branches);
		}

		if (branches.length === 0) {
			iamQueryPlannerLogger.verbose(`IAM query scope for resource type "${options.resourceDefinition.resourceType}" resolved without additional where branches.`);

			return { isFullyCompilable: true, scope: undefined };
		}

		iamQueryPlannerLogger.verbose(`IAM query scope for resource type "${options.resourceDefinition.resourceType}" resolved with ${branches.length} where branches.`);

		return {
			isFullyCompilable: true,
			scope: {
				where: branches.length === 1 ? branches[0] : branches,
			},
		};
	}

	/**
	 * Compiles matched Deny statements into the scope of rows they leave visible. Each statement becomes an OR of its
	 * negated resource keys and resource-pattern constraints; statements are ANDed through `AuthorizationScopeMergeWhere`.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {object} options - Planning options.
	 * @param {ReadonlyArray<IApiAuthorizationIamDenyExclusion>} options.exclusions - Matched Deny statements with their resource-pattern constraints.
	 * @param {IApiAuthorizationPrincipal} options.principal - Principal used to resolve `${...}` condition values.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} options.requestMetadata - Request metadata used to resolve `${...}` condition values.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition with the filterable field mappings.
	 * @returns {{ isFullyCompilable: boolean; scope?: IApiAuthorizationScope<E> }} Exclusion scope, or a non-compilable result that must deny the request.
	 */
	public planExclusion<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(options: { exclusions: ReadonlyArray<IApiAuthorizationIamDenyExclusion>; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> }): { isFullyCompilable: boolean; scope?: IApiAuthorizationScope<E> } {
		iamQueryPlannerLogger.verbose(`Planning IAM exclusion scope for resource type "${options.resourceDefinition.resourceType}" using ${options.exclusions.length} deny exclusions.`);

		let where: TApiAuthorizationScopeWhere<E>;

		for (const exclusion of options.exclusions) {
			const compiledExclusion: { branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean } = this.compileStatementExclusion({
				condition: exclusion.statement.Condition,
				principal: options.principal,
				requestMetadata: options.requestMetadata,
				resource: options.resource,
				resourceConstraints: exclusion.resourceConstraints,
				resourceDefinition: options.resourceDefinition,
			});

			if (!compiledExclusion.isCompilable || !compiledExclusion.branches) {
				iamQueryPlannerLogger.verbose(`IAM exclusion scope is not fully compilable for resource type "${options.resourceDefinition.resourceType}".`);

				return { isFullyCompilable: false };
			}

			where = AuthorizationScopeMergeWhere(where, compiledExclusion.branches.length === 1 ? compiledExclusion.branches[0] : compiledExclusion.branches);

			if (Array.isArray(where) && where.length > AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES) {
				iamQueryPlannerLogger.warn(`IAM exclusion scope for resource type "${options.resourceDefinition.resourceType}" exceeds ${AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES} where branches.`);

				return { isFullyCompilable: false };
			}
		}

		return {
			isFullyCompilable: true,
			scope: where ? { where } : undefined,
		};
	}

	private assignWhereValue<E extends IApiBaseEntity>(where: FindOptionsWhere<E>, queryPath: string, value: unknown): void {
		const pathSegments: Array<string> = queryPath.split(".").filter(Boolean);

		if (pathSegments.length === 0) {
			return;
		}

		let currentValue: Record<string, unknown> = where;

		for (const segment of pathSegments.slice(0, -1)) {
			if (!this.isRecord(currentValue[segment])) {
				currentValue[segment] = {};
			}

			currentValue = currentValue[segment] as Record<string, unknown>;
		}

		const lastSegment: string | undefined = pathSegments.at(-1);

		if (!lastSegment) {
			return;
		}

		currentValue[lastSegment] = value;
	}

	/**
	 * Compiles one matched Deny statement into the OR branches of rows it leaves visible. Keys of one statement are
	 * ANDed, so by De Morgan every negated key or resource-pattern constraint is its own top-level branch.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {object} options - Compilation options.
	 * @param {Record<string, Record<string, unknown>>} [options.condition] - Statement condition.
	 * @param {IApiAuthorizationPrincipal} options.principal - Principal used to resolve `${...}` condition values.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} options.requestMetadata - Request metadata used to resolve `${...}` condition values.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceConstraint>} options.resourceConstraints - Placeholder constraints of a row-scoped Resource pattern.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition with the filterable field mappings.
	 * @returns {{ branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean }} Exclusion branches, or a non-compilable result.
	 */
	private compileStatementExclusion<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(options: {
		condition?: Record<string, Record<string, unknown>>;
		principal: IApiAuthorizationPrincipal;
		requestMetadata: IApiAuthorizationRequestMetadata<E, M>;
		resource?: E;
		resourceConstraints: ReadonlyArray<IApiAuthorizationIamResourceConstraint>;
		resourceDefinition: IApiAuthorizationResourceDefinition<E>;
	}): { branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean } {
		const branches: Array<FindOptionsWhere<E>> = [];

		for (const constraint of options.resourceConstraints) {
			const fieldDefinition: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = this.resolveFilterableField(options.resourceDefinition, `resource.${constraint.placeholder}`);

			if (!fieldDefinition || (constraint.isPrefix && !this.isStringField(options.resourceDefinition, fieldDefinition.queryPath))) {
				return { isCompilable: false };
			}

			// An exact placeholder binds like a condition value, so `bool:item/true` compares a boolean column with true.
			const columnValue: { isComparable: boolean; value?: unknown } = constraint.isPrefix ? { isComparable: true } : this.resolveColumnValue(options.resourceDefinition, fieldDefinition.queryPath, constraint.value);

			if (!columnValue.isComparable) {
				return { isCompilable: false };
			}

			// A row whose placeholder is NULL renders `*` in its resource string, which no row-scoped pattern matches.
			branches.push(this.createWhere(fieldDefinition.queryPath, constraint.isPrefix ? this.createPrefixExclusion(constraint.value) : Not(Equal(columnValue.value))), this.createWhere(fieldDefinition.queryPath, IsNull()));
		}

		for (const [operator, operands] of Object.entries(options.condition ?? {})) {
			for (const [path, rawValue] of Object.entries(operands)) {
				if (!path.startsWith("resource.")) {
					continue;
				}

				const fieldDefinition: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = this.resolveFilterableField(options.resourceDefinition, path);

				const resolvedValue: unknown = this.resolveConditionValue(rawValue, {
					principal: options.principal,
					request: options.requestMetadata,
					resource: options.resource,
				});

				const columnValue: { isComparable: boolean; value?: unknown } = fieldDefinition && this.isCompilableValue(resolvedValue) ? this.resolveColumnValue(options.resourceDefinition, fieldDefinition.queryPath, resolvedValue) : { isComparable: false };
				const negatedBranches: Array<Array<[string, unknown]>> | undefined = fieldDefinition && columnValue.isComparable ? this.negateConditionOperator(operator, fieldDefinition.queryPath, this.resolveField(options.resourceDefinition.entity, fieldDefinition.queryPath), columnValue.value) : undefined;

				if (!negatedBranches) {
					return { isCompilable: false };
				}

				for (const negatedBranch of negatedBranches) {
					branches.push(this.createBranchWhere(negatedBranch));
				}
			}
		}

		return branches.length === 0 ? { isCompilable: false } : { branches, isCompilable: true };
	}

	/**
	 * Compiles one matched Allow statement into the OR branches of rows it allows. Keys of one statement are ANDed, so
	 * the branches are the cross product of each key's alternatives; keys on one query path combine with `And`, so two
	 * different values on one column allow no row, as they do in memory.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {object} options - Compilation options.
	 * @param {Record<string, Record<string, unknown>>} [options.condition] - Statement condition.
	 * @param {IApiAuthorizationPrincipal} options.principal - Principal used to resolve `${...}` condition values.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} options.requestMetadata - Request metadata used to resolve `${...}` condition values.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition with the filterable field mappings.
	 * @returns {{ branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean }} Allow branches, none when the statement has no `resource.*` key, or a non-compilable result.
	 */
	private compileStatementWhere<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(options: { condition?: Record<string, Record<string, unknown>>; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> }): { branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean } {
		if (!options.condition) {
			return {
				isCompilable: true,
			};
		}

		let branches: Array<Array<[string, unknown]>> = [[]];
		let hasResourceCondition: boolean = false;

		for (const [operator, operands] of Object.entries(options.condition)) {
			for (const [path, rawValue] of Object.entries(operands)) {
				if (!path.startsWith("resource.")) {
					continue;
				}

				hasResourceCondition = true;

				const fieldDefinition: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = this.resolveFilterableField(options.resourceDefinition, path);

				if (!fieldDefinition) {
					return { isCompilable: false };
				}

				const resolvedValue: unknown = this.resolveConditionValue(rawValue, {
					principal: options.principal,
					request: options.requestMetadata,
					resource: options.resource,
				});

				const columnValue: { isComparable: boolean; value?: unknown } = this.isCompilableValue(resolvedValue) ? this.resolveColumnValue(options.resourceDefinition, fieldDefinition.queryPath, resolvedValue) : { isComparable: false };
				const keyBranches: Array<Array<[string, unknown]>> | undefined = columnValue.isComparable ? this.resolveConditionBranches(operator, fieldDefinition.queryPath, this.resolveField(options.resourceDefinition.entity, fieldDefinition.queryPath), columnValue.value) : undefined;

				if (!keyBranches) {
					return { isCompilable: false };
				}

				branches = branches.flatMap((branch: Array<[string, unknown]>): Array<Array<[string, unknown]>> => keyBranches.map((keyBranch: Array<[string, unknown]>): Array<[string, unknown]> => [...branch, ...keyBranch]));

				if (branches.length > AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES) {
					iamQueryPlannerLogger.warn(`IAM query scope for resource type "${options.resourceDefinition.resourceType}" exceeds ${AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES} where branches.`);

					return { isCompilable: false };
				}
			}
		}

		return {
			branches: hasResourceCondition ? branches.map((branch: Array<[string, unknown]>): FindOptionsWhere<E> => this.createBranchWhere(branch)) : undefined,
			isCompilable: true,
		};
	}

	/**
	 * Builds one WHERE branch from the column conditions it ANDs. Conditions on one query path combine with `And`; a
	 * condition repeated on one path is kept once, and a plain value becomes `Equal` only when it meets another condition.
	 * @template E - Entity type.
	 * @param {Array<[string, unknown]>} conditions - Query paths with their values or find operators.
	 * @returns {FindOptionsWhere<E>} WHERE branch.
	 */
	private createBranchWhere<E extends IApiBaseEntity>(conditions: Array<[string, unknown]>): FindOptionsWhere<E> {
		const pathConditions: Map<string, Array<unknown>> = new Map<string, Array<unknown>>();

		for (const [queryPath, value] of conditions) {
			pathConditions.set(queryPath, [...(pathConditions.get(queryPath) ?? []), value]);
		}

		const where: FindOptionsWhere<E> = {};

		for (const [queryPath, values] of pathConditions) {
			if (values.length === 1) {
				this.assignWhereValue(where, queryPath, values[0]);

				continue;
			}

			const operators: Array<FindOperator<unknown>> = [];

			for (const value of values) {
				const operator: FindOperator<unknown> = value instanceof FindOperator ? (value as FindOperator<unknown>) : Equal(value);

				if (!operators.some((existing: FindOperator<unknown>): boolean => this.isSameCondition(existing, operator))) {
					operators.push(operator);
				}
			}

			this.assignWhereValue(where, queryPath, operators.length === 1 ? operators[0] : And(...operators));
		}

		return where;
	}

	/**
	 * Builds a prefix exclusion with an explicit ESCAPE clause, because databases disagree on the default LIKE escape character.
	 * @param {string} prefix - Literal resource-pattern prefix.
	 * @returns {FindOperator<unknown>} Operator keeping values that do not start with the prefix.
	 */
	private createPrefixExclusion(prefix: string): FindOperator<unknown> {
		const parameterName: string = `iamResourcePrefix${Buffer.from(prefix).toString("hex")}`;
		const pattern: string = `${prefix.replaceAll(/[!%_]/g, "!$&")}%`;

		return Raw((columnAlias: string): string => `${columnAlias} NOT LIKE :${parameterName} ESCAPE '!'`, { [parameterName]: pattern });
	}

	/**
	 * Builds a single-field WHERE branch, following the nested `queryPath` rules of `assignWhereValue`.
	 * @template E - Entity type.
	 * @param {string} queryPath - Entity query path such as `status` or `operator.id`.
	 * @param {unknown} value - Field condition.
	 * @returns {FindOptionsWhere<E>} WHERE branch.
	 */
	private createWhere<E extends IApiBaseEntity>(queryPath: string, value: unknown): FindOptionsWhere<E> {
		const where: FindOptionsWhere<E> = {};
		this.assignWhereValue(where, queryPath, value);

		return where;
	}

	/**
	 * Accepts only condition values whose SQL comparison matches the in-memory evaluator, which normalizes
	 * `null`, `undefined`, and `""` to the same empty string and cannot compare objects.
	 * @param {unknown} value - Resolved condition value.
	 * @returns {boolean} True for non-empty scalar values.
	 */
	private isCompilableValue(value: unknown): boolean {
		return value !== undefined && value !== null && value !== "" && typeof value !== "object";
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return Boolean(value) && typeof value === "object" && !Array.isArray(value);
	}

	/**
	 * Compares two column conditions by operator type and operand, so a condition repeated on one path is kept once.
	 * @param {unknown} left - Value or find operator.
	 * @param {unknown} right - Value or find operator.
	 * @returns {boolean} True when both conditions compare the same way with the same operand.
	 */
	private isSameCondition(left: unknown, right: unknown): boolean {
		if (left instanceof FindOperator && right instanceof FindOperator) {
			return left.type === right.type && this.isSameCondition(left.value, right.value);
		}

		return left === right;
	}

	/**
	 * Checks the package's own rule for LIKE-based criteria: only properties described as `EApiPropertyDescribeType.STRING`.
	 * String formats backed by `bigint` or `uuid` columns are excluded, because databases such as PostgreSQL reject LIKE on them.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @param {string} queryPath - Direct property of the entity or one of its ancestor classes; nested paths are never treated as string columns.
	 * @returns {boolean} True when the property is a described text column.
	 */
	private isStringField<E extends IApiBaseEntity>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, queryPath: string): boolean {
		const propertyMetadata: Partial<TApiPropertyDescribeProperties> | undefined = MetadataStorage.getInstance().getMetadata(resourceDefinition.entity, queryPath, PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY);

		if (propertyMetadata?.type !== EApiPropertyDescribeType.STRING) {
			return false;
		}

		return propertyMetadata.format !== EApiPropertyStringType.BIGINT_STRING && propertyMetadata.format !== EApiPropertyStringType.UUID;
	}

	/**
	 * Negates one resource condition key into the OR branches of rows that fail it, with the in-memory evaluator's
	 * semantics: a NULL column is a present value that compares as an empty string, while a path through a missing
	 * relation is a missing key at any depth. The IfExists operators hold for a missing key, so a Deny on one keeps
	 * a NULL column only while the relation it sits on is present.
	 * @param {string} operator - Condition operator.
	 * @param {string} queryPath - Entity query path of the key.
	 * @param {IApiAuthorizationIamQueryField} field - Resolved query path.
	 * @param {unknown} value - Resolved scalar condition value.
	 * @returns {Array<Array<[string, unknown]>> | undefined} OR branches of ANDed column conditions, or undefined when the key cannot compile.
	 */
	private negateConditionOperator(operator: string, queryPath: string, field: IApiAuthorizationIamQueryField, value: unknown): Array<Array<[string, unknown]>> | undefined {
		if (!EnumIsValue(EApiPolicyConditionOperator, operator)) {
			return undefined;
		}

		switch (operator) {
			case EApiPolicyConditionOperator.STRING_EQUALS: {
				return [[[queryPath, Not(Equal(value))]], [[queryPath, IsNull()]]];
			}

			case EApiPolicyConditionOperator.STRING_EQUALS_IF_EXISTS: {
				if (!field.isOptional) {
					return [[[queryPath, Not(Equal(value))]], [[queryPath, IsNull()]]];
				}

				if (!field.presencePath) {
					return undefined;
				}

				// A NULL primary key is the missing relation itself, which the key holds for.
				return field.presencePath === queryPath
					? [[[queryPath, Not(Equal(value))]]]
					: [
							[[queryPath, Not(Equal(value))]],
							[
								[queryPath, IsNull()],
								[field.presencePath, Not(IsNull())],
							],
						];
			}

			case EApiPolicyConditionOperator.STRING_NOT_EQUALS: {
				return [[[queryPath, Equal(value)]]];
			}

			case EApiPolicyConditionOperator.STRING_NOT_EQUALS_IF_EXISTS: {
				return [[[queryPath, Equal(value)]]];
			}
		}
	}

	/**
	 * Reads a query path through the TypeORM metadata of the resource entity, as `AuthorizationIamReadQueryField` describes.
	 * @param {object} entity - Resource entity class.
	 * @param {string} queryPath - Entity query path.
	 * @returns {IApiAuthorizationIamQueryField} The resolved query path.
	 */
	private readField(entity: object, queryPath: string): IApiAuthorizationIamQueryField {
		return AuthorizationIamReadQueryField(entity, queryPath);
	}

	/**
	 * Converts a resolved scalar condition value to the value its column compares against in SQL, following the in-memory
	 * evaluator, which compares the text of both sides. A boolean column holds only `true` and `false`, so `true`, `false`
	 * or that exact text binds as a boolean, which each driver compares in its own stored form (`1`/`0` on SQLite and MySQL).
	 * Any other value, such as `"1"`, `"yes"` or the number `1`, equals no row in memory and is not comparable, so the scope fails closed.
	 * A path TypeORM cannot resolve is not comparable either. Values for other columns are kept as they are.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @param {string} queryPath - Entity query path such as `isActive` or `owner.company.isVerified`.
	 * @param {unknown} value - Resolved non-empty scalar condition value.
	 * @returns {{ isComparable: boolean; value?: unknown }} The value to bind, or a non-comparable result.
	 */
	private resolveColumnValue<E extends IApiBaseEntity>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, queryPath: string, value: unknown): { isComparable: boolean; value?: unknown } {
		const field: IApiAuthorizationIamQueryField = this.resolveField(resourceDefinition.entity, queryPath);

		if (!field.isResolvable) {
			return { isComparable: false };
		}

		if (!field.isBoolean) {
			return { isComparable: true, value };
		}

		try {
			// The one boolean rule of every filter value: true, false, or that exact text.
			return { isComparable: true, value: ApiControllerGetListQueryParseValue(value, { description: queryPath, type: EApiPropertyDescribeType.BOOLEAN }) };
		} catch {
			return { isComparable: false };
		}
	}

	/**
	 * Resolves one Allow resource condition key into the OR branches of rows that pass it. A plain StringEquals needs the
	 * column to equal the value; StringEqualsIfExists also holds for a row whose path crosses a missing relation, which
	 * the in-memory evaluator reads as a missing key.
	 * @param {string} operator - Condition operator.
	 * @param {string} queryPath - Entity query path of the key.
	 * @param {IApiAuthorizationIamQueryField} field - Resolved query path.
	 * @param {unknown} value - Resolved scalar condition value.
	 * @returns {Array<Array<[string, unknown]>> | undefined} OR branches of ANDed column conditions, or undefined when the key cannot compile.
	 */
	private resolveConditionBranches(operator: string, queryPath: string, field: IApiAuthorizationIamQueryField, value: unknown): Array<Array<[string, unknown]>> | undefined {
		if (operator === (EApiPolicyConditionOperator.STRING_EQUALS as string) || (operator === (EApiPolicyConditionOperator.STRING_EQUALS_IF_EXISTS as string) && !field.isOptional)) {
			return [[[queryPath, value]]];
		}

		if (operator !== (EApiPolicyConditionOperator.STRING_EQUALS_IF_EXISTS as string) || !field.presencePath) {
			return undefined;
		}

		return [[[queryPath, value]], [[field.presencePath, IsNull()]]];
	}

	private resolveConditionValue(
		value: unknown,
		context: {
			principal: IApiAuthorizationPrincipal;
			request: {
				body?: unknown;
				headers?: Record<string, string>;
				ip?: string;
				parameters?: unknown;
				query?: unknown;
			};
			resource?: IApiBaseEntity;
		},
	): unknown {
		if (typeof value !== "string") {
			return value;
		}

		const matcher: null | RegExpMatchArray = /^\$\{(.+)\}$/.exec(value);

		if (!matcher) {
			return value;
		}

		const matchedPath: string | undefined = matcher[1];

		if (!matchedPath) {
			return undefined;
		}

		return this.resolvePathValue(
			{
				principal: context.principal,
				request: {
					body: context.request.body,
					headers: context.request.headers,
					ip: context.request.ip,
					parameters: context.request.parameters,
					query: context.request.query,
				},
				resource: context.resource,
			},
			matchedPath,
		);
	}

	/**
	 * Returns the resolved column of a query path, read once per resource entity and path.
	 * @param {object} entity - Resource entity class.
	 * @param {string} queryPath - Entity query path.
	 * @returns {IApiAuthorizationIamQueryField} The resolved query path.
	 */
	private resolveField(entity: object, queryPath: string): IApiAuthorizationIamQueryField {
		let entityCache: Map<string, IApiAuthorizationIamQueryField> | undefined = iamQueryPlannerFieldCache.get(entity);

		if (!entityCache) {
			entityCache = new Map<string, IApiAuthorizationIamQueryField>();
			iamQueryPlannerFieldCache.set(entity, entityCache);
		}

		let field: IApiAuthorizationIamQueryField | undefined = entityCache.get(queryPath);

		if (!field) {
			field = this.readField(entity, queryPath);
			entityCache.set(queryPath, field);
		}

		return field;
	}

	/**
	 * Resolves the resource field mapping of a `resource.*` path when it may be used in a database scope.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @param {string} path - `resource.*` condition path.
	 * @returns {IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined} Filterable field mapping, if any.
	 */
	private resolveFilterableField<E extends IApiBaseEntity>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, path: string): IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined {
		return resourceDefinition.fields.find((field: IApiAuthorizationResourceDefinition<E>["fields"][number]): boolean => field.path === path && field.isFilterable);
	}

	private resolvePathValue(source: unknown, path: string): unknown {
		let currentValue: unknown = source;

		for (const segment of path.split(".").filter(Boolean)) {
			if (!this.isRecord(currentValue)) {
				return undefined;
			}

			currentValue = currentValue[segment];
		}

		return currentValue;
	}
}
