import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiSubscriber } from "@interface/class/api/subscriber/interface";
import type { IApiSubscriberRouteErrorExecutionContext } from "@interface/class/api/subscriber/route/error-execution-context.interface";
import type { IApiSubscriberRouteExecutionContextData, IApiSubscriberRouteExecutionContextDataExtended } from "@interface/class/api/subscriber/route/execution/context-data.interface";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context.interface";
import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";
import type { DeepPartial } from "typeorm";

export interface IApiSubscriberRoute<E extends IApiBaseEntity> extends IApiSubscriber {
	onAfterCreate?(context: IApiSubscriberRouteExecutionContext<E, E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>): Promise<E | undefined>;
	onAfterDelete?(context: IApiSubscriberRouteExecutionContext<E, Partial<E>, IApiSubscriberRouteExecutionContextDataExtended<E, undefined>>): Promise<Partial<E> | undefined>;

	onAfterErrorCreate?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>, error: Error): Promise<void>;
	onAfterErrorDelete?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextDataExtended<E, undefined>>, error: Error): Promise<void>;

	onAfterErrorGet?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>, error: Error): Promise<void>;
	onAfterErrorGetList?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextDataExtended<E, IApiGetListResponseResult<E>>>, error: Error): Promise<void>;
	onAfterErrorPartialUpdate?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>, error: Error): Promise<void>;
	onAfterErrorUpdate?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>, error: Error): Promise<void>;

	onAfterGet?(context: IApiSubscriberRouteExecutionContext<E, E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>): Promise<E | undefined>;
	onAfterGetList?(context: IApiSubscriberRouteExecutionContext<E, IApiGetListResponseResult<E>, IApiSubscriberRouteExecutionContextDataExtended<E, IApiGetListResponseResult<E>>>): Promise<IApiGetListResponseResult<E> | undefined>;
	onAfterPartialUpdate?(context: IApiSubscriberRouteExecutionContext<E, E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>): Promise<E | undefined>;
	onAfterUpdate?(context: IApiSubscriberRouteExecutionContext<E, E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>): Promise<E | undefined>;

	onBeforeCreate?(
		context: IApiSubscriberRouteExecutionContext<
			E,
			{
				authenticationRequest?: IApiAuthenticationRequest;
				body: DeepPartial<E>;
				headers: Record<string, string>;
				ip: string;
			},
			IApiSubscriberRouteExecutionContextData<E, E>
		>,
	): Promise<
		| {
				authenticationRequest?: IApiAuthenticationRequest;
				body: DeepPartial<E>;
				headers: Record<string, string>;
				ip: string;
		  }
		| undefined
	>;
	onBeforeDelete?(
		context: IApiSubscriberRouteExecutionContext<
			E,
			{
				authenticationRequest?: IApiAuthenticationRequest;
				headers: Record<string, string>;
				ip: string;
				parameters: Partial<E>;
			},
			IApiSubscriberRouteExecutionContextData<E, undefined>
		>,
	): Promise<
		| {
				authenticationRequest?: IApiAuthenticationRequest;
				headers: Record<string, string>;
				ip: string;
				parameters: Partial<E>;
		  }
		| undefined
	>;
	onBeforeErrorCreate?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextData<E, E>>, error: Error): Promise<void>;
	onBeforeErrorDelete?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextData<E, undefined>>, error: Error): Promise<void>;
	onBeforeErrorGet?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextData<E, E>>, error: Error): Promise<void>;
	onBeforeErrorGetList?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextData<E, IApiGetListResponseResult<E>>>, error: Error): Promise<void>;
	onBeforeErrorPartialUpdate?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextData<E, E>>, error: Error): Promise<void>;
	onBeforeErrorUpdate?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextData<E, E>>, error: Error): Promise<void>;
	onBeforeGet?(
		context: IApiSubscriberRouteExecutionContext<
			E,
			{
				authenticationRequest?: IApiAuthenticationRequest;
				headers: Record<string, string>;
				ip: string;
				parameters: Partial<E>;
			},
			IApiSubscriberRouteExecutionContextData<E, E>
		>,
	): Promise<
		| {
				authenticationRequest?: IApiAuthenticationRequest;
				headers: Record<string, string>;
				ip: string;
				parameters: Partial<E>;
		  }
		| undefined
	>;
	onBeforeGetList?(
		context: IApiSubscriberRouteExecutionContext<
			E,
			{
				authenticationRequest?: IApiAuthenticationRequest;
				headers: Record<string, string>;
				ip: string;
				query: TApiControllerGetListQuery<E>;
			},
			IApiSubscriberRouteExecutionContextData<E, IApiGetListResponseResult<E>>
		>,
	): Promise<
		| {
				authenticationRequest?: IApiAuthenticationRequest;
				headers: Record<string, string>;
				ip: string;
				query: TApiControllerGetListQuery<E>;
		  }
		| undefined
	>;
	onBeforePartialUpdate?(
		context: IApiSubscriberRouteExecutionContext<
			E,
			{
				authenticationRequest?: IApiAuthenticationRequest;
				body: DeepPartial<E>;
				headers: Record<string, string>;
				ip: string;
				parameters: Partial<E>;
			},
			IApiSubscriberRouteExecutionContextData<E, E>
		>,
	): Promise<
		| {
				authenticationRequest?: IApiAuthenticationRequest;
				body: DeepPartial<E>;
				headers: Record<string, string>;
				ip: string;
				parameters: Partial<E>;
		  }
		| undefined
	>;
	onBeforeUpdate?(
		context: IApiSubscriberRouteExecutionContext<
			E,
			{
				authenticationRequest?: IApiAuthenticationRequest;
				body: DeepPartial<E>;
				headers: Record<string, string>;
				ip: string;
				parameters: Partial<E>;
			},
			IApiSubscriberRouteExecutionContextData<E, E>
		>,
	): Promise<
		| {
				authenticationRequest?: IApiAuthenticationRequest;
				body: DeepPartial<E>;
				headers: Record<string, string>;
				ip: string;
				parameters: Partial<E>;
		  }
		| undefined
	>;
}
