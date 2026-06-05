import type { IApiPolicyDocumentRecord, IApiPolicyDocumentSource } from "@interface/class/api/authorization";

import { AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN } from "@constant/class/authorization";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

import { ApiAuthorizationIamDocumentCache } from "./cache.class";
import { ApiAuthorizationIamDocumentValidator } from "./validator.class";

const iamDocumentResolverLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationIamDocumentResolver");

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

	public async resolve(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
		const normalizedIds: Array<string> = this.cache.normalizeIds(ids);

		if (normalizedIds.length === 0) {
			return [];
		}

		const cachedDocuments: ReadonlyArray<IApiPolicyDocumentRecord> | undefined = this.cache.get(normalizedIds);

		if (cachedDocuments) {
			iamDocumentResolverLogger.verbose(`Using cached IAM policy documents for ${normalizedIds.length} requested ids.`);

			return cachedDocuments;
		}

		const recordsById: Map<string, IApiPolicyDocumentRecord> = new Map<string, IApiPolicyDocumentRecord>();

		for (const source of this.sources) {
			const records: ReadonlyArray<IApiPolicyDocumentRecord> = await source.getDocumentsByIds(normalizedIds);
			this.validator.validateMany(records);

			for (const record of records) {
				const existingRecord: IApiPolicyDocumentRecord | undefined = recordsById.get(record.id);

				if (existingRecord) {
					iamDocumentResolverLogger.error(`Duplicate policy document id "${record.id}" resolved from multiple sources`);

					throw ErrorException(`Duplicate policy document id "${record.id}" resolved from multiple sources`);
				}

				recordsById.set(record.id, record);
			}
		}

		for (const id of normalizedIds) {
			if (!recordsById.has(id)) {
				iamDocumentResolverLogger.error(`Policy document "${id}" was requested but no document source returned it`);

				throw ErrorException(`Policy document "${id}" was requested but no document source returned it`);
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
		this.cache.set(normalizedIds, result);
		iamDocumentResolverLogger.verbose(`Resolved ${result.length} IAM policy documents from ${this.sources.length} sources.`);

		return result;
	}
}
