import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision, IApiAuthorizationIamDenyExclusion, IApiAuthorizationIamResourceConstraint, IApiAuthorizationIamResourceSegment, IApiAuthorizationIamStatementMatch, IApiAuthorizationPrincipal, IApiAuthorizationRequestMetadata, IApiAuthorizationResourceDefinition, IApiAuthorizationScope, IApiPolicyAttachment, IApiPolicyDocumentRecord, IApiPolicyStatement, IApiResolvedPolicyAttachments } from "@interface/class/api/authorization";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

import { ApiAuthorizationIamQueryPlanner } from "@class/api/authorization/iam/query-planner.class";
import { AUTHORIZATION_IAM_SCOPE_CONSTANT } from "@constant/class/authorization";
import { EApiAuthorizationDecisionType, EApiAuthorizationMode, EApiPolicyConditionOperator, EApiPolicyEffect, EApiPolicySourceType } from "@enum/class/authorization";
import { EApiRouteType } from "@enum/decorator/api";
import { Injectable } from "@nestjs/common";
import { AuthorizationScopeMergeWhere } from "@utility/authorization";
import { EnumIsValue } from "@utility/enum/is-value.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

const iamEngineLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationIamEngine");

@Injectable()
export class ApiAuthorizationIamEngine {
	public constructor(private readonly queryPlanner: ApiAuthorizationIamQueryPlanner) {}

	public evaluate<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(options: {
		action: string;
		attachments: IApiResolvedPolicyAttachments;
		documents: ReadonlyArray<IApiPolicyDocumentRecord>;
		policyNamespace: string;
		principal: IApiAuthorizationPrincipal;
		requestMetadata: IApiAuthorizationRequestMetadata<E, M>;
		resource?: E;
		resourceDefinition: IApiAuthorizationResourceDefinition<E>;
		routeType?: EApiRouteType;
	}): Promise<IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>>> {
		iamEngineLogger.verbose(`Evaluating IAM authorization for principal "${options.principal.id}" action "${options.action}" with ${options.documents.length} documents.`);

		const resourceSegments: Array<IApiAuthorizationIamResourceSegment> = this.resolveResourceSegments(options.resourceDefinition, options.requestMetadata, options.resource);
		const isCreateRequest: boolean = options.routeType === EApiRouteType.CREATE || (options.routeType === undefined && options.action === `${options.policyNamespace}:create`);
		const isListRequest: boolean = options.routeType === EApiRouteType.GET_LIST || (options.routeType === undefined && options.action === `${options.policyNamespace}:list`);
		const documentMap: Map<string, IApiPolicyDocumentRecord> = new Map<string, IApiPolicyDocumentRecord>(options.documents.map((document: IApiPolicyDocumentRecord): [string, IApiPolicyDocumentRecord] => [document.id, document]));

		const identityDocuments: ReadonlyArray<IApiPolicyDocumentRecord> = options.attachments.attachments.map((attachment: IApiPolicyAttachment): IApiPolicyDocumentRecord => this.resolveDocumentRecord(attachment.policyId, documentMap, options.policyNamespace));

		const boundaryDocuments: ReadonlyArray<IApiPolicyDocumentRecord> = options.attachments.boundaries.map((attachment: IApiPolicyAttachment): IApiPolicyDocumentRecord => this.resolveDocumentRecord(attachment.policyId, documentMap, options.policyNamespace));

		const identityEvaluation: {
			allowStatements: Array<IApiPolicyStatement>;
			denyExclusions: Array<IApiAuthorizationIamDenyExclusion>;
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
			isCreateRequest,
			isListRequest,
			principal: options.principal,
			requestMetadata: options.requestMetadata,
			resource: options.resource,
			resourceDefinition: options.resourceDefinition,
			resourceSegments,
		});

