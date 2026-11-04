import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type {
	IApiAuthorizationDecision,
	IApiAuthorizationIamCondition,
	IApiAuthorizationIamConditionValue,
	IApiAuthorizationIamDenyExclusion,
	IApiAuthorizationIamPattern,
	IApiAuthorizationIamResourceConstraint,
	IApiAuthorizationIamResourceSegment,
	IApiAuthorizationIamStatement,
	IApiAuthorizationIamStatementMatch,
	IApiAuthorizationIamToken,
	IApiAuthorizationPrincipal,
	IApiAuthorizationRequestMetadata,
	IApiAuthorizationResourceDefinition,
	IApiAuthorizationScope,
	IApiPolicyAttachment,
	IApiPolicyDocumentRecord,
	IApiPolicyStatement,
	IApiResolvedPolicyAttachments,
} from "@interface/class/api/authorization";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

import { ApiAuthorizationIamGlob } from "@class/api/authorization/iam/glob.class";
import { ApiAuthorizationIamParser } from "@class/api/authorization/iam/parser.class";
import { ApiAuthorizationIamQueryPlanner } from "@class/api/authorization/iam/query-planner.class";
import { ApiAuthorizationIamVariable } from "@class/api/authorization/iam/variable.class";
import { AUTHORIZATION_IAM_SCOPE_CONSTANT } from "@constant/class/authorization";
import { EApiAuthorizationDecisionType, EApiAuthorizationIamTokenType, EApiAuthorizationMode, EApiPolicyEffect, EApiPolicySourceType } from "@enum/class/authorization";
import { EApiRouteType } from "@enum/decorator/api";
import { Injectable } from "@nestjs/common";
import { AuthorizationScopeMergeWhere } from "@utility/authorization";
import { AuthorizationIamReadQueryField } from "@utility/authorization/iam-query-field.utility";
import { AuthorizationIsCreateRoute } from "@utility/authorization/is-create-route.utility";
import { AuthorizationIsListRoute } from "@utility/authorization/is-list-route.utility";
import { AuthorizationSerializeValue } from "@utility/authorization/serialize-value.utility";
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
		const isCreateRequest: boolean = AuthorizationIsCreateRoute(options.routeType, options.action, options.policyNamespace);
		const isListRequest: boolean = AuthorizationIsListRoute(options.routeType, options.action, options.policyNamespace);
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

	/**
	 * Evaluates one String condition key in memory: both sides compare as canonical text, a missing or null value as an
	 * empty string. `IfExists` holds for a missing value; a negated operator holds where the positive one fails.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {unknown} actualValue - Value the key reads.
	 * @param {unknown} expectedValue - Resolved condition value.
	 * @returns {boolean} Whether the key holds.
	 */
	private evaluateOperator(condition: IApiAuthorizationIamCondition, actualValue: unknown, expectedValue: unknown): boolean {
		if (condition.isIfExists && actualValue === undefined) {
			return true;
		}

		const isEqual: boolean = this.normalizeComparable(actualValue) === this.normalizeComparable(expectedValue);

		return condition.isNegated ? !isEqual : isEqual;
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return Boolean(value) && typeof value === "object" && !Array.isArray(value);
	}

	/**
	 * Tells whether a condition value is a `${resource.*}` variable.
	 * @param {IApiAuthorizationIamConditionValue} value - Condition value read by the grammar.
	 * @returns {boolean} Whether the value reads the resource.
	 */
	private isResourceVariable(value: IApiAuthorizationIamConditionValue): boolean {
		return value.parts.some((part: IApiAuthorizationIamToken): boolean => part.type === EApiAuthorizationIamTokenType.VARIABLE && (part.variable?.path.startsWith("resource.") ?? false));
	}

	/**
	 * Tells whether a value has no text to compare although it is present: a list, an object, or an invalid date.
	 * @param {unknown} value - Value a condition key reads.
	 * @returns {boolean} Whether the value is structured.
	 */
	private isStructuredValue(value: unknown): boolean {
		return typeof value === "object" && value !== null && AuthorizationSerializeValue(value) === undefined;
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
		const statement: IApiAuthorizationIamStatement = ApiAuthorizationIamParser.readStatement(options.statement);
		const isDeny: boolean = statement.effect === EApiPolicyEffect.DENY;
		// Allow and Deny patterns are globs alike: `*` and `?` anywhere, so neither matches less or more than it says.
		const isActionMatched: boolean = statement.action.patterns.some((pattern: IApiAuthorizationIamPattern): boolean => ApiAuthorizationIamGlob.isMatched(pattern.tokens, options.action));

		if (!isActionMatched) {
			return { isMatched: false };
		}

		// An unresolved placeholder may hold any value, so only a pattern that covers every value matches the whole collection.
		const isResourceMatched: boolean = statement.resource.patterns.some((pattern: IApiAuthorizationIamPattern): boolean => ApiAuthorizationIamGlob.isCovering(pattern.tokens, options.resourceSegments));
		const resourceConstraintSets: Array<ReadonlyArray<IApiAuthorizationIamResourceConstraint>> = isResourceMatched ? [[]] : [];
		let isResourceMappable: boolean = true;

		if (!isResourceMatched && isDeny && options.resource === undefined && (options.isListRequest || options.isCreateRequest)) {
			for (const pattern of statement.resource.patterns) {
				const literalPrefix: { isPrefix: boolean; value: string } | undefined = ApiAuthorizationIamGlob.readLiteralPrefix(pattern.tokens);

				// A create names no row, so only a pattern with a wildcard before its end, which cannot be mapped, applies to it.
				if (!options.isListRequest && literalPrefix) {
					continue;
				}

				const patternMatch: { constraints: Array<IApiAuthorizationIamResourceConstraint>; isMappable: boolean } | undefined = literalPrefix ? this.resolveResourcePatternConstraints(literalPrefix, options.resourceSegments) : this.resolveWildcardPatternMatch(pattern, options.resourceSegments);

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

		for (const condition of statement.conditions) {
			const path: string = condition.key;

			if (path.startsWith("resource.") && options.resource === undefined) {
				hasResourceCondition = true;

				continue;
			}

			// The grammar gives a key one value until several values reach the engine.
			const conditionValue: IApiAuthorizationIamConditionValue | undefined = condition.values[0];

			// A `${resource.*}` value has no resource to read before the row is loaded, so it fails closed: it holds for a Deny and fails an Allow.
			if (!conditionValue || (options.resource === undefined && this.isResourceVariable(conditionValue))) {
				if (isDeny) {
					continue;
				}

				return { isMatched: false };
			}

			const expectedValue: unknown = ApiAuthorizationIamVariable.resolveValue(conditionValue, evaluationContext);

			// A variable that resolves to a list or an object has no text to compare, so it fails closed; one that resolves to null still compares as "".
			if (typeof expectedValue === "object" && expectedValue !== null && !(expectedValue instanceof Date)) {
				if (isDeny) {
					continue;
				}

				return { isMatched: false };
			}

			const actualValue: { isDeclared: boolean; isReadable: boolean; value?: unknown } = path.startsWith("resource.") ? this.readResourceValue(options.resourceDefinition, options.resource, path) : { isDeclared: true, isReadable: true, value: this.resolvePathValue(evaluationContext, path) };

			// A `resource.*` key with no field mapping, or one through a to-many relation, has no single column, so it fails closed as the SQL scope does: it holds for a Deny and fails an Allow.
			if (!actualValue.isReadable) {
				if (isDeny) {
					continue;
				}

				return { isMatched: false };
			}

			// A list or object value, such as `principal.roles`, has no one text to compare, so the key fails closed: it holds for a Deny and fails an Allow.
			if (this.isStructuredValue(actualValue.value)) {
				if (isDeny) {
					continue;
				}

				return { isMatched: false };
			}

			if (!this.evaluateOperator(condition, actualValue.value, expectedValue)) {
				return { isMatched: false };
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

	/**
	 * Writes a condition operand as the canonical text the condition compares, so a typed resource value and the text of a path value compare equal.
	 * @param {unknown} value - Request, resource or principal value.
	 * @returns {string} Canonical text, or an empty string for a missing or null value.
	 */
	private normalizeComparable(value: unknown): string {
		return AuthorizationSerializeValue(value) ?? "";
	}

	/**
	 * Reads a `resource.*` path from a loaded resource through the query path its field mapping declares, the same
	 * column the SQL scope compares. A path through a relation the resource does not carry reads as missing. A path
	 * through a `OneToMany` or `ManyToMany` relation reads a list, which no scope compares as one value, so it is not readable.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition with the field mappings.
	 * @param {E | undefined} resource - Loaded resource.
	 * @param {string} path - `resource.*` condition path or placeholder path.
	 * @returns {{ isDeclared: boolean; isReadable: boolean; value?: unknown }} The value at the field's query path, whether a field maps the path, and whether its value is one comparable value.
	 */
	private readResourceValue<E extends IApiBaseEntity>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, resource: E | undefined, path: string): { isDeclared: boolean; isReadable: boolean; value?: unknown } {
		const field: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = resourceDefinition.fields.find((candidate: IApiAuthorizationResourceDefinition<E>["fields"][number]): boolean => candidate.path === path);

		if (!field) {
			return { isDeclared: false, isReadable: false };
		}

		if (AuthorizationIamReadQueryField(resourceDefinition.entity, field.queryPath).collectionPath !== undefined) {
			return { isDeclared: true, isReadable: false };
		}

		return { isDeclared: true, isReadable: true, value: this.resolvePathValue(resource, field.queryPath) };
	}

	/**
	 * Renders a resource or path value into its resource-string form, with the same canonical text that `request.parameters` carries.
	 * @param {unknown} value - Resource field or path value.
	 * @returns {string | undefined} Rendered value, or undefined when the value is empty or has no text form.
	 */
	private renderResourceValue(value: unknown): string | undefined {
		const text: string | undefined = AuthorizationSerializeValue(value);

		return text === "" ? undefined : text;
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
	 * Maps a literal Deny resource pattern, optionally ending with one `*`, onto the unresolved placeholders of a collection resource.
	 * @param {object} pattern - Literal form of a Resource pattern that does not cover the collection.
	 * @param {boolean} pattern.isPrefix - Whether a trailing `*` makes the text a prefix.
	 * @param {string} pattern.value - Literal text of the pattern.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceSegment>} segments - Collection resource segments.
	 * @returns {{ constraints: Array<IApiAuthorizationIamResourceConstraint>; isMappable: boolean } | undefined} Placeholder constraints of the rows the pattern covers, `isMappable: false` when the placeholder values are ambiguous, or undefined when no row can match.
	 */
	private resolveResourcePatternConstraints(pattern: { isPrefix: boolean; value: string }, segments: ReadonlyArray<IApiAuthorizationIamResourceSegment>): { constraints: Array<IApiAuthorizationIamResourceConstraint>; isMappable: boolean } | undefined {
		const isPrefixPattern: boolean = pattern.isPrefix;
		const constraints: Array<IApiAuthorizationIamResourceConstraint> = [];
		let remainder: string = pattern.value;

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
	 * request parameters become literals, unresolved ones keep their name and render as `*`. A request parameter of the
	 * placeholder's name wins; otherwise a placeholder that names a field reads the resource through its query path, as
	 * the SQL scope does, and any other placeholder reads the resource property of its name.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} requestMetadata - Request metadata.
	 * @param {E | undefined} resource - Loaded resource, when available.
	 * @returns {Array<IApiAuthorizationIamResourceSegment>} Resource segments with adjacent literals merged.
	 */
	private resolveResourceSegments<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, requestMetadata: IApiAuthorizationRequestMetadata<E, M>, resource: E | undefined): Array<IApiAuthorizationIamResourceSegment> {
		const parameters: Record<string, unknown> = this.isRecord(requestMetadata.parameters) ? requestMetadata.parameters : {};

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
			const resourceValue: { isDeclared: boolean; isReadable: boolean; value?: unknown } = this.readResourceValue(resourceDefinition, resource, `resource.${placeholder}`);
			let resolvedValue: unknown;

			if (Object.prototype.hasOwnProperty.call(parameters, placeholder)) {
				resolvedValue = parameters[placeholder];
			} else if (resourceValue.isDeclared) {
				resolvedValue = resourceValue.value;
			} else {
				resolvedValue = this.isRecord(resource) ? (resource as Record<string, unknown>)[placeholder] : undefined;
			}

			appendLiteral(resourceDefinition.resourcePath.slice(literalStart, match.index));

			const renderedValue: string | undefined = this.renderResourceValue(resolvedValue);

			if (renderedValue) {
				appendLiteral(renderedValue);
			} else {
				segments.push({ placeholder, value: "*" });
			}

			literalStart = match.index + match[0].length;
		}

		appendLiteral(resourceDefinition.resourcePath.slice(literalStart));

		return segments;
	}

	/**
	 * Matches a Deny resource pattern with a `*` before its end, or any `?`, against a collection resource. Such a
	 * wildcard can span literals and placeholders alike, so it never maps to rows: when some row can match it the whole
	 * request is denied.
	 * @param {IApiAuthorizationIamPattern} pattern - Resource pattern that does not cover the collection.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceSegment>} segments - Collection resource segments.
	 * @returns {{ constraints: Array<IApiAuthorizationIamResourceConstraint>; isMappable: boolean } | undefined} A not mappable match when some row can match the pattern, or undefined when no row can.
	 */
	private resolveWildcardPatternMatch(pattern: IApiAuthorizationIamPattern, segments: ReadonlyArray<IApiAuthorizationIamResourceSegment>): { constraints: Array<IApiAuthorizationIamResourceConstraint>; isMappable: boolean } | undefined {
		return ApiAuthorizationIamGlob.isOverlapping(pattern.tokens, segments) ? { constraints: [], isMappable: false } : undefined;
	}
}
