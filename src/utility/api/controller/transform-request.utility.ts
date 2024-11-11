import { InternalServerErrorException } from "@nestjs/common";

import { TRANSFORMER_VALUE_DTO_CONSTANT } from "../../../constant/dto/transformer-value.constant";
import { EApiControllerRequestTransformerType, EApiDtoType, EErrorStringAction } from "../../../enum";

import { ErrorString } from "../../error-string.utility";

import type { EApiRouteType } from "../../../enum";
import type { IApiAuthenticationRequest, IApiControllerProperties, IApiGetListResponseResult } from "../../../interface";
import type { TApiControllerPropertiesRouteBaseRequestTransformers, TApiControllerPropertiesRouteBaseResponseTransformers, TApiControllerGetListQuery, TApiRequestTransformer } from "../../../type";
import type { DeepPartial } from "typeorm";

function isApiGetListResponseResult<E>(object: IApiGetListResponseResult<E> | Partial<E> | TApiControllerGetListQuery<E>): object is IApiGetListResponseResult<E> {
	return "items" in object && "totalCount" in object;
}

function isApiFunctionGetListProperties<E>(object: IApiGetListResponseResult<E> | Partial<E> | TApiControllerGetListQuery<E>): object is TApiControllerGetListQuery<E> {
	return "limit" in object && "page" in object;
}

function isPartialE<E>(object: IApiGetListResponseResult<E> | Partial<E> | TApiControllerGetListQuery<E>): object is Partial<E> {
	return !isApiGetListResponseResult(object) && !isApiFunctionGetListProperties(object);
}

function processTransformer<E>(transformer: TApiRequestTransformer<E>, objectToTransform: IApiGetListResponseResult<E> | Partial<E> | TApiControllerGetListQuery<E>, properties: IApiControllerProperties<E>, requestData: TApiControllerTransformRequestRequestData): void {
	switch (transformer.type) {
		case EApiControllerRequestTransformerType.DYNAMIC: {
			if (Object.values(TRANSFORMER_VALUE_DTO_CONSTANT).includes(transformer.value)) {
				switch (transformer.value) {
					case TRANSFORMER_VALUE_DTO_CONSTANT.AUTHORIZED_ENTITY: {
						if (!requestData.authenticationRequest) {
							throw new InternalServerErrorException(
								ErrorString({
									entity: properties.entity,
									type: EErrorStringAction.AUTHORIZED_ENTITY_NOT_FOUND,
								}),
							);
						}

						handleTransformation(objectToTransform, transformer.key, requestData.authenticationRequest.user);

						break;
					}

					case TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_IP: {
						handleTransformation(objectToTransform, transformer.key, requestData.ip);

						break;
					}

					case TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_SIGNATURE: {
						if (!requestData.headers["x-signature"]) {
							throw new InternalServerErrorException(
								ErrorString({
									entity: properties.entity,
									type: EErrorStringAction.REQUEST_SIGNATURE_NOT_FOUND,
								}),
							);
						}

						handleTransformation(objectToTransform, transformer.key, requestData.headers["x-signature"]);

						break;
					}

					case TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_TIMESTAMP: {
						if (!requestData.headers["x-timestamp"]) {
							throw new InternalServerErrorException(
								ErrorString({
									entity: properties.entity,
									type: EErrorStringAction.REQUEST_TIMESTAMP_NOT_FOUND,
								}),
							);
						}

						handleTransformation(objectToTransform, transformer.key, requestData.headers["x-timestamp"]);

						break;
					}

					case TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_USER_AGENT: {
						if (!requestData.headers["user-agent"]) {
							throw new InternalServerErrorException(
								ErrorString({
									entity: properties.entity,
									type: EErrorStringAction.REQUEST_USER_AGENT_NOT_FOUND,
								}),
							);
						}

						handleTransformation(objectToTransform, transformer.key, requestData.headers["user-agent"]);

						break;
					}

					default: {
						console.warn(`Invalid dynamic value: ${String(transformer.value)}`);

						throw new Error("Invalid dynamic value");
					}
				}
			} else {
				console.warn(`Invalid dynamic value: ${String(transformer.value)}`);

				throw new Error("Invalid dynamic value");
			}

			break;
		}

		case EApiControllerRequestTransformerType.STATIC: {
			const staticValue: string = transformer.value;
			console.log(`Processing static value: ${staticValue}`);

			handleTransformation(objectToTransform, transformer.key, staticValue);

			break;
		}
	}
}

function handleTransformation<E>(object: IApiGetListResponseResult<E> | Partial<E> | TApiControllerGetListQuery<E>, key: keyof E | keyof IApiGetListResponseResult<E> | keyof TApiControllerGetListQuery<E>, value: unknown): void {
	if (isApiGetListResponseResult(object)) {
		if (key in object) {
			(object[key as keyof IApiGetListResponseResult<E>] as unknown) = value;
		}
	} else if (isApiFunctionGetListProperties(object)) {
		if (key in object) {
			(object[key as keyof TApiControllerGetListQuery<E>] as unknown) = value;
		}
	} else if (isPartialE(object) && key in object) {
		(object[key as keyof E] as unknown) = value;
	}
}

type TApiControllerTransformRequestObjectToTransform<E> = {
	body?: DeepPartial<E>;
	parameters?: Partial<E>;
	query?: TApiControllerGetListQuery<E>;
	response?: IApiGetListResponseResult<E> | Partial<E>;
};

type TApiControllerTransformRequestRequestData = {
	authenticationRequest?: IApiAuthenticationRequest;
	headers: Record<string, string>;
	ip: string;
};

export function ApiControllerTransformRequest<E, R extends EApiRouteType>(transformers: TApiControllerPropertiesRouteBaseRequestTransformers<E, R> | TApiControllerPropertiesRouteBaseResponseTransformers<E, R> | undefined, properties: IApiControllerProperties<E>, objectToTransform: TApiControllerTransformRequestObjectToTransform<E>, requestData: TApiControllerTransformRequestRequestData): void {
	if (!transformers) return;

	if (EApiDtoType.BODY in transformers && transformers[EApiDtoType.BODY]) {
		for (const transformer of transformers[EApiDtoType.BODY]) {
			if (objectToTransform.body) processTransformer(transformer, objectToTransform.body, properties, requestData);
		}
	}

	if (EApiDtoType.QUERY in transformers && transformers[EApiDtoType.QUERY]) {
		for (const transformer of transformers[EApiDtoType.QUERY]) {
			if (objectToTransform.query) processTransformer(transformer, objectToTransform.query, properties, requestData);
		}
	}

	if (EApiDtoType.REQUEST in transformers && transformers[EApiDtoType.REQUEST]) {
		for (const transformer of transformers[EApiDtoType.REQUEST]) {
			if (objectToTransform.parameters) processTransformer(transformer, objectToTransform.parameters, properties, requestData);
		}
	}

	if (EApiDtoType.RESPONSE in transformers && transformers[EApiDtoType.RESPONSE]) {
		for (const transformer of transformers[EApiDtoType.RESPONSE]) {
			if (objectToTransform.response) processTransformer(transformer, objectToTransform.response, properties, requestData);
		}
	}
}
