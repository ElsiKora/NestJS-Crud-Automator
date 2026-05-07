import type { IApiPolicyDocumentRecord } from "@interface/class/api/authorization";

import { EApiPolicyEffect } from "@enum/class/authorization";
import { Injectable } from "@nestjs/common";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

const iamDocumentValidatorLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationIamDocumentValidator");

@Injectable()
export class ApiAuthorizationIamDocumentValidator {
	public validate(record: IApiPolicyDocumentRecord): void {
		if (typeof record.id !== "string" || record.id.length === 0) {
			iamDocumentValidatorLogger.error("Policy document record id must be a non-empty string");

			throw ErrorException("Policy document record id must be a non-empty string");
		}

		if (typeof record.namespace !== "string" || record.namespace.length === 0) {
			iamDocumentValidatorLogger.error(`Policy document "${record.id}" namespace must be a non-empty string`);

			throw ErrorException(`Policy document "${record.id}" namespace must be a non-empty string`);
		}

		if (typeof record.sourceType !== "string" || record.sourceType.length === 0) {
			iamDocumentValidatorLogger.error(`Policy document "${record.id}" sourceType must be a non-empty string`);

			throw ErrorException(`Policy document "${record.id}" sourceType must be a non-empty string`);
		}

		if (typeof record.version !== "string" || record.version.length === 0) {
			iamDocumentValidatorLogger.error(`Policy document "${record.id}" version must be a non-empty string`);

			throw ErrorException(`Policy document "${record.id}" version must be a non-empty string`);
		}

		if (typeof record.document?.Version !== "string" || record.document.Version.length === 0) {
			iamDocumentValidatorLogger.error(`Policy document "${record.id}" Version must be a non-empty string`);

			throw ErrorException(`Policy document "${record.id}" Version must be a non-empty string`);
		}

		if (!Array.isArray(record.document.Statement)) {
			iamDocumentValidatorLogger.error(`Policy document "${record.id}" Statement must be an array`);

			throw ErrorException(`Policy document "${record.id}" Statement must be an array`);
		}

		for (const statement of record.document.Statement as ReadonlyArray<unknown>) {
			this.validateStatement(record.id, statement);
		}
	}

	public validateMany(records: ReadonlyArray<IApiPolicyDocumentRecord>): void {
		iamDocumentValidatorLogger.verbose(`Validating ${records.length} IAM policy documents.`);

		for (const record of records) {
			this.validate(record);
		}
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return Boolean(value) && typeof value === "object" && !Array.isArray(value);
	}

	private validateStatement(documentId: string, statement: unknown): void {
		if (!this.isRecord(statement)) {
			iamDocumentValidatorLogger.error(`Policy document "${documentId}" contains an invalid statement`);

			throw ErrorException(`Policy document "${documentId}" contains an invalid statement`);
		}

		const action: unknown = statement.Action;
		const resource: unknown = statement.Resource;
		const effect: unknown = statement.Effect;
		const condition: unknown = statement.Condition;

		if (!Array.isArray(action) || action.some((entry: unknown) => typeof entry !== "string" || entry.length === 0)) {
			iamDocumentValidatorLogger.error(`Policy document "${documentId}" contains a statement with invalid Action entries`);

			throw ErrorException(`Policy document "${documentId}" contains a statement with invalid Action entries`);
		}

		if (!Array.isArray(resource) || resource.some((entry: unknown) => typeof entry !== "string" || entry.length === 0)) {
			iamDocumentValidatorLogger.error(`Policy document "${documentId}" contains a statement with invalid Resource entries`);

			throw ErrorException(`Policy document "${documentId}" contains a statement with invalid Resource entries`);
		}

		if (effect !== EApiPolicyEffect.ALLOW && effect !== EApiPolicyEffect.DENY) {
			iamDocumentValidatorLogger.error(`Policy document "${documentId}" contains a statement with invalid Effect "${String(effect)}"`);

			throw ErrorException(`Policy document "${documentId}" contains a statement with invalid Effect "${String(effect)}"`);
		}

		if (condition !== undefined && !this.isRecord(condition)) {
			iamDocumentValidatorLogger.error(`Policy document "${documentId}" contains an invalid Condition object`);

			throw ErrorException(`Policy document "${documentId}" contains an invalid Condition object`);
		}

		if (condition && this.isRecord(condition)) {
			for (const value of Object.values(condition)) {
				if (!this.isRecord(value)) {
					iamDocumentValidatorLogger.error(`Policy document "${documentId}" contains an invalid Condition operand map`);

					throw ErrorException(`Policy document "${documentId}" contains an invalid Condition operand map`);
				}
			}
		}
	}
}
