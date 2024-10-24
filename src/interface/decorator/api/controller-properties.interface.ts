import type { EApiAuthenticationType, EApiDtoType, EApiRouteType } from "../../../enum";
import type { TApiRequestTransformer } from "../../../type";

import type { IApiBaseEntity } from "../../api-base-entity.interface";
import type { IApiDtoValidator } from "../../api-dto-validator.interface";
import type { IApiRequestValidator } from "../../api-request-validator.interface";

import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { FindOptionsRelations } from "typeorm";

export interface IApiControllerPropertiesRouteAuthentication {
	bearerStrategies?: Array<string>;
	guard: Type<IAuthGuard>;
	securityStrategies?: Array<string>;
	type: EApiAuthenticationType;
}

export enum EApiControllerLoadRelationsStrategy {
	AUTO = "AUTO",
	MANUAL = "MANUAL",
}

export type TApiControllerPropertiesRouteBaseRequestRelations<E> = {
	loadRelations: boolean;
	relationsLoadStrategy: EApiControllerLoadRelationsStrategy;
	servicesLoadStrategy: EApiControllerLoadRelationsStrategy;
} & (
	| {
			relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO;
	  }
	| {
			relationsLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL;
			relationsToLoad: Array<keyof FindOptionsRelations<E>>;
	  }
) &
	(
		| {
				forceAllServicesToBeSpecified?: boolean;
				servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO;
		  }
		| {
				relationsServices: Partial<Record<keyof FindOptionsRelations<E>, string>>;
				servicesLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL;
		  }
	);

type TTransformerConfig<E> = {
	[EApiDtoType.BODY]?: Array<TApiRequestTransformer<E>>;
	[EApiDtoType.QUERY]?: Array<TApiRequestTransformer<E>>;
	[EApiDtoType.REQUEST]?: Array<TApiRequestTransformer<E>>;
	[EApiDtoType.RESPONSE]?: Array<TApiRequestTransformer<E>>;
};

export type TApiControllerPropertiesRouteBaseRequestTransformers<E, R extends EApiRouteType> = R extends EApiRouteType
	? {
			[EApiRouteType.CREATE]: Pick<TTransformerConfig<E>, EApiDtoType.BODY>;
			[EApiRouteType.DELETE]: Pick<TTransformerConfig<E>, EApiDtoType.REQUEST>;
			[EApiRouteType.GET_LIST]: Pick<TTransformerConfig<E>, EApiDtoType.QUERY>;
			[EApiRouteType.GET]: Pick<TTransformerConfig<E>, EApiDtoType.REQUEST>;
			[EApiRouteType.PARTIAL_UPDATE]: Pick<TTransformerConfig<E>, EApiDtoType.BODY | EApiDtoType.REQUEST>;
			[EApiRouteType.UPDATE]: Pick<TTransformerConfig<E>, EApiDtoType.BODY | EApiDtoType.REQUEST>;
		}[R]
	: never;

export type TApiControllerPropertiesRouteBaseResponseTransformers<E, R extends EApiRouteType> = R extends EApiRouteType
	? {
			[EApiRouteType.CREATE]: Pick<TTransformerConfig<E>, EApiDtoType.RESPONSE>;
			[EApiRouteType.DELETE]: never;
			[EApiRouteType.GET_LIST]: Pick<TTransformerConfig<E>, EApiDtoType.RESPONSE>;
			[EApiRouteType.GET]: Pick<TTransformerConfig<E>, EApiDtoType.RESPONSE>;
			[EApiRouteType.PARTIAL_UPDATE]: Pick<TTransformerConfig<E>, EApiDtoType.RESPONSE>;
			[EApiRouteType.UPDATE]: Pick<TTransformerConfig<E>, EApiDtoType.RESPONSE>;
		}[R]
	: never;

export interface IApiControllerPropertiesRouteBaseRequest<E, R extends EApiRouteType> {
	relations?: TApiControllerPropertiesRouteBaseRequestRelations<E>;
	transformers?: TApiControllerPropertiesRouteBaseRequestTransformers<E, R>;
	validators?: Array<IApiRequestValidator<E>>;
}

export interface IApiControllerPropertiesRouteBase<E, R extends EApiRouteType> {
	authentication?: IApiControllerPropertiesRouteAuthentication;
	decorators?: Array<MethodDecorator> | Array<PropertyDecorator>;
	isEnabled?: boolean;
	request?: IApiControllerPropertiesRouteBaseRequest<E, R>;
	response?: IApiControllerPropertiesRouteBaseResponse<E, R>;
}

export interface IApiControllerPropertiesRouteWithDto<E, R extends EApiRouteType> extends IApiControllerPropertiesRouteBase<E, R> {
	autoDto?: never;
	dto?: {
		[key in EApiDtoType]?: Type<unknown>;
	};
}

export interface IApiControllerPropertiesRouteBaseResponse<E, R extends EApiRouteType> {
	relations?: FindOptionsRelations<E>;
	transformers?: TApiControllerPropertiesRouteBaseResponseTransformers<E, R>;
}

export interface IApiControllerPropertiesRouteAutoDtoConfig {
	validators?: Array<IApiDtoValidator>;
}

export interface IApiControllerPropertiesRouteWithAutoDto<E, R extends EApiRouteType> extends IApiControllerPropertiesRouteBase<E, R> {
	autoDto?: {
		[key in EApiDtoType]?: IApiControllerPropertiesRouteAutoDtoConfig;
	};
	dto?: never;
}

export type TApiControllerPropertiesRoute<E, R extends EApiRouteType> = IApiControllerPropertiesRouteWithAutoDto<E, R> | IApiControllerPropertiesRouteWithDto<E, R>;

export interface IApiControllerProperties<E> {
	entity: IApiBaseEntity;
	name?: string;
	path?: string;
	routes: {
		[R in EApiRouteType]?: TApiControllerPropertiesRoute<E, R>;
	};
}
