import type { IApiPolicyDocumentRecord, IApiPolicyDocumentSource } from "@interface/class/api/authorization";

import { ApiAuthorizationIamDocumentCache } from "@class/api/authorization/iam/document/cache.class";
import { ApiAuthorizationIamDocumentValidator } from "@class/api/authorization/iam/document/validator.class";
import { AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN } from "@constant/class/authorization";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

const iamDocumentResolverLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationIamDocumentResolver");

// Starts the cache key part that names the namespace of a read; a policy id never starts with a NUL character.
const IAM_DOCUMENT_RESOLVER_NAMESPACE_KEY: string = "\u0000namespace:";

@Injectable()
export class ApiAuthorizationIamDocumentResolver {
	public constructor(
		private readonly cache: ApiAuthorizationIamDocumentCache,
		private readonly validator: ApiAuthorizationIamDocumentValidator,
		@Inject(AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN)
		@Optional()
		private readonly sources: ReadonlyArray<IApiPolicyDocumentSource> = [],
	) {}

	public clear(): void {
		this.cache.clear();
	}

	/**
	 * Reads the policy documents of the requested ids from every document source. Only a requested document counts: one a
	 * source returns unasked is neither read nor checked. With a namespace, only the documents of that namespace are checked
	 * against the grammar; a requested document of another namespace is returned unchecked, and the engine skips it.
	 * @param {ReadonlyArray<string>} ids - Requested policy ids.
	 * @param {object} [options] - Read options.
	 * @param {string} [options.namespace] - Namespace of the request; without it every requested document is checked.
	 * @returns {Promise<ReadonlyArray<IApiPolicyDocumentRecord>>} One record per requested id, in id order.
	 * @throws {Error} When a requested id is missing or returned twice, or a checked document is invalid.
	 */
	public async resolve(ids: ReadonlyArray<string>, options: { namespace?: string } = {}): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
		const normalizedIds: Array<string> = this.cache.normalizeIds(ids);

		if (normalizedIds.length === 0) {
			return [];
		}

		// What a read checks depends on its namespace, so a read of another namespace never answers from this one's entry.
		const cacheIds: Array<string> = options.namespace === undefined ? normalizedIds : [...normalizedIds, `${IAM_DOCUMENT_RESOLVER_NAMESPACE_KEY}${options.namespace}`];
		const cachedDocuments: ReadonlyArray<IApiPolicyDocumentRecord> | undefined = this.cache.get(cacheIds);

		if (cachedDocuments) {
			iamDocumentResolverLogger.verbose(`Using cached IAM policy documents for ${normalizedIds.length} requested ids.`);

			return cachedDocuments;
		}

		const requestedIds: ReadonlySet<string> = new Set<string>(normalizedIds);
		const recordsById: Map<string, IApiPolicyDocumentRecord> = new Map<string, IApiPolicyDocumentRecord>();

		for (const source of this.sources) {
			const records: ReadonlyArray<IApiPolicyDocumentRecord> = await source.getDocumentsByIds(normalizedIds);
			const requestedRecords: Array<IApiPolicyDocumentRecord> = records.filter((record: IApiPolicyDocumentRecord): boolean => typeof record.id === "string" && requestedIds.has(record.id));

			this.validator.validateMany(requestedRecords.filter((record: IApiPolicyDocumentRecord): boolean => options.namespace === undefined || record.namespace === options.namespace));

			for (const record of requestedRecords) {
				const existingRecord: IApiPolicyDocumentRecord | undefined = recordsById.get(record.id);

				if (existingRecord) {
					iamDocumentResolverLogger.error(`Duplicate policy document id "${record.id}" resolved from multiple sources`);

					throw ErrorException(`Duplicate policy document id "${record.id}" resolved from multiple sources`);
				}

				recordsById.set(record.id, record);
			}
		}

		const result: Array<IApiPolicyDocumentRecord> = [];

		for (const id of normalizedIds) {
			const record: IApiPolicyDocumentRecord | undefined = recordsById.get(id);

			if (!record) {
				iamDocumentResolverLogger.error(`Policy document "${id}" was requested but no document source returned it`);

				throw ErrorException(`Policy document "${id}" was requested but no document source returned it`);
			}

			result.push(record);
		}
		this.cache.set(cacheIds, result);
		iamDocumentResolverLogger.verbose(`Resolved ${result.length} IAM policy documents from ${this.sources.length} sources.`);

		return result;
	}
}
