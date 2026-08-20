import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";

import { isDeepStrictEqual } from "node:util";

import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { InstanceChecker } from "typeorm";

/**
 * Merges subscriber WHERE criteria with a generated mandatory scope without
 * repeatedly expanding an already-contained OR scope.
 */
export class ApiControllerGeneratedScopeWhereContract {
	public static contains<E extends IApiBaseEntity>(candidateWhere: TApiAuthorizationScopeWhere<E>, mandatoryWhere: TApiAuthorizationScopeWhere<E>): boolean {
		if (!mandatoryWhere) {
			return true;
		}

		if (!candidateWhere) {
			return false;
		}

		const candidateBranches: Array<object> = Array.isArray(candidateWhere) ? candidateWhere : [candidateWhere];
		const mandatoryBranches: Array<object> = Array.isArray(mandatoryWhere) ? mandatoryWhere : [mandatoryWhere];

		return candidateBranches.length > 0 && mandatoryBranches.length > 0 && candidateBranches.every((candidateBranch: object): boolean => mandatoryBranches.some((mandatoryBranch: object): boolean => this.branchContains(candidateBranch, mandatoryBranch)));
	}

	public static merge<E extends IApiBaseEntity>(candidateWhere: TApiAuthorizationScopeWhere<E>, mandatoryWhere: TApiAuthorizationScopeWhere<E>): TApiAuthorizationScopeWhere<E> {
		const normalizedCandidate: TApiAuthorizationScopeWhere<E> = AuthorizationScopeMergeWhere(undefined, candidateWhere);

		return this.contains(normalizedCandidate, mandatoryWhere) ? normalizedCandidate : AuthorizationScopeMergeWhere(normalizedCandidate, mandatoryWhere);
	}

	private static branchContains(candidate: object, mandatory: object): boolean {
		const candidateEntries: Array<[PropertyKey, unknown]> | undefined = this.getOwnEnumerableDataEntries(candidate);
		const mandatoryEntries: Array<[PropertyKey, unknown]> | undefined = this.getOwnEnumerableDataEntries(mandatory);

		if (!candidateEntries || !mandatoryEntries) {
			return false;
		}

		const candidateValues: Map<PropertyKey, unknown> = new Map<PropertyKey, unknown>(candidateEntries);

		return mandatoryEntries.every(([key, mandatoryValue]: [PropertyKey, unknown]): boolean => candidateValues.has(key) && this.valueContains(candidateValues.get(key), mandatoryValue));
	}

	private static getOwnEnumerableDataEntries(value: object): Array<[PropertyKey, unknown]> | undefined {
		const entries: Array<[PropertyKey, unknown]> = [];

		for (const key of Reflect.ownKeys(value)) {
			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);

			if (!descriptor?.enumerable || !("value" in descriptor)) {
				return undefined;
			}

			entries.push([key, descriptor.value]);
		}

		return entries;
	}

	private static isNestedWhere(value: unknown): value is object {
		return Boolean(value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !ArrayBuffer.isView(value) && !InstanceChecker.isFindOperator(value));
	}

	private static valueContains(candidate: unknown, mandatory: unknown): boolean {
		if (Array.isArray(candidate) || Array.isArray(mandatory)) {
			if (!Array.isArray(candidate) || !Array.isArray(mandatory)) {
				return false;
			}

			return candidate.every((candidateBranch: unknown): boolean => this.isNestedWhere(candidateBranch) && mandatory.some((mandatoryBranch: unknown): boolean => this.isNestedWhere(mandatoryBranch) && this.branchContains(candidateBranch, mandatoryBranch)));
		}

		if (this.isNestedWhere(candidate)) {
			return this.isNestedWhere(mandatory) && this.branchContains(candidate, mandatory);
		}

		if (this.isNestedWhere(mandatory)) {
			return false;
		}

		return isDeepStrictEqual(candidate, mandatory);
	}
}
