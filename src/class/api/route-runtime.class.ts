import type { EFilterOrderDirection } from "@enum/filter";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization";
import type { IApiControllerGetListQueryAstNode, IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanOrderEntry, IApiControllerGetListQueryRuntimeResult } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";
import type { IApiControllerPathPlan, IApiControllerPathPlanParameter } from "@interface/class/api/controller/path";
import type { IApiRouteRuntimeContextData, IApiRouteRuntimeCustomExecutionOptions, IApiRouteRuntimeGeneratedExecutionOptions, IApiRouteRuntimeGeneratedTargets, IApiRouteRuntimeHttpRequest } from "@interface/class/api/route";
import type { IApiSubscriberRouteErrorExecutionContext } from "@interface/class/api/subscriber/route/error-execution-context.interface";
import type { IApiSubscriberRouteExecutionContextData } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiControllerProperties, IApiControllerPropertiesRouteBaseRelationsResponseLoad, IApiControllerPropertiesRouteBaseRequestTarget, IApiRouteMetadata, IApiRouteRuntimeProperties } from "@interface/decorator/api";
import type { IApiControllerPropertiesRouteGetListResponseDtoConfig } from "@interface/decorator/api/controller/properties/route";
import type { IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiControllerGetListQueryCompiledPlan } from "@type/class/api/controller/get-list/compiled/plan.type";
import type { TApiControllerGetListCursorExecutionOptions } from "@type/class/api/controller/get-list/cursor/execution-options.type";
import type { TApiControllerGetListCursorQueryRuntimeResult } from "@type/class/api/controller/get-list/cursor/query-runtime-result.type";
import type { TApiControllerMethod } from "@type/class/controller-method.type";
import type { TApiControllerGetListQuery, TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetListPropertiesWhere, TApiFunctionGetManyProperties, TApiFunctionGetProperties, TApiFunctionUpdateCriteria } from "@type/decorator/api/function";
import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";
import type { TApiControllerTransformDataObjectToTransform } from "@type/utility";
import type { TApiControllerTransformDataTargets } from "@type/utility/api/controller/transform-data/targets.type";
import type { TTypeOrmColumnMetadata } from "@type/utility/typeorm";
import type { ClassConstructor } from "class-transformer";
import type { ValidationError } from "class-validator";
import type { DeepPartial, EntityManager, EntityMetadata, FindOptionsOrder, FindOptionsSelect, FindOptionsWhere, ObjectLiteral, RelationMetadata } from "typeorm";

import { ApiControllerGeneratedCreateIdentityContract, ApiControllerGeneratedCreateTemporalKeyContract, ApiControllerGeneratedInsertedKeyStorage, ApiControllerGeneratedReadScopeStorage, ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated";
import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGetListCursorDataSourceContract } from "@class/api/controller/get-list/cursor/data-source-contract.class";
import { ApiControllerGetListCursorRuntime } from "@class/api/controller/get-list/cursor/runtime.class";
import { ApiControllerGetListQueryRuntime } from "@class/api/controller/get-list/query";
import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionRuntime } from "@class/api/function/transaction/runtime.class";
import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { ApiServiceBase } from "@class/api/service-base.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ClassTransformerFreeFormValue } from "@class/class-transformer-free-form-value.class";
import { DATABASE_COLUMN_TYPE_CONSTANT } from "@constant/database-column-type.constant";
import { CONTROLLER_API_DECORATOR_CONSTANT, FUNCTION_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiControllerGetListQueryPaginationMode, EApiControllerRequestTarget, EApiFunctionTransactionMode, EApiFunctionTransactionOwnerKind, EApiFunctionType, EApiRouteType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EApiDtoType } from "@enum/decorator/api";
import { BadRequestException, ForbiddenException, HttpStatus, InternalServerErrorException } from "@nestjs/common";
import { ApiControllerAssertRepositoryEntity } from "@utility/api/controller/assert-repository-entity.utility";
import { ApiControllerGetListIsHiddenColumn } from "@utility/api/controller/get-list/is-hidden-column.utility";
import { ApiControllerGetListQueryPlanGet } from "@utility/api/controller/get-list/query";
import { ApiControllerGetListQueryAssertOrderable } from "@utility/api/controller/get-list/query/assert-orderable.utility";
import { ApiControllerGetListQueryGetPaginationMode } from "@utility/api/controller/get-list/query/get-pagination-mode.utility";
import { ApiControllerGetListQueryResolveCursorOrderFields } from "@utility/api/controller/get-list/query/resolve-cursor-order-fields.utility";
import { ApiControllerGetListQueryValidate } from "@utility/api/controller/get-list/query/validate.utility";
import { ApiControllerGetListResponsePublishedFields } from "@utility/api/controller/get-list/response-published-fields.utility";
import { ApiControllerGetListTransformAssertRequestRelationTargets } from "@utility/api/controller/get-list/transform/assert-request-relation-targets.utility";
import { ApiControllerGetListTransformFilter } from "@utility/api/controller/get-list/transform/filter.utility";
import { ApiControllerGetDtoWithPathPlan, ApiControllerGetResponseDto } from "@utility/api/controller/get/dto.utility";
import { ApiControllerHandleRequestRelations } from "@utility/api/controller/handle-request-relations.utility";
import { ApiControllerHasResponseRelationInclude } from "@utility/api/controller/has-response-relation-include.utility";
import { ApiControllerIdentityPlanGet } from "@utility/api/controller/identity";
import { ApiControllerParametersDtoGet, ApiControllerParametersResolveRequest, ApiControllerParametersValidate } from "@utility/api/controller/parameters";
import { ApiControllerPathIsExactInstant, ApiControllerPathPlanGet, ApiControllerPathRouteParameters, ApiControllerPathWhere } from "@utility/api/controller/path";
import { ApiControllerRejectCreateInverseSideKeys } from "@utility/api/controller/reject-create-inverse-side-keys.utility";
import { ApiControllerRejectToManyUpdateKeys } from "@utility/api/controller/reject-to-many-update-keys.utility";
import { ApiControllerSerializeRouteResponse } from "@utility/api/controller/serialize-route-response.utility";
import { ApiControllerTransformData, ApiControllerTransformRouteData } from "@utility/api/controller/transform-data.utility";
import { ApiControllerValidateRequest } from "@utility/api/controller/validate-request.utility";
import { ApiRouteProjectRelationResponse, ApiRouteValidationFlattenErrors } from "@utility/api/route";
import { ApiRouteCreateDiscriminatedDtoValidationFailure, ApiRouteIsDiscriminatedDtoProperties, ApiRoutePrepareDiscriminatedDtoPayload, ApiRouteResolveDiscriminatedDto, ApiRouteValidateDiscriminatedDtoProperties } from "@utility/api/route/discriminator";
import { ApiRouteGetNonCanonicalUuidFailures } from "@utility/api/route/get-non-canonical-uuid-failures.utility";
import { ApiRouteResponseIsListEnvelope } from "@utility/api/route/response/is-list-envelope.utility";
import { ApiRouteSerializeResponse } from "@utility/api/route/response/serialize.utility";
import { AuthorizationDecisionApplyResult, AuthorizationDecisionAttachResource, AuthorizationDecisionResolveFromRequest } from "@utility/authorization/decision";
import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { DatabaseTypeOrmAssertServiceRepository } from "@utility/database/typeorm/assert/service-repository.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Repository } from "typeorm";

// A filter value key names its path before "[value]" or "[values]", as the query carries it.
const FILTER_VALUE_KEY_PATTERN: RegExp = /^(.+)\[values?\]$/u;
// Two rows are enough to tell that a path does not name one row.
const PATH_MATCH_LIMIT: number = 2;
const BODY_PATH_MISMATCH_REJECTION_REASON: string = "value must be the one the path names";
const BODY_RELATION_COMPONENT_REJECTION_REASON: string = "a relation must name each of its join columns by a single value";
const BODY_RELATION_CONFLICT_REJECTION_REASON: string = "relation must name the same value as the entity's own column";
const BODY_RELATION_KEY_CLEAR_REJECTION_REASON: string = "it cannot be cleared, because its columns are in the primary key";
const BODY_RELATION_LOCKED_CLEAR_REJECTION_REASON: string = "it cannot be cleared, because its columns are in the primary key or bound by the path";
const BODY_RELATION_OBJECT_REJECTION_REASON: string = "a relation over several columns must be sent as an object naming its join columns";
const BODY_RELATION_SPLIT_REJECTION_REASON: string = "relation must name each of its own columns, which the entity must declare";
const BODY_RELATION_UNNAMED_REJECTION_REASON: string = "a relation object must name its join columns";
const BODY_RELATION_VALUE_REJECTION_REASON: string = "a relation over one column must be sent as the value of the column it references, or an object naming it";
const BODY_UNADDRESSED_KEY_REJECTION_REASON: string = "key column is not in the path";

export class ApiRouteRuntime {
	// The body of each generated request as the client sent it, before subscribers and transformers can change the object a route without a pipe shares with the request.
	private static readonly SENT_BODIES: WeakMap<object, unknown> = new WeakMap<object, unknown>();

	public static async executeCustom<E extends IApiBaseEntity, R>(options: IApiRouteRuntimeCustomExecutionOptions<E, R>): Promise<R> {
		const action: string = options.metadata.resource.action;
		const entityInstance: E = new (options.metadata.resource.entity as new () => E)();
		const request: IApiRouteRuntimeHttpRequest<E> = options.executionContext.switchToHttp().getRequest<IApiRouteRuntimeHttpRequest<E>>();
		const headers: Record<string, string> = {};

		for (const [key, value] of Object.entries(request.headers ?? {})) {
			if (typeof value === "string") {
				headers[key] = value;
			} else if (Array.isArray(value) && typeof value[0] === "string") {
				headers[key] = value[0];
			}
		}

		const contextData: IApiRouteRuntimeContextData<E> = {
			authenticationRequest: request as unknown as IApiAuthenticationRequest,
			headers,
			ip: request.ip ?? "",
			metadata: options.metadata,
			runtimeProperties: options.runtimeProperties,
		};

		const beforeContext: IApiSubscriberRouteExecutionContext<E, { body?: Partial<E>; parameters?: Partial<E>; query?: Partial<E> }, IApiRouteRuntimeContextData<E>> = {
			action,
			DATA: contextData,
			ENTITY: entityInstance,
			result: {
				body: request.body,
				parameters: request.params,
				query: request.query,
			},
			ROUTE_TYPE: options.metadata.route.type,
		};

		try {
			const beforeResult: { body?: Partial<E>; parameters?: Partial<E>; query?: Partial<E> } | undefined = await ApiSubscriberExecutor.executeRouteSubscribers(options.executionContext.getClass(), entityInstance, options.metadata.route.type, EApiSubscriberOnType.BEFORE, beforeContext, action);

			if (beforeResult) {
				request.body = beforeResult.body;
				request.params = beforeResult.parameters;
				// Express 5 serves `query` from a getter on the request prototype, which an assignment cannot replace, so an own property takes its place.
				Object.defineProperty(request, "query", {
					// eslint-disable-next-line @elsikora/typescript/naming-convention
					configurable: true,
					// eslint-disable-next-line @elsikora/typescript/naming-convention
					enumerable: true,
					value: beforeResult.query,
					// eslint-disable-next-line @elsikora/typescript/naming-convention
					writable: true,
				});
			}

			if (options.metadata.route.type === EApiRouteType.PARTIAL_UPDATE || options.metadata.route.type === EApiRouteType.UPDATE) {
				ApiControllerRejectToManyUpdateKeys(options.metadata.resource.entity, request.body);
			}

			if (options.metadata.route.type === EApiRouteType.CREATE) {
				ApiControllerRejectCreateInverseSideKeys(options.metadata.resource.entity, request.body);
			}

			await this.executeRequestTargets(options.metadata, options.runtimeProperties, request, contextData);
		} catch (error) {
			await this.executeCustomErrorSubscribers(options, entityInstance, contextData, EApiSubscriberOnType.BEFORE_ERROR, error);

			throw error;
		}

		try {
			const result: R = await options.operation();
			const transformedResult: R = await this.executeCustomResponse(options, entityInstance, contextData, result);

			return transformedResult;
		} catch (error) {
			await this.executeCustomErrorSubscribers(options, entityInstance, contextData, EApiSubscriberOnType.AFTER_ERROR, error);

			throw error;
		}
	}

