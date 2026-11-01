import type { EFilterOrderDirection } from "@enum/filter";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization";
import type { IApiControllerGetListQueryAstNode, IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanOrderEntry, IApiControllerGetListQueryRuntimeResult } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";
import type { IApiControllerReadPlan } from "@interface/class/api/controller/read";
import type { IApiRouteRuntimeContextData, IApiRouteRuntimeCustomExecutionOptions, IApiRouteRuntimeGeneratedExecutionOptions, IApiRouteRuntimeGeneratedTargets, IApiRouteRuntimeHttpRequest } from "@interface/class/api/route";
import type { IApiSubscriberRouteErrorExecutionContext } from "@interface/class/api/subscriber/route/error-execution-context.interface";
import type { IApiSubscriberRouteExecutionContextData } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiControllerProperties, IApiControllerPropertiesRouteBaseRelationsResponseLoad, IApiControllerPropertiesRouteBaseRequestTarget, IApiRouteMetadata, IApiRouteRuntimeProperties } from "@interface/decorator/api";
import type { IApiControllerPropertiesRouteGetListResponseDtoConfig } from "@interface/decorator/api/controller/properties/route";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { IApiControllerPrimaryColumn } from "@interface/utility";
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
import type { DeepPartial, EntityManager, EntityMetadata, FindOptionsOrder, FindOptionsWhere, ObjectLiteral, RelationMetadata, Repository } from "typeorm";

import { ApiControllerGeneratedInsertedKeyStorage, ApiControllerGeneratedReadScopeStorage, ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated";
import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGetListCursorDataSourceContract } from "@class/api/controller/get-list/cursor/data-source-contract.class";
import { ApiControllerGetListCursorRuntime } from "@class/api/controller/get-list/cursor/runtime.class";
import { ApiControllerGetListQueryRuntime } from "@class/api/controller/get-list/query";
import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionRuntime } from "@class/api/function/transaction/runtime.class";
import { ApiServiceBase } from "@class/api/service-base.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ClassTransformerFreeFormValue } from "@class/class-transformer-free-form-value.class";
import { DATABASE_COLUMN_TYPE_CONSTANT } from "@constant/database-column-type.constant";
import { FUNCTION_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiControllerGetListQueryPaginationMode, EApiControllerRequestTarget, EApiFunctionTransactionMode, EApiFunctionTransactionOwnerKind, EApiFunctionType, EApiRouteType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EApiDtoType } from "@enum/decorator/api";
import { BadRequestException } from "@nestjs/common";
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
import { ApiControllerGetDtoWithReadPlan, ApiControllerGetResponseDto } from "@utility/api/controller/get/dto.utility";
import { ApiControllerGetPrimaryColumn } from "@utility/api/controller/get/primary-column.utility";
import { ApiControllerHandleRequestRelations } from "@utility/api/controller/handle-request-relations.utility";
import { ApiControllerIdentityPlanGet } from "@utility/api/controller/identity";
import { ApiControllerParametersDtoGet, ApiControllerParametersResolveRequest, ApiControllerParametersValidate } from "@utility/api/controller/parameters";
import { ApiControllerReadPlanGet, ApiControllerReadScopeWhere } from "@utility/api/controller/read";
import { ApiControllerRejectToManyUpdateKeys } from "@utility/api/controller/reject-to-many-update-keys.utility";
import { ApiControllerSerializeRouteResponse } from "@utility/api/controller/serialize-route-response.utility";
import { ApiControllerTransformData, ApiControllerTransformRouteData } from "@utility/api/controller/transform-data.utility";
import { ApiControllerValidateRequest } from "@utility/api/controller/validate-request.utility";
import { ApiControllerWriteLowerCaseUuid } from "@utility/api/controller/write/lower-case-uuid.utility";
import { ApiRouteProjectRelationResponse, ApiRouteValidationFlattenErrors } from "@utility/api/route";
import { ApiRouteCreateDiscriminatedDtoValidationFailure, ApiRouteIsDiscriminatedDtoProperties, ApiRoutePrepareDiscriminatedDtoPayload, ApiRouteResolveDiscriminatedDto, ApiRouteValidateDiscriminatedDtoProperties } from "@utility/api/route/discriminator";
import { ApiRouteResponseIsListEnvelope } from "@utility/api/route/response/is-list-envelope.utility";
import { ApiRouteSerializeResponse } from "@utility/api/route/response/serialize.utility";
import { AuthorizationDecisionApplyResult, AuthorizationDecisionAttachResource, AuthorizationDecisionResolveFromRequest } from "@utility/authorization/decision";
import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { DatabaseTypeOrmAssertServiceRepository } from "@utility/database/typeorm/assert/service-repository.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

