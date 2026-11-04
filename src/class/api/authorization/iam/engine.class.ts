import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type {
	IApiAuthorizationDecision,
	IApiAuthorizationIamCondition,
	IApiAuthorizationIamDenyExclusion,
	IApiAuthorizationIamDialect,
	IApiAuthorizationIamOperand,
	IApiAuthorizationIamPattern,
	IApiAuthorizationIamQueryField,
	IApiAuthorizationIamResourceClassification,
	IApiAuthorizationIamResourceConstraint,
	IApiAuthorizationIamResourceRows,
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
import { ApiAuthorizationIamOperator } from "@class/api/authorization/iam/operator.class";
import { ApiAuthorizationIamParser } from "@class/api/authorization/iam/parser.class";
import { ApiAuthorizationIamQueryPlanner } from "@class/api/authorization/iam/query-planner.class";
import { ApiAuthorizationIamResourcePattern } from "@class/api/authorization/iam/resource-pattern.class";
import { ApiAuthorizationIamVariable } from "@class/api/authorization/iam/variable.class";
import { AUTHORIZATION_IAM_SCOPE_CONSTANT } from "@constant/class/authorization";
import { EApiAuthorizationDecisionType, EApiAuthorizationIamResourceClass, EApiAuthorizationMode, EApiPolicyConditionOperatorFamily, EApiPolicyEffect, EApiPolicySourceType } from "@enum/class/authorization";
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

	/**
	 * Evaluates the IAM documents of a principal for one request.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {object} options - Evaluation options.
	 * @param {string} options.action - Namespaced IAM action.
	 * @param {IApiResolvedPolicyAttachments} options.attachments - Identity and boundary attachments of the principal.
	 * @param {IApiAuthorizationIamDialect} [options.dialect] - SQL dialect of the resource entity, which the query scopes are lowered to; portable when absent.
	 * @param {ReadonlyArray<IApiPolicyDocumentRecord>} options.documents - Attached policy documents.
	 * @param {string} options.policyNamespace - Policy namespace of the resource.
	 * @param {IApiAuthorizationPrincipal} options.principal - Evaluated principal.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} options.requestMetadata - Request metadata.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition.
	 * @param {EApiRouteType} [options.routeType] - Route type of the request.
	 * @returns {Promise<IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>>>} The decision with its scope.
	 */
	public evaluate<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(options: {
		action: string;
		attachments: IApiResolvedPolicyAttachments;
		dialect?: IApiAuthorizationIamDialect;
		documents: ReadonlyArray<IApiPolicyDocumentRecord>;
		policyNamespace: string;
		principal: IApiAuthorizationPrincipal;
		requestMetadata: IApiAuthorizationRequestMetadata<E, M>;
		resource?: E;
		resourceDefinition: IApiAuthorizationResourceDefinition<E>;
		routeType?: EApiRouteType;
	}): Promise<IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>>> {
		iamEngineLogger.verbose(`Evaluating IAM authorization for principal "${options.principal.id}" action "${options.action}" with ${options.documents.length} documents.`);

		// One request reads one time, so every key and scope of it compares with the same instant.
		const requestMetadata: IApiAuthorizationRequestMetadata<E, M> = options.requestMetadata.time ? options.requestMetadata : { ...options.requestMetadata, time: new Date() };
		const resourceSegments: Array<IApiAuthorizationIamResourceSegment> = this.resolveResourceSegments(options.resourceDefinition, requestMetadata, options.resource);
		const isCreateRequest: boolean = AuthorizationIsCreateRoute(options.routeType, options.action, options.policyNamespace);
		const isListRequest: boolean = AuthorizationIsListRoute(options.routeType, options.action, options.policyNamespace);
		const documentMap: Map<string, IApiPolicyDocumentRecord> = new Map<string, IApiPolicyDocumentRecord>(options.documents.map((document: IApiPolicyDocumentRecord): [string, IApiPolicyDocumentRecord] => [document.id, document]));

		const identityDocuments: ReadonlyArray<IApiPolicyDocumentRecord> = options.attachments.attachments.map((attachment: IApiPolicyAttachment): IApiPolicyDocumentRecord => this.resolveDocumentRecord(attachment.policyId, documentMap, options.policyNamespace));

		const boundaryDocuments: ReadonlyArray<IApiPolicyDocumentRecord> = options.attachments.boundaries.map((attachment: IApiPolicyAttachment): IApiPolicyDocumentRecord => this.resolveDocumentRecord(attachment.policyId, documentMap, options.policyNamespace));

		const identityEvaluation: {
			allowRows: Map<IApiPolicyStatement, IApiAuthorizationIamResourceRows>;
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
			dialect: options.dialect,
			documents: identityDocuments,
			isCreateRequest,
			isListRequest,
			principal: options.principal,
			requestMetadata,
			resource: options.resource,
			resourceDefinition: options.resourceDefinition,
			resourceSegments,
		});

		const boundaryEvaluation: {
			allowRows: Map<IApiPolicyStatement, IApiAuthorizationIamResourceRows>;
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
			dialect: options.dialect,
			documents: boundaryDocuments,
			isCreateRequest,
			isListRequest,
			principal: options.principal,
			requestMetadata,
			resource: options.resource,
			resourceDefinition: options.resourceDefinition,
			resourceSegments,
		});

		const identityScope: {
			isFullyCompilable: boolean;
			scope?: IApiAuthorizationScope<E>;
		} = this.queryPlanner.plan({
			dialect: options.dialect,
			principal: options.principal,
			requestMetadata,
			resource: options.resource,
			resourceDefinition: options.resourceDefinition,
			statementRows: identityEvaluation.allowRows,
			statements: identityEvaluation.allowStatements,
		});

		const boundaryScope: {
			isFullyCompilable: boolean;
			scope?: IApiAuthorizationScope<E>;
		} =
			boundaryDocuments.length === 0
				? { isFullyCompilable: true, scope: undefined }
				: this.queryPlanner.plan({
						dialect: options.dialect,
						principal: options.principal,
						requestMetadata,
						resource: options.resource,
						resourceDefinition: options.resourceDefinition,
						statementRows: boundaryEvaluation.allowRows,
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
			dialect: options.dialect,
			exclusions: [...identityEvaluation.denyExclusions, ...boundaryEvaluation.denyExclusions],
			principal: options.principal,
			requestMetadata,
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

	/**
	 * Classifies one resolved pattern of a statement's target. A list decomposes it over the placeholders of the path. Any
	 * other request names one resource or none, so a pattern either covers it, misses it, or says nothing exact about it:
	 * an Allow then grants nothing by the pattern and a `NotResource` or a loaded resource fails closed. A `Resource` of a
	 * Deny that says nothing exact about an unloaded row stays out of the request, unless it holds a wildcard before its
	 * end on a create, which no row could be checked against later.
	 * @template E - Entity type.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} tokens - Resolved pattern tokens.
	 * @param {IApiAuthorizationIamStatement} statement - Statement of the pattern.
	 * @param {object} options - Matching options.
	 * @param {IApiAuthorizationIamDialect} [options.dialect] - SQL dialect of the resource entity.
	 * @param {boolean} options.isCreateRequest - Whether the request creates a resource.
	 * @param {boolean} options.isListRequest - Whether the request lists resources.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceSegment>} options.resourceSegments - Request resource segments.
	 * @returns {IApiAuthorizationIamResourceClassification} The class of the pattern.
	 */
	private classifyResourcePattern<E extends IApiBaseEntity>(tokens: ReadonlyArray<IApiAuthorizationIamToken>, statement: IApiAuthorizationIamStatement, options: { dialect?: IApiAuthorizationIamDialect; isCreateRequest: boolean; isListRequest: boolean; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E>; resourceSegments: ReadonlyArray<IApiAuthorizationIamResourceSegment> }): IApiAuthorizationIamResourceClassification {
		if (options.isListRequest && options.resource === undefined) {
			return ApiAuthorizationIamResourcePattern.classify(tokens, options.resourceSegments, this.queryPlanner.readSlotAlphabets(options.resourceDefinition, options.dialect));
		}

		if (ApiAuthorizationIamGlob.isCovering(tokens, options.resourceSegments)) {
			return { constraints: [], kind: EApiAuthorizationIamResourceClass.ALL };
		}

		if (!ApiAuthorizationIamGlob.isOverlapping(tokens, options.resourceSegments)) {
			return { constraints: [], kind: EApiAuthorizationIamResourceClass.NONE };
		}

		const isDenyResourceOfUnloadedRow: boolean = statement.effect === EApiPolicyEffect.DENY && !statement.resource.isNegated && options.resource === undefined;
		const isStayingOut: boolean = isDenyResourceOfUnloadedRow && (!options.isCreateRequest || ApiAuthorizationIamGlob.readLiteralPrefix(tokens) !== undefined);

		return { constraints: [], kind: isStayingOut ? EApiAuthorizationIamResourceClass.NONE : EApiAuthorizationIamResourceClass.AMBIGUOUS };
	}

	/**
	 * Evaluates one condition key in memory, as `ApiAuthorizationIamOperator` says. A `resource.*` key reads the column its
	 * field mapping declares, and compares only if its SQL scope could: otherwise the row would decide one way when loaded
	 * and another when listed. A key on a path TypeORM does not map has no column type to check, so only String and Null
	 * read it.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {unknown} context - Evaluation context with the `principal`, `request` and `resource` roots.
	 * @param {object} options - Matching options.
	 * @param {IApiAuthorizationIamDialect} [options.dialect] - SQL dialect of the resource entity.
	 * @param {IApiAuthorizationPrincipal} options.principal - Evaluated principal.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} options.requestMetadata - Request metadata.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition.
	 * @returns {boolean | undefined} Whether the key holds, or undefined when it cannot be read, which fails it closed.
	 */
	private evaluateCondition<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(condition: IApiAuthorizationIamCondition, context: unknown, options: { dialect?: IApiAuthorizationIamDialect; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> }): boolean | undefined {
		const operand: IApiAuthorizationIamOperand | undefined = ApiAuthorizationIamOperator.readOperand(condition, context);

		if (!operand) {
			return undefined;
		}

		if (!condition.key.startsWith("resource.")) {
			return ApiAuthorizationIamOperator.evaluate(condition, ApiAuthorizationIamVariable.readPath(context, condition.key), operand, false);
		}

		// A `resource.*` key with no field mapping, or one through a to-many relation, has no single column.
		const actualValue: { isDeclared: boolean; isReadable: boolean; value?: unknown } = this.readResourceValue(options.resourceDefinition, options.resource, condition.key);

		if (!actualValue.isReadable) {
			return undefined;
		}

		const fieldDefinition: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = options.resourceDefinition.fields.find((candidate: IApiAuthorizationResourceDefinition<E>["fields"][number]): boolean => candidate.path === condition.key);
		const field: IApiAuthorizationIamQueryField | undefined = fieldDefinition ? AuthorizationIamReadQueryField(options.resourceDefinition.entity, fieldDefinition.queryPath) : undefined;

		if (field?.isResolvable) {
			return this.queryPlanner.isConditionCompilable(condition, options) ? ApiAuthorizationIamOperator.evaluate(condition, actualValue.value, operand, true) : undefined;
		}

		return condition.family === EApiPolicyConditionOperatorFamily.STRING || condition.family === EApiPolicyConditionOperatorFamily.NULL ? ApiAuthorizationIamOperator.evaluate(condition, actualValue.value, operand, false) : undefined;
	}

	private evaluateDocumentSet<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(options: {
		action: string;
		dialect?: IApiAuthorizationIamDialect;
		documents: ReadonlyArray<IApiPolicyDocumentRecord>;
		isCreateRequest: boolean;
		isListRequest: boolean;
		principal: IApiAuthorizationPrincipal;
		requestMetadata: IApiAuthorizationRequestMetadata<E, M>;
		resource?: E;
		resourceDefinition: IApiAuthorizationResourceDefinition<E>;
		resourceSegments: ReadonlyArray<IApiAuthorizationIamResourceSegment>;
	}): {
		allowRows: Map<IApiPolicyStatement, IApiAuthorizationIamResourceRows>;
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
		const allowRows: Map<IApiPolicyStatement, IApiAuthorizationIamResourceRows> = new Map<IApiPolicyStatement, IApiAuthorizationIamResourceRows>();
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
					dialect: options.dialect,
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

					if (statementMatch.resourceRows) {
						allowRows.set(statement, statementMatch.resourceRows);
					}

					continue;
				}

				if (!statementMatch.exclusions) {
					return {
						allowRows,
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
			allowRows,
			allowStatements,
			denyExclusions,
			hasExplicitDeny: false,
			statementTraces,
		};
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return Boolean(value) && typeof value === "object" && !Array.isArray(value);
	}

	/**
	 * Matches one statement against the request. A matched Deny denies the whole request, unless the resource is not
	 * loaded yet: then its `resource.*` keys and, for list requests, the rows its target applies to become row exclusions
	 * that the query planner compiles. A matched Allow on a list that applies to part of the rows carries them as a scope.
	 * A `NotAction` or `NotResource` target applies where no pattern of it matches; a pattern it cannot read exactly makes
	 * a Deny deny and an Allow grant nothing, so a negated target never fails open.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {object} options - Matching options.
	 * @param {string} options.action - Namespaced IAM action.
	 * @param {IApiAuthorizationIamDialect} [options.dialect] - SQL dialect of the resource entity.
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
		dialect?: IApiAuthorizationIamDialect;
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

		// A `NotAction` applies to every action none of its patterns matches.
		if (isActionMatched === statement.action.isNegated) {
			return { isMatched: false };
		}

		const context: Record<string, unknown> = ApiAuthorizationIamVariable.createContext(options.principal, options.requestMetadata, options.resource);
		const target: { constraintSets: Array<ReadonlyArray<IApiAuthorizationIamResourceConstraint>>; kind: EApiAuthorizationIamResourceClass } = this.resolveResourceTarget(statement, context, options);

		if (target.kind === EApiAuthorizationIamResourceClass.NONE) {
			return { isMatched: false };
		}

		let hasResourceCondition: boolean = false;

		for (const condition of statement.conditions) {
			if (condition.key.startsWith("resource.") && options.resource === undefined) {
				hasResourceCondition = true;

				continue;
			}

			const isHolding: boolean | undefined = this.evaluateCondition(condition, context, options);

			// A key that cannot be read fails closed: it holds for a Deny and fails an Allow.
			if (isHolding === undefined ? !isDeny : !isHolding) {
				return { isMatched: false };
			}
		}

		const isPartial: boolean = target.kind === EApiAuthorizationIamResourceClass.PARTIAL;

		if (!isDeny) {
			const resourceRows: IApiAuthorizationIamResourceRows | undefined = isPartial ? { constraintSets: target.constraintSets, isNegated: statement.resource.isNegated } : undefined;

			if (!hasResourceCondition && !resourceRows) {
				return { isMatched: true };
			}

			const isCompilable: boolean = this.queryPlanner.plan({
				dialect: options.dialect,
				principal: options.principal,
				requestMetadata: options.requestMetadata,
				resource: options.resource,
				resourceDefinition: options.resourceDefinition,
				...(resourceRows ? { statementRows: new Map<IApiPolicyStatement, IApiAuthorizationIamResourceRows>([[options.statement, resourceRows]]) } : {}),
				statements: [options.statement],
			}).isFullyCompilable;

			return { isMatched: isCompilable, ...(resourceRows ? { resourceRows } : {}) };
		}

		const isWholeRequestDeny: boolean = target.kind === EApiAuthorizationIamResourceClass.AMBIGUOUS || (hasResourceCondition ? options.isCreateRequest : !isPartial);

		if (isWholeRequestDeny) {
			return { isMatched: true };
		}

		if (!isPartial) {
			return { exclusions: [{ statement: options.statement }], isMatched: true };
		}

		// The rows of `Resource` patterns are excluded one pattern at a time; the rows `NotResource` keeps are those of any pattern.
		const exclusionRows: Array<IApiAuthorizationIamResourceRows> = statement.resource.isNegated ? [{ constraintSets: target.constraintSets, isNegated: true }] : target.constraintSets.map((constraints: ReadonlyArray<IApiAuthorizationIamResourceConstraint>): IApiAuthorizationIamResourceRows => ({ constraintSets: [constraints], isNegated: false }));

		return {
			exclusions: exclusionRows.map((resourceRows: IApiAuthorizationIamResourceRows): IApiAuthorizationIamDenyExclusion => ({ resourceRows, statement: options.statement })),
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
	 * Splits the resource path into literal segments and placeholders; placeholders resolved from the resource or
	 * request parameters become literals, unresolved ones keep their name and render as `*`. On a loaded resource a
	 * NULL, missing or empty value renders as `""`, so `item/` names the row whose `id` is NULL. A request parameter of the
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
			} else if (resource !== undefined && (resolvedValue === undefined || resolvedValue === null || resolvedValue === "")) {
				// A loaded resource has no unknown placeholder: a NULL or empty value renders as nothing, as its SQL row does.
				appendLiteral("");
			} else {
				segments.push({ placeholder, value: "*" });
			}

			literalStart = match.index + match[0].length;
		}

		appendLiteral(resourceDefinition.resourcePath.slice(literalStart));

		return segments;
	}

	/**
	 * Reads what the `Resource` or `NotResource` target of a statement says about the request. A pattern whose variable
	 * does not resolve names no resource: a `Resource` of an Allow grants nothing by it, and any other target fails closed,
	 * since reading it as a miss would make a `NotResource` apply to every row.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationIamStatement} statement - Statement read by the grammar.
	 * @param {Record<string, unknown>} context - Evaluation context with the `principal`, `request` and `resource` roots.
	 * @param {object} options - Matching options.
	 * @param {IApiAuthorizationIamDialect} [options.dialect] - SQL dialect of the resource entity.
	 * @param {boolean} options.isCreateRequest - Whether the request creates a resource.
	 * @param {boolean} options.isListRequest - Whether the request lists resources.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceSegment>} options.resourceSegments - Request resource segments.
	 * @returns {{ constraintSets: Array<ReadonlyArray<IApiAuthorizationIamResourceConstraint>>; kind: EApiAuthorizationIamResourceClass }} The class of the target as written, `NONE` when the statement does not apply, `ALL` for every row, `AMBIGUOUS` for a whole-request Deny, and for `PARTIAL` the constraints of each pattern that names rows.
	 */
	private resolveResourceTarget<E extends IApiBaseEntity>(
		statement: IApiAuthorizationIamStatement,
		context: Record<string, unknown>,
		options: { dialect?: IApiAuthorizationIamDialect; isCreateRequest: boolean; isListRequest: boolean; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E>; resourceSegments: ReadonlyArray<IApiAuthorizationIamResourceSegment> },
	): { constraintSets: Array<ReadonlyArray<IApiAuthorizationIamResourceConstraint>>; kind: EApiAuthorizationIamResourceClass } {
		const isDeny: boolean = statement.effect === EApiPolicyEffect.DENY;
		const isNegated: boolean = statement.resource.isNegated;
		const classifications: Array<IApiAuthorizationIamResourceClassification> = [];
		let hasUnresolvedPattern: boolean = false;

		for (const pattern of statement.resource.patterns) {
			const parts: Array<IApiAuthorizationIamToken> | undefined = ApiAuthorizationIamVariable.resolveTokens(pattern.tokens, context);

			if (parts) {
				classifications.push(this.classifyResourcePattern(parts, statement, options));
			} else {
				hasUnresolvedPattern = true;
			}
		}

		// The class that makes the statement grant nothing, or deny the whole request.
		const failedClosed: EApiAuthorizationIamResourceClass = isDeny ? EApiAuthorizationIamResourceClass.AMBIGUOUS : EApiAuthorizationIamResourceClass.NONE;

		if (hasUnresolvedPattern && (isDeny || isNegated)) {
			return { constraintSets: [], kind: failedClosed };
		}

		const hasKind = (kind: EApiAuthorizationIamResourceClass): boolean => classifications.some((classification: IApiAuthorizationIamResourceClassification): boolean => classification.kind === kind);
		const constraintSets: Array<ReadonlyArray<IApiAuthorizationIamResourceConstraint>> = classifications.filter((classification: IApiAuthorizationIamResourceClassification): boolean => classification.kind === EApiAuthorizationIamResourceClass.PARTIAL).map((classification: IApiAuthorizationIamResourceClassification): ReadonlyArray<IApiAuthorizationIamResourceConstraint> => classification.constraints);
		const hasRows: boolean = constraintSets.length > 0;

		if (isNegated) {
			if (hasKind(EApiAuthorizationIamResourceClass.ALL)) {
				return { constraintSets: [], kind: EApiAuthorizationIamResourceClass.NONE };
			}

			if (hasKind(EApiAuthorizationIamResourceClass.AMBIGUOUS)) {
				return { constraintSets: [], kind: failedClosed };
			}

			return hasRows ? { constraintSets, kind: EApiAuthorizationIamResourceClass.PARTIAL } : { constraintSets: [], kind: EApiAuthorizationIamResourceClass.ALL };
		}

		if (hasKind(EApiAuthorizationIamResourceClass.ALL)) {
			return { constraintSets: [], kind: EApiAuthorizationIamResourceClass.ALL };
		}

		if (isDeny && hasKind(EApiAuthorizationIamResourceClass.AMBIGUOUS)) {
			return { constraintSets: [], kind: EApiAuthorizationIamResourceClass.AMBIGUOUS };
		}

		return hasRows ? { constraintSets, kind: EApiAuthorizationIamResourceClass.PARTIAL } : { constraintSets: [], kind: EApiAuthorizationIamResourceClass.NONE };
	}
}
