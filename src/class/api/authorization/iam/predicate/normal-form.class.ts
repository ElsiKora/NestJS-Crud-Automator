import type { EApiAuthorizationIamTokenType } from "@enum/class/authorization";
import type { TApiAuthorizationIamPredicate, TApiAuthorizationIamPredicateAtom } from "@type/class/api/authorization/iam";

import { EApiAuthorizationIamPredicateKind } from "@enum/class/authorization";

/**
 * Turns an IAM predicate into its disjunctive normal form: an OR of branches, each an AND of atoms, which is the shape
 * of a TypeORM `where` array. `TRUE` is one empty branch and `FALSE` no branch. The expansion counts branches as it
 * goes and stops at the cap, so an oversized product is never built.
 */
export class ApiAuthorizationIamPredicateNormalForm {
	/**
	 * Reads the identity of an atom, so an atom repeated in a branch is kept once.
	 * @param {TApiAuthorizationIamPredicateAtom} atom - Atom.
	 * @returns {string} A key equal for atoms that compare the same column the same way.
	 */
	public static readAtomKey(atom: TApiAuthorizationIamPredicateAtom): string {
		switch (atom.kind) {
			case EApiAuthorizationIamPredicateKind.IN: {
				return JSON.stringify([atom.kind, atom.column.queryPath, atom.comparison, atom.isNegated, atom.values]);
			}

			case EApiAuthorizationIamPredicateKind.IS_NULL:
			// falls through

			case EApiAuthorizationIamPredicateKind.NOT_NULL: {
				return JSON.stringify([atom.kind, atom.column.queryPath]);
			}

			case EApiAuthorizationIamPredicateKind.LIKE: {
				return JSON.stringify([atom.kind, atom.column.queryPath, atom.isNegated, atom.pattern.map((token: { type: EApiAuthorizationIamTokenType; value?: string }): Array<string | undefined> => [token.type, token.value])]);
			}
		}
	}

	/**
	 * Expands a predicate into branches. A branch that requires a column to be NULL and not NULL at once holds for no
	 * row and is dropped; an atom repeated within a branch is kept once.
	 * @param {TApiAuthorizationIamPredicate} predicate - Predicate.
	 * @param {number} maxBranches - Most branches the result may hold.
	 * @returns {Array<Array<TApiAuthorizationIamPredicateAtom>> | undefined} The branches in order, or undefined when they exceed the cap.
	 */
	public static toBranches(predicate: TApiAuthorizationIamPredicate, maxBranches: number): Array<Array<TApiAuthorizationIamPredicateAtom>> | undefined {
		const branches: Array<Array<TApiAuthorizationIamPredicateAtom>> | undefined = ApiAuthorizationIamPredicateNormalForm.expand(predicate, maxBranches);

		if (!branches) {
			return undefined;
		}

		const result: Array<Array<TApiAuthorizationIamPredicateAtom>> = [];

		for (const branch of branches) {
			const simplified: Array<TApiAuthorizationIamPredicateAtom> | undefined = ApiAuthorizationIamPredicateNormalForm.simplifyBranch(branch);

			if (simplified) {
				result.push(simplified);
			}
		}

		return result;
	}

	/**
	 * Expands a predicate into branches without simplifying them.
	 * @param {TApiAuthorizationIamPredicate} predicate - Predicate.
	 * @param {number} maxBranches - Most branches the result may hold.
	 * @returns {Array<Array<TApiAuthorizationIamPredicateAtom>> | undefined} The branches, or undefined when they exceed the cap.
	 */
	private static expand(predicate: TApiAuthorizationIamPredicate, maxBranches: number): Array<Array<TApiAuthorizationIamPredicateAtom>> | undefined {
		switch (predicate.kind) {
			case EApiAuthorizationIamPredicateKind.AND: {
				let branches: Array<Array<TApiAuthorizationIamPredicateAtom>> = [[]];

				for (const child of predicate.children) {
					const childBranches: Array<Array<TApiAuthorizationIamPredicateAtom>> | undefined = ApiAuthorizationIamPredicateNormalForm.expand(child, maxBranches);

					if (!childBranches || branches.length * childBranches.length > maxBranches) {
						return undefined;
					}

					branches = branches.flatMap((branch: Array<TApiAuthorizationIamPredicateAtom>): Array<Array<TApiAuthorizationIamPredicateAtom>> => childBranches.map((childBranch: Array<TApiAuthorizationIamPredicateAtom>): Array<TApiAuthorizationIamPredicateAtom> => [...branch, ...childBranch]));
				}

				return branches;
			}

			case EApiAuthorizationIamPredicateKind.FALSE: {
				return [];
			}

			case EApiAuthorizationIamPredicateKind.IN:
			// falls through

			case EApiAuthorizationIamPredicateKind.IS_NULL:
			// falls through

			case EApiAuthorizationIamPredicateKind.LIKE:
			// falls through

			case EApiAuthorizationIamPredicateKind.NOT_NULL: {
				return [[predicate]];
			}

			case EApiAuthorizationIamPredicateKind.OR: {
				const branches: Array<Array<TApiAuthorizationIamPredicateAtom>> = [];

				for (const child of predicate.children) {
					const childBranches: Array<Array<TApiAuthorizationIamPredicateAtom>> | undefined = ApiAuthorizationIamPredicateNormalForm.expand(child, maxBranches);

					if (!childBranches || branches.length + childBranches.length > maxBranches) {
						return undefined;
					}

					branches.push(...childBranches);
				}

				return branches;
			}

			case EApiAuthorizationIamPredicateKind.TRUE: {
				return [[]];
			}
		}
	}

	/**
	 * Keeps each atom of a branch once and drops a branch that needs one column NULL and not NULL.
	 * @param {ReadonlyArray<TApiAuthorizationIamPredicateAtom>} branch - Atoms of the branch.
	 * @returns {Array<TApiAuthorizationIamPredicateAtom> | undefined} The branch, or undefined when it holds for no row.
	 */
	private static simplifyBranch(branch: ReadonlyArray<TApiAuthorizationIamPredicateAtom>): Array<TApiAuthorizationIamPredicateAtom> | undefined {
		const keys: Set<string> = new Set<string>();
		const nullPaths: Set<string> = new Set<string>();
		const notNullPaths: Set<string> = new Set<string>();
		const atoms: Array<TApiAuthorizationIamPredicateAtom> = [];

		for (const atom of branch) {
			const key: string = ApiAuthorizationIamPredicateNormalForm.readAtomKey(atom);

			if (keys.has(key)) {
				continue;
			}

			keys.add(key);
			atoms.push(atom);

			if (atom.kind === EApiAuthorizationIamPredicateKind.IS_NULL) {
				nullPaths.add(atom.column.queryPath);
			} else if (atom.kind === EApiAuthorizationIamPredicateKind.NOT_NULL) {
				notNullPaths.add(atom.column.queryPath);
			}
		}

		return [...nullPaths].some((path: string): boolean => notNullPaths.has(path)) ? undefined : atoms;
	}
}
