import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision, IApiAuthorizationPrincipal, IApiAuthorizationRequestMetadata, IApiAuthorizationResourceDefinition, IApiAuthorizationScope, IApiPolicyAttachment, IApiPolicyDocumentRecord, IApiPolicyStatement, IApiResolvedPolicyAttachments } from "@interface/class/api/authorization";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

import { EApiAuthorizationDecisionType, EApiAuthorizationMode, EApiPolicyEffect, EApiPolicySourceType } from "@enum/class/authorization";
import { Injectable } from "@nestjs/common";
import { AuthorizationScopeMergeWhere } from "@utility/authorization";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

import { ApiAuthorizationIamQueryPlanner } from "./query-planner.class";

const iamEngineLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationIamEngine");

@Injectable()
export class ApiAuthorizationIamEngine {
	public constructor(private readonly queryPlanner: ApiAuthorizationIamQueryPlanner) {}

	public evaluate<E extends IApiBaseEntity>(options: { action: string; attachments: IApiResolvedPolicyAttachments; documents: ReadonlyArray<IApiPolicyDocumentRecord>; policyNamespace: string; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> }): Promise<IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>>> {
		iamEngineLogger.verbose(`Evaluating IAM authorization for principal "${options.principal.id}" action "${options.action}" with ${options.documents.length} documents.`);

		const resourceString: string = this.resolveResourceString(options.resourceDefinition, options.requestMetadata, options.resource);
		const documentMap: Map<string, IApiPolicyDocumentRecord> = new Map<string, IApiPolicyDocumentRecord>(options.documents.map((document: IApiPolicyDocumentRecord): [string, IApiPolicyDocumentRecord] => [document.id, document]));

		const identityDocuments: ReadonlyArray<IApiPolicyDocumentRecord> = options.attachments.attachments.map((attachment: IApiPolicyAttachment): IApiPolicyDocumentRecord => this.resolveDocumentRecord(attachment.policyId, documentMap, options.policyNamespace));

		const boundaryDocuments: ReadonlyArray<IApiPolicyDocumentRecord> = options.attachments.boundaries.map((attachment: IApiPolicyAttachment): IApiPolicyDocumentRecord => this.resolveDocumentRecord(attachment.policyId, documentMap, options.policyNamespace));

		const identityEvaluation: {
			allowStatements: Array<IApiPolicyStatement>;
			hasExplicitDeny: boolean;
			statementTraces: Array<{
				effect: EApiPolicyEffect;
				isMatched: boolean;
				policyId: string;
				sid?: string;
				sourceType: EApiPolicySourceType;
			}>;
		} = this.evaluateDocumentSet({
			action: options.action,
			documents: identityDocuments,
			principal: options.principal,
			requestMetadata: options.requestMetadata,
			resource: options.resource,
			resourceDefinition: options.resourceDefinition,
			resourceString,
		});

		const boundaryEvaluation: {
			allowStatements: Array<IApiPolicyStatement>;
			hasExplicitDeny: boolean;
			statementTraces: Array<{
				effect: EApiPolicyEffect;
				isMatched: boolean;
				policyId: string;
				sid?: string;
				sourceType: EApiPolicySourceType;
			}>;
		} = this.evaluateDocumentSet({
			action: options.action,
			documents: boundaryDocuments,
			principal: options.principal,
			requestMetadata: options.requestMetadata,
			resource: options.resource,
			resourceDefinition: options.resourceDefinition,
			resourceString,
		});

		const identityScope: {
			isFullyCompilable: boolean;
			scope?: IApiAuthorizationScope<E>;
		} = this.queryPlanner.plan({
			principal: options.principal,
			requestMetadata: options.requestMetadata,
			resource: options.resource,
			resourceDefinition: options.resourceDefinition,
			statements: identityEvaluation.allowStatements,
		});

		const boundaryScope: {
			isFullyCompilable: boolean;
			scope?: IApiAuthorizationScope<E>;
		} =
			boundaryDocuments.length === 0
				? { isFullyCompilable: true, scope: undefined }
				: this.queryPlanner.plan({
						principal: options.principal,
						requestMetadata: options.requestMetadata,
						resource: options.resource,
						resourceDefinition: options.resourceDefinition,
						statements: boundaryEvaluation.allowStatements,
					});

		const statementTraces: Array<{
			effect: EApiPolicyEffect;
			isMatched: boolean;
			policyId: string;
			sid?: string;
			sourceType: EApiPolicySourceType;
		}> = [...identityEvaluation.statementTraces, ...boundaryEvaluation.statementTraces];

		if (identityEvaluation.hasExplicitDeny || boundaryEvaluation.hasExplicitDeny) {
			iamEngineLogger.verbose(`IAM authorization resolved explicit deny for principal "${options.principal.id}" action "${options.action}".`);

			return Promise.resolve(
				this.buildDecision(options, {
					decisionType: EApiAuthorizationDecisionType.EXPLICIT_DENY,
					effect: EApiPolicyEffect.DENY,
					scope: undefined,
					statementTraces,
				}),
			);
		}

		if (identityEvaluation.allowStatements.length === 0 || (boundaryDocuments.length > 0 && boundaryEvaluation.allowStatements.length === 0) || !identityScope.isFullyCompilable || !boundaryScope.isFullyCompilable) {
			iamEngineLogger.verbose(`IAM authorization resolved implicit deny for principal "${options.principal.id}" action "${options.action}".`);

			return Promise.resolve(
				this.buildDecision(options, {
					decisionType: EApiAuthorizationDecisionType.IMPLICIT_DENY,
					effect: EApiPolicyEffect.DENY,
					scope: undefined,
					statementTraces,
				}),
			);
		}

		iamEngineLogger.verbose(`IAM authorization resolved explicit allow for principal "${options.principal.id}" action "${options.action}".`);

		return Promise.resolve(
			this.buildDecision(options, {
				decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW,
				effect: EApiPolicyEffect.ALLOW,
				scope: this.mergeScopes(identityScope.scope, boundaryScope.scope),
				statementTraces,
			}),
		);
	}

