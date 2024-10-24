import { DECORATORS } from "@nestjs/swagger/dist/constants";

import { MetadataStorage } from "../../../class";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../../../constant";
import { EApiDtoType, EApiPropertyDescribeType } from "../../../enum";
import { CapitalizeString } from "../../capitalize-string.utility";
import { DtoGenerate } from "../../dto";

import type { EApiRouteType } from "../../../enum";
import type { IApiControllerProperties, IApiEntity, TApiControllerPropertiesRoute } from "../../../interface";
import type { TMetadata } from "../../../type";
import type { Type } from "@nestjs/common";

export function ApiControllerWriteDtoSwagger<E>(target: Object, entity: IApiEntity<E>, properties: IApiControllerProperties<E>, method: EApiRouteType, routeConfig: TApiControllerPropertiesRoute<E, typeof method>, entityMetadata: IApiEntity<E>): void {
	const swaggerModels: Array<unknown> = (Reflect.getMetadata(DECORATORS.API_EXTRA_MODELS, target) || []) as Array<unknown>;

	const requestDto: Type<unknown> | undefined = routeConfig.dto?.request || DtoGenerate(properties.entity, entity, method, EApiDtoType.REQUEST, routeConfig.autoDto?.[EApiDtoType.REQUEST], routeConfig.authentication?.guard);
	const queryDto: Type<unknown> | undefined = routeConfig.dto?.query || DtoGenerate(properties.entity, entity, method, EApiDtoType.QUERY, routeConfig.autoDto?.[EApiDtoType.QUERY], routeConfig.authentication?.guard);
	const bodyDto: Type<unknown> | undefined = routeConfig.dto?.body || DtoGenerate(properties.entity, entity, method, EApiDtoType.BODY, routeConfig.autoDto?.[EApiDtoType.BODY], routeConfig.authentication?.guard);
	const responseDto: Type<unknown> | undefined = routeConfig.dto?.response || DtoGenerate(properties.entity, entity, method, EApiDtoType.RESPONSE, routeConfig.autoDto?.[EApiDtoType.RESPONSE], routeConfig.authentication?.guard);

	const dtoList: Array<Type<unknown> | undefined> = [requestDto, queryDto, bodyDto, responseDto];

	for (const dto of dtoList) {
		if (dto && !swaggerModels.includes(dto)) {
			swaggerModels.push(dto);

			const storage: MetadataStorage = MetadataStorage.getInstance();

			const metadata: TMetadata | undefined = storage.getMetadata(entityMetadata.name);

			if (metadata)
				for (const key of Object.keys(metadata)) {
					if (metadata[key]?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME] && metadata[key]?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME].type === EApiPropertyDescribeType.RELATION) {
						const relationClass: { new (): any; prototype: any } = class GeneratedDTO {
							constructor() {
								Object.defineProperty(this, "id", {
									configurable: true,
									enumerable: true,
									value: undefined,
									writable: true,
								});
							}
						};

						Object.defineProperty(relationClass, "name", {
							value: `${entityMetadata.name}${CapitalizeString(method)}${CapitalizeString(EApiDtoType.BODY)}${key}DTO`,
						});

						swaggerModels.push(relationClass);
					}
				}

			Reflect.defineMetadata(DECORATORS.API_EXTRA_MODELS, swaggerModels, target);
		}
	}
}