	public static async executeCustomRequestRelations<E extends IApiBaseEntity>(controller: TApiControllerMethod<E>, metadata: IApiRouteMetadata<E>, runtimeProperties: IApiRouteRuntimeProperties<E>, body: Partial<E> | undefined): Promise<void> {
		if (!body) {
			return;
		}

		await ApiControllerHandleRequestRelations(controller, { entity: metadata.resource.entity, routes: {} }, runtimeProperties.relations?.request, body);
	}

	public static async executeCustomResponseRelations<E extends IApiBaseEntity, R>(controller: TApiControllerMethod<E>, runtimeProperties: IApiRouteRuntimeProperties<E>, response: R, routeType?: EApiRouteType, entity?: Type<unknown>): Promise<R> {
		if (!ApiControllerHasResponseRelationInclude(runtimeProperties.relations?.response?.load?.include)) {
			return response;
		}

		if (!(controller.service instanceof ApiServiceBase)) {
			throw ErrorException("ApiRouteCustom response relation loading requires a controller service extending ApiServiceBase");
		}

		if (Array.isArray(response)) {
			return (await Promise.all(response.map(async (item: unknown): Promise<unknown> => await this.loadCustomResponseRelations(controller.service, runtimeProperties, item)))) as R;
		}

		const responseValue: unknown = response;

		if (ApiRouteResponseIsListEnvelope(responseValue, routeType, entity)) {
			const responseObject: { items: Array<unknown> } = responseValue;
			responseObject.items = await Promise.all(responseObject.items.map(async (item: unknown): Promise<unknown> => await this.loadCustomResponseRelations(controller.service, runtimeProperties, item)));

			return response;
		}

		return (await this.loadCustomResponseRelations(controller.service, runtimeProperties, response)) as R;
	}

