import type { EFilterOrderDirection } from "@enum/filter";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization";
import type { IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanOrderEntry, IApiControllerGetListQueryRuntimeResult } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerReadPlan } from "@interface/class/api/controller/read";
import type { IApiRouteRuntimeContextData, IApiRouteRuntimeCustomExecutionOptions, IApiRouteRuntimeGeneratedExecutionOptions, IApiRouteRuntimeGeneratedTargets, IApiRouteRuntimeHttpRequest } from "@interface/class/api/route";
import type { IApiSubscriberRouteErrorExecutionContext } from "@interface/class/api/subscriber/route/error-execution-context.interface";
import type { IApiSubscriberRouteExecutionContextData } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiControllerProperties, IApiControllerPropertiesRouteBaseRelationsResponseLoad, IApiControllerPropertiesRouteBaseRequestTarget, IApiRouteMetadata, IApiRouteRuntimeProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { IApiControllerPrimaryColumn } from "@interface/utility";
import type { Type } from "@nestjs/common";
import type { TApiRequestTransformer } from "@type/api-request-transformer.type";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiControllerMethod } from "@type/class/controller-method.type";
import type { TApiControllerGetListQuery, TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetListPropertiesWhere, TApiFunctionGetProperties, TApiFunctionUpdateCriteria } from "@type/decorator/api/function";
import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";
import type { TApiControllerTransformDataObjectToTransform } from "@type/utility";
import type { ClassConstructor } from "class-transformer";
import type { ValidationError } from "class-validator";
import type { DeepPartial, EntityManager, FindOptionsOrder, FindOptionsWhere, Repository } from "typeorm";