		const boundaryEvaluation: {
			allowStatements: Array<IApiPolicyStatement>;
			denyExclusions: Array<IApiAuthorizationIamDenyExclusion>;
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
			isCreateRequest,
			isListRequest,
			principal: options.principal,
			requestMetadata: options.requestMetadata,
			resource: options.resource,
			resourceDefinition: options.resourceDefinition,
			resourceSegments,
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

		const exclusionScope: {
			isFullyCompilable: boolean;
			scope?: IApiAuthorizationScope<E>;
		} = this.queryPlanner.planExclusion({
			exclusions: [...identityEvaluation.denyExclusions, ...boundaryEvaluation.denyExclusions],
			principal: options.principal,
			requestMetadata: options.requestMetadata,
			resource: options.resource,
			resourceDefinition: options.resourceDefinition,
		});

		if (identityEvaluation.hasExplicitDeny || boundaryEvaluation.hasExplicitDeny || !exclusionScope.isFullyCompilable) {
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

		const scope: IApiAuthorizationScope<E> | undefined = this.mergeScopes(this.mergeScopes(identityScope.scope, boundaryScope.scope), exclusionScope.scope);

		if (exclusionScope.scope && Array.isArray(scope?.where) && scope.where.length > AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES) {
			iamEngineLogger.warn(`IAM authorization resolved explicit deny for principal "${options.principal.id}" action "${options.action}": the scope exceeds ${AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES} where branches.`);

			return Promise.resolve(
				this.buildDecision(options, {
					decisionType: EApiAuthorizationDecisionType.EXPLICIT_DENY,
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
				scope,
				statementTraces,
			}),
		);
	}

	private buildDecision<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(
		options: {
			action: string;
			attachments: IApiResolvedPolicyAttachments;
			documents: ReadonlyArray<IApiPolicyDocumentRecord>;
			policyNamespace: string;
			principal: IApiAuthorizationPrincipal;
			requestMetadata: IApiAuthorizationRequestMetadata<E, M>;
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

	private evaluateDocumentSet<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(options: {
		action: string;
		documents: ReadonlyArray<IApiPolicyDocumentRecord>;
		isCreateRequest: boolean;
		isListRequest: boolean;
		principal: IApiAuthorizationPrincipal;
		requestMetadata: IApiAuthorizationRequestMetadata<E, M>;
		resource?: E;
		resourceDefinition: IApiAuthorizationResourceDefinition<E>;
		resourceSegments: ReadonlyArray<IApiAuthorizationIamResourceSegment>;
	}): {
		allowStatements: Array<IApiPolicyStatement>;
		denyExclusions: Array<IApiAuthorizationIamDenyExclusion>;
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
		const denyExclusions: Array<IApiAuthorizationIamDenyExclusion> = [];

		const statementTraces: Array<{
			effect: EApiPolicyEffect;
			isMatched: boolean;
			policyId: string;
			sid?: string;
			sourceType: EApiPolicySourceType;
		}> = [];

		for (const document of options.documents) {
			for (const statement of document.document.Statement) {
				const statementMatch: IApiAuthorizationIamStatementMatch = this.matchStatement({
					action: options.action,
					isCreateRequest: options.isCreateRequest,
					isListRequest: options.isListRequest,
					principal: options.principal,
					requestMetadata: options.requestMetadata,
					resource: options.resource,
					resourceDefinition: options.resourceDefinition,
					resourceSegments: options.resourceSegments,
					statement,
				});

				statementTraces.push({
					effect: statement.Effect,
					isMatched: statementMatch.isMatched,
					policyId: document.id,
					sid: statement.Sid,
					sourceType: document.sourceType,
				});

				if (!statementMatch.isMatched) {
					continue;
				}

				if (statement.Effect === EApiPolicyEffect.ALLOW) {
					allowStatements.push(statement);

					continue;
				}

				if (!statementMatch.exclusions) {
					return {
						allowStatements,
						denyExclusions,
						hasExplicitDeny: true,
						statementTraces,
					};
				}

				denyExclusions.push(...statementMatch.exclusions);
			}
		}

		return {
			allowStatements,
			denyExclusions,
			hasExplicitDeny: false,
			statementTraces,
		};
	}

	private evaluateOperator(operator: EApiPolicyConditionOperator, actualValue: unknown, expectedValue: unknown): boolean {
		switch (operator) {
			case EApiPolicyConditionOperator.STRING_EQUALS: {
				return this.normalizeComparable(actualValue) === this.normalizeComparable(expectedValue);
			}

			case EApiPolicyConditionOperator.STRING_EQUALS_IF_EXISTS: {
				return actualValue === undefined ? true : this.normalizeComparable(actualValue) === this.normalizeComparable(expectedValue);
			}

			case EApiPolicyConditionOperator.STRING_NOT_EQUALS: {
				return this.normalizeComparable(actualValue) !== this.normalizeComparable(expectedValue);
			}

			case EApiPolicyConditionOperator.STRING_NOT_EQUALS_IF_EXISTS: {
				return actualValue === undefined ? true : this.normalizeComparable(actualValue) !== this.normalizeComparable(expectedValue);
			}
		}
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

	/**
	 * Matches one statement against the request. A matched Deny denies the whole request, unless the resource is not
	 * loaded yet: then its `resource.*` keys and, for list requests, its row-scoped Resource patterns become row
	 * exclusions that the query planner compiles.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {object} options - Matching options.
	 * @param {string} options.action - Namespaced IAM action.
	 * @param {boolean} options.isCreateRequest - Whether the request creates a resource.
	 * @param {boolean} options.isListRequest - Whether the request lists resources.
	 * @param {IApiAuthorizationPrincipal} options.principal - Evaluated principal.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} options.requestMetadata - Request metadata.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceSegment>} options.resourceSegments - Request resource segments.
	 * @param {IApiPolicyStatement} options.statement - Statement to match.
	 * @returns {IApiAuthorizationIamStatementMatch} Match result; a matched Deny without exclusions denies the whole request.
	 */
	private matchStatement<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(options: {
		action: string;
		isCreateRequest: boolean;
		isListRequest: boolean;
		principal: IApiAuthorizationPrincipal;
		requestMetadata: IApiAuthorizationRequestMetadata<E, M>;
		resource?: E;
		resourceDefinition: IApiAuthorizationResourceDefinition<E>;
		resourceSegments: ReadonlyArray<IApiAuthorizationIamResourceSegment>;
		statement: IApiPolicyStatement;
	}): IApiAuthorizationIamStatementMatch {
		const isActionMatched: boolean = options.statement.Action.some((pattern: string) => this.matchesWildcardPattern(pattern, options.action));

		if (!isActionMatched) {
			return { isMatched: false };
		}

		const isDeny: boolean = options.statement.Effect === EApiPolicyEffect.DENY;
		const resourceString: string = options.resourceSegments.map((segment: IApiAuthorizationIamResourceSegment): string => segment.value).join("");
		const isResourceMatched: boolean = options.statement.Resource.some((pattern: string) => this.matchesWildcardPattern(pattern, resourceString));
		const resourceConstraintSets: Array<ReadonlyArray<IApiAuthorizationIamResourceConstraint>> = isResourceMatched ? [[]] : [];
		let isResourceMappable: boolean = true;

		if (!isResourceMatched && isDeny && options.resource === undefined && options.isListRequest) {
			for (const pattern of options.statement.Resource) {
				const patternMatch: { constraints: Array<IApiAuthorizationIamResourceConstraint>; isMappable: boolean } | undefined = this.resolveResourcePatternConstraints(pattern, options.resourceSegments);

				if (patternMatch) {
					isResourceMappable &&= patternMatch.isMappable;
					resourceConstraintSets.push(patternMatch.constraints);
				}
			}
		}

		if (resourceConstraintSets.length === 0) {
			return { isMatched: false };
		}

		const evaluationContext: {
			principal: IApiAuthorizationPrincipal;
			request: {
				body?: unknown;
				headers?: Record<string, string>;
				ip?: string;
				parameters?: unknown;
				query?: unknown;
			};
			resource?: IApiBaseEntity;
		} = {
			principal: options.principal,
			request: {
				body: options.requestMetadata.body,
				headers: options.requestMetadata.headers,
				ip: options.requestMetadata.ip,
				parameters: options.requestMetadata.parameters,
				query: options.requestMetadata.query,
			},
			resource: options.resource,
		};

		let hasResourceCondition: boolean = false;

		for (const [operator, operands] of Object.entries(options.statement.Condition ?? {})) {
			for (const [path, rawExpectedValue] of Object.entries(operands)) {
				if (path.startsWith("resource.") && options.resource === undefined) {
					hasResourceCondition = true;

					continue;
				}

				// Validated documents only carry known operators; an unknown one still fails closed: it holds for a Deny and fails an Allow.
				if (!EnumIsValue(EApiPolicyConditionOperator, operator)) {
					if (isDeny) {
						continue;
					}

					return { isMatched: false };
				}

				if (!this.evaluateOperator(operator, this.resolvePathValue(evaluationContext, path), this.resolveConditionValue(rawExpectedValue, evaluationContext))) {
					return { isMatched: false };
				}
			}
		}

		if (!isDeny) {
			return {
				isMatched:
					!hasResourceCondition ||
					this.queryPlanner.plan({
						principal: options.principal,
						requestMetadata: options.requestMetadata,
						resource: options.resource,
						resourceDefinition: options.resourceDefinition,
						statements: [options.statement],
					}).isFullyCompilable,
			};
		}

		const isWholeRequestDeny: boolean = !isResourceMappable || (hasResourceCondition ? options.isCreateRequest : resourceConstraintSets.some((constraints: ReadonlyArray<IApiAuthorizationIamResourceConstraint>): boolean => constraints.length === 0));

		if (isWholeRequestDeny) {
			return { isMatched: true };
		}

		return {
			exclusions: resourceConstraintSets.map((resourceConstraints: ReadonlyArray<IApiAuthorizationIamResourceConstraint>) => ({ resourceConstraints, statement: options.statement })),
			isMatched: true,
		};
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

	/**
	 * Maps a Deny resource pattern onto the unresolved placeholders of a collection resource.
	 * @param {string} pattern - Statement Resource pattern that does not match the collection resource string.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceSegment>} segments - Collection resource segments.
	 * @returns {{ constraints: Array<IApiAuthorizationIamResourceConstraint>; isMappable: boolean } | undefined} Placeholder constraints of the rows the pattern covers, `isMappable: false` when the placeholder values are ambiguous, or undefined when no row can match.
	 */
	private resolveResourcePatternConstraints(pattern: string, segments: ReadonlyArray<IApiAuthorizationIamResourceSegment>): { constraints: Array<IApiAuthorizationIamResourceConstraint>; isMappable: boolean } | undefined {
		const isPrefixPattern: boolean = pattern.endsWith("*");
		const constraints: Array<IApiAuthorizationIamResourceConstraint> = [];
		let remainder: string = isPrefixPattern ? pattern.slice(0, -1) : pattern;

		if (remainder.includes("*")) {
			return undefined;
		}

		for (const [index, segment] of segments.entries()) {
			if (segment.placeholder === undefined) {
				if (remainder.startsWith(segment.value)) {
					remainder = remainder.slice(segment.value.length);

					continue;
				}

				return isPrefixPattern && segment.value.startsWith(remainder) ? { constraints, isMappable: true } : undefined;
			}

			const nextSegment: IApiAuthorizationIamResourceSegment | undefined = segments[index + 1];

			if (!nextSegment) {
				if (remainder.length > 0) {
					constraints.push({ isPrefix: isPrefixPattern, placeholder: segment.placeholder, value: remainder });
				}

				return remainder.length > 0 || isPrefixPattern ? { constraints, isMappable: true } : undefined;
			}

			if (nextSegment.placeholder !== undefined) {
				return { constraints, isMappable: false };
			}

			if (isPrefixPattern) {
				const slotPrefix: string = remainder;
				const isSeparatorReachable: boolean = Array.from({ length: slotPrefix.length }, (_value: unknown, offset: number): string => slotPrefix.slice(offset)).some((suffix: string): boolean => suffix.includes(nextSegment.value) || nextSegment.value.startsWith(suffix));

				if (isSeparatorReachable) {
					return { constraints, isMappable: false };
				}

				constraints.push({ isPrefix: true, placeholder: segment.placeholder, value: remainder });

				return { constraints, isMappable: true };
			}

			const separatorIndex: number = remainder.indexOf(nextSegment.value);

			if (separatorIndex <= 0) {
				return undefined;
			}

			if (remainder.includes(nextSegment.value, separatorIndex + 1)) {
				return { constraints, isMappable: false };
			}

			constraints.push({ isPrefix: false, placeholder: segment.placeholder, value: remainder.slice(0, separatorIndex) });
			remainder = remainder.slice(separatorIndex);
		}

		return remainder.length === 0 ? { constraints, isMappable: true } : undefined;
	}

	/**
	 * Splits the resource path into literal segments and placeholders; placeholders resolved from the resource or
	 * request parameters become literals, unresolved ones keep their name and render as `*`.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} requestMetadata - Request metadata.
	 * @param {E | undefined} resource - Loaded resource, when available.
	 * @returns {Array<IApiAuthorizationIamResourceSegment>} Resource segments with adjacent literals merged.
	 */
	private resolveResourceSegments<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, requestMetadata: IApiAuthorizationRequestMetadata<E, M>, resource: E | undefined): Array<IApiAuthorizationIamResourceSegment> {
		const resourceSource: Record<string, unknown> = {
			...(this.isRecord(resource) ? resource : {}),
			...(this.isRecord(requestMetadata.parameters) ? requestMetadata.parameters : {}),
		};

		const segments: Array<IApiAuthorizationIamResourceSegment> = [];

		const appendLiteral: (value: string) => void = (value: string): void => {
			const lastSegment: IApiAuthorizationIamResourceSegment | undefined = segments.at(-1);

			if (value.length === 0) {
				return;
			}

			if (lastSegment && lastSegment.placeholder === undefined) {
				lastSegment.value += value;
			} else {
				segments.push({ value });
			}
		};

		let literalStart: number = 0;

		for (const match of resourceDefinition.resourcePath.matchAll(/\{([\w.-]+)\}/g)) {
			const placeholder: string = match[1] ?? "";
			const resolvedValue: unknown = resourceSource[placeholder];

			appendLiteral(resourceDefinition.resourcePath.slice(literalStart, match.index));

			if (typeof resolvedValue === "string" && resolvedValue.length > 0) {
				appendLiteral(resolvedValue);
			} else {
				segments.push({ placeholder, value: "*" });
			}

			literalStart = match.index + match[0].length;
		}

		appendLiteral(resourceDefinition.resourcePath.slice(literalStart));

		return segments;
	}
}