	public static async executeGenerated<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>): Promise<unknown> {
		// A REQUEST-scoped or lazy-loaded controller has no bootstrap hook, so its first request is where the repository can be checked.
		ApiControllerAssertRepositoryEntity(options.properties.entity, (options.controller.service as { repository?: unknown } | undefined)?.repository, options.controller.constructor.name);

		const entityInstance: E = new (options.properties.entity as new () => E)();
		const authorizationDecision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined = ApiControllerGeneratedSecuritySnapshot.create(AuthorizationDecisionResolveFromRequest(options.targets.authenticationRequest));
		this.keepSentBody(options.targets.authenticationRequest);

		const beforeData: IApiSubscriberRouteExecutionContextData<E> = { authorizationDecision: ApiControllerGeneratedSecuritySnapshot.createSubscriberView(authorizationDecision), entityMetadata: options.entityMetadata, method: options.method, methodName: options.methodName, properties: options.properties };
		let typedTargets: IApiRouteRuntimeGeneratedTargets<E>;
		let beforeResult: IApiRouteRuntimeGeneratedTargets<E> | undefined;

		try {
			typedTargets = await this.resolveGeneratedTypedTargets(options);
		} catch (error) {
			await this.executeGeneratedErrorSubscribers(options, options.targets, entityInstance, beforeData, authorizationDecision, EApiSubscriberOnType.BEFORE_ERROR, error);

			throw error;
		}

		const beforeContext: IApiSubscriberRouteExecutionContext<E, IApiRouteRuntimeGeneratedTargets<E>, IApiSubscriberRouteExecutionContextData<E>> = {
			DATA: beforeData,
			ENTITY: entityInstance,
			result: typedTargets,
			ROUTE_TYPE: options.method,
		};

		try {
			beforeResult = await ApiSubscriberExecutor.executeRouteSubscribers(options.controller.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, options.method, EApiSubscriberOnType.BEFORE, beforeContext);
		} catch (error) {
			await this.executeGeneratedErrorSubscribers(options, typedTargets, entityInstance, beforeContext.DATA, authorizationDecision, EApiSubscriberOnType.BEFORE_ERROR, error);

			throw error;
		}
		const targets: IApiRouteRuntimeGeneratedTargets<E> = beforeResult ?? typedTargets;

		let errorBoundary: EApiSubscriberOnType.AFTER_ERROR | EApiSubscriberOnType.BEFORE_ERROR = EApiSubscriberOnType.BEFORE_ERROR;

		try {
			const result: unknown = await this.executeGeneratedOperation(options, targets, authorizationDecision, () => {
				errorBoundary = EApiSubscriberOnType.AFTER_ERROR;
			});

			return await this.executeGeneratedResponse(options, targets, entityInstance, beforeContext.DATA, authorizationDecision, result);
		} catch (error) {
			await this.executeGeneratedErrorSubscribers(options, targets, entityInstance, beforeContext.DATA, authorizationDecision, errorBoundary, error);

			throw error;
		}
	}

	/**
	 * Refuses a body that names another value for a field the path addresses, directly or through the relation that field joins: a bound field on every write, and a key column on a write to one row.
	 * A key column the path leaves out has no value to compare with, so a write to one row cannot name it at all. A relation over several columns names such a field only inside its object; any other value is refused by the split.
	 * The body is read as the client sent it and as the route will write it, so a pipe that strips or transforms it changes nothing. The value is not echoed, because it is the client's and the path already names the right one.
	 * @param {ReadonlyArray<Record<string, unknown>>} bodies - The body as the client sent it and as the route will write it.
	 * @param {Record<string, unknown>} pathValues - Values the path binds, by entity property.
	 * @param {ReadonlyArray<string>} unaddressedFields - Key columns the path leaves out on a write to one row.
	 * @param {ReadonlyArray<RelationMetadata>} relations - Relations of the entity.
	 * @throws {BadRequestException} When the body differs from the path.
	 */
	private static assertBodyPathValues(bodies: ReadonlyArray<Record<string, unknown>>, pathValues: Record<string, unknown>, unaddressedFields: ReadonlyArray<string>, relations: ReadonlyArray<RelationMetadata>): void {
		for (const body of bodies) {
			for (const field of [...Object.keys(pathValues), ...unaddressedFields]) {
				const isAddressed: boolean = Object.hasOwn(pathValues, field);

				if (body[field] !== undefined && (!isAddressed || !this.isSamePathValue(body[field], pathValues[field]))) {
					throw this.createBodyParameterException(field, isAddressed ? BODY_PATH_MISMATCH_REJECTION_REASON : BODY_UNADDRESSED_KEY_REJECTION_REASON);
				}

				for (const relation of relations) {
					const joinColumn: TTypeOrmColumnMetadata | undefined = relation.joinColumns.find((column: TTypeOrmColumnMetadata): boolean => column.propertyName === field);
					const relationValue: unknown = body[relation.propertyName];

					if (!joinColumn || relationValue === undefined) {
						continue;
					}

					if (relation.joinColumns.length > 1 && !this.isPlainRecord(relationValue)) {
						continue;
					}

					const referencedName: string | undefined = joinColumn.referencedColumn?.propertyName;
					const relationKey: unknown = this.isPlainRecord(relationValue) && referencedName ? relationValue[referencedName] : relationValue;

					if (relation.joinColumns.length > 1 && relationKey === undefined) {
						continue;
					}

					if (!isAddressed || !this.isSamePathValue(relationKey, pathValues[field])) {
						throw this.createBodyParameterException(relation.propertyName, isAddressed ? BODY_PATH_MISMATCH_REJECTION_REASON : BODY_UNADDRESSED_KEY_REJECTION_REASON);
					}
				}
			}
		}
	}

	/**
	 * Builds the refusal of a body field that the path decides. It names the field and the rule, not the value, because the value is the client's.
	 * @param {string} propertyName - Body property the refusal names.
	 * @param {string} reason - Rule the property breaks.
	 * @returns {BadRequestException} The refusal.
	 */
	private static createBodyParameterException(propertyName: string, reason: string): BadRequestException {
		return new BadRequestException({ details: { propertyName, reason }, error: "Bad Request", message: "PARAMETERS_NOT_VALID", statusCode: HttpStatus.BAD_REQUEST });
	}

	private static async executeCustomErrorSubscribers<E extends IApiBaseEntity, R>(options: IApiRouteRuntimeCustomExecutionOptions<E, R>, entityInstance: E, contextData: IApiRouteRuntimeContextData<E>, onType: EApiSubscriberOnType, error: unknown): Promise<void> {
		const action: string = options.metadata.resource.action;

		const errorContext: IApiSubscriberRouteErrorExecutionContext<E, IApiRouteRuntimeContextData<E>> = {
			action,
			DATA: contextData,
			ENTITY: entityInstance,
			ROUTE_TYPE: options.metadata.route.type,
		};

		await ApiSubscriberExecutor.executeRouteErrorSubscribers(options.executionContext.getClass(), entityInstance, options.metadata.route.type, onType, errorContext, error as Error, action);
	}

	private static async executeCustomResponse<E extends IApiBaseEntity, R>(options: IApiRouteRuntimeCustomExecutionOptions<E, R>, entityInstance: E, contextData: IApiRouteRuntimeContextData<E>, result: R): Promise<R> {
		const action: string = options.metadata.resource.action;
		const responseTarget: TApiControllerTransformDataObjectToTransform<E> = { response: ApiRouteProjectRelationResponse(options.runtimeProperties.relations?.response, result, options.metadata.route.type, options.metadata.resource.entity) as Partial<E> };
		let authorizationDecision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined = AuthorizationDecisionResolveFromRequest(contextData.authenticationRequest);

		const controllerProperties: IApiControllerProperties<E> = {
			entity: options.metadata.resource.entity,
			routes: {},
		};

		authorizationDecision = AuthorizationDecisionAttachResource(authorizationDecision as never, responseTarget.response as never) as IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined;
		ApiControllerTransformData<E>(options.runtimeProperties.response, controllerProperties, responseTarget, contextData);

		const afterContext: IApiSubscriberRouteExecutionContext<E, R, IApiRouteRuntimeContextData<E>> = {
			action,
			DATA: contextData,
			ENTITY: entityInstance,
			result: responseTarget.response as R,
			ROUTE_TYPE: options.metadata.route.type,
		};
		const afterResult: R | undefined = await ApiSubscriberExecutor.executeRouteSubscribers(options.executionContext.getClass(), entityInstance, options.metadata.route.type, EApiSubscriberOnType.AFTER, afterContext, action);
		const finalResult: R = afterResult ?? (responseTarget.response as R);
		const transformedResult: R = await AuthorizationDecisionApplyResult(AuthorizationDecisionAttachResource(authorizationDecision as never, finalResult as never) as never, finalResult as never);

		return ApiRouteSerializeResponse(options.metadata, transformedResult);
	}

	private static async executeDiscriminatedRequestBodyDto<E extends IApiBaseEntity>(runtimeProperties: IApiRouteRuntimeProperties<E>, request: IApiRouteRuntimeHttpRequest<E>): Promise<void> {
		const bodyDto: TApiRouteDiscriminatedDtoProperties | Type<unknown> | undefined = runtimeProperties.dto?.[EApiDtoType.BODY];

		if (!ApiRouteIsDiscriminatedDtoProperties(bodyDto)) {
			return;
		}

		ApiRouteValidateDiscriminatedDtoProperties(bodyDto, "ApiRouteCustom body");

		let selectedDto: Type<unknown> | undefined;
		let transformedBody: unknown;
		let validationErrors: Array<ValidationError> = [];

		try {
			selectedDto = ApiRouteResolveDiscriminatedDto(bodyDto, request.body, "ApiRouteCustom body");
		} catch {
			validationErrors = [ApiRouteCreateDiscriminatedDtoValidationFailure(bodyDto, request.body)];
		}

		if (selectedDto) {
			const uuidFailures: Array<ValidationError> = ApiRouteGetNonCanonicalUuidFailures(selectedDto, request.body, "");

			if (uuidFailures.length > 0) {
				throw new ApiRequestValidationException(uuidFailures);
			}

			transformedBody = plainToInstance(selectedDto as ClassConstructor<unknown>, ApiRoutePrepareDiscriminatedDtoPayload(bodyDto, request.body), bodyDto.transformOptions);
			validationErrors = await validate(transformedBody as object, bodyDto.validatorOptions);
		}

		if (validationErrors.length > 0) {
			throw bodyDto.exceptionFactory ? await bodyDto.exceptionFactory(validationErrors) : new BadRequestException(ApiRouteValidationFlattenErrors(validationErrors));
		}

		request.body = transformedBody as Partial<E>;
	}

	private static async executeGeneratedErrorSubscribers<E extends IApiBaseEntity, R extends EApiRouteType>(
		options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>,
		targets: IApiRouteRuntimeGeneratedTargets<E>,
		entityInstance: E,
		baseData: IApiSubscriberRouteExecutionContextData<E>,
		authorizationDecision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined,
		onType: EApiSubscriberOnType.AFTER_ERROR | EApiSubscriberOnType.BEFORE_ERROR,
		error: unknown,
	): Promise<void> {
		const errorContext: IApiSubscriberRouteErrorExecutionContext<E> = {
			DATA: { ...(baseData as object), authenticationRequest: targets.authenticationRequest, authorizationDecision: ApiControllerGeneratedSecuritySnapshot.createSubscriberView(authorizationDecision), body: targets.body, headers: targets.headers, ip: targets.ip, parameters: targets.parameters, query: targets.query },
			ENTITY: entityInstance,
			ROUTE_TYPE: options.method,
		};

		await ApiSubscriberExecutor.executeRouteErrorSubscribers(options.controller.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, options.method, onType, errorContext, error as Error);
	}

	private static async executeGeneratedOperation<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, targets: IApiRouteRuntimeGeneratedTargets<E>, authorizationDecision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined, markAfterBoundary: () => void): Promise<unknown> {
		const routeConfig: TApiControllerPropertiesRoute<E, R> = options.properties.routes[options.method] ?? {};
		const method: EApiRouteType = options.method;

		if (method === EApiRouteType.PARTIAL_UPDATE || method === EApiRouteType.UPDATE) {
			ApiControllerRejectToManyUpdateKeys(options.properties.entity, targets.body);
			await this.executeGeneratedRequestPipeline(options, targets, [EApiControllerRequestTarget.PARAMETERS, EApiControllerRequestTarget.BODY]);
			const writeTargets: IApiRouteRuntimeGeneratedTargets<E> = { ...targets, body: this.resolveWriteBody(options, targets, this.resolvePathPlan(options)) as never };
			const service: ApiServiceBase<E> = options.controller.service;
			const updateFunction: (this: ApiServiceBase<E>, criteria: Array<TApiFunctionUpdateCriteria<E>> | TApiFunctionUpdateCriteria<E>, properties: never) => Promise<E> = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.UPDATE, EApiFunctionType.UPDATE, options.properties.entity);
			const getFunction: (this: ApiServiceBase<E>, properties: TApiFunctionGetProperties<E>) => Promise<E> = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.GET, EApiFunctionType.GET, options.properties.entity);

			return await this.executeGeneratedTransaction(options, routeConfig, async (eventManager: EntityManager | undefined): Promise<E> => await this.executeGeneratedUpdateOperation(options, writeTargets, authorizationDecision, routeConfig, markAfterBoundary, service, updateFunction, getFunction, eventManager));
		}

		switch (method) {
			case EApiRouteType.CREATE: {
				ApiControllerRejectCreateInverseSideKeys(options.properties.entity, targets.body);
				const pathPlan: IApiControllerPathPlan = this.resolvePathPlan(options);

				await this.executeGeneratedRequestPipeline(options, targets, pathPlan.scopeParameters.length > 0 ? [EApiControllerRequestTarget.PARAMETERS, EApiControllerRequestTarget.BODY] : [EApiControllerRequestTarget.BODY]);
				const writeBody: Record<string, unknown> = Object.assign(this.resolveWriteBody(options, targets, pathPlan), this.resolveRouteWhere(options, targets, pathPlan, pathPlan.scopeParameters));
				const service: ApiServiceBase<E> = options.controller.service;
				const createFunction: (this: ApiServiceBase<E>, properties: never) => Promise<E> = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.CREATE, EApiFunctionType.CREATE, options.properties.entity);
				const getFunction: (this: ApiServiceBase<E>, properties: TApiFunctionGetProperties<E>) => Promise<E> = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.GET, EApiFunctionType.GET, options.properties.entity);
				const scopeWhere: TApiAuthorizationScopeWhere<E> = AuthorizationScopeMergeWhere(undefined, ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(authorizationDecision));
				const isScopedWrite: boolean = scopeWhere !== undefined && Object.keys(scopeWhere).length > 0;
				const repository: Repository<E> | undefined = options.controller.service.repository;
				// Request-scoped controllers never reach the startup hook that refuses this.
				ApiControllerGeneratedCreateTemporalKeyContract.assertIdentifiable(repository, `Controller "${options.controller.constructor.name}" route "${options.method}"`, Boolean(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, options.controller.constructor)));
				ApiControllerGeneratedCreateTemporalKeyContract.parse(repository, writeBody);

				return await this.executeGeneratedTransaction(
					options,
					routeConfig,
					async (eventManager: EntityManager | undefined): Promise<E> => {
						const createInput: DeepPartial<E> = writeBody as DeepPartial<E>;
						await this.loadWriteRelations(options, routeConfig, writeBody);
						markAfterBoundary();

						// The reload checks the row the protected function stored, by the key it reported before its subscribers could replace the result.
						const insertedKey: ObjectLiteral = await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.CREATE, createInput, scopeWhere, async (): Promise<ObjectLiteral> => await ApiControllerGeneratedInsertedKeyStorage.run(createInput, async (): Promise<E> => await Reflect.apply(createFunction, service, [createInput])));
						const identityRepository: Repository<E> | undefined = repository && eventManager?.getRepository<E>(repository.target);
						const identity: FindOptionsWhere<E> = await ApiControllerGeneratedCreateIdentityContract.identify(identityRepository, insertedKey as Partial<Record<keyof E, unknown>>);

						const requestProperties: TApiFunctionGetProperties<E> = {
							relationLoadStrategy: routeConfig.relations?.response?.load?.relationLoadStrategy,
							relations: routeConfig.relations?.response?.load?.include,
							where: AuthorizationScopeMergeWhere(identity, scopeWhere),
						};

						const created: E = await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, requestProperties, requestProperties.where, async (): Promise<E> => {
							try {
								return await Reflect.apply(getFunction, service, [requestProperties]);
							} catch (error) {
								if (isScopedWrite && ApiControllerGeneratedReadScopeStorage.isReadMissed(requestProperties)) {
									throw new ForbiddenException();
								}

								throw error;
							}
						});

						// A row another request committed into the millisecond of the created key would answer in its place.
						await ApiControllerGeneratedCreateIdentityContract.confirm(identityRepository, identity);

						return created;
					},
					true,
				);
			}

			case EApiRouteType.DELETE: {
				await this.executeGeneratedRequestPipeline(options, targets, [EApiControllerRequestTarget.PARAMETERS]);
				const service: ApiServiceBase<E> = options.controller.service;
				const deleteFunction: (this: ApiServiceBase<E>, criteria: Array<TApiFunctionDeleteCriteria<E>> | TApiFunctionDeleteCriteria<E>) => Promise<void> = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.DELETE, EApiFunctionType.DELETE, options.properties.entity);

				await this.executeGeneratedTransaction(options, routeConfig, async (eventManager: EntityManager | undefined): Promise<void> => {
					const deleteCriteria: Array<TApiFunctionDeleteCriteria<E>> | TApiFunctionDeleteCriteria<E> = await this.resolveWriteCriteria(options, targets, authorizationDecision, eventManager);

					markAfterBoundary();
					await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.DELETE, deleteCriteria, deleteCriteria, async (): Promise<void> => {
						await Reflect.apply(deleteFunction, service, [deleteCriteria]);
					});
				});

				return undefined;
			}

			case EApiRouteType.GET: {
				await this.executeGeneratedRequestPipeline(options, targets, [EApiControllerRequestTarget.PARAMETERS]);
				const service: ApiServiceBase<E> = options.controller.service;
				const getFunction: (this: ApiServiceBase<E>, properties: TApiFunctionGetProperties<E>) => Promise<E> = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.GET, EApiFunctionType.GET, options.properties.entity);

				return await this.executeGeneratedTransaction(options, routeConfig, async (eventManager: EntityManager | undefined): Promise<E> => {
					const identityPlan: IApiControllerIdentityPlan | undefined = this.resolveIdentityPlan(options.controller, options.methodName);
					const pathPlan: IApiControllerPathPlan = this.resolvePathPlan(options);
					const routeWhere: FindOptionsWhere<E> = this.resolveRouteWhere(options, targets, pathPlan, ApiControllerPathRouteParameters(pathPlan, method, identityPlan));

					const requestProperties: TApiFunctionGetProperties<E> = {
						relationLoadStrategy: routeConfig.relations?.response?.load?.relationLoadStrategy,
						relations: routeConfig.relations?.response?.load?.include,
						where: AuthorizationScopeMergeWhere(routeWhere, ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(authorizationDecision)),
					};

					// A row a finer stored value keeps out of the full key stays readable, so the read keeps the where its path names.
					if (!pathPlan.isKeyCovered && requestProperties.where) {
						await this.findKeyMatches(options.controller.service, requestProperties.where, pathPlan.primaryFields, eventManager);
					}

					markAfterBoundary();

					return await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, requestProperties, requestProperties.where, async (): Promise<E> => await Reflect.apply(getFunction, service, [requestProperties]));
				});
			}

			case EApiRouteType.GET_LIST: {
				const pathPlan: IApiControllerPathPlan | undefined = ApiControllerPathPlanGet(Object.getPrototypeOf(options.controller) as object, options.methodName);
				const scopedPathPlan: IApiControllerPathPlan | undefined = pathPlan && pathPlan.scopeParameters.length > 0 ? pathPlan : undefined;

				await this.executeGeneratedRequestPipeline(options, targets, scopedPathPlan ? [EApiControllerRequestTarget.PARAMETERS, EApiControllerRequestTarget.QUERY] : [EApiControllerRequestTarget.QUERY]);

				const requestQuery: TApiControllerGetListQuery<E, EApiControllerGetListQueryPaginationMode> | undefined = targets.query;

				if (!requestQuery) {
					throw ErrorException("Query target is required for GET_LIST routes");
				}

				const queryPlan: IApiControllerGetListQueryPlan | undefined = ApiControllerGetListQueryPlanGet(Object.getPrototypeOf(options.controller) as object, options.methodName);
				let cursorPlan: TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR> | undefined;

				if (queryPlan && !queryPlan.filter.isLegacy) {
					ApiControllerGetListTransformAssertRequestRelationTargets(requestQuery, options.entityMetadata, routeConfig.security?.authentication?.guard);
				}

				if (queryPlan && ApiControllerGetListQueryGetPaginationMode(queryPlan) === EApiControllerGetListQueryPaginationMode.CURSOR) {
					const compiledPlan: Partial<TApiControllerGetListQueryCompiledPlan> = queryPlan as Partial<TApiControllerGetListQueryCompiledPlan>;

					if (!compiledPlan.order?.serverFields) {
						throw ErrorException("CURSOR GET_LIST compiled query plan is unavailable");
					}

					cursorPlan = queryPlan as TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR>;
				}

				const routeSource: string = `Controller "${options.controller.constructor.name}" route "${options.method}"`;
				const cursorRuntimeQuery: TApiControllerGetListCursorQueryRuntimeResult | undefined = cursorPlan ? (ApiControllerGetListQueryRuntime.parse(requestQuery, cursorPlan) as unknown as TApiControllerGetListCursorQueryRuntimeResult) : undefined;
				const pageRuntimeQuery: IApiControllerGetListQueryRuntimeResult | undefined = !cursorPlan && queryPlan ? ApiControllerGetListQueryRuntime.parse(requestQuery, queryPlan) : undefined;
				const runtimeQuery: IApiControllerGetListQueryRuntimeResult | TApiControllerGetListCursorQueryRuntimeResult | undefined = cursorRuntimeQuery ?? pageRuntimeQuery;
				const queryDto: Type<unknown> | undefined = ApiControllerGetDtoWithPathPlan(options.properties, options.entityMetadata, options.method, EApiDtoType.QUERY, routeConfig, options.schemaPrefix, queryPlan, pathPlan);
				const validatedQuery: TApiControllerGetListQuery<E, EApiControllerGetListQueryPaginationMode> = queryDto ? await ApiControllerGetListQueryValidate(queryDto, requestQuery) : requestQuery;
				// Only the database query uses the validated copy; subscribers keep the query that route-before subscribers produced.
				const query: TApiControllerGetListQuery<E, EApiControllerGetListQueryPaginationMode> = !queryPlan || queryPlan.filter.isLegacy ? validatedQuery : requestQuery;

				// A query plan already holds the client's order to its fields.
				if (!queryPlan && queryDto) {
					ApiControllerGetListQueryAssertOrderable(options.properties, options.entityMetadata, queryDto, requestQuery, query);
				}

				// Date-time values the DTO or plan accepted must also name a calendar instant before any query.
				ApiControllerGetListQueryRuntime.assertDateTimeFilterValues(requestQuery, this.resolveDateTimeFilterPaths(options.controller.service, requestQuery, routeSource));

				const {
					limit,
					orderBy,
					orderDirection,
					page,
					...getListQuery
				}: {
					limit: number;
					orderBy?: keyof E;
					orderDirection?: EFilterOrderDirection;
					page?: number;
				} = query;
				const listResponseDto: IApiControllerPropertiesRouteGetListResponseDtoConfig | Type<unknown> | undefined = (routeConfig as TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>).dto?.[EApiDtoType.RESPONSE];
				const listPublishedFields: ReadonlySet<string> | undefined = listResponseDto ? ApiControllerGetListResponsePublishedFields(listResponseDto) : undefined;

				// The startup check keeps such a column out of a typed plan; a plan that skipped it, as a bare ApiControllerFactory does, answers as the legacy path does.
				if (runtimeQuery?.ast?.nodes.some((node: IApiControllerGetListQueryAstNode): boolean => ApiControllerGetListIsHiddenColumn(options.entityMetadata, node.path, routeConfig.security?.authentication?.guard, listPublishedFields))) {
					throw new BadRequestException("FILTER_NOT_VALID");
				}

				// Built before the transaction, so a value outside the published schema, or a column the list response hides, answers 400 before any SQL.
				const filter: TApiFunctionGetListPropertiesWhere<E> = runtimeQuery?.ast ? ApiControllerGetListQueryRuntime.compileWhere<E>(runtimeQuery.ast) : ApiControllerGetListTransformFilter<E>(runtimeQuery?.filterQuery ?? getListQuery, options.entityMetadata, routeConfig.security?.authentication?.guard, listPublishedFields);
				const service: ApiServiceBase<E> = options.controller.service;
				const getManyFunction: ((this: ApiServiceBase<E>, properties: TApiFunctionGetManyProperties<E>) => Promise<Array<E>>) | undefined = cursorRuntimeQuery ? ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.GET_MANY, EApiFunctionType.GET_MANY, options.properties.entity) : undefined;
				const getListFunction: ((this: ApiServiceBase<E>, properties: TApiFunctionGetListProperties<E>) => Promise<unknown>) | undefined = cursorRuntimeQuery ? undefined : ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.GET_LIST, EApiFunctionType.GET_LIST, options.properties.entity);

				return await this.executeGeneratedTransaction(options, routeConfig, async (eventManager: EntityManager | undefined): Promise<unknown> => {
					const routeScopedFilter: TApiAuthorizationScopeWhere<E> = scopedPathPlan ? AuthorizationScopeMergeWhere(filter, this.resolveRouteWhere(options, targets, scopedPathPlan, scopedPathPlan.scopeParameters)) : filter;
					const scopedFilter: Array<TApiFunctionGetListPropertiesWhere<E>> | TApiFunctionGetListPropertiesWhere<E> | undefined = AuthorizationScopeMergeWhere(routeScopedFilter, ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(authorizationDecision));
					const effectiveLimit: number = runtimeQuery?.limit ?? limit;
					const effectiveOrderBy: keyof E | string | undefined = runtimeQuery?.orderBy ?? orderBy;
					const effectiveOrderDirection: EFilterOrderDirection | undefined = runtimeQuery?.orderDirection ?? orderDirection;
					const effectivePage: number | undefined = pageRuntimeQuery?.page ?? page;

					if (cursorRuntimeQuery) {
						if (!cursorPlan || !cursorRuntimeQuery.ast || !cursorRuntimeQuery.order?.length) {
							throw ErrorException("Compiled CURSOR GET_LIST query plan is incomplete");
						}

						const baseProperties: TApiFunctionGetManyProperties<E> = {
							relationLoadStrategy: routeConfig.relations?.response?.load?.relationLoadStrategy,
							relations: routeConfig.relations?.response?.load?.include,
							where: scopedFilter ?? filter,
						};
						const routePath: string = options.properties.path ?? (options.properties.entity.name ? options.properties.entity.name.toLowerCase() : "UnknownResource");
						const contextHash: string = ApiControllerGetListCursorRuntime.createContextHash(routePath, targets.parameters, cursorPlan, cursorRuntimeQuery.ast, cursorRuntimeQuery.order, scopedPathPlan?.signature);
						let direction: "after" | "before" | undefined;

						if (cursorRuntimeQuery.after) {
							direction = "after";
						} else if (cursorRuntimeQuery.before) {
							direction = "before";
						}

						const cursor: string | undefined = cursorRuntimeQuery.after ?? cursorRuntimeQuery.before;

						if (!getManyFunction) {
							throw ErrorException("Generated CURSOR GET_LIST function capability is not available");
						}

						const activeRepository: Repository<E> = this.resolveActiveRepository(service, eventManager);
						const validateStorageValue: TApiControllerGetListCursorExecutionOptions<E>["validateStorageValue"] = ApiControllerGetListCursorDataSourceContract.createRouteValueValidator(activeRepository, cursorPlan, routeSource);

						return await ApiControllerGetListCursorRuntime.execute<E>({
							baseProperties,
							contextHash,
							cursor,
							direction,
							limit: effectiveLimit,
							onBeforeQuery: markAfterBoundary,
							order: cursorRuntimeQuery.order,
							plan: cursorPlan,
							run: async (properties: TApiFunctionGetManyProperties<E>): Promise<Array<E>> => await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_MANY, properties, properties.where, async (): Promise<Array<E>> => await Reflect.apply(getManyFunction, service, [properties])),
							validateStorageValue,
						});
					}

					if (effectivePage === undefined) {
						throw ErrorException("Compiled PAGE GET_LIST query plan is incomplete");
					}

					const requestProperties: TApiFunctionGetListProperties<E> = {
						relationLoadStrategy: routeConfig.relations?.response?.load?.relationLoadStrategy,
						relations: routeConfig.relations?.response?.load?.include,
						skip: effectiveLimit * (effectivePage - 1),
						take: effectiveLimit,
						where: scopedFilter ?? filter,
					};

					if (effectiveOrderBy) {
						requestProperties.order = { [effectiveOrderBy as never as string]: effectiveOrderDirection ?? FUNCTION_API_DECORATOR_CONSTANT.DEFAULT_FILTER_ORDER_BY_DIRECTION } as FindOptionsOrder<E>;
					}

					if (runtimeQuery?.order?.length) {
						requestProperties.order = Object.fromEntries(runtimeQuery.order.map((entry: IApiControllerGetListQueryPlanOrderEntry): [string, EFilterOrderDirection] => [entry.field, entry.direction])) as FindOptionsOrder<E>;
					}

					if (!getListFunction) {
						throw ErrorException("Generated PAGE GET_LIST function capability is not available");
					}

					markAfterBoundary();

					return await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_LIST, requestProperties, requestProperties.where, async (): Promise<unknown> => await Reflect.apply(getListFunction, service, [requestProperties]));
				});
			}
		}
	}

	private static async executeGeneratedRequestPipeline<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, targets: IApiRouteRuntimeGeneratedTargets<E>, targetOrder: Array<EApiControllerRequestTarget>): Promise<void> {
		const routeConfig: TApiControllerPropertiesRoute<E, R> = options.properties.routes[options.method] ?? {};
		const requestTargets: Partial<Record<EApiControllerRequestTarget, unknown>> | undefined = routeConfig.request;
		const transformTargets: TApiControllerTransformDataTargets<E> | undefined = routeConfig.request;

		for (const target of targetOrder) {
			if (target === EApiControllerRequestTarget.PARAMETERS) {
				ApiControllerTransformRouteData<E>(transformTargets, options.properties, { parameters: targets.parameters }, { authenticationRequest: targets.authenticationRequest, headers: targets.headers, ip: targets.ip });
				await ApiControllerValidateRequest<E>(requestTargets?.[EApiControllerRequestTarget.PARAMETERS] as IApiControllerPropertiesRouteBaseRequestTarget<E> | undefined, options.properties, targets.parameters ?? {});
				const parametersRule: IApiControllerParametersRule | undefined = this.resolveParametersRule(options.controller, options.methodName);

				// Subscribers and transformers may replace typed path values, so the values the route uses are checked once more.
				if (parametersRule) {
					targets.parameters = await ApiControllerParametersValidate<E>(parametersRule, targets.parameters);
				}
			}

			if (target === EApiControllerRequestTarget.QUERY) {
				ApiControllerTransformRouteData<E>(transformTargets, options.properties, { query: targets.query }, { authenticationRequest: targets.authenticationRequest, headers: targets.headers, ip: targets.ip });
				await ApiControllerValidateRequest<E, EApiControllerGetListQueryPaginationMode>(requestTargets?.[EApiControllerRequestTarget.QUERY] as IApiControllerPropertiesRouteBaseRequestTarget<E, EApiControllerGetListQueryPaginationMode> | undefined, options.properties, targets.query ?? {});
			}

			if (target === EApiControllerRequestTarget.BODY) {
				ApiControllerTransformRouteData<E>(transformTargets, options.properties, { body: targets.body }, { authenticationRequest: targets.authenticationRequest, headers: targets.headers, ip: targets.ip });
				await ApiControllerValidateRequest<E>(requestTargets?.[EApiControllerRequestTarget.BODY] as IApiControllerPropertiesRouteBaseRequestTarget<E> | undefined, options.properties, (targets.body ?? {}) as Partial<E>);
			}
		}
	}

	private static async executeGeneratedResponse<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, targets: IApiRouteRuntimeGeneratedTargets<E>, entityInstance: E, baseData: IApiSubscriberRouteExecutionContextData<E>, authorizationDecision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined, result: unknown): Promise<unknown> {
		const routeConfig: TApiControllerPropertiesRoute<E, R> = options.properties.routes[options.method] ?? {};
		const queryPlan: IApiControllerGetListQueryPlan | undefined = options.method === EApiRouteType.GET_LIST ? ApiControllerGetListQueryPlanGet(Object.getPrototypeOf(options.controller) as object, options.methodName) : undefined;
		let cursorOrderFields: ReadonlyArray<string> | undefined;
		let cursorResponseSignature: string | undefined;

		if (ApiControllerGetListQueryGetPaginationMode(queryPlan) === EApiControllerGetListQueryPaginationMode.CURSOR && queryPlan) {
			const protectedFields: ReadonlyArray<string> = ApiControllerGetListQueryResolveCursorOrderFields(queryPlan.order);

			if (protectedFields.length === 0) {
				throw ErrorException("CURSOR GET_LIST response requires its effective order");
			}

			cursorOrderFields = protectedFields;
			cursorResponseSignature = ApiControllerGetListCursorRuntime.createResponseInvariantSignature(result, protectedFields);
		}

		const assertCursorResponseInvariant = (value: unknown): void => {
			if (cursorOrderFields && cursorResponseSignature) {
				ApiControllerGetListCursorRuntime.assertResponseInvariant(value, cursorOrderFields, cursorResponseSignature);
			}
		};
		const responseTarget: TApiControllerTransformDataObjectToTransform<E> = { response: result as Partial<E> };
		const responseResource: E | undefined = responseTarget.response as E | undefined;

		ApiControllerTransformData<E>(routeConfig.response, options.properties, responseTarget, { authenticationRequest: targets.authenticationRequest, headers: targets.headers, ip: targets.ip });
		assertCursorResponseInvariant(responseTarget.response);

		const afterContext: IApiSubscriberRouteExecutionContext<E> = {
			DATA: { ...(baseData as object), authenticationRequest: targets.authenticationRequest, authorizationDecision: ApiControllerGeneratedSecuritySnapshot.createSubscriberView(authorizationDecision, responseResource), body: targets.body, headers: targets.headers, ip: targets.ip, parameters: targets.parameters, query: targets.query },
			ENTITY: responseTarget.response as E,
			result: responseTarget.response,
			ROUTE_TYPE: options.method,
		};
		const afterResult: unknown = await ApiSubscriberExecutor.executeRouteSubscribers(options.controller.constructor as new (...arguments_: Array<unknown>) => unknown, (responseTarget.response ?? entityInstance) as E, options.method, EApiSubscriberOnType.AFTER, afterContext);
		const finalResponse: unknown = afterResult ?? responseTarget.response;
		assertCursorResponseInvariant(finalResponse);
		const transformedResponse: unknown = await AuthorizationDecisionApplyResult(ApiControllerGeneratedSecuritySnapshot.withResource(authorizationDecision, finalResponse as E) as never, finalResponse as never);
		assertCursorResponseInvariant(transformedResponse);
		const identityPlan: IApiControllerIdentityPlan | undefined = this.resolveIdentityPlan(options.controller, options.methodName);
		const dto: TApiRouteDiscriminatedDtoProperties | Type<unknown> | undefined = ApiControllerGetResponseDto(options.properties, options.entityMetadata, options.method, routeConfig, options.schemaPrefix, queryPlan, identityPlan);
		const projectedResponse: unknown = ApiRouteProjectRelationResponse(routeConfig.relations?.response, transformedResponse, options.method);

		assertCursorResponseInvariant(projectedResponse);
		const serializedResponse: unknown = ApiControllerSerializeRouteResponse(routeConfig, dto, projectedResponse);

		if (cursorOrderFields && cursorResponseSignature) {
			const wireResponse: unknown = ClassTransformerFreeFormValue.instanceToPlain(serializedResponse);

			assertCursorResponseInvariant(wireResponse);

			return wireResponse;
		}

		return serializedResponse;
	}

	private static async executeGeneratedTransaction<E extends IApiBaseEntity, R extends EApiRouteType, T>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, routeConfig: TApiControllerPropertiesRoute<E, R>, callback: (eventManager: EntityManager | undefined) => Promise<T>, isTransactionRequired: boolean = false): Promise<T> {
		const mode: EApiFunctionTransactionMode = routeConfig.transaction?.mode ?? EApiFunctionTransactionMode.SUPPORTS;
		const activeEventManager: EntityManager | undefined = ApiFunctionContextStorage.getTransactionRegistry() ? ApiFunctionContextStorage.getEventManager() : undefined;

		if (mode === EApiFunctionTransactionMode.NONE && activeEventManager) {
			throw ErrorException("ApiRoute generated transaction mode NONE cannot run inside an active transaction");
		}

		if (mode === EApiFunctionTransactionMode.MANDATORY && !activeEventManager) {
			throw ErrorException("ApiRoute generated transaction mode MANDATORY requires an active transaction");
		}

		// A create stays uncommitted until its reload confirms the stored row, so SUPPORTS has to own a transaction here.
		if ((mode === EApiFunctionTransactionMode.REQUIRED || (mode === EApiFunctionTransactionMode.SUPPORTS && isTransactionRequired)) && !activeEventManager) {
			const repository: Repository<E> | undefined = options.controller.service.repository;

			if (!repository) {
				throw ErrorException("Repository is not available in this context");
			}

			return await ApiFunctionTransactionRuntime.execute({
				callback,
				dataSource: repository.manager.dataSource,
				owner: {
					entityName: options.properties.entity.name ?? options.entityMetadata.tableName,
					kind: EApiFunctionTransactionOwnerKind.ROUTE,
					methodName: options.methodName,
					routeType: options.method,
				},
			});
		}

		if (isTransactionRequired && !activeEventManager) {
			throw ErrorException("ApiRoute generated transaction mode cannot run a create without a transaction");
		}

		return await callback(activeEventManager);
	}

	private static async executeGeneratedUpdateOperation<E extends IApiBaseEntity, R extends EApiRouteType>(
		options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>,
		targets: IApiRouteRuntimeGeneratedTargets<E>,
		authorizationDecision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined,
		routeConfig: TApiControllerPropertiesRoute<E, R>,
		markAfterBoundary: () => void,
		service: ApiServiceBase<E>,
		updateFunction: (this: ApiServiceBase<E>, criteria: Array<TApiFunctionUpdateCriteria<E>> | TApiFunctionUpdateCriteria<E>, properties: never) => Promise<E>,
		getFunction: (this: ApiServiceBase<E>, properties: TApiFunctionGetProperties<E>) => Promise<E>,
		eventManager: EntityManager | undefined,
	): Promise<E> {
		const responseLoad: IApiControllerPropertiesRouteBaseRelationsResponseLoad<E> | undefined = routeConfig.relations?.response?.load;

		targets.body ??= {} as never;
		await this.loadWriteRelations(options, routeConfig, targets.body as Record<string, unknown>);
		const updateCriteria: NonNullable<TApiAuthorizationScopeWhere<E>> = await this.resolveWriteCriteria(options, targets, authorizationDecision, eventManager);
		markAfterBoundary();
		await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.UPDATE, updateCriteria, updateCriteria, async (): Promise<E> => await Reflect.apply(updateFunction, service, [updateCriteria, (targets.body ?? {}) as never]));

		// The route answers with the row it wrote, read as GET reads it by the key the request resolved, so neither the body's raw relation keys nor the update result shape the response.
		const requestProperties: TApiFunctionGetProperties<E> = {
			relationLoadStrategy: responseLoad?.relationLoadStrategy,
			relations: responseLoad?.include,
			// The write addressed one row by these criteria and the body cannot change its key, so they still name that row.
			where: updateCriteria,
		};

		return await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, requestProperties, requestProperties.where, async (): Promise<E> => await Reflect.apply(getFunction, service, [requestProperties]));
	}

	private static async executeRequestTargets<E extends IApiBaseEntity>(metadata: IApiRouteMetadata<E>, runtimeProperties: IApiRouteRuntimeProperties<E>, request: IApiRouteRuntimeHttpRequest<E>, contextData: IApiRouteRuntimeContextData<E>): Promise<void> {
		const controllerProperties: IApiControllerProperties<E> = {
			entity: metadata.resource.entity,
			routes: {},
		};
		const requestTargets: Partial<Record<EApiControllerRequestTarget, unknown>> | undefined = runtimeProperties.request;

		ApiControllerTransformRouteData<E>(runtimeProperties.request, controllerProperties, { parameters: request.params }, contextData);
		await ApiControllerValidateRequest<E>(requestTargets?.[EApiControllerRequestTarget.PARAMETERS] as IApiControllerPropertiesRouteBaseRequestTarget<E> | undefined, controllerProperties, request.params ?? {});
		ApiControllerTransformRouteData<E>(runtimeProperties.request, controllerProperties, { query: request.query as TApiControllerGetListQuery<E, EApiControllerGetListQueryPaginationMode> | undefined }, contextData);
		await ApiControllerValidateRequest<E, EApiControllerGetListQueryPaginationMode>(requestTargets?.[EApiControllerRequestTarget.QUERY] as IApiControllerPropertiesRouteBaseRequestTarget<E, EApiControllerGetListQueryPaginationMode> | undefined, controllerProperties, request.query ?? {});
		ApiControllerTransformRouteData<E>(runtimeProperties.request, controllerProperties, { body: request.body as E | undefined }, contextData);
		await ApiControllerValidateRequest<E>(requestTargets?.[EApiControllerRequestTarget.BODY] as IApiControllerPropertiesRouteBaseRequestTarget<E> | undefined, controllerProperties, request.body ?? {});
		await this.executeDiscriminatedRequestBodyDto(runtimeProperties, request);
	}

	/**
	 * Reads the key of the rows a where clause names, through the active transaction. Several rows mean the deployed key promise is wrong, which a client cannot fix.
	 * Rows are counted as the database returns them: entity hydration merges rows whose keys are equal once a `Date` drops what is finer than a millisecond, so it would count two such rows as one.
	 * @template E - Entity type owned by the service.
	 * @param {ApiServiceBase<E>} service - Service of the route.
	 * @param {TApiAuthorizationScopeWhere<E>} where - Where clause, with the request's security scope applied.
	 * @param {ReadonlyArray<string>} primaryFields - Key columns of the entity.
	 * @param {EntityManager | undefined} eventManager - Active transaction manager.
	 * @returns {Promise<Array<E>>} The row, or none.
	 * @throws {InternalServerErrorException} When the where clause names several rows.
	 */
	private static async findKeyMatches<E extends IApiBaseEntity>(service: ApiServiceBase<E>, where: NonNullable<TApiAuthorizationScopeWhere<E>>, primaryFields: ReadonlyArray<string>, eventManager: EntityManager | undefined): Promise<Array<E>> {
		const matches: { entities: Array<E>; raw: Array<unknown> } = await this.resolveActiveRepository(service, eventManager)
			.createQueryBuilder()
			.setFindOptions({
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				loadEagerRelations: false,
				select: Object.fromEntries(primaryFields.map((field: string): [string, boolean] => [field, true])) as FindOptionsSelect<E>,
				where,
			})
			.distinct(true)
			.limit(PATH_MATCH_LIMIT)
			.getRawAndEntities();

		if (matches.raw.length > 1) {
			throw new InternalServerErrorException("Route path names more than one row");
		}

		return matches.entities;
	}

	/**
	 * Tells whether a column stores a date and time.
	 * @param {Repository<IApiBaseEntity>} repository - Repository of the entity.
	 * @param {string} field - Property name of the column.
	 * @returns {boolean} Whether the column stores a date and time.
	 */
	private static isDateTimeColumn(repository: Repository<IApiBaseEntity>, field: string): boolean {
		const column: TTypeOrmColumnMetadata | undefined = repository.metadata.findColumnWithPropertyPath(field);
		const columnType: string | undefined = column ? repository.manager.dataSource.driver.normalizeType(column) : undefined;

		return columnType !== undefined && (DATABASE_COLUMN_TYPE_CONSTANT.DATE_TIME.has(columnType) || DATABASE_COLUMN_TYPE_CONSTANT.INSTANT.has(columnType));
	}

	/**
	 * Tells whether a JavaScript `Date` reproduces every value a column of the entity stores.
	 * @param {Repository<IApiBaseEntity>} repository - Repository of the entity.
	 * @param {string} field - Property name of the column.
	 * @returns {boolean} Whether the column keeps at most milliseconds.
	 */
	private static isExactInstantColumn(repository: Repository<IApiBaseEntity>, field: string): boolean {
		const column: TTypeOrmColumnMetadata | undefined = repository.metadata.findColumnWithPropertyPath(field);

		return column !== undefined && ApiControllerPathIsExactInstant(repository.manager.dataSource.driver.normalizeType(column), column.precision);
	}

	/**
	 * Tells whether a value is a plain object a body can name columns in, as opposed to null, an array or a single value. A `Date` is a single value, as a transforming pipe makes it from a date and time string.
	 * @param {unknown} value - Value to inspect.
	 * @returns {boolean} Whether the value is a non-null object that is neither an array nor a `Date`.
	 */
	private static isPlainRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
	}

	/**
	 * Tells whether a relation value only references the related row: a scalar, or an object naming nothing but the columns the join references and the related key columns.
	 * @param {RelationMetadata} relation - The relation.
	 * @param {unknown} value - Value the body gives the relation.
	 * @returns {boolean} Whether the value carries no other value of the related row.
	 */
	private static isRelationReference(relation: RelationMetadata, value: unknown): boolean {
		if (!this.isPlainRecord(value)) {
			return true;
		}

		const referencedNames: Set<string> = new Set<string>([...relation.joinColumns.map((column: TTypeOrmColumnMetadata): string | undefined => column.referencedColumn?.propertyName), ...relation.inverseEntityMetadata.primaryColumns.map((column: TTypeOrmColumnMetadata): string => column.propertyName)].filter((name: string | undefined): name is string => name !== undefined));

		return Object.keys(value).every((key: string): boolean => referencedNames.has(key));
	}

	/**
	 * Tells whether a value can name the referenced column of a relation over one column by itself: a string, a number, a boolean or a valid `Date`.
	 * @param {unknown} value - Value the body gives the relation.
	 * @returns {boolean} Whether the value is such a scalar.
	 */
	private static isRelationScalar(value: unknown): boolean {
		return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || (value instanceof Date && !Number.isNaN(value.getTime()));
	}

	/**
	 * Compares a body value with the value its path parameter binds. Only the string the path itself would carry names that value: a date and time in its canonical UTC millisecond form, anything else as written.
	 * @param {unknown} value - Value the request body carries.
	 * @param {unknown} pathValue - Value the request path binds.
	 * @returns {boolean} Whether both name the same value.
	 */
	private static isSamePathValue(value: unknown, pathValue: unknown): boolean {
		return typeof value === "string" && value === (pathValue instanceof Date ? pathValue.toISOString() : String(pathValue));
	}

	/**
	 * Tells whether two values the route writes into one column are the same, a `Date` and its canonical string included.
	 * @param {unknown} left - One value.
	 * @param {unknown} right - The other value.
	 * @returns {boolean} Whether both write the same value.
	 */
	private static isSameWriteValue(left: unknown, right: unknown): boolean {
		return this.toWriteValue(left) === this.toWriteValue(right);
	}

	/**
	 * Keeps a copy of the request body as the client sent it, so the checks against the path read the sent value even after a transformer changed the body object in place.
	 * @param {unknown} request - The HTTP request of the route.
	 */
	private static keepSentBody(request: unknown): void {
		const body: unknown = (request as { body?: unknown } | undefined)?.body;

		if (typeof request !== "object" || request === null || !this.isPlainRecord(body)) {
			return;
		}

		try {
			this.SENT_BODIES.set(request, structuredClone(body));
		} catch {
			// A body that cannot be copied stays readable as it is, as before.
		}
	}

	private static async loadCustomResponseRelations<E extends IApiBaseEntity>(service: ApiServiceBase<E>, runtimeProperties: IApiRouteRuntimeProperties<E>, response: unknown): Promise<unknown> {
		if (response === null || typeof response !== "object") {
			return response;
		}

		const repository: unknown = (service as { repository?: unknown }).repository;
		const primaryFields: ReadonlyArray<string> = repository instanceof Repository ? repository.metadata.primaryColumns.map((column: TTypeOrmColumnMetadata): string => column.propertyName) : ["id"];
		const key: Record<string, unknown> = {};

		for (const field of primaryFields) {
			const value: unknown = (response as Record<string, unknown>)[field];

			if (value === undefined || value === null) {
				return response;
			}

			key[field] = value;
		}

		return await service.get({
			relationLoadStrategy: runtimeProperties.relations?.response?.load?.relationLoadStrategy,
			relations: runtimeProperties.relations?.response?.load?.include,
			where: await this.resolveKeyWhere(service, key, primaryFields),
		});
	}

	/**
	 * Loads the request relations of a generated write, then removes every relation whose join columns the entity declares, that loading left as the body sent it, and that only references the related row. The split already wrote its value into the entity's own column, which the save then reads alone: a reference the client sent, such as a `Date` a pipe made from a string or an object naming only key columns, would otherwise reach the save as a related row, and an update would insert another row. A loaded row stays for the save and its subscribers, and so do a null that clears the relation and an object with other values of the related row, which a cascade writes.
	 * @template E - Entity type owned by the route.
	 * @template R - Generated route type.
	 * @param {IApiRouteRuntimeGeneratedExecutionOptions<E, R>} options - Generated route execution options.
	 * @param {TApiControllerPropertiesRoute<E, R>} routeConfig - Route configuration.
	 * @param {Record<string, unknown>} body - The body the route writes, changed in place.
	 * @returns {Promise<void>} Resolves once the body holds only loaded relations.
	 */
	private static async loadWriteRelations<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, routeConfig: TApiControllerPropertiesRoute<E, R>, body: Record<string, unknown>): Promise<void> {
		const repository: unknown = (options.controller.service as { repository?: unknown }).repository;
		const relations: ReadonlyArray<RelationMetadata> = repository instanceof Repository ? (repository as Repository<IApiBaseEntity>).metadata.relations.filter((relation: RelationMetadata): boolean => relation.joinColumns.length > 0 && relation.joinColumns.every((column: TTypeOrmColumnMetadata): boolean => !column.isVirtual)) : [];
		const sentValues: Map<string, unknown> = new Map<string, unknown>(relations.map((relation: RelationMetadata): [string, unknown] => [relation.propertyName, body[relation.propertyName]]));

		await ApiControllerHandleRequestRelations(options.controller, options.properties, routeConfig.relations?.request, body as DeepPartial<E>);

		for (const relation of relations) {
			const value: unknown = body[relation.propertyName];

			if (value !== undefined && value !== null && value === sentValues.get(relation.propertyName) && this.isRelationReference(relation, value)) {
				Reflect.deleteProperty(body, relation.propertyName);
			}
		}
	}

	/**
	 * Reads the value a relation gives one of its join columns: the referenced property of an object, or a scalar itself, which names the one referenced column of a relation over one column.
	 * @param {unknown} value - Value the body gives the relation.
	 * @param {string | undefined} referencedName - Property of the related entity the join column references.
	 * @returns {unknown} The value of the join column, or `undefined` when the relation does not name it.
	 */
	private static readRelationComponent(value: unknown, referencedName: string | undefined): unknown {
		if (this.isRelationScalar(value) || !this.isPlainRecord(value)) {
			return value;
		}

		return referencedName ? value[referencedName] : undefined;
	}

	/**
	 * Reads the request body as the client sent it.
	 * @param {unknown} request - The HTTP request of the route.
	 * @returns {unknown} The copy taken when the route started, or the request body when there is none.
	 */
	private static readSentBody(request: unknown): unknown {
		if (typeof request === "object" && request !== null && this.SENT_BODIES.has(request)) {
			return this.SENT_BODIES.get(request);
		}

		return (request as { body?: unknown } | undefined)?.body;
	}

	/**
	 * Resolves the repository of a service in the active transaction.
	 * @template E - Entity type owned by the service.
	 * @param {ApiServiceBase<E>} service - Service of the route.
	 * @param {EntityManager | undefined} eventManager - Active transaction manager.
	 * @returns {Repository<E>} The repository.
	 * @throws {Error} When the service has no repository.
	 */
	private static resolveActiveRepository<E extends IApiBaseEntity>(service: ApiServiceBase<E>, eventManager: EntityManager | undefined): Repository<E> {
		const repository: Repository<E> | undefined = (service as { repository?: Repository<E> } & ApiServiceBase<E>).repository;

		if (!repository) {
			throw ErrorException("Repository is not available in this context");
		}

		return eventManager ? eventManager.getRepository<E>(repository.target) : repository;
	}

	/**
	 * Resolves the filter paths of a request over date and time columns, by the column types the active driver normalizes.
	 * It reads the query itself, so routes without a compiled filter plan resolve the same paths.
	 * @param {unknown} service - Service of the route
	 * @param {Record<string, unknown>} query - Query as the request carries it
	 * @param {string} source - Controller and route named in the error
	 * @returns {ReadonlyMap<string, boolean>} Filter paths over date and time columns, each with whether its column stores an exact instant
	 * @throws {Error} When the service has no TypeORM repository, so the filter values cannot be checked
	 */
	private static resolveDateTimeFilterPaths(service: unknown, query: Record<string, unknown>, source: string): ReadonlyMap<string, boolean> {
		const repository: Repository<ObjectLiteral> = DatabaseTypeOrmAssertServiceRepository(service, source, ", so its date and time filter values cannot be checked");
		const dateTimePaths: Map<string, boolean> = new Map<string, boolean>();

		for (const key of Object.keys(query)) {
			const path: string | undefined = FILTER_VALUE_KEY_PATTERN.exec(key)?.[1];
			const column: TTypeOrmColumnMetadata | undefined = path ? this.resolveFilterColumn(repository.metadata, path) : undefined;
			const columnType: string | undefined = column ? repository.manager.dataSource.driver.normalizeType(column) : undefined;

			if (path && columnType && (DATABASE_COLUMN_TYPE_CONSTANT.DATE.has(columnType) || DATABASE_COLUMN_TYPE_CONSTANT.DATE_TIME.has(columnType) || DATABASE_COLUMN_TYPE_CONSTANT.INSTANT.has(columnType))) {
				dateTimePaths.set(path, DATABASE_COLUMN_TYPE_CONSTANT.INSTANT.has(columnType));
			}
		}

		return dateTimePaths;
	}

	/**
	 * Resolves the column a filter path names, through relations, by the active entity metadata.
	 * @param {EntityMetadata} metadata - Metadata of the entity the path starts at
	 * @param {string} path - Filter path as the query names it
	 * @returns {TTypeOrmColumnMetadata | undefined} The column, or undefined when the path names none
	 */
	private static resolveFilterColumn(metadata: EntityMetadata, path: string): TTypeOrmColumnMetadata | undefined {
		const [relationName, ...nestedNames]: Array<string> = path.split(".");
		const relation: RelationMetadata | undefined = nestedNames.length > 0 ? metadata.findRelationWithPropertyPath(relationName ?? "") : undefined;

		return relation ? this.resolveFilterColumn(relation.inverseEntityMetadata, nestedNames.join(".")) : metadata.findColumnWithPropertyPath(path);
	}

	/**
	 * Resolves the typed path values of the request before route-before subscribers run, reusing the values the authorization guard already typed.
	 * @template E - Entity type.
	 * @template R - Generated route type.
	 * @param {IApiRouteRuntimeGeneratedExecutionOptions<E, R>} options - Generated route execution options.
	 * @returns {Promise<IApiRouteRuntimeGeneratedTargets<E>>} Request targets with typed path values.
	 */
	private static async resolveGeneratedTypedTargets<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>): Promise<IApiRouteRuntimeGeneratedTargets<E>> {
		if (options.targets.parameters === undefined) {
			return options.targets;
		}

		const parameters: Partial<E> | undefined = await ApiControllerParametersResolveRequest<E>(options.targets.authenticationRequest, this.resolveParametersRule(options.controller, options.methodName), options.targets.parameters);

		return { ...options.targets, parameters };
	}

	private static resolveIdentityPlan(controller: object, methodName: string): IApiControllerIdentityPlan | undefined {
		const handler: unknown = Reflect.get(controller, methodName);

		return typeof handler === "function" ? ApiControllerIdentityPlanGet(handler) : undefined;
	}

	/**
	 * Resolves the where clause of a row by its key. A `Date` of a key column that stores finer values than a millisecond may have lost part of the stored value, so the other key columns identify the row when any exist, and must name only that row.
	 * @template E - Entity type owned by the service.
	 * @param {ApiServiceBase<E>} service - Service of the route.
	 * @param {Record<string, unknown>} key - Value of every key column.
	 * @param {ReadonlyArray<string>} primaryFields - Key columns of the entity.
	 * @param {EntityManager} [eventManager] - Active transaction manager.
	 * @returns {Promise<FindOptionsWhere<E>>} The where clause.
	 */
	private static async resolveKeyWhere<E extends IApiBaseEntity>(service: ApiServiceBase<E>, key: Record<string, unknown>, primaryFields: ReadonlyArray<string>, eventManager?: EntityManager): Promise<FindOptionsWhere<E>> {
		const repository: unknown = (service as { repository?: unknown }).repository;
		const exactFields: Array<string> = repository instanceof Repository ? primaryFields.filter((field: string): boolean => !(key[field] instanceof Date) || this.isExactInstantColumn(repository as Repository<IApiBaseEntity>, field)) : [...primaryFields];

		if (exactFields.length === 0 || exactFields.length === primaryFields.length) {
			return key as FindOptionsWhere<E>;
		}

		const where: FindOptionsWhere<E> = Object.fromEntries(exactFields.map((field: string): [string, unknown] => [field, key[field]])) as FindOptionsWhere<E>;

		await this.findKeyMatches(service, where, primaryFields, eventManager);

		return where;
	}

	/**
	 * Returns the path value rule of a generated route, which the controller decorator attached to the handler it generated.
	 * @param {object} controller - Controller instance.
	 * @param {string} methodName - Generated route method name.
	 * @returns {IApiControllerParametersRule | undefined} Path value rule of the route.
	 */
	private static resolveParametersRule(controller: object, methodName: string): IApiControllerParametersRule | undefined {
		const handler: unknown = Reflect.get(controller, methodName);

		return typeof handler === "function" ? ApiControllerParametersDtoGet(handler) : undefined;
	}

	/**
	 * Resolves the path plan of a generated route. A route the factory did not compile addresses its first primary column.
	 * @template E - Entity type owned by the route.
	 * @template R - Generated route type.
	 * @param {IApiRouteRuntimeGeneratedExecutionOptions<E, R>} options - Generated route execution options.
	 * @returns {IApiControllerPathPlan} The path plan of the route.
	 */
	private static resolvePathPlan<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>): IApiControllerPathPlan {
		const primaryColumn: IApiEntityColumn<E> | undefined = options.entityMetadata.columns.find((column: IApiEntityColumn<E>): boolean => column.isPrimary);

		if (!primaryColumn) {
			throw ErrorException("Primary key not found in entity columns");
		}

		const pathPlan: IApiControllerPathPlan | undefined = ApiControllerPathPlanGet(Object.getPrototypeOf(options.controller) as object, options.methodName);

		if (pathPlan) {
			return pathPlan;
		}

		const field: string = String(primaryColumn.name);

		return { controllerName: options.controller.constructor.name, isDefaultRowPath: true, isKeyCovered: true, isRowPathDeclared: false, primaryFields: [field], rowParameters: [{ field, parameter: field }], scopeParameters: [], signature: "" };
	}

	/**
	 * Builds the reason that refuses null for a relation over one column whose column cannot be cleared: a key column, a column the path binds, or a column the body already sets.
	 * @param {RelationMetadata} relation - Relation the body names.
	 * @param {Record<string, unknown>} pathValues - Values the path binds, by entity property.
	 * @param {ReadonlyArray<string>} lockedKeyFields - Key columns a write to one row keeps.
	 * @returns {string} The reason.
	 */
	private static resolveRelationClearReason(relation: RelationMetadata, pathValues: Record<string, unknown>, lockedKeyFields: ReadonlyArray<string>): string {
		const isKeyColumn = (column: TTypeOrmColumnMetadata): boolean => column.isPrimary || lockedKeyFields.includes(column.propertyName);

		if (relation.joinColumns.every((column: TTypeOrmColumnMetadata): boolean => isKeyColumn(column))) {
			return BODY_RELATION_KEY_CLEAR_REJECTION_REASON;
		}

		return relation.joinColumns.some((column: TTypeOrmColumnMetadata): boolean => Object.hasOwn(pathValues, column.propertyName)) ? BODY_RELATION_LOCKED_CLEAR_REJECTION_REASON : BODY_RELATION_CONFLICT_REJECTION_REASON;
	}

	/**
	 * Builds the reason that refuses a relation over several columns sent as something other than an object. It names the entity's own columns that clear the relation, which are the declared join columns that are neither key columns nor bound by the path.
	 * @param {RelationMetadata} relation - Relation the body names.
	 * @param {Record<string, unknown>} pathValues - Values the path binds, by entity property.
	 * @param {ReadonlyArray<string>} lockedKeyFields - Key columns a write to one row keeps.
	 * @returns {string} The reason, with how to clear the relation or why it cannot be cleared.
	 */
	private static resolveRelationObjectReason(relation: RelationMetadata, pathValues: Record<string, unknown>, lockedKeyFields: ReadonlyArray<string>): string {
		const isKeyColumn = (column: TTypeOrmColumnMetadata): boolean => column.isPrimary || lockedKeyFields.includes(column.propertyName);
		const clearingColumns: Array<string> = relation.joinColumns.filter((column: TTypeOrmColumnMetadata): boolean => !column.isVirtual && !isKeyColumn(column) && !Object.hasOwn(pathValues, column.propertyName)).map((column: TTypeOrmColumnMetadata): string => `${column.propertyName}: null`);

		if (clearingColumns.length > 0) {
			return `${BODY_RELATION_OBJECT_REJECTION_REASON}; clear it with ${clearingColumns.join(", ")}`;
		}

		return `${BODY_RELATION_OBJECT_REJECTION_REASON}; ${relation.joinColumns.every((column: TTypeOrmColumnMetadata): boolean => isKeyColumn(column)) ? BODY_RELATION_KEY_CLEAR_REJECTION_REASON : BODY_RELATION_LOCKED_CLEAR_REJECTION_REASON}`;
	}

	/**
	 * Builds the where clause a route path addresses. Date and time values of a composite or bound route must name one exact instant, which a plain single-column key route leaves to the database as before.
	 * @template E - Entity type owned by the route.
	 * @template R - Generated route type.
	 * @param {IApiRouteRuntimeGeneratedExecutionOptions<E, R>} options - Generated route execution options.
	 * @param {IApiRouteRuntimeGeneratedTargets<E>} targets - Request targets.
	 * @param {IApiControllerPathPlan} pathPlan - Path plan of the route.
	 * @param {ReadonlyArray<IApiControllerPathPlanParameter>} mappings - Path parameters to read.
	 * @returns {FindOptionsWhere<E>} The where clause.
	 */
	private static resolveRouteWhere<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, targets: IApiRouteRuntimeGeneratedTargets<E>, pathPlan: IApiControllerPathPlan, mappings: ReadonlyArray<IApiControllerPathPlanParameter>): FindOptionsWhere<E> {
		if (pathPlan.primaryFields.length === 1 && pathPlan.scopeParameters.length === 0) {
			return ApiControllerPathWhere<E>(targets.parameters, mappings);
		}

		const repository: unknown = (options.controller.service as { repository?: unknown }).repository;
		const instantFields: Set<string> = new Set<string>();

		if (repository instanceof Repository) {
			for (const mapping of mappings) {
				if (this.isDateTimeColumn(repository as Repository<IApiBaseEntity>, mapping.field)) {
					instantFields.add(mapping.field);
				}
			}
		}

		return ApiControllerPathWhere<E>(targets.parameters, mappings, instantFields, (targets.authenticationRequest as { params?: Record<string, unknown> } | undefined)?.params);
	}

	/**
	 * Checks a generated write body against its path and returns the body the route writes.
	 * The checks run in order: every value the body names for a field the path addresses must be the path's, then the copy is split, so every relation agrees with the entity's own columns. A CREATE parses its date and time keys afterwards, in the copy, wherever the body set them.
	 * The request body stays as the client sent it.
	 * @template E - Entity type owned by the route.
	 * @template R - Generated route type.
	 * @param {IApiRouteRuntimeGeneratedExecutionOptions<E, R>} options - Generated route execution options.
	 * @param {IApiRouteRuntimeGeneratedTargets<E>} targets - Request targets.
	 * @param {IApiControllerPathPlan} pathPlan - Path plan of the route.
	 * @returns {Record<string, unknown>} The body the route writes.
	 * @throws {BadRequestException} When the body differs from the path or names a relation the route cannot split.
	 */
	private static resolveWriteBody<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, targets: IApiRouteRuntimeGeneratedTargets<E>, pathPlan: IApiControllerPathPlan): Record<string, unknown> {
		const rawBody: unknown = this.readSentBody(targets.authenticationRequest);
		const pathValues: Record<string, unknown> = this.resolveRouteWhere(options, targets, pathPlan, ApiControllerPathRouteParameters(pathPlan, options.method));
		const unaddressedFields: ReadonlyArray<string> = options.method === EApiRouteType.CREATE ? [] : pathPlan.primaryFields.filter((field: string): boolean => !Object.hasOwn(pathValues, field));
		const repository: unknown = (options.controller.service as { repository?: unknown }).repository;
		const relations: ReadonlyArray<RelationMetadata> = repository instanceof Repository ? repository.metadata.relations : [];

		this.assertBodyPathValues(
			[targets.body, rawBody].filter((body: unknown): body is Record<string, unknown> => this.isPlainRecord(body)),
			pathValues,
			unaddressedFields,
			relations,
		);

		return this.splitWriteBody(targets.body, rawBody, pathValues, options.method === EApiRouteType.CREATE ? [] : pathPlan.primaryFields, relations);
	}

	/**
	 * Resolves the criteria of a generated write. A path that leaves key columns out is first resolved to the one row it names, so the write targets its complete key.
	 * @template E - Entity type owned by the route.
	 * @template R - Generated route type.
	 * @param {IApiRouteRuntimeGeneratedExecutionOptions<E, R>} options - Generated route execution options.
	 * @param {IApiRouteRuntimeGeneratedTargets<E>} targets - Request targets.
	 * @param {IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined} authorizationDecision - Security snapshot of the request.
	 * @param {EntityManager | undefined} eventManager - Active transaction manager.
	 * @returns {Promise<NonNullable<TApiAuthorizationScopeWhere<E>>>} Criteria of the write. A missing row keeps the requested criteria, so the function answers 404.
	 * @throws {InternalServerErrorException} When a `Date` cannot reproduce the stored key of the row.
	 */
	private static async resolveWriteCriteria<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, targets: IApiRouteRuntimeGeneratedTargets<E>, authorizationDecision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined, eventManager: EntityManager | undefined): Promise<NonNullable<TApiAuthorizationScopeWhere<E>>> {
		const pathPlan: IApiControllerPathPlan = this.resolvePathPlan(options);
		const requestCriteria: FindOptionsWhere<E> = this.resolveRouteWhere(options, targets, pathPlan, ApiControllerPathRouteParameters(pathPlan, options.method));
		const criteria: NonNullable<TApiAuthorizationScopeWhere<E>> = AuthorizationScopeMergeWhere(requestCriteria, ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(authorizationDecision)) ?? requestCriteria;

		if (pathPlan.isKeyCovered) {
			return criteria;
		}

		const [match]: Array<E> = await this.findKeyMatches(options.controller.service, criteria, pathPlan.primaryFields, eventManager);

		if (!match) {
			return criteria;
		}

		const key: FindOptionsWhere<E> = Object.fromEntries(pathPlan.primaryFields.map((field: string): [string, unknown] => [field, (match as Record<string, unknown>)[field]])) as FindOptionsWhere<E>;
		const hasInstant: boolean = Object.values(key).some((value: unknown): boolean => value instanceof Date);

		// A write through a key the stored value does not equal would insert a second row or delete nothing, so it stops here.
		if (hasInstant && !(await this.resolveActiveRepository(options.controller.service, eventManager).exists({ where: key }))) {
			throw new InternalServerErrorException("Generated route cannot address a row whose key column holds a finer value than a millisecond");
		}

		// The key stands in for the row parameters, whose text may differ from the stored value's type, and the bound fields stay.
		const keyWhere: FindOptionsWhere<E> = { ...this.resolveRouteWhere(options, targets, pathPlan, pathPlan.scopeParameters), ...key };

		return AuthorizationScopeMergeWhere(keyWhere, ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(authorizationDecision)) ?? keyWhere;
	}

	/**
	 * Copies the body the route writes. A field the path addresses leaves it, because a key the save reads from the body would make it insert another row, and so does a relation that joins such a field over one column.
	 * Every relation whose join columns the entity declares is written through them. The entity's own value decides: the path's for a bound column, otherwise the body's as the route will write it after transformers, or as the client sent it when a pipe dropped it; a relation that names another one answers `400`, and a join column with no own value takes the value of the relation the route writes. A key column of a write to one row keeps the row's value, since the route never changes the key.
	 * A relation over one column is read as the value of the column it references or as an object naming it, and stays in the body for the save and request relation loading, now in step with the own column. A relation over several columns must be an object and leaves the body, because the save reads every join column from a relation it is given and would write each column twice.
	 * The relation is compared as the client sent it and as the route will write it, so a pipe that strips or transforms it hides no disagreement, but only the relation the route writes sets an own column: one that a subscriber, a transformer or a pipe removed sets nothing. Each join column must be named by a single value, so an object or an array in its place answers `400`. Null in the written body, or as sent when the relation left the written one, clears a relation only when none of its columns is a key column, bound by the path, or set by the body; otherwise it answers `400`. A relation whose join columns the entity does not declare is left to the save, which has no own column to compare with.
	 * @param {unknown} body - The body as the route will write it.
	 * @param {unknown} rawBody - The body as the client sent it.
	 * @param {Record<string, unknown>} pathValues - Values the path binds, by entity property.
	 * @param {ReadonlyArray<string>} lockedKeyFields - Key columns a write to one row keeps; empty on CREATE.
	 * @param {ReadonlyArray<RelationMetadata>} relations - Relations of the entity.
	 * @returns {Record<string, unknown>} The body the route writes, with the prototype of the given one.
	 * @throws {BadRequestException} When a relation disagrees with the entity's own columns or cannot be split into them.
	 */
	private static splitWriteBody(body: unknown, rawBody: unknown, pathValues: Record<string, unknown>, lockedKeyFields: ReadonlyArray<string>, relations: ReadonlyArray<RelationMetadata>): Record<string, unknown> {
		const writeBody: Record<string, unknown> = this.isPlainRecord(body) ? Object.assign(Object.create(Object.getPrototypeOf(body) as null | object) as Record<string, unknown>, body) : {};
		const rawRecord: Record<string, unknown> = this.isPlainRecord(rawBody) ? rawBody : {};

		// The path decides a bound column, then the body as the route writes it; a column a pipe dropped is read as the client sent it, so dropping it cannot hide a disagreement.
		const readOwnValue = (column: TTypeOrmColumnMetadata): unknown => {
			if (Object.hasOwn(pathValues, column.propertyName)) {
				return pathValues[column.propertyName];
			}

			return writeBody[column.propertyName] === undefined ? rawRecord[column.propertyName] : writeBody[column.propertyName];
		};

		for (const field of Object.keys(pathValues)) {
			Reflect.deleteProperty(writeBody, field);
		}

		for (const relation of relations) {
			const written: unknown = writeBody[relation.propertyName];
			const declaredColumns: Array<TTypeOrmColumnMetadata> = relation.joinColumns.filter((column: TTypeOrmColumnMetadata): boolean => !column.isVirtual);
			const isSingleColumn: boolean = relation.joinColumns.length === 1;

			if ((written === undefined && rawRecord[relation.propertyName] === undefined) || declaredColumns.length === 0) {
				continue;
			}

			// The body the route writes decides whether the relation is cleared; the body as sent decides only when the relation left the written one.
			if ((written === undefined ? rawRecord[relation.propertyName] : written) === null) {
				const isClearable: boolean = declaredColumns.every((column: TTypeOrmColumnMetadata): boolean => !column.isPrimary && !lockedKeyFields.includes(column.propertyName) && !Object.hasOwn(pathValues, column.propertyName) && readOwnValue(column) === undefined);

				if (isClearable) {
					continue;
				}

				throw this.createBodyParameterException(relation.propertyName, isSingleColumn ? this.resolveRelationClearReason(relation, pathValues, lockedKeyFields) : this.resolveRelationObjectReason(relation, pathValues, lockedKeyFields));
			}

			// A null the client sent for a relation the route then sets clears nothing, so only the values that name the relation are compared.
			const values: Array<unknown> = [written, rawRecord[relation.propertyName]].filter((value: unknown): boolean => value !== undefined && value !== null);

			if (!values.every((value: unknown): boolean => (isSingleColumn && this.isRelationScalar(value)) || this.isPlainRecord(value))) {
				throw this.createBodyParameterException(relation.propertyName, isSingleColumn ? BODY_RELATION_VALUE_REJECTION_REASON : this.resolveRelationObjectReason(relation, pathValues, lockedKeyFields));
			}

			// An object that names none of the columns would reach the save as a relation without a key, whatever the own columns hold.
			if (values.some((value: unknown): boolean => this.isPlainRecord(value) && relation.joinColumns.every((column: TTypeOrmColumnMetadata): boolean => column.referencedColumn === undefined || value[column.referencedColumn.propertyName] === undefined))) {
				throw this.createBodyParameterException(relation.propertyName, BODY_RELATION_UNNAMED_REJECTION_REASON);
			}

			if (declaredColumns.length < relation.joinColumns.length) {
				throw this.createBodyParameterException(relation.propertyName, BODY_RELATION_SPLIT_REJECTION_REASON);
			}

			for (const column of relation.joinColumns) {
				// The path's value was compared with the relation before the split, as the path compares it.
				if (Object.hasOwn(pathValues, column.propertyName)) {
					continue;
				}

				const referencedName: string | undefined = column.referencedColumn?.propertyName;
				const components: Array<unknown> = values.map((value: unknown): unknown => this.readRelationComponent(value, referencedName));

				// An object or an array is no value of one column: the save would write it as nothing or fail on it.
				if (components.some((component: unknown): boolean => component !== undefined && component !== null && !this.isRelationScalar(component))) {
					throw this.createBodyParameterException(relation.propertyName, BODY_RELATION_COMPONENT_REJECTION_REASON);
				}

				const ownValue: unknown = readOwnValue(column);
				const expected: unknown = ownValue === undefined ? components.find((candidate: unknown): boolean => candidate !== undefined) : ownValue;

				if (components.some((component: unknown): boolean => component !== undefined && !this.isSameWriteValue(expected, component))) {
					throw this.createBodyParameterException(relation.propertyName, BODY_RELATION_CONFLICT_REJECTION_REASON);
				}

				// Only the relation the route writes sets its column: one that a subscriber, a transformer or a pipe removed sets nothing, and the body as sent is only compared.
				if (writeBody[column.propertyName] !== undefined || lockedKeyFields.includes(column.propertyName) || writeBody[relation.propertyName] === undefined) {
					continue;
				}

				const component: unknown = this.readRelationComponent(writeBody[relation.propertyName], referencedName);

				if (component === undefined) {
					throw this.createBodyParameterException(relation.propertyName, BODY_RELATION_SPLIT_REJECTION_REASON);
				}

				// A null would reach the insert as a key value, which no row can hold.
				if (component === null && column.isPrimary) {
					throw this.createBodyParameterException(relation.propertyName, BODY_RELATION_KEY_CLEAR_REJECTION_REASON);
				}

				writeBody[column.propertyName] = component;
			}

			// The save reads one join column from the relation as the entity's own column now holds it, and request relation loading reads it too; a relation over several columns would make the save write each column twice.
			if (!isSingleColumn || relation.joinColumns.some((column: TTypeOrmColumnMetadata): boolean => Object.hasOwn(pathValues, column.propertyName))) {
				Reflect.deleteProperty(writeBody, relation.propertyName);
			}
		}

		return writeBody;
	}

	/**
	 * Returns the form two written values are compared in: a valid `Date` as its canonical string, anything else as it is.
	 * @param {unknown} value - Value the route writes.
	 * @returns {unknown} The comparable value.
	 */
	private static toWriteValue(value: unknown): unknown {
		return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : value;
	}
}