import { ApiControllerGeneratedReadScopeStorage, ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated";
import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGetListQueryRuntime } from "@class/api/controller/get-list/query";
import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionRuntime } from "@class/api/function/transaction/runtime.class";
import { ApiServiceBase } from "@class/api/service-base.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { FUNCTION_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiControllerRequestTarget, EApiFunctionTransactionMode, EApiFunctionTransactionOwnerKind, EApiFunctionType, EApiRouteType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EApiDtoType } from "@enum/decorator/api";
import { BadRequestException } from "@nestjs/common";
import { ApiControllerGetListQueryPlanGet } from "@utility/api/controller/get-list/query";
import { ApiControllerGetListTransformFilter } from "@utility/api/controller/get-list/transform/filter.utility";
import { ApiControllerGetDtoWithReadPlan } from "@utility/api/controller/get/dto.utility";
import { ApiControllerGetPrimaryColumn } from "@utility/api/controller/get/primary-column.utility";
import { ApiControllerHandleRequestRelations } from "@utility/api/controller/handle-request-relations.utility";
import { ApiControllerIdentityPlanGet } from "@utility/api/controller/identity";
import { ApiControllerReadPlanGet, ApiControllerReadScopeWhere } from "@utility/api/controller/read";
import { ApiControllerSerializeRouteResponse } from "@utility/api/controller/serialize-route-response.utility";
import { ApiControllerTransformData } from "@utility/api/controller/transform-data.utility";
import { ApiControllerValidateRequest } from "@utility/api/controller/validate-request.utility";
import { ApiRouteProjectRelationResponse, ApiRouteValidationFlattenErrors } from "@utility/api/route";
import { ApiRouteCreateDiscriminatedDtoValidationFailure, ApiRouteIsDiscriminatedDtoProperties, ApiRoutePrepareDiscriminatedDtoPayload, ApiRouteResolveDiscriminatedDto } from "@utility/api/route/discriminator";
import { ApiRouteSerializeResponse } from "@utility/api/route/response/serialize.utility";
import { AuthorizationDecisionApplyResult, AuthorizationDecisionAttachResource, AuthorizationDecisionResolveFromRequest } from "@utility/authorization/decision";
import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

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

	public static async executeCustomResponseRelations<E extends IApiBaseEntity, R>(controller: TApiControllerMethod<E>, runtimeProperties: IApiRouteRuntimeProperties<E>, response: R): Promise<R> {
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

		if (responseValue !== null && typeof responseValue === "object" && "items" in responseValue && Array.isArray((responseValue as { items?: unknown }).items)) {
			const responseObject: { items: Array<unknown> } = responseValue as { items: Array<unknown> };
			responseObject.items = await Promise.all(responseObject.items.map(async (item: unknown): Promise<unknown> => await this.loadCustomResponseRelations(controller.service, runtimeProperties, item)));

			return response;
		}

		return (await this.loadCustomResponseRelations(controller.service, runtimeProperties, response)) as R;
	}

	public static async executeGenerated<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>): Promise<unknown> {
		const entityInstance: E = new (options.properties.entity as new () => E)();
		const authorizationDecision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined = ApiControllerGeneratedSecuritySnapshot.create(AuthorizationDecisionResolveFromRequest(options.targets.authenticationRequest));

		const beforeContext: IApiSubscriberRouteExecutionContext<E, IApiRouteRuntimeGeneratedTargets<E>, IApiSubscriberRouteExecutionContextData<E>> = {
			DATA: { authorizationDecision: ApiControllerGeneratedSecuritySnapshot.createSubscriberView(authorizationDecision), entityMetadata: options.entityMetadata, method: options.method, methodName: options.methodName, properties: options.properties },
			ENTITY: entityInstance,
			result: options.targets,
			ROUTE_TYPE: options.method,
		};
		let beforeResult: IApiRouteRuntimeGeneratedTargets<E> | undefined;

		try {
			beforeResult = await ApiSubscriberExecutor.executeRouteSubscribers(options.controller.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, options.method, EApiSubscriberOnType.BEFORE, beforeContext);
		} catch (error) {
			await this.executeGeneratedErrorSubscribers(options, options.targets, entityInstance, beforeContext.DATA, authorizationDecision, EApiSubscriberOnType.BEFORE_ERROR, error);

			throw error;
		}
		const targets: IApiRouteRuntimeGeneratedTargets<E> = beforeResult ?? options.targets;

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
		const responseTarget: TApiControllerTransformDataObjectToTransform<E> = { response: ApiRouteProjectRelationResponse(options.runtimeProperties.relations?.response, result) as Partial<E> };
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

		let selectedDto: Type<unknown>;

		try {
			selectedDto = ApiRouteResolveDiscriminatedDto(bodyDto, request.body, "ApiRouteCustom body");
		} catch {
			const validationError: ValidationError = ApiRouteCreateDiscriminatedDtoValidationFailure(bodyDto, request.body);
			const validationMessages: Array<string> = ApiRouteValidationFlattenErrors([validationError]);

			throw new BadRequestException(validationMessages);
		}

		const transformedBody: unknown = plainToInstance(selectedDto as ClassConstructor<unknown>, ApiRoutePrepareDiscriminatedDtoPayload(bodyDto, request.body), bodyDto.transformOptions);
		const validationErrors: Array<ValidationError> = await validate(transformedBody as object, bodyDto.validatorOptions);

		if (validationErrors.length > 0) {
			const validationMessages: Array<string> = ApiRouteValidationFlattenErrors(validationErrors);

			throw new BadRequestException(validationMessages);
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
			await this.executeGeneratedRequestPipeline(options, targets, [EApiControllerRequestTarget.PARAMETERS, EApiControllerRequestTarget.BODY]);
			const service: ApiServiceBase<E> = options.controller.service;
			const updateFunction: (this: ApiServiceBase<E>, criteria: Array<TApiFunctionUpdateCriteria<E>> | TApiFunctionUpdateCriteria<E>, properties: never) => Promise<E> = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.UPDATE, EApiFunctionType.UPDATE, options.properties.entity);
			const responseLoad: IApiControllerPropertiesRouteBaseRelationsResponseLoad<E> | undefined = routeConfig.relations?.response?.load;
			const getFunction: ((this: ApiServiceBase<E>, properties: TApiFunctionGetProperties<E>) => Promise<E>) | undefined = responseLoad && this.hasResponseRelationInclude(responseLoad.include) ? ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.GET, EApiFunctionType.GET, options.properties.entity) : undefined;

			return await this.executeGeneratedTransaction(options, routeConfig, async (): Promise<E> => await this.executeGeneratedUpdateOperation(options, targets, authorizationDecision, routeConfig, markAfterBoundary, service, updateFunction, getFunction));
		}

		switch (method) {
			case EApiRouteType.CREATE: {
				await this.executeGeneratedRequestPipeline(options, targets, [EApiControllerRequestTarget.BODY]);
				const service: ApiServiceBase<E> = options.controller.service;
				const getFunction: (this: ApiServiceBase<E>, properties: TApiFunctionGetProperties<E>) => Promise<E> = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.GET, EApiFunctionType.GET, options.properties.entity);

				return await this.executeGeneratedTransaction(options, routeConfig, async (): Promise<E> => {
					await ApiControllerHandleRequestRelations(options.controller, options.properties, routeConfig.relations?.request, targets.body ?? {});
					const primaryKey: IApiControllerPrimaryColumn<E> = this.resolvePrimaryKey(targets.body, options.entityMetadata);
					markAfterBoundary();
					const createResponse: E = await options.controller.service.create((targets.body ?? {}) as never);

					const requestProperties: TApiFunctionGetProperties<E> = {
						relationLoadStrategy: routeConfig.relations?.response?.load?.relationLoadStrategy,
						relations: routeConfig.relations?.response?.load?.include,
						where: AuthorizationScopeMergeWhere({ [primaryKey.key]: createResponse[primaryKey.key] } as FindOptionsWhere<E>, ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(authorizationDecision)),
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

				const query: TApiControllerGetListQuery<E> | undefined = targets.query;

				if (!query) {
					throw ErrorException("Query target is required for GET_LIST routes");
				}

				const queryPlan: IApiControllerGetListQueryPlan | undefined = ApiControllerGetListQueryPlanGet(Object.getPrototypeOf(options.controller) as object, options.methodName);
				const runtimeQuery: IApiControllerGetListQueryRuntimeResult | undefined = queryPlan ? ApiControllerGetListQueryRuntime.parse(query, queryPlan) : undefined;
				const service: ApiServiceBase<E> = options.controller.service;
				const getListFunction: (this: ApiServiceBase<E>, properties: TApiFunctionGetListProperties<E>) => Promise<unknown> = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.GET_LIST, EApiFunctionType.GET_LIST, options.properties.entity);

				return await this.executeGeneratedTransaction(options, routeConfig, async (): Promise<unknown> => {
					const { limit, orderBy, orderDirection, page, ...getListQuery }: TApiControllerGetListQuery<E> = query;
					const filter: TApiFunctionGetListPropertiesWhere<E> = runtimeQuery?.ast ? ApiControllerGetListQueryRuntime.compileWhere<E>(runtimeQuery.ast) : ApiControllerGetListTransformFilter<E>(runtimeQuery?.filterQuery ?? getListQuery, options.entityMetadata, routeConfig.security?.authentication?.guard);
					const routeScopedFilter: TApiAuthorizationScopeWhere<E> = readPlan ? AuthorizationScopeMergeWhere(filter, ApiControllerReadScopeWhere(targets.parameters, readPlan)) : filter;
					const scopedFilter: Array<TApiFunctionGetListPropertiesWhere<E>> | TApiFunctionGetListPropertiesWhere<E> | undefined = AuthorizationScopeMergeWhere(routeScopedFilter, ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(authorizationDecision));
					const effectiveLimit: number = runtimeQuery?.limit ?? limit;
					const effectiveOrderBy: keyof E | string | undefined = runtimeQuery?.orderBy ?? orderBy;
					const effectiveOrderDirection: EFilterOrderDirection | undefined = runtimeQuery?.orderDirection ?? orderDirection;
					const effectivePage: number = runtimeQuery?.page ?? page;

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

					markAfterBoundary();

					return await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_LIST, requestProperties, requestProperties.where, async (): Promise<unknown> => await Reflect.apply(getListFunction, service, [requestProperties]));
				});
			}
		}
	}

	private static async executeGeneratedRequestPipeline<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, targets: IApiRouteRuntimeGeneratedTargets<E>, targetOrder: Array<EApiControllerRequestTarget>): Promise<void> {
		const routeConfig: TApiControllerPropertiesRoute<E, R> = options.properties.routes[options.method] ?? {};
		const requestTargets: Partial<Record<EApiControllerRequestTarget, IApiControllerPropertiesRouteBaseRequestTarget<E>>> | undefined = routeConfig.request;
		const transformTargets: Partial<Record<EApiControllerRequestTarget, { transformers?: Array<TApiRequestTransformer<E>> }>> | undefined = routeConfig.request;

		for (const target of targetOrder) {
			if (target === EApiControllerRequestTarget.PARAMETERS) {
				ApiControllerTransformData<E>(transformTargets, options.properties, { parameters: targets.parameters }, { authenticationRequest: targets.authenticationRequest, headers: targets.headers, ip: targets.ip });
				await ApiControllerValidateRequest<E>(requestTargets?.[target], options.properties, targets.parameters ?? {});
			}

			if (target === EApiControllerRequestTarget.QUERY) {
				ApiControllerTransformData<E>(transformTargets, options.properties, { query: targets.query }, { authenticationRequest: targets.authenticationRequest, headers: targets.headers, ip: targets.ip });
				await ApiControllerValidateRequest<E>(requestTargets?.[target], options.properties, targets.query ?? {});
			}

			if (target === EApiControllerRequestTarget.BODY) {
				ApiControllerTransformData<E>(transformTargets, options.properties, { body: targets.body }, { authenticationRequest: targets.authenticationRequest, headers: targets.headers, ip: targets.ip });
				await ApiControllerValidateRequest<E>(requestTargets?.[target], options.properties, (targets.body ?? {}) as Partial<E>);
			}
		}
	}

	private static async executeGeneratedResponse<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, targets: IApiRouteRuntimeGeneratedTargets<E>, entityInstance: E, baseData: IApiSubscriberRouteExecutionContextData<E>, authorizationDecision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined, result: unknown): Promise<unknown> {
		const routeConfig: TApiControllerPropertiesRoute<E, R> = options.properties.routes[options.method] ?? {};
		const responseTarget: TApiControllerTransformDataObjectToTransform<E> = { response: result as Partial<E> };
		const responseResource: E | undefined = responseTarget.response as E | undefined;

		ApiControllerTransformData<E>(routeConfig.response, options.properties, responseTarget, { authenticationRequest: targets.authenticationRequest, headers: targets.headers, ip: targets.ip });

		const afterContext: IApiSubscriberRouteExecutionContext<E> = {
			DATA: { ...(baseData as object), authenticationRequest: targets.authenticationRequest, authorizationDecision: ApiControllerGeneratedSecuritySnapshot.createSubscriberView(authorizationDecision, responseResource), body: targets.body, headers: targets.headers, ip: targets.ip, parameters: targets.parameters, query: targets.query },
			ENTITY: responseTarget.response as E,
			result: responseTarget.response,
			ROUTE_TYPE: options.method,
		};
		const afterResult: unknown = await ApiSubscriberExecutor.executeRouteSubscribers(options.controller.constructor as new (...arguments_: Array<unknown>) => unknown, (responseTarget.response ?? entityInstance) as E, options.method, EApiSubscriberOnType.AFTER, afterContext);
		const finalResponse: unknown = afterResult ?? responseTarget.response;
		const transformedResponse: unknown = await AuthorizationDecisionApplyResult(ApiControllerGeneratedSecuritySnapshot.withResource(authorizationDecision, finalResponse as E) as never, finalResponse as never);
		const identityPlan: IApiControllerIdentityPlan | undefined = this.resolveIdentityPlan(options.controller, options.methodName);
		const dto: Type<unknown> | undefined = ApiControllerGetDtoWithReadPlan(options.properties, options.entityMetadata, options.method, EApiDtoType.RESPONSE, routeConfig, undefined, undefined, identityPlan);

		return ApiControllerSerializeRouteResponse(routeConfig, dto, ApiRouteProjectRelationResponse(routeConfig.relations?.response, transformedResponse));
	}

	private static async executeGeneratedTransaction<E extends IApiBaseEntity, R extends EApiRouteType, T>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, routeConfig: TApiControllerPropertiesRoute<E, R>, callback: () => Promise<T>): Promise<T> {
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
				dataSource: repository.manager.connection,
				owner: {
					entityName: options.properties.entity.name ?? options.entityMetadata.tableName,
					kind: EApiFunctionTransactionOwnerKind.ROUTE,
					methodName: options.methodName,
					routeType: options.method,
				},
			});
		}

		return await callback();
	}

	private static async executeGeneratedUpdateOperation<E extends IApiBaseEntity, R extends EApiRouteType>(
		options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>,
		targets: IApiRouteRuntimeGeneratedTargets<E>,
		authorizationDecision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined,
		routeConfig: TApiControllerPropertiesRoute<E, R>,
		markAfterBoundary: () => void,
		service: ApiServiceBase<E>,
		updateFunction: (this: ApiServiceBase<E>, criteria: Array<TApiFunctionUpdateCriteria<E>> | TApiFunctionUpdateCriteria<E>, properties: never) => Promise<E>,
		getFunction: ((this: ApiServiceBase<E>, properties: TApiFunctionGetProperties<E>) => Promise<E>) | undefined,
	): Promise<E> {
		const responseLoad: IApiControllerPropertiesRouteBaseRelationsResponseLoad<E> | undefined = routeConfig.relations?.response?.load;

		await ApiControllerHandleRequestRelations(options.controller, options.properties, routeConfig.relations?.request, targets.body ?? {});
		const primaryKey: IApiControllerPrimaryColumn<E> = this.resolvePrimaryKey(targets.parameters, options.entityMetadata);
		const requestCriteria: TApiFunctionUpdateCriteria<E> = { [primaryKey.key]: primaryKey.value } as TApiFunctionUpdateCriteria<E>;
		const scopedCriteria: TApiAuthorizationScopeWhere<E> = AuthorizationScopeMergeWhere(requestCriteria, ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(authorizationDecision));
		const updateCriteria: TApiAuthorizationScopeWhere<E> = scopedCriteria ?? requestCriteria;
		markAfterBoundary();
		const updateResponse: E = await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.UPDATE, updateCriteria, updateCriteria, async (): Promise<E> => await Reflect.apply(updateFunction, service, [updateCriteria, (targets.body ?? {}) as never]));

		if (!responseLoad || !getFunction) {
			return updateResponse;
		}

		const requestProperties: TApiFunctionGetProperties<E> = {
			relationLoadStrategy: responseLoad.relationLoadStrategy,
			relations: responseLoad.include,
			where: AuthorizationScopeMergeWhere({ [primaryKey.key]: updateResponse[primaryKey.key] } as FindOptionsWhere<E>, ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(authorizationDecision)),
		};

		return await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, requestProperties, requestProperties.where, async (): Promise<E> => await Reflect.apply(getFunction, service, [requestProperties]));
	}

	private static async executeRequestTargets<E extends IApiBaseEntity>(metadata: IApiRouteMetadata<E>, runtimeProperties: IApiRouteRuntimeProperties<E>, request: IApiRouteRuntimeHttpRequest<E>, contextData: IApiRouteRuntimeContextData<E>): Promise<void> {
		const controllerProperties: IApiControllerProperties<E> = {
			entity: metadata.resource.entity,
			routes: {},
		};
		const requestTargets: Partial<Record<EApiControllerRequestTarget, IApiControllerPropertiesRouteBaseRequestTarget<E>>> | undefined = runtimeProperties.request;

		ApiControllerTransformData<E>(runtimeProperties.request, controllerProperties, { parameters: request.params }, contextData);
		await ApiControllerValidateRequest<E>(requestTargets?.[EApiControllerRequestTarget.PARAMETERS], controllerProperties, request.params ?? {});
		ApiControllerTransformData<E>(runtimeProperties.request, controllerProperties, { query: request.query as TApiControllerGetListQuery<E> | undefined }, contextData);
		await ApiControllerValidateRequest<E>(requestTargets?.[EApiControllerRequestTarget.QUERY], controllerProperties, request.query ?? {});
		ApiControllerTransformData<E>(runtimeProperties.request, controllerProperties, { body: request.body as E | undefined }, contextData);
		await ApiControllerValidateRequest<E>(requestTargets?.[EApiControllerRequestTarget.BODY], controllerProperties, request.body ?? {});
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

	private static resolveIdentityPlan(controller: object, methodName: string): IApiControllerIdentityPlan | undefined {
		const handler: unknown = Reflect.get(controller, methodName);

		return typeof handler === "function" ? ApiControllerIdentityPlanGet(handler) : undefined;
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

		if (!parameters || !Object.hasOwn(parameters, identityPlan.parameter)) {
			throw new BadRequestException("INVALID_PARAMETERS");
		}

		const value: unknown = parameters[identityPlan.parameter];

		if (value === undefined || value === null) {
			throw new BadRequestException("INVALID_PARAMETERS");
		}

		return {
			key: identityPlan.field,
			value: value as string,
		};
	}
}