	private buildDecision<E extends IApiBaseEntity>(
		options: {
			action: string;
			attachments: IApiResolvedPolicyAttachments;
			documents: ReadonlyArray<IApiPolicyDocumentRecord>;
			policyNamespace: string;
			principal: IApiAuthorizationPrincipal;
			requestMetadata: IApiAuthorizationRequestMetadata<E>;
			resource?: E;
			resourceDefinition: IApiAuthorizationResourceDefinition<E>;
		},
		payload: {
			decisionType: EApiAuthorizationDecisionType;
			effect: EApiPolicyEffect;
			scope: IApiAuthorizationScope<E> | undefined;
			statementTraces: Array<{
				effect: EApiPolicyEffect;
				isMatched: boolean;
				policyId: string;
				sid?: string;
				sourceType: EApiPolicySourceType;
			}>;
		},
	): IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> {
		return {
			action: options.action,
			appliedRules: [],
			effect: payload.effect,
			mode: EApiAuthorizationMode.IAM,
			permissions: [],
			policyId: options.policyNamespace,
			policyIds: options.documents.map((document: IApiPolicyDocumentRecord) => document.id),
			principal: options.principal,
			resource: options.resource,
			resourceType: options.resourceDefinition.resourceType,
			scope: payload.scope,
			trace: {
				attachments: options.attachments.attachments,
				boundaries: options.attachments.boundaries,
				decisionType: payload.decisionType,
				documents: options.documents,
				mode: EApiAuthorizationMode.IAM,
				permissions: [],
				statements: payload.statementTraces,
			},
			transforms: [],
		};
	}

	private evaluateDocumentSet<E extends IApiBaseEntity>(options: {
		action: string;
		documents: ReadonlyArray<IApiPolicyDocumentRecord>;
		principal: IApiAuthorizationPrincipal;
		requestMetadata: IApiAuthorizationRequestMetadata<E>;
		resource?: E;
		resourceDefinition: IApiAuthorizationResourceDefinition<E>;
		resourceString: string;
	}): {
		allowStatements: Array<IApiPolicyStatement>;
		hasExplicitDeny: boolean;
		statementTraces: Array<{
			effect: EApiPolicyEffect;
			isMatched: boolean;
			policyId: string;
			sid?: string;
			sourceType: EApiPolicySourceType;
		}>;
	} {
		const allowStatements: Array<IApiPolicyStatement> = [];

		const statementTraces: Array<{
			effect: EApiPolicyEffect;
			isMatched: boolean;
			policyId: string;
			sid?: string;
			sourceType: EApiPolicySourceType;
		}> = [];

		for (const document of options.documents) {
			for (const statement of document.document.Statement) {
				const isStatementMatched: boolean = this.isStatementMatched({
					action: options.action,
					principal: options.principal,
					requestMetadata: options.requestMetadata,
					resource: options.resource,
					resourceDefinition: options.resourceDefinition,
					resourceString: options.resourceString,
					statement,
				});

				statementTraces.push({
					effect: statement.Effect,
					isMatched: isStatementMatched,
					policyId: document.id,
					sid: statement.Sid,
					sourceType: document.sourceType,
				});

				if (!isStatementMatched) {
					continue;
				}

				if (statement.Effect === EApiPolicyEffect.DENY) {
					return {
						allowStatements,
						hasExplicitDeny: true,
						statementTraces,
					};
				}

				allowStatements.push(statement);
			}
		}

		return {
			allowStatements,
			hasExplicitDeny: false,
			statementTraces,
		};
	}

	private evaluateOperator(operator: string, actualValue: unknown, expectedValue: unknown): boolean {
		switch (operator) {
			case "StringEquals": {
				return this.normalizeComparable(actualValue) === this.normalizeComparable(expectedValue);
			}

			case "StringEqualsIfExists": {
				return actualValue === undefined ? true : this.normalizeComparable(actualValue) === this.normalizeComparable(expectedValue);
			}

			case "StringNotEquals": {
				return this.normalizeComparable(actualValue) !== this.normalizeComparable(expectedValue);
			}

			case "StringNotEqualsIfExists": {
				return actualValue === undefined ? true : this.normalizeComparable(actualValue) !== this.normalizeComparable(expectedValue);
			}

			default: {
				return false;
			}
		}
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return Boolean(value) && typeof value === "object" && !Array.isArray(value);
	}

