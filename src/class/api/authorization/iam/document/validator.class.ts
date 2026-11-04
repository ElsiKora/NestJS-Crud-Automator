import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationIamFailure, IApiAuthorizationIamStatement, IApiAuthorizationResourceDefinition, IApiPolicyDocumentRecord } from "@interface/class/api/authorization";
import type { ValidationError } from "class-validator";

import { ApiAuthorizationIamParser } from "@class/api/authorization/iam/parser.class";
import { ApiAuthorizationIamResourceDefinitionRegistry } from "@class/api/authorization/iam/registry.class";
import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { Injectable } from "@nestjs/common";
import { ApiControllerParametersCreateFailure } from "@utility/api/controller/parameters/create-failure.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

const iamDocumentValidatorLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationIamDocumentValidator");

/**
 * Validates IAM policy documents against the one policy grammar, at save and at load. `inspect` and `assertSavable`
 * serve a host's save path; `validate` runs on every document a document source returns.
 */
@Injectable()
export class ApiAuthorizationIamDocumentValidator {
	/**
	 * Throws when a policy document fails the grammar, so a host refuses to store it. Call it in the create or update
	 * service of the policy table, or in a BEFORE route subscriber.
	 * @param {unknown} input - Policy document, as the client sent it.
	 * @param {object} options - Namespace-aware checks.
	 * @param {string} options.namespace - Namespace the document is stored for.
	 * @throws {ApiRequestValidationException} With one failure per problem, each carrying a constraint code from `AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT`.
	 */
	public assertSavable(input: unknown, options: { namespace: string }): void {
		const failures: Array<ValidationError> = this.inspect(input, options);

		if (failures.length > 0) {
			throw new ApiRequestValidationException(failures);
		}
	}

	/**
	 * Reports every failure of a policy document against the grammar, without throwing. A `resource.*` key must map to
	 * a filterable field of a resource definition registered for the namespace at bootstrap, so a namespace no IAM
	 * controller of the application serves maps no key.
	 * @param {unknown} input - Policy document.
	 * @param {object} options - Namespace-aware checks.
	 * @param {string} options.namespace - Namespace the document is stored for.
	 * @returns {Array<ValidationError>} One failure per problem: `property` is its path, such as `document.Statement[2].Condition.StringLike["resource.name"]`, and `constraints` holds its code.
	 */
	public inspect(input: unknown, options: { namespace: string }): Array<ValidationError> {
		const result: { failures: Array<IApiAuthorizationIamFailure>; statements: Array<IApiAuthorizationIamStatement> } = ApiAuthorizationIamParser.readDocument(input, {
			namespace: options.namespace,
			resourceDefinitions: ApiAuthorizationIamResourceDefinitionRegistry.getInstance().get(options.namespace),
		});

		return result.failures.map((failure: IApiAuthorizationIamFailure): ValidationError => ApiControllerParametersCreateFailure(failure.property, failure.code, failure.message));
	}

	/**
	 * Validates one loaded policy document record: its record fields, and its document against the grammar. The
	 * `resource.*` keys are checked against the namespace's resource definitions once bootstrap registered any.
	 * @param {IApiPolicyDocumentRecord} record - Record a document source returned.
	 * @throws {Error} When the record or its document is invalid; the request answers 500.
	 */
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

		const registry: ApiAuthorizationIamResourceDefinitionRegistry = ApiAuthorizationIamResourceDefinitionRegistry.getInstance();
		const resourceDefinitions: ReadonlyArray<IApiAuthorizationResourceDefinition<IApiBaseEntity>> | undefined = registry.has(record.namespace) ? registry.get(record.namespace) : undefined;
		const result: { failures: Array<IApiAuthorizationIamFailure>; statements: Array<IApiAuthorizationIamStatement> } = ApiAuthorizationIamParser.readDocument(record.document, { namespace: record.namespace, resourceDefinitions });

		if (result.failures.length > 0) {
			const message: string = `Policy document "${record.id}" is invalid: ${ApiAuthorizationIamParser.formatFailures(result.failures)}`;
			iamDocumentValidatorLogger.error(message);

			throw ErrorException(message);
		}
	}

	/**
	 * Validates every loaded policy document record.
	 * @param {ReadonlyArray<IApiPolicyDocumentRecord>} records - Records a document source returned.
	 * @throws {Error} When a record or its document is invalid.
	 */
	public validateMany(records: ReadonlyArray<IApiPolicyDocumentRecord>): void {
		iamDocumentValidatorLogger.verbose(`Validating ${records.length} IAM policy documents.`);

		for (const record of records) {
			this.validate(record);
		}
	}
}
