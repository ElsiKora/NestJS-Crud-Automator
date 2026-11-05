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
	IApiAuthorizationIamRequestResource,
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

import { ApiAuthorizationIamCollection } from "@class/api/authorization/iam/collection.class";
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
		const requestResource: IApiAuthorizationIamRequestResource = this.resolveRequestResource(options.resourceDefinition, requestMetadata, options.resource, options.dialect);
		const isCreateRequest: boolean = AuthorizationIsCreateRoute(options.routeType, options.action, options.policyNamespace);
		const isListRequest: boolean = AuthorizationIsListRoute(options.routeType, options.action, options.policyNamespace);
		const documentMap: Map<string, IApiPolicyDocumentRecord> = new Map<string, IApiPolicyDocumentRecord>(options.documents.map((document: IApiPolicyDocumentRecord): [string, IApiPolicyDocumentRecord] => [document.id, document]));

		const identityDocuments: ReadonlyArray<IApiPolicyDocumentRecord> = this.resolveDocumentRecords(options.attachments.attachments, documentMap, options.policyNamespace);

		const boundaryDocuments: ReadonlyArray<IApiPolicyDocumentRecord> = this.resolveDocumentRecords(options.attachments.boundaries, documentMap, options.policyNamespace);
		// A boundary of another namespace still bounds the principal: it allows nothing in this one.
		const isBounded: boolean = options.attachments.boundaries.length > 0;

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
			requestResource,
			resource: options.resource,
			resourceDefinition: options.resourceDefinition,
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
			requestResource,
			resource: options.resource,
			resourceDefinition: options.resourceDefinition,
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

		if (identityEvaluation.allowStatements.length === 0 || (isBounded && boundaryEvaluation.allowStatements.length === 0) || !identityScope.isFullyCompilable || !boundaryScope.isFullyCompilable) {
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

		// Each merge builds the product of its branches, so the cap is checked before each one is built.
		const boundedScope: { isWithinCap: boolean; scope?: IApiAuthorizationScope<E> } = this.mergeScopes(identityScope.scope, boundaryScope.scope);
		const mergedScope: { isWithinCap: boolean; scope?: IApiAuthorizationScope<E> } = boundedScope.isWithinCap ? this.mergeScopes(boundedScope.scope, exclusionScope.scope) : boundedScope;
		const scope: IApiAuthorizationScope<E> | undefined = mergedScope.scope;

		if (!mergedScope.isWithinCap) {
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
		// The decision reports the documents it read: those of the request's namespace.
		const documents: Array<IApiPolicyDocumentRecord> = options.documents.filter((document: IApiPolicyDocumentRecord): boolean => document.namespace === options.policyNamespace);

		return {
			action: options.action,
			appliedRules: [],
			effect: payload.effect,
			mode: EApiAuthorizationMode.IAM,
			permissions: [],
			policyId: options.policyNamespace,
			policyIds: documents.map((document: IApiPolicyDocumentRecord) => document.id),
			principal: options.principal,
			resource: options.resource,
			resourceType: options.resourceDefinition.resourceType,
			scope: payload.scope,
			trace: {
				attachments: options.attachments.attachments,
				boundaries: options.attachments.boundaries,
				decisionType: payload.decisionType,
				documents,
				mode: EApiAuthorizationMode.IAM,
				permissions: [],
				statements: payload.statementTraces,
			},
			transforms: [],
		};
	}

	/**
	 * Classifies one resolved pattern of a statement's target, read by text. A list decomposes it over the placeholders of
	 * the path, and so does a create for a `Resource` of a Deny: its constraints then exclude the row the create stores,
	 * which the create reads back before it commits, so the Deny refuses that row and no other. Any other request names one
	 * resource or none, so a pattern either covers it, misses it, or says nothing exact about it: an Allow then grants
	 * nothing by the pattern and a `NotResource` or a loaded resource fails closed. A `Resource` of a Deny that says nothing
	 * exact about the unloaded row of a row route stays out of the request.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} tokens - Resolved pattern tokens.
	 * @param {IApiAuthorizationIamStatement} statement - Statement of the pattern.
	 * @param {object} options - Matching options.
	 * @param {boolean} options.isCreateRequest - Whether the request creates a resource.
	 * @param {boolean} options.isListRequest - Whether the request lists resources.
	 * @param {IApiAuthorizationIamRequestResource} options.requestResource - Resource string the request names.
	 * @param {unknown} [options.resource] - Loaded resource, when available.
	 * @returns {IApiAuthorizationIamResourceClassification} The class of the pattern.
	 */
	private classifyResourcePattern(tokens: ReadonlyArray<IApiAuthorizationIamToken>, statement: IApiAuthorizationIamStatement, options: { isCreateRequest: boolean; isListRequest: boolean; requestResource: IApiAuthorizationIamRequestResource; resource?: unknown }): IApiAuthorizationIamResourceClassification {
		const segments: ReadonlyArray<IApiAuthorizationIamResourceSegment> = options.requestResource.segments;
		const isDenyResourceOfUnloadedRow: boolean = statement.effect === EApiPolicyEffect.DENY && !statement.resource.isNegated && options.resource === undefined;

		if (options.resource === undefined && (options.isListRequest || (options.isCreateRequest && isDenyResourceOfUnloadedRow))) {
			return ApiAuthorizationIamResourcePattern.classify(tokens, segments, options.requestResource.alphabets);
		}

		if (ApiAuthorizationIamGlob.isCovering(tokens, segments)) {
			return { constraints: [], kind: EApiAuthorizationIamResourceClass.ALL };
		}

		if (!ApiAuthorizationIamGlob.isOverlapping(tokens, segments)) {
			return { constraints: [], kind: EApiAuthorizationIamResourceClass.NONE };
		}

		return { constraints: [], kind: isDenyResourceOfUnloadedRow ? EApiAuthorizationIamResourceClass.NONE : EApiAuthorizationIamResourceClass.AMBIGUOUS };
	}

	/**
	 * Classifies one resolved pattern of a statement's target on the stored row: a placeholder a path value fills is read
	 * from the column the database holds, compared exactly, instead of the path text the database matched the row by under
	 * its collation. The row and the text readings must both match for the pattern to grant, and either matching applies it
	 * to refuse: an Allow `Resource` and a Deny `NotResource` take what both readings name, an Allow `NotResource` and a Deny
	 * `Resource` take what either reading names.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} tokens - Resolved pattern tokens.
	 * @param {IApiAuthorizationIamStatement} statement - Statement of the pattern.
	 * @param {object} options - Matching options.
	 * @param {boolean} options.isCreateRequest - Whether the request creates a resource.
	 * @param {boolean} options.isListRequest - Whether the request lists resources.
	 * @param {IApiAuthorizationIamRequestResource} options.requestResource - Resource string the request names.
	 * @param {unknown} [options.resource] - Loaded resource, when available.
	 * @returns {Array<IApiAuthorizationIamResourceClassification>} The classes of the pattern, ORed by the target.
	 */
	private classifyResourcePatternReadings(tokens: ReadonlyArray<IApiAuthorizationIamToken>, statement: IApiAuthorizationIamStatement, options: { isCreateRequest: boolean; isListRequest: boolean; requestResource: IApiAuthorizationIamRequestResource; resource?: unknown }): Array<IApiAuthorizationIamResourceClassification> {
		const text: IApiAuthorizationIamResourceClassification = this.classifyResourcePattern(tokens, statement, options);
		const rowSegments: ReadonlyArray<IApiAuthorizationIamResourceSegment> | undefined = options.requestResource.rowSegments;

		if (!rowSegments) {
			return [text];
		}

		const row: IApiAuthorizationIamResourceClassification = ApiAuthorizationIamResourcePattern.classify(tokens, rowSegments, options.requestResource.alphabets);
		const isGranting: boolean = (statement.effect === EApiPolicyEffect.ALLOW) !== statement.resource.isNegated;

		return isGranting ? [this.intersectClassifications(text, row)] : [text, row];
	}

	/**
	 * Builds the characters a placeholder a path value fills can render: those of its column, if the column enforces any,
	 * without the separators of the resource path, which a path value that names a resource never holds.
	 * @param {RegExp | undefined} columnAlphabet - Characters the column enforces, of one character each.
	 * @param {string} separatorClass - Character class of the separators of the resource path.
	 * @returns {RegExp} The alphabet of the placeholder.
	 */
	private createSlotAlphabet(columnAlphabet: RegExp | undefined, separatorClass: string): RegExp {
		const columnSource: string = columnAlphabet ? columnAlphabet.source.replace(/^\^/u, "").replace(/\$$/u, "") : String.raw`[\s\S]`;

		return new RegExp(`^(?!${separatorClass})(?:${columnSource})$`, "u");
	}

	/**
	 * Evaluates one `resource.*` key through a to-many relation on a loaded resource, reading the rows its subquery reads:
	 * a soft-deleted related row does not count, as it does not in SQL. The key needs a set qualifier and compiles for the
	 * dialect, or a row would decide one way when loaded and another when listed. A relation that is not loaded, or a
	 * related row that does not carry what the subquery reads, cannot be read exactly and fails the key closed.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {IApiAuthorizationIamQueryField} field - Resolved query path of the key.
	 * @param {ReadonlyArray<IApiAuthorizationIamOperand>} operands - Operands of the key.
	 * @param {object} options - Matching options.
	 * @param {IApiAuthorizationIamDialect} [options.dialect] - SQL dialect of the resource entity.
	 * @param {IApiAuthorizationPrincipal} options.principal - Evaluated principal.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} options.requestMetadata - Request metadata.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition.
	 * @returns {boolean | undefined} Whether the key holds, or undefined when it cannot be read.
	 */
	private evaluateCollectionCondition<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(
		condition: IApiAuthorizationIamCondition,
		field: IApiAuthorizationIamQueryField,
		operands: ReadonlyArray<IApiAuthorizationIamOperand>,
		options: { dialect?: IApiAuthorizationIamDialect; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> },
	): boolean | undefined {
		const element: IApiAuthorizationIamQueryField["element"] = field.element;

		if (!element || !this.queryPlanner.isConditionCompilable(condition, options)) {
			return undefined;
		}

		const relatedRows: unknown = this.resolvePathValue(options.resource, element.relationPath);
		const softDeletePath: string | undefined = ApiAuthorizationIamCollection.read(options.dialect?.dataSource, options.resourceDefinition.entity, element)?.softDeletePath;

		if (!Array.isArray(relatedRows)) {
			return undefined;
		}

		const values: Array<unknown> = [];

		for (const relatedRow of relatedRows as ReadonlyArray<unknown>) {
			const deletedAt: unknown = softDeletePath === undefined ? null : this.resolvePathValue(relatedRow, softDeletePath);
			const value: unknown = this.resolvePathValue(relatedRow, element.queryPath);

			if (deletedAt === undefined || value === undefined) {
				return undefined;
			}

			if (deletedAt === null) {
				values.push(value);
			}
		}

		return ApiAuthorizationIamOperator.evaluateSet(condition, values, operands, true);
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
		const operands: Array<IApiAuthorizationIamOperand> | undefined = ApiAuthorizationIamOperator.readOperands(condition, context);

		if (!operands) {
			return undefined;
		}

		if (!condition.key.startsWith("resource.")) {
			const contextValue: unknown = ApiAuthorizationIamVariable.readPath(context, condition.key);

			return condition.qualifier === undefined ? ApiAuthorizationIamOperator.evaluate(condition, contextValue, operands, false) : ApiAuthorizationIamOperator.evaluateSet(condition, contextValue, operands, false);
		}

		const fieldDefinition: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = options.resourceDefinition.fields.find((candidate: IApiAuthorizationResourceDefinition<E>["fields"][number]): boolean => candidate.path === condition.key);
		const field: IApiAuthorizationIamQueryField | undefined = fieldDefinition ? AuthorizationIamReadQueryField(options.resourceDefinition.entity, fieldDefinition.queryPath) : undefined;

		if (field?.collectionPath !== undefined) {
			return this.evaluateCollectionCondition(condition, field, operands, options);
		}

		// A set qualifier reads a list of related rows, and a column holds one value.
		if (condition.qualifier !== undefined) {
			return undefined;
		}

		// A `resource.*` key with no field mapping has no column.
		const actualValue: { isDeclared: boolean; isReadable: boolean; value?: unknown } = this.readResourceValue(options.resourceDefinition, options.resource, condition.key);

		if (!actualValue.isReadable) {
			return undefined;
		}

		if (field?.isResolvable) {
			return this.queryPlanner.isConditionCompilable(condition, options) ? ApiAuthorizationIamOperator.evaluate(condition, actualValue.value, operands, true) : undefined;
		}

		return condition.family === EApiPolicyConditionOperatorFamily.STRING || condition.family === EApiPolicyConditionOperatorFamily.NULL ? ApiAuthorizationIamOperator.evaluate(condition, actualValue.value, operands, false) : undefined;
	}

	private evaluateDocumentSet<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(options: {
		action: string;
		dialect?: IApiAuthorizationIamDialect;
		documents: ReadonlyArray<IApiPolicyDocumentRecord>;
		isCreateRequest: boolean;
		isListRequest: boolean;
		principal: IApiAuthorizationPrincipal;
		requestMetadata: IApiAuthorizationRequestMetadata<E, M>;
		requestResource: IApiAuthorizationIamRequestResource;
		resource?: E;
		resourceDefinition: IApiAuthorizationResourceDefinition<E>;
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
					requestResource: options.requestResource,
					resource: options.resource,
					resourceDefinition: options.resourceDefinition,
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

	/**
	 * Reads what two readings of one pattern both name.
	 * @param {IApiAuthorizationIamResourceClassification} left - One reading.
	 * @param {IApiAuthorizationIamResourceClassification} right - The other reading.
	 * @returns {IApiAuthorizationIamResourceClassification} Their intersection; an ambiguous reading keeps it ambiguous.
	 */
	private intersectClassifications(left: IApiAuthorizationIamResourceClassification, right: IApiAuthorizationIamResourceClassification): IApiAuthorizationIamResourceClassification {
		if (left.kind === EApiAuthorizationIamResourceClass.NONE || right.kind === EApiAuthorizationIamResourceClass.NONE) {
			return { constraints: [], kind: EApiAuthorizationIamResourceClass.NONE };
		}

		if (left.kind === EApiAuthorizationIamResourceClass.ALL) {
			return right;
		}

		if (right.kind === EApiAuthorizationIamResourceClass.ALL) {
			return left;
		}

		if (left.kind === EApiAuthorizationIamResourceClass.AMBIGUOUS || right.kind === EApiAuthorizationIamResourceClass.AMBIGUOUS) {
			return { constraints: [], kind: EApiAuthorizationIamResourceClass.AMBIGUOUS };
		}

		return { constraints: [...left.constraints, ...right.constraints], kind: EApiAuthorizationIamResourceClass.PARTIAL };
	}

	/**
	 * Tells whether a placeholder reads a column the database scope compares: a filterable field that maps it to a
	 * resolvable column of the resource or of a to-one relation.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @param {string} placeholder - Placeholder name.
	 * @returns {boolean} Whether a scope can compare the placeholder on the stored row.
	 */
	private isColumnPlaceholder<E extends IApiBaseEntity>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, placeholder: string): boolean {
		const field: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = resourceDefinition.fields.find((candidate: IApiAuthorizationResourceDefinition<E>["fields"][number]): boolean => candidate.path === `resource.${placeholder}` && candidate.isFilterable);

		if (!field) {
			return false;
		}

		const queryField: IApiAuthorizationIamQueryField = AuthorizationIamReadQueryField(resourceDefinition.entity, field.queryPath);

		return queryField.isResolvable && queryField.collectionPath === undefined;
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
	 * @param {IApiAuthorizationIamRequestResource} options.requestResource - Resource string the request names.
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
		requestResource: IApiAuthorizationIamRequestResource;
		resource?: E;
		resourceDefinition: IApiAuthorizationResourceDefinition<E>;
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

	/**
	 * ANDs two scopes, unless their product would pass the branch cap; the product is then never built.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationScope<E> | undefined} baseScope - First scope; none restricts nothing.
	 * @param {IApiAuthorizationScope<E> | undefined} additionalScope - Second scope; none restricts nothing.
	 * @returns {{ isWithinCap: boolean; scope?: IApiAuthorizationScope<E> }} The merged scope, or a result over the cap that must deny.
	 */
	private mergeScopes<E extends IApiBaseEntity>(baseScope: IApiAuthorizationScope<E> | undefined, additionalScope: IApiAuthorizationScope<E> | undefined): { isWithinCap: boolean; scope?: IApiAuthorizationScope<E> } {
		if (!baseScope) {
			return { isWithinCap: true, scope: additionalScope };
		}

		if (!additionalScope) {
			return { isWithinCap: true, scope: baseScope };
		}

		if (ApiAuthorizationIamQueryPlanner.countBranches(baseScope.where) * ApiAuthorizationIamQueryPlanner.countBranches(additionalScope.where) > AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES) {
			return { isWithinCap: false };
		}

		return {
			isWithinCap: true,
			scope: {
				...baseScope,
				...additionalScope,
				where: AuthorizationScopeMergeWhere(baseScope.where, additionalScope.where),
			},
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
	 * Reads the separators of a resource path: `/`, and every character other than a letter or a digit that the path
	 * writes between or after its placeholders. A value that holds one would move where the next placeholder starts.
	 * @param {string} resourcePath - Resource path of the definition.
	 * @returns {string} A regular-expression character class of the separators.
	 */
	private readSeparatorClass(resourcePath: string): string {
		const firstPlaceholder: number = resourcePath.indexOf("{");
		const tail: string = firstPlaceholder === -1 ? "" : resourcePath.slice(firstPlaceholder).replaceAll(/\{[\w.-]+\}/gu, "");
		const separators: Set<string> = new Set<string>(["/", ...(tail.match(/[^\p{L}\p{N}]/gu) ?? [])]);
		const escaped: string = [...separators].join("").replaceAll(/[\\\]^-]/gu, String.raw`\$&`);

		return `[${escaped}]`;
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

	/**
	 * Reads the documents of attachments. A document of another namespace holds nothing for this request, so it is skipped;
	 * a document no source returned fails the request.
	 * @param {ReadonlyArray<IApiPolicyAttachment>} attachments - Attachments of the principal.
	 * @param {Map<string, IApiPolicyDocumentRecord>} documentMap - Resolved documents by id.
	 * @param {string} policyNamespace - Policy namespace of the request.
	 * @returns {Array<IApiPolicyDocumentRecord>} The documents of the namespace, in attachment order.
	 * @throws {Error} When an attached document is not available.
	 */
	private resolveDocumentRecords(attachments: ReadonlyArray<IApiPolicyAttachment>, documentMap: Map<string, IApiPolicyDocumentRecord>, policyNamespace: string): Array<IApiPolicyDocumentRecord> {
		const documents: Array<IApiPolicyDocumentRecord> = [];

		for (const attachment of attachments) {
			const document: IApiPolicyDocumentRecord | undefined = documentMap.get(attachment.policyId);

			if (!document) {
				iamEngineLogger.error(`Policy document "${attachment.policyId}" is not available for IAM evaluation`);

				throw ErrorException(`Policy document "${attachment.policyId}" is not available for IAM evaluation`);
			}

			if (document.namespace === policyNamespace) {
				documents.push(document);
			} else {
				iamEngineLogger.verbose(`Policy document "${attachment.policyId}" of namespace "${document.namespace}" is skipped for namespace "${policyNamespace}".`);
			}
		}

		return documents;
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
	 * NULL, missing or empty value renders as `""`, so `item/` names the row whose `id` is NULL. A loaded resource gives
	 * the value of each placeholder that names a field, through its query path, as the SQL scope reads it; otherwise a
	 * request parameter of the placeholder's name gives it, and any other placeholder reads the resource property of its
	 * name. A placeholder a path value fills and a filterable column maps is also kept as a placeholder in the row reading,
	 * which the database compares on the stored row; that placeholder renders no separator of the resource path. A path or
	 * body value that holds such a separator, `/` or a non-alphanumeric character between or after placeholders, names no
	 * resource. A loaded row is read as its list reads it, separators and all.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} requestMetadata - Request metadata.
	 * @param {E | undefined} resource - Loaded resource, when available.
	 * @param {IApiAuthorizationIamDialect} [dialect] - SQL dialect of the resource entity.
	 * @returns {IApiAuthorizationIamRequestResource} The text and row readings, with adjacent literals merged.
	 */
	private resolveRequestResource<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, requestMetadata: IApiAuthorizationRequestMetadata<E, M>, resource: E | undefined, dialect?: IApiAuthorizationIamDialect): IApiAuthorizationIamRequestResource {
		const parameters: Record<string, unknown> = this.isRecord(requestMetadata.parameters) ? requestMetadata.parameters : {};
		const resourcePath: string = resourceDefinition.resourcePath;
		const separatorClass: string = this.readSeparatorClass(resourcePath);
		const separatorPattern: RegExp = new RegExp(separatorClass, "u");
		const alphabets: Map<string, RegExp> = new Map<string, RegExp>(this.queryPlanner.readSlotAlphabets(resourceDefinition, dialect));
		const segments: Array<IApiAuthorizationIamResourceSegment> = [];
		const rowSegments: Array<IApiAuthorizationIamResourceSegment> = [];
		let hasRowPlaceholder: boolean = false;
		let isNamingNoResource: boolean = false;

		const appendLiteral: (target: Array<IApiAuthorizationIamResourceSegment>, value: string) => void = (target: Array<IApiAuthorizationIamResourceSegment>, value: string): void => {
			const lastSegment: IApiAuthorizationIamResourceSegment | undefined = target.at(-1);

			if (value.length === 0) {
				return;
			}

			if (lastSegment && lastSegment.placeholder === undefined) {
				lastSegment.value += value;
			} else {
				target.push({ value });
			}
		};

		let literalStart: number = 0;

		for (const match of resourcePath.matchAll(/\{([\w.-]+)\}/g)) {
			const placeholder: string = match[1] ?? "";
			const resourceValue: { isDeclared: boolean; isReadable: boolean; value?: unknown } = this.readResourceValue(resourceDefinition, resource, `resource.${placeholder}`);
			const isParameter: boolean = Object.prototype.hasOwnProperty.call(parameters, placeholder);
			let resolvedValue: unknown;

			if (resource !== undefined && resourceValue.isDeclared) {
				resolvedValue = resourceValue.value;
			} else if (isParameter) {
				resolvedValue = parameters[placeholder];
			} else if (resourceValue.isDeclared) {
				resolvedValue = resourceValue.value;
			} else {
				resolvedValue = this.isRecord(resource) ? (resource as Record<string, unknown>)[placeholder] : undefined;
			}

			const literal: string = resourcePath.slice(literalStart, match.index);
			appendLiteral(segments, literal);
			appendLiteral(rowSegments, literal);

			const renderedValue: string | undefined = this.renderResourceValue(resolvedValue);

			// A body that writes the placeholder's field would store a row whose resource string another resource could own.
			const bodyValue: string | undefined = resource === undefined && this.isRecord(requestMetadata.body) ? this.renderResourceValue(this.readResourceValue(resourceDefinition, requestMetadata.body as E, `resource.${placeholder}`).value) : undefined;

			// A stored row is read as it is, as its list reads it; only a value the request writes can cross a separator.
			const isRequestValue: boolean = isParameter && !(resource !== undefined && resourceValue.isDeclared);

			if ((isRequestValue && renderedValue !== undefined && separatorPattern.test(renderedValue)) || (bodyValue !== undefined && separatorPattern.test(bodyValue))) {
				isNamingNoResource = true;
			}

			if (renderedValue) {
				appendLiteral(segments, renderedValue);

				if (resource === undefined && isParameter && this.isColumnPlaceholder(resourceDefinition, placeholder)) {
					rowSegments.push({ placeholder, value: "*" });
					alphabets.set(placeholder, this.createSlotAlphabet(alphabets.get(placeholder), separatorClass));
					hasRowPlaceholder = true;
				} else {
					appendLiteral(rowSegments, renderedValue);
				}
			} else if (resource !== undefined && (resolvedValue === undefined || resolvedValue === null || resolvedValue === "")) {
				// A loaded resource has no unknown placeholder: a NULL or empty value renders as nothing, as its SQL row does.
				appendLiteral(segments, "");
				appendLiteral(rowSegments, "");
			} else {
				segments.push({ placeholder, value: "*" });
				rowSegments.push({ placeholder, value: "*" });
			}

			literalStart = match.index + match[0].length;
		}

		appendLiteral(segments, resourcePath.slice(literalStart));
		appendLiteral(rowSegments, resourcePath.slice(literalStart));

		return { alphabets, isNamingNoResource, segments, ...(hasRowPlaceholder ? { rowSegments } : {}) };
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
	 * @param {IApiAuthorizationIamRequestResource} options.requestResource - Resource string the request names.
	 * @returns {{ constraintSets: Array<ReadonlyArray<IApiAuthorizationIamResourceConstraint>>; kind: EApiAuthorizationIamResourceClass }} The class of the target as written, `NONE` when the statement does not apply, `ALL` for every row, `AMBIGUOUS` for a whole-request Deny, and for `PARTIAL` the constraints of each pattern that names rows.
	 */
	private resolveResourceTarget<E extends IApiBaseEntity>(
		statement: IApiAuthorizationIamStatement,
		context: Record<string, unknown>,
		options: { dialect?: IApiAuthorizationIamDialect; isCreateRequest: boolean; isListRequest: boolean; requestResource: IApiAuthorizationIamRequestResource; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> },
	): { constraintSets: Array<ReadonlyArray<IApiAuthorizationIamResourceConstraint>>; kind: EApiAuthorizationIamResourceClass } {
		const isDeny: boolean = statement.effect === EApiPolicyEffect.DENY;
		const isNegated: boolean = statement.resource.isNegated;
		// The class that makes the statement grant nothing, or deny the whole request.
		const failedClosed: EApiAuthorizationIamResourceClass = isDeny ? EApiAuthorizationIamResourceClass.AMBIGUOUS : EApiAuthorizationIamResourceClass.NONE;

		// A value that crosses a separator of the resource path would let a pattern match another resource's string.
		if (options.requestResource.isNamingNoResource) {
			return { constraintSets: [], kind: failedClosed };
		}

		const classifications: Array<IApiAuthorizationIamResourceClassification> = [];
		let hasUnresolvedPattern: boolean = false;

		for (const pattern of statement.resource.patterns) {
			const parts: Array<IApiAuthorizationIamToken> | undefined = ApiAuthorizationIamVariable.resolveTokens(pattern.tokens, context);

			if (parts) {
				classifications.push(...this.classifyResourcePatternReadings(parts, statement, options));
			} else {
				hasUnresolvedPattern = true;
			}
		}

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
