import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization";
import type { IApiRouteRuntimeContextData, IApiRouteRuntimeCustomExecutionOptions, IApiRouteRuntimeGeneratedExecutionOptions, IApiRouteRuntimeGeneratedTargets, IApiRouteRuntimeHttpRequest } from "@interface/class/api/route";
import type { IApiSubscriberRouteErrorExecutionContext } from "@interface/class/api/subscriber/route/error-execution-context.interface";
import type { IApiSubscriberRouteExecutionContextData } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiControllerProperties, IApiControllerPropertiesRouteBaseRequestTarget, IApiRouteMetadata, IApiRouteRuntimeProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { IApiControllerPrimaryColumn } from "@interface/utility";
import type { Type } from "@nestjs/common";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiControllerMethod } from "@type/class/controller-method.type";
import type { TApiControllerGetListQuery, TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetListPropertiesWhere, TApiFunctionGetProperties, TApiFunctionUpdateCriteria } from "@type/decorator/api/function";
import type { TApiControllerTransformDataObjectToTransform } from "@type/utility";
import type { DeepPartial, FindOptionsOrder, FindOptionsWhere } from "typeorm";

import { ApiServiceBase } from "@class/api/service-base.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { FUNCTION_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiControllerRequestTarget, EApiRouteType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EApiDtoType } from "@enum/decorator/api";
import { ApiControllerGetListTransformFilter } from "@utility/api/controller/get-list/transform/filter.utility";
import { ApiControllerGetDto } from "@utility/api/controller/get/dto.utility";
import { ApiControllerGetPrimaryColumn } from "@utility/api/controller/get/primary-column.utility";
import { ApiControllerHandleRequestRelations } from "@utility/api/controller/handle-request-relations.utility";
import { ApiControllerSerializeRouteResponse } from "@utility/api/controller/serialize-route-response.utility";
import { ApiControllerTransformData } from "@utility/api/controller/transform-data.utility";
import { ApiControllerValidateRequest } from "@utility/api/controller/validate-request.utility";
import { ApiRouteProjectRelationResponse } from "@utility/api/route";
import { ApiRouteSerializeResponse } from "@utility/api/route/response/serialize.utility";
import { AuthorizationDecisionApplyResult, AuthorizationDecisionAttachResource, AuthorizationDecisionResolveFromRequest } from "@utility/authorization/decision";
import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { ErrorException } from "@utility/error/exception.utility";

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
		if (!runtimeProperties.relations?.response?.load?.include) {
			return response;
		}

		if (!(controller.service instanceof ApiServiceBase)) {
			throw ErrorException("ApiRouteCustom response relation loading requires a controller service extending ApiServiceBase");
		}

		if (Array.isArray(response)) {
			return (await Promise.all(response.map(async (item: unknown): Promise<unknown> => await this.loadCustomResponseRelations(controller.service, runtimeProperties, item)))) as R;
		}

		if (response !== null && typeof response === "object" && "items" in response && Array.isArray((response as { items?: unknown }).items)) {
			const responseObject: { items: Array<unknown> } = response as { items: Array<unknown> };
			responseObject.items = await Promise.all(responseObject.items.map(async (item: unknown): Promise<unknown> => await this.loadCustomResponseRelations(controller.service, runtimeProperties, item)));

			return response;
		}

		return (await this.loadCustomResponseRelations(controller.service, runtimeProperties, response)) as R;
	}

	public static async executeGenerated<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>): Promise<unknown> {
		const entityInstance: E = new (options.properties.entity as new () => E)();
		let authorizationDecision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined = AuthorizationDecisionResolveFromRequest(options.targets.authenticationRequest);

		const beforeContext: IApiSubscriberRouteExecutionContext<E, IApiRouteRuntimeGeneratedTargets<E>, IApiSubscriberRouteExecutionContextData<E>> = {
			DATA: { authorizationDecision, entityMetadata: options.entityMetadata, method: options.method, methodName: options.methodName, properties: options.properties },
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

		if (beforeResult) {
			authorizationDecision = AuthorizationDecisionResolveFromRequest(targets.authenticationRequest);
		}

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
			DATA: { ...(baseData as object), authenticationRequest: targets.authenticationRequest, authorizationDecision, body: targets.body, headers: targets.headers, ip: targets.ip, parameters: targets.parameters, query: targets.query },
			ENTITY: entityInstance,
			ROUTE_TYPE: options.method,
		};

		await ApiSubscriberExecutor.executeRouteErrorSubscribers(options.controller.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, options.method, onType, errorContext, error as Error);
	}

	private static async executeGeneratedOperation<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, targets: IApiRouteRuntimeGeneratedTargets<E>, authorizationDecision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined, markAfterBoundary: () => void): Promise<unknown> {
		const routeConfig: TApiControllerPropertiesRoute<E, R> = options.properties.routes[options.method] ?? {};

		switch (options.method) {
			case EApiRouteType.CREATE: {
				await this.executeGeneratedRequestPipeline(options, targets, [EApiControllerRequestTarget.BODY]);
				await ApiControllerHandleRequestRelations(options.controller, options.properties, routeConfig.relations?.request, targets.body ?? {});
				const primaryKey: IApiControllerPrimaryColumn<E> = this.resolvePrimaryKey(targets.body, options.entityMetadata);
				markAfterBoundary();
				const createResponse: E = await options.controller.service.create((targets.body ?? {}) as never);

				return await options.controller.service.get({
					relations: routeConfig.relations?.response?.load?.include,
					where: AuthorizationScopeMergeWhere({ [primaryKey.key]: createResponse[primaryKey.key] } as FindOptionsWhere<E>, authorizationDecision?.scope?.where),
				});
			}

			case EApiRouteType.DELETE: {
				await this.executeGeneratedRequestPipeline(options, targets, [EApiControllerRequestTarget.PARAMETERS]);
				const primaryKey: IApiControllerPrimaryColumn<E> = this.resolvePrimaryKey(targets.parameters, options.entityMetadata);
				const requestCriteria: TApiFunctionDeleteCriteria<E> = { [primaryKey.key]: primaryKey.value } as TApiFunctionDeleteCriteria<E>;
				const scopedCriteria: Array<TApiFunctionDeleteCriteria<E>> | TApiFunctionDeleteCriteria<E> | undefined = AuthorizationScopeMergeWhere(requestCriteria, authorizationDecision?.scope?.where);

				markAfterBoundary();
				await options.controller.service.delete(scopedCriteria ?? requestCriteria);

				return undefined;
			}

			case EApiRouteType.GET: {
				await this.executeGeneratedRequestPipeline(options, targets, [EApiControllerRequestTarget.PARAMETERS]);
				const primaryKey: IApiControllerPrimaryColumn<E> = this.resolvePrimaryKey(targets.parameters, options.entityMetadata);

				const requestProperties: TApiFunctionGetProperties<E> = {
					relations: routeConfig.relations?.response?.load?.include,
					where: AuthorizationScopeMergeWhere({ [primaryKey.key]: primaryKey.value } as FindOptionsWhere<E>, authorizationDecision?.scope?.where),
				};

				markAfterBoundary();

				return await options.controller.service.get(requestProperties);
			}

			case EApiRouteType.GET_LIST: {
				await this.executeGeneratedRequestPipeline(options, targets, [EApiControllerRequestTarget.QUERY]);

				if (!targets.query) {
					throw ErrorException("Query target is required for GET_LIST routes");
				}

				const query: TApiControllerGetListQuery<E> = targets.query;
				const { limit, orderBy, orderDirection, page, ...getListQuery }: TApiControllerGetListQuery<E> = query;
				const filter: TApiFunctionGetListPropertiesWhere<E> = ApiControllerGetListTransformFilter<E>(getListQuery, options.entityMetadata);
				const scopedFilter: Array<TApiFunctionGetListPropertiesWhere<E>> | TApiFunctionGetListPropertiesWhere<E> | undefined = AuthorizationScopeMergeWhere(filter, authorizationDecision?.scope?.where);

				const requestProperties: TApiFunctionGetListProperties<E> = {
					relations: routeConfig.relations?.response?.load?.include,
					skip: query.limit * (query.page - 1),
					take: query.limit,
					where: scopedFilter ?? filter,
				};

				if (orderBy) {
					requestProperties.order = { [orderBy as never as string]: orderDirection ?? FUNCTION_API_DECORATOR_CONSTANT.DEFAULT_FILTER_ORDER_BY_DIRECTION } as FindOptionsOrder<E>;
				}

				markAfterBoundary();

				return await options.controller.service.getList(requestProperties);
			}

			case EApiRouteType.PARTIAL_UPDATE: {
				return await this.executeGeneratedUpdateOperation(options, targets, authorizationDecision, routeConfig, markAfterBoundary);
			}

			case EApiRouteType.UPDATE: {
				return await this.executeGeneratedUpdateOperation(options, targets, authorizationDecision, routeConfig, markAfterBoundary);
			}
		}
	}

	private static async executeGeneratedRequestPipeline<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, targets: IApiRouteRuntimeGeneratedTargets<E>, targetOrder: Array<EApiControllerRequestTarget>): Promise<void> {
		const routeConfig: TApiControllerPropertiesRoute<E, R> = options.properties.routes[options.method] ?? {};
		const requestTargets: Partial<Record<EApiControllerRequestTarget, IApiControllerPropertiesRouteBaseRequestTarget<E>>> | undefined = routeConfig.request;

		for (const target of targetOrder) {
			if (target === EApiControllerRequestTarget.PARAMETERS) {
				ApiControllerTransformData<E>(routeConfig.request, options.properties, { parameters: targets.parameters }, { authenticationRequest: targets.authenticationRequest, headers: targets.headers, ip: targets.ip });
				await ApiControllerValidateRequest<E>(requestTargets?.[target], options.properties, targets.parameters ?? {});
			}

			if (target === EApiControllerRequestTarget.QUERY) {
				ApiControllerTransformData<E>(routeConfig.request, options.properties, { query: targets.query }, { authenticationRequest: targets.authenticationRequest, headers: targets.headers, ip: targets.ip });
				await ApiControllerValidateRequest<E>(requestTargets?.[target], options.properties, targets.query ?? {});
			}

			if (target === EApiControllerRequestTarget.BODY) {
				ApiControllerTransformData<E>(routeConfig.request, options.properties, { body: targets.body }, { authenticationRequest: targets.authenticationRequest, headers: targets.headers, ip: targets.ip });
				await ApiControllerValidateRequest<E>(requestTargets?.[target], options.properties, (targets.body ?? {}) as Partial<E>);
			}
		}
	}

	private static async executeGeneratedResponse<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, targets: IApiRouteRuntimeGeneratedTargets<E>, entityInstance: E, baseData: IApiSubscriberRouteExecutionContextData<E>, authorizationDecision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined, result: unknown): Promise<unknown> {
		const routeConfig: TApiControllerPropertiesRoute<E, R> = options.properties.routes[options.method] ?? {};
		const responseTarget: TApiControllerTransformDataObjectToTransform<E> = { response: result as Partial<E> };

		authorizationDecision = AuthorizationDecisionAttachResource(authorizationDecision as never, responseTarget.response as never) as IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined;
		ApiControllerTransformData<E>(routeConfig.response, options.properties, responseTarget, { authenticationRequest: targets.authenticationRequest, headers: targets.headers, ip: targets.ip });

		const afterContext: IApiSubscriberRouteExecutionContext<E> = {
			DATA: { ...(baseData as object), authenticationRequest: targets.authenticationRequest, authorizationDecision, body: targets.body, headers: targets.headers, ip: targets.ip, parameters: targets.parameters, query: targets.query },
			ENTITY: responseTarget.response as E,
			result: responseTarget.response,
			ROUTE_TYPE: options.method,
		};
		const afterResult: unknown = await ApiSubscriberExecutor.executeRouteSubscribers(options.controller.constructor as new (...arguments_: Array<unknown>) => unknown, (responseTarget.response ?? entityInstance) as E, options.method, EApiSubscriberOnType.AFTER, afterContext);
		const finalResponse: unknown = afterResult ?? responseTarget.response;
		const transformedResponse: unknown = await AuthorizationDecisionApplyResult(AuthorizationDecisionAttachResource(authorizationDecision as never, finalResponse as never) as never, finalResponse as never);
		const dto: Type<unknown> | undefined = ApiControllerGetDto(options.properties, options.entityMetadata, options.method, EApiDtoType.RESPONSE, routeConfig);

		return ApiControllerSerializeRouteResponse(routeConfig, dto, ApiRouteProjectRelationResponse(routeConfig.relations?.response, transformedResponse));
	}

	private static async executeGeneratedUpdateOperation<E extends IApiBaseEntity, R extends EApiRouteType>(options: IApiRouteRuntimeGeneratedExecutionOptions<E, R>, targets: IApiRouteRuntimeGeneratedTargets<E>, authorizationDecision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> | undefined, routeConfig: TApiControllerPropertiesRoute<E, R>, markAfterBoundary: () => void): Promise<E> {
		await this.executeGeneratedRequestPipeline(options, targets, [EApiControllerRequestTarget.PARAMETERS, EApiControllerRequestTarget.BODY]);
		await ApiControllerHandleRequestRelations(options.controller, options.properties, routeConfig.relations?.request, targets.body ?? {});
		const primaryKey: IApiControllerPrimaryColumn<E> = this.resolvePrimaryKey(targets.parameters, options.entityMetadata);
		const requestCriteria: TApiFunctionUpdateCriteria<E> = { [primaryKey.key]: primaryKey.value } as TApiFunctionUpdateCriteria<E>;
		const scopedCriteria: TApiAuthorizationScopeWhere<E> = AuthorizationScopeMergeWhere(requestCriteria, authorizationDecision?.scope?.where);
		markAfterBoundary();
		const updateResponse: E = await options.controller.service.update(scopedCriteria ?? requestCriteria, (targets.body ?? {}) as never);

		if (!routeConfig.relations?.response?.load?.include) {
			return updateResponse;
		}

		return await options.controller.service.get({
			relations: routeConfig.relations.response.load.include,
			where: AuthorizationScopeMergeWhere({ [primaryKey.key]: updateResponse[primaryKey.key] } as FindOptionsWhere<E>, authorizationDecision?.scope?.where),
		});
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
			relations: runtimeProperties.relations?.response?.load?.include,
			where: {
				id: responseId,
			} as unknown as FindOptionsWhere<E>,
		});
	}

	private static resolvePrimaryKey<E extends IApiBaseEntity>(source: DeepPartial<E> | Partial<E> | undefined, entityMetadata: IApiEntity<E>): IApiControllerPrimaryColumn<E> {
		const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(source ?? {}, entityMetadata);

		if (!primaryKey) {
			throw ErrorException("Primary key not found in entity columns");
		}

		return primaryKey;
	}
}
