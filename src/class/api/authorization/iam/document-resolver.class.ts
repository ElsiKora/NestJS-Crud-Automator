import type { IApiPolicyDocumentRecord, IApiPolicyDocumentSource } from "@interface/class/api/authorization";

import { ApiAuthorizationIamDocumentValidator } from "@class/api/authorization/iam/document-validator.class";
import { AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN } from "@constant/class/authorization";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

const iamDocumentResolverLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationIamDocumentResolver");

@Injectable()
export class ApiAuthorizationIamDocumentResolver {
	private readonly CACHE: Map<string, ReadonlyArray<IApiPolicyDocumentRecord>> = new Map<string, ReadonlyArray<IApiPolicyDocumentRecord>>();

	public constructor(
		private readonly validator: ApiAuthorizationIamDocumentValidator,
		@Optional()
		@Inject(AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN)
		private readonly sources: ReadonlyArray<IApiPolicyDocumentSource> = [],
	) {}

	public clear(): void {
		this.CACHE.clear();
	}

	public async resolve(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
		const normalizedIds: Array<string> = [...new Set(ids.filter((id: string) => typeof id === "string" && id.length > 0))].sort((left: string, right: string) => left.localeCompare(right));

		if (normalizedIds.length === 0) {
			return [];
		}

		const cacheKey: string = normalizedIds.join("::");
		const cachedDocuments: ReadonlyArray<IApiPolicyDocumentRecord> | undefined = this.CACHE.get(cacheKey);

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
		this.CACHE.set(cacheKey, result);
		iamDocumentResolverLogger.verbose(`Resolved ${result.length} IAM policy documents from ${this.sources.length} sources.`);

		return result;
	}
}