	private isStatementMatched<E extends IApiBaseEntity>(options: { action: string; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E>; resourceString: string; statement: IApiPolicyStatement }): boolean {
		const isActionMatched: boolean = options.statement.Action.some((pattern: string) => this.matchesWildcardPattern(pattern, options.action));
		const isResourceMatched: boolean = options.statement.Resource.some((pattern: string) => this.matchesWildcardPattern(pattern, options.resourceString));

		if (!isActionMatched || !isResourceMatched) {
			return false;
		}

		if (!options.statement.Condition) {
			return true;
		}

		const condition: Record<string, Record<string, unknown>> = options.statement.Condition;

		for (const [operator, operands] of Object.entries(condition)) {
			for (const [path, rawExpectedValue] of Object.entries(operands)) {
				if (path.startsWith("resource.") && options.resource === undefined) {
					const queryPlan: { isFullyCompilable: boolean; scope?: IApiAuthorizationScope<E> } = this.queryPlanner.plan({
						principal: options.principal,
						requestMetadata: options.requestMetadata,
						resource: options.resource,
						resourceDefinition: options.resourceDefinition,
						statements: [options.statement],
					});

					if (!queryPlan.isFullyCompilable) {
						return false;
					}

					continue;
				}

				const actualValue: unknown = this.resolvePathValue(
					{
						principal: options.principal,
						request: {
							body: options.requestMetadata.body,
							headers: options.requestMetadata.headers,
							ip: options.requestMetadata.ip,
							parameters: options.requestMetadata.parameters,
							query: options.requestMetadata.query,
						},
						resource: options.resource,
					},
					path,
				);

				const expectedValue: unknown = this.resolveConditionValue(rawExpectedValue, {
					principal: options.principal,
					request: {
						body: options.requestMetadata.body,
						headers: options.requestMetadata.headers,
						ip: options.requestMetadata.ip,
						parameters: options.requestMetadata.parameters,
						query: options.requestMetadata.query,
					},
					resource: options.resource as IApiBaseEntity | undefined,
				});

				if (!this.evaluateOperator(operator, actualValue, expectedValue)) {
					return false;
				}
			}
		}

		return true;
	}

	private matchesWildcardPattern(pattern: string, value: string): boolean {
		if (pattern === "*") {
			return true;
		}

		if (!pattern.includes("*")) {
			return pattern === value;
		}

		if (!pattern.endsWith("*")) {
			return false;
		}

		return value.startsWith(pattern.slice(0, -1));
	}

	private mergeScopes<E extends IApiBaseEntity>(baseScope: IApiAuthorizationScope<E> | undefined, additionalScope: IApiAuthorizationScope<E> | undefined): IApiAuthorizationScope<E> | undefined {
		if (!baseScope) {
			return additionalScope;
		}

		if (!additionalScope) {
			return baseScope;
		}

		return {
			...baseScope,
			...additionalScope,
			where: AuthorizationScopeMergeWhere(baseScope.where, additionalScope.where),
		};
	}

	private normalizeComparable(value: unknown): string {
		if (value === undefined || value === null) {
			return "";
		}

		if (typeof value === "string") {
			return value;
		}

		if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
			return value.toString();
		}

		return "";
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

	private resolveDocumentRecord(policyId: string, documentMap: Map<string, IApiPolicyDocumentRecord>, policyNamespace: string): IApiPolicyDocumentRecord {
		const document: IApiPolicyDocumentRecord | undefined = documentMap.get(policyId);

		if (!document) {
			iamEngineLogger.error(`Policy document "${policyId}" is not available for IAM evaluation`);

			throw ErrorException(`Policy document "${policyId}" is not available for IAM evaluation`);
		}

		if (document.namespace !== policyNamespace) {
			iamEngineLogger.error(`Policy document "${policyId}" namespace "${document.namespace}" does not match required namespace "${policyNamespace}"`);

			throw ErrorException(`Policy document "${policyId}" namespace "${document.namespace}" does not match required namespace "${policyNamespace}"`);
		}

		return document;
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

	private resolveResourceString<E extends IApiBaseEntity>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, requestMetadata: IApiAuthorizationRequestMetadata<E>, resource: E | undefined): string {
		const resourceSource: Record<string, unknown> = {
			...(this.isRecord(resource) ? (resource as Record<string, unknown>) : {}),
			...(this.isRecord(requestMetadata.parameters) ? (requestMetadata.parameters as Record<string, unknown>) : {}),
		};

		return resourceDefinition.resourcePath.replaceAll(/\{([\w.-]+)\}/g, (_match: string, key: string) => {
			const resolvedValue: unknown = resourceSource[key];

			return typeof resolvedValue === "string" && resolvedValue.length > 0 ? resolvedValue : "*";
		});
	}
}