// A filter value key names its path before "[value]" or "[values]", as the query carries it.
const FILTER_VALUE_KEY_PATTERN: RegExp = /^(.+)\[values?\]$/u;

export class ApiRouteRuntime {
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
				request.query = beforeResult.query;
			}

			if (options.metadata.route.type === EApiRouteType.PARTIAL_UPDATE || options.metadata.route.type === EApiRouteType.UPDATE) {
				ApiControllerRejectToManyUpdateKeys(options.metadata.resource.entity, request.body);
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
		if (!this.hasResponseRelationInclude(runtimeProperties.relations?.response?.load?.include)) {
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
			const service: ApiServiceBase<E> = options.controller.service;
			const updateFunction: (this: ApiServiceBase<E>, criteria: Array<TApiFunctionUpdateCriteria<E>> | TApiFunctionUpdateCriteria<E>, properties: never) => Promise<E> = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.UPDATE, EApiFunctionType.UPDATE, options.properties.entity);
			const getFunction: (this: ApiServiceBase<E>, properties: TApiFunctionGetProperties<E>) => Promise<E> = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.GET, EApiFunctionType.GET, options.properties.entity);

			return await this.executeGeneratedTransaction(options, routeConfig, async (): Promise<E> => await this.executeGeneratedUpdateOperation(options, targets, authorizationDecision, routeConfig, markAfterBoundary, service, updateFunction, getFunction));
		}

		switch (method) {
			case EApiRouteType.CREATE: {
				await this.executeGeneratedRequestPipeline(options, targets, [EApiControllerRequestTarget.BODY]);
				const service: ApiServiceBase<E> = options.controller.service;
				const createFunction: (this: ApiServiceBase<E>, properties: never) => Promise<E> = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.CREATE, EApiFunctionType.CREATE, options.properties.entity);
				const getFunction: (this: ApiServiceBase<E>, properties: TApiFunctionGetProperties<E>) => Promise<E> = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.GET, EApiFunctionType.GET, options.properties.entity);

				return await this.executeGeneratedTransaction(options, routeConfig, async (): Promise<E> => {
					const createInput: DeepPartial<E> = targets.body ?? ({} as DeepPartial<E>);
					await ApiControllerHandleRequestRelations(options.controller, options.properties, routeConfig.relations?.request, createInput);
					// An entity without primary key metadata fails here, before the route writes, as GET, PUT, PATCH and DELETE fail.
					this.resolvePrimaryKey(createInput, options.entityMetadata);
					markAfterBoundary();
					const insertedKey: ObjectLiteral = await ApiControllerGeneratedInsertedKeyStorage.run(createInput, async (): Promise<E> => await Reflect.apply(createFunction, service, [createInput]));

					// The route answers with the row it inserted, read as GET reads it by the key TypeORM saved, so the create result cannot pull another row into the response.
					const requestProperties: TApiFunctionGetProperties<E> = {
						relationLoadStrategy: routeConfig.relations?.response?.load?.relationLoadStrategy,
						relations: routeConfig.relations?.response?.load?.include,
						where: AuthorizationScopeMergeWhere(insertedKey as FindOptionsWhere<E>, ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(authorizationDecision)),
					};

					return await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, requestProperties, requestProperties.where, async (): Promise<E> => await Reflect.apply(getFunction, service, [requestProperties]));
				});
			}

			case EApiRouteType.DELETE: {
				await this.executeGeneratedRequestPipeline(options, targets, [EApiControllerRequestTarget.PARAMETERS]);
				const service: ApiServiceBase<E> = options.controller.service;
				const deleteFunction: (this: ApiServiceBase<E>, criteria: Array<TApiFunctionDeleteCriteria<E>> | TApiFunctionDeleteCriteria<E>) => Promise<void> = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.DELETE, EApiFunctionType.DELETE, options.properties.entity);

				await this.executeGeneratedTransaction(options, routeConfig, async (): Promise<void> => {
					const primaryKey: IApiControllerPrimaryColumn<E> = this.resolvePrimaryKey(targets.parameters, options.entityMetadata);
					const requestCriteria: TApiFunctionDeleteCriteria<E> = { [primaryKey.key]: primaryKey.value } as TApiFunctionDeleteCriteria<E>;
					const scopedCriteria: Array<TApiFunctionDeleteCriteria<E>> | TApiFunctionDeleteCriteria<E> | undefined = AuthorizationScopeMergeWhere(requestCriteria, ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(authorizationDecision));
					const deleteCriteria: Array<TApiFunctionDeleteCriteria<E>> | TApiFunctionDeleteCriteria<E> = scopedCriteria ?? requestCriteria;

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

				return await this.executeGeneratedTransaction(options, routeConfig, async (): Promise<E> => {
					const readPlan: IApiControllerReadPlan | undefined = ApiControllerReadPlanGet(Object.getPrototypeOf(options.controller) as object, options.methodName);
					const identityPlan: IApiControllerIdentityPlan | undefined = this.resolveIdentityPlan(options.controller, options.methodName);
					const primaryKey: IApiControllerPrimaryColumn<E> = this.resolveReadIdentity(targets.parameters, options.entityMetadata, identityPlan);
					const identityWhere: FindOptionsWhere<E> = { [primaryKey.key]: primaryKey.value } as FindOptionsWhere<E>;
					const routeScopedWhere: TApiAuthorizationScopeWhere<E> = readPlan ? AuthorizationScopeMergeWhere(identityWhere, ApiControllerReadScopeWhere(targets.parameters, readPlan)) : identityWhere;

					const requestProperties: TApiFunctionGetProperties<E> = {
						relationLoadStrategy: routeConfig.relations?.response?.load?.relationLoadStrategy,
						relations: routeConfig.relations?.response?.load?.include,
						where: AuthorizationScopeMergeWhere(routeScopedWhere, ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(authorizationDecision)),
					};

					markAfterBoundary();

					return await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, requestProperties, requestProperties.where, async (): Promise<E> => await Reflect.apply(getFunction, service, [requestProperties]));
				});
			}

			case EApiRouteType.GET_LIST: {
				const readPlan: IApiControllerReadPlan | undefined = ApiControllerReadPlanGet(Object.getPrototypeOf(options.controller) as object, options.methodName);
				await this.executeGeneratedRequestPipeline(options, targets, readPlan ? [EApiControllerRequestTarget.PARAMETERS, EApiControllerRequestTarget.QUERY] : [EApiControllerRequestTarget.QUERY]);

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
				const queryDto: Type<unknown> | undefined = ApiControllerGetDtoWithReadPlan(options.properties, options.entityMetadata, options.method, EApiDtoType.QUERY, routeConfig, options.schemaPrefix, queryPlan, readPlan);
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
					const routeScopedFilter: TApiAuthorizationScopeWhere<E> = readPlan ? AuthorizationScopeMergeWhere(filter, ApiControllerReadScopeWhere(targets.parameters, readPlan)) : filter;
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
						const contextHash: string = ApiControllerGetListCursorRuntime.createContextHash(routePath, targets.parameters, cursorPlan, cursorRuntimeQuery.ast, cursorRuntimeQuery.order, readPlan?.signature);
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

						const serviceRepository: Repository<E> | undefined = (service as { repository?: Repository<E> } & ApiServiceBase<E>).repository;

						if (!serviceRepository) {
							throw ErrorException("Repository is not available in this context");
						}

						const activeRepository: Repository<E> = eventManager ? eventManager.getRepository<E>(serviceRepository.target) : serviceRepository;
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
				ApiControllerWriteLowerCaseUuid<E>(options.entityMetadata, targets.body);
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

	private static async executeGeneratedTransaction<E extends IApiBaseEntity, R extends EApiRouteType, T>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, routeConfig: TApiControllerPropertiesRoute<E, R>, callback: (eventManager: EntityManager | undefined) => Promise<T>): Promise<T> {
		const mode: EApiFunctionTransactionMode = routeConfig.transaction?.mode ?? EApiFunctionTransactionMode.SUPPORTS;
		const activeEventManager: EntityManager | undefined = ApiFunctionContextStorage.getTransactionRegistry() ? ApiFunctionContextStorage.getEventManager() : undefined;

		if (mode === EApiFunctionTransactionMode.NONE && activeEventManager) {
			throw ErrorException("ApiRoute generated transaction mode NONE cannot run inside an active transaction");
		}

		if (mode === EApiFunctionTransactionMode.MANDATORY && !activeEventManager) {
			throw ErrorException("ApiRoute generated transaction mode MANDATORY requires an active transaction");
		}

		if (mode === EApiFunctionTransactionMode.REQUIRED && !activeEventManager) {
			const repository: Repository<E> | undefined = (options.controller.service as { repository?: Repository<E> } & ApiServiceBase<E>).repository;

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
	): Promise<E> {
		const responseLoad: IApiControllerPropertiesRouteBaseRelationsResponseLoad<E> | undefined = routeConfig.relations?.response?.load;

		await ApiControllerHandleRequestRelations(options.controller, options.properties, routeConfig.relations?.request, targets.body ?? {});
		const primaryKey: IApiControllerPrimaryColumn<E> = this.resolvePrimaryKey(targets.parameters, options.entityMetadata);
		const requestCriteria: TApiFunctionUpdateCriteria<E> = { [primaryKey.key]: primaryKey.value } as TApiFunctionUpdateCriteria<E>;
		const scopedCriteria: TApiAuthorizationScopeWhere<E> = AuthorizationScopeMergeWhere(requestCriteria, ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(authorizationDecision));
		const updateCriteria: TApiAuthorizationScopeWhere<E> = scopedCriteria ?? requestCriteria;
		markAfterBoundary();
		await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.UPDATE, updateCriteria, updateCriteria, async (): Promise<E> => await Reflect.apply(updateFunction, service, [updateCriteria, (targets.body ?? {}) as never]));

		// The route answers with the row it wrote, read as GET reads it by the key the request resolved, so neither the body's raw relation keys nor the update result shape the response.
		const requestProperties: TApiFunctionGetProperties<E> = {
			relationLoadStrategy: responseLoad?.relationLoadStrategy,
			relations: responseLoad?.include,
			where: AuthorizationScopeMergeWhere(requestCriteria, ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(authorizationDecision)),
		};

		return await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, requestProperties, requestProperties.where, async (): Promise<E> => await Reflect.apply(getFunction, service, [requestProperties]));
	}

	private static async executeRequestTargets<E extends IApiBaseEntity>(metadata: IApiRouteMetadata<E>, runtimeProperties: IApiRouteRuntimeProperties<E>, request: IApiRouteRuntimeHttpRequest<E>, contextData: IApiRouteRuntimeContextData<E>): Promise<void> {
		const controllerProperties: IApiControllerProperties<E> = {
			entity: metadata.resource.entity,
			routes: {},
		};
		const requestTargets: Partial<Record<EApiControllerRequestTarget, unknown>> | undefined = runtimeProperties.request;

		ApiControllerTransformData<E>(runtimeProperties.request, controllerProperties, { parameters: request.params }, contextData);
		await ApiControllerValidateRequest<E>(requestTargets?.[EApiControllerRequestTarget.PARAMETERS] as IApiControllerPropertiesRouteBaseRequestTarget<E> | undefined, controllerProperties, request.params ?? {});
		ApiControllerTransformData<E>(runtimeProperties.request, controllerProperties, { query: request.query as TApiControllerGetListQuery<E, EApiControllerGetListQueryPaginationMode> | undefined }, contextData);
		await ApiControllerValidateRequest<E, EApiControllerGetListQueryPaginationMode>(requestTargets?.[EApiControllerRequestTarget.QUERY] as IApiControllerPropertiesRouteBaseRequestTarget<E, EApiControllerGetListQueryPaginationMode> | undefined, controllerProperties, request.query ?? {});
		ApiControllerTransformData<E>(runtimeProperties.request, controllerProperties, { body: request.body as E | undefined }, contextData);
		await ApiControllerValidateRequest<E>(requestTargets?.[EApiControllerRequestTarget.BODY] as IApiControllerPropertiesRouteBaseRequestTarget<E> | undefined, controllerProperties, request.body ?? {});
		await this.executeDiscriminatedRequestBodyDto(runtimeProperties, request);
	}

	/**
	 * Checks whether response relation loading has at least one configured include key.
	 * @param {unknown} include - Response include map.
	 * @returns {boolean} Whether response relation loading should run.
	 */
	private static hasResponseRelationInclude(include: unknown): boolean {
		return include !== null && typeof include === "object" && Object.keys(include).length > 0;
	}

	private static async loadCustomResponseRelations<E extends IApiBaseEntity>(service: ApiServiceBase<E>, runtimeProperties: IApiRouteRuntimeProperties<E>, response: unknown): Promise<unknown> {
		if (response === null || typeof response !== "object" || !("id" in response)) {
			return response;
		}

		const responseId: unknown = (response as { id?: unknown }).id;

		if (responseId === undefined || responseId === null) {
			return response;
		}

		return await service.get({
			relationLoadStrategy: runtimeProperties.relations?.response?.load?.relationLoadStrategy,
			relations: runtimeProperties.relations?.response?.load?.include,
			where: {
				id: responseId,
			} as unknown as FindOptionsWhere<E>,
		});
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
	 * Returns the path value rule of a generated route, which the controller decorator attached to the handler it generated.
	 * @param {object} controller - Controller instance.
	 * @param {string} methodName - Generated route method name.
	 * @returns {IApiControllerParametersRule | undefined} Path value rule of the route.
	 */
	private static resolveParametersRule(controller: object, methodName: string): IApiControllerParametersRule | undefined {
		const handler: unknown = Reflect.get(controller, methodName);

		return typeof handler === "function" ? ApiControllerParametersDtoGet(handler) : undefined;
	}

	private static resolvePrimaryKey<E extends IApiBaseEntity>(source: DeepPartial<E> | Partial<E> | undefined, entityMetadata: IApiEntity<E>): IApiControllerPrimaryColumn<E> {
		const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(source ?? {}, entityMetadata);

		if (!primaryKey) {
			throw ErrorException("Primary key not found in entity columns");
		}

		return primaryKey;
	}

	private static resolveReadIdentity<E extends IApiBaseEntity>(source: DeepPartial<E> | Partial<E> | undefined, entityMetadata: IApiEntity<E>, identityPlan: IApiControllerIdentityPlan | undefined): IApiControllerPrimaryColumn<E> {
		if (!identityPlan) {
			return this.resolvePrimaryKey(source, entityMetadata);
		}

		const parameters: Record<string, unknown> | undefined = source as Record<string, unknown> | undefined;

		const value: unknown = parameters && Object.hasOwn(parameters, identityPlan.parameter) ? parameters[identityPlan.parameter] : undefined;

		if (value === undefined || value === null) {
			throw new BadRequestException([`${identityPlan.parameter} should not be null or undefined`]);
		}

		const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((entityColumn: IApiEntityColumn<E>): boolean => String(entityColumn.name) === identityPlan.field);

		if (!column) {
			throw ErrorException(`Identity field ${identityPlan.field} not found in entity columns`);
		}

		return {
			key: column.name,
			value: value as string,
		};
	}
}
