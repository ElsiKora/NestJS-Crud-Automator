import type { EApiRouteType } from "../../../enum";
import type { IApiBaseEntity, IApiControllerProperties, IApiGetListResponseResult } from "../../../interface";
import type { TApiControllerGetListQuery, TApiControllerPropertiesRouteBaseRequestTransformers, TApiControllerPropertiesRouteBaseResponseTransformers, TApiControllerTransformDataData, TApiControllerTransformDataObjectToTransform, TApiRequestTransformer, TApiTransformDataIsValidationProperties } from "../../../type";

import { InternalServerErrorException } from "@nestjs/common";

import { TRANSFORMER_VALUE_DTO_CONSTANT } from "../../../constant/dto/transformer-value.constant";
import { EApiControllerRequestTransformerType, EApiDtoType, EErrorStringAction } from "../../../enum";
import { ErrorString } from "../../error-string.utility";

/**
 *
 * @param transformers
 * @param properties
 * @param objectToTransform
 * @param data
 */
export function ApiControllerTransformData<E, R extends EApiRouteType>(transformers: TApiControllerPropertiesRouteBaseRequestTransformers<E, R> | TApiControllerPropertiesRouteBaseResponseTransformers<E, R> | undefined, properties: IApiControllerProperties<E>, objectToTransform: TApiControllerTransformDataObjectToTransform<E>, data: TApiControllerTransformDataData): void {
	if (!transformers) return;

	if (EApiDtoType.BODY in transformers && transformers[EApiDtoType.BODY]) {
		for (const transformer of transformers[EApiDtoType.BODY]) {
			if (objectToTransform.body) processTransformer(transformer, objectToTransform.body, properties, data);
		}
	}

	if (EApiDtoType.QUERY in transformers && transformers[EApiDtoType.QUERY]) {
		for (const transformer of transformers[EApiDtoType.QUERY]) {
			if (objectToTransform.query) processTransformer(transformer, objectToTransform.query, properties, data);
		}
	}

	if (EApiDtoType.REQUEST in transformers && transformers[EApiDtoType.REQUEST]) {
		for (const transformer of transformers[EApiDtoType.REQUEST]) {
			if (objectToTransform.parameters) processTransformer(transformer, objectToTransform.parameters, properties, data);
		}
	}

	if (EApiDtoType.RESPONSE in transformers && transformers[EApiDtoType.RESPONSE]) {
		for (const transformer of transformers[EApiDtoType.RESPONSE]) {
			if (objectToTransform.response) processTransformer(transformer, objectToTransform.response, properties, data);
		}
	}
}

/**
 *
 * @param object
 * @param key
 * @param value
 * @param entity
 * @param shouldSetValueEvenIfMissing
 */
function handleTransformation<E>(object: TApiTransformDataIsValidationProperties<E>, key: keyof E | keyof IApiGetListResponseResult<E> | keyof TApiControllerGetListQuery<E>, value: unknown, entity: IApiBaseEntity, shouldSetValueEvenIfMissing: boolean = false): void {
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
	} else if (shouldSetValueEvenIfMissing) {
		(object[key as keyof E] as unknown) = value;
	} else {
		throw new InternalServerErrorException(
			ErrorString({
				entity,
				type: EErrorStringAction.KEY_FOR_TRANSFORM_NOT_IN_OBJECT,
			}),
		);
	}
}

/**
 *
 * @param object
 */
function isApiFunctionGetListProperties<E>(object: TApiTransformDataIsValidationProperties<E>): object is TApiControllerGetListQuery<E> {
	return "limit" in object && "page" in object;
}

/**
 *
 * @param object
 */
function isApiGetListResponseResult<E>(object: TApiTransformDataIsValidationProperties<E>): object is IApiGetListResponseResult<E> {
	return "items" in object && "totalCount" in object;
}

/**
 *
 * @param object
 */
function isPartialE<E>(object: TApiTransformDataIsValidationProperties<E>): object is Partial<E> {
	return !isApiGetListResponseResult(object) && !isApiFunctionGetListProperties(object);
}

/**
 *
 * @param transformer
 * @param objectToTransform
 * @param properties
 * @param data
 */
function processTransformer<E>(transformer: TApiRequestTransformer<E>, objectToTransform: TApiTransformDataIsValidationProperties<E>, properties: IApiControllerProperties<E>, data: TApiControllerTransformDataData): void {
	switch (transformer.type) {
		case EApiControllerRequestTransformerType.DYNAMIC: {
			if (Object.values(TRANSFORMER_VALUE_DTO_CONSTANT).includes(transformer.value)) {
				switch (transformer.value) {
					case TRANSFORMER_VALUE_DTO_CONSTANT.AUTHORIZED_ENTITY: {
						if (!data.authenticationRequest) {
							throw new InternalServerErrorException(
								ErrorString({
									entity: properties.entity,
									type: EErrorStringAction.AUTHORIZED_ENTITY_NOT_FOUND,
								}),
							);
						}

						handleTransformation(objectToTransform, transformer.key, data.authenticationRequest.user, properties.entity, transformer.shouldSetValueEvenIfMissing);

						break;
					}

					case TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_IP: {
						handleTransformation(objectToTransform, transformer.key, data.ip, properties.entity, transformer.shouldSetValueEvenIfMissing);

						break;
					}

					case TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_SIGNATURE: {
						if (!data.headers["x-signature"]) {
							throw new InternalServerErrorException(
								ErrorString({
									entity: properties.entity,
									type: EErrorStringAction.REQUEST_SIGNATURE_NOT_FOUND,
								}),
							);
						}

						handleTransformation(objectToTransform, transformer.key, data.headers["x-signature"], properties.entity, transformer.shouldSetValueEvenIfMissing);

						break;
					}

					case TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_TIMESTAMP: {
						if (!data.headers["x-timestamp"]) {
							throw new InternalServerErrorException(
								ErrorString({
									entity: properties.entity,
									type: EErrorStringAction.REQUEST_TIMESTAMP_NOT_FOUND,
								}),
							);
						}

						handleTransformation(objectToTransform, transformer.key, data.headers["x-timestamp"], properties.entity, transformer.shouldSetValueEvenIfMissing);

						break;
					}

					case TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_USER_AGENT: {
						if (!data.headers["user-agent"]) {
							throw new InternalServerErrorException(
								ErrorString({
									entity: properties.entity,
									type: EErrorStringAction.REQUEST_USER_AGENT_NOT_FOUND,
								}),
							);
						}

						handleTransformation(objectToTransform, transformer.key, data.headers["user-agent"], properties.entity, transformer.shouldSetValueEvenIfMissing);

						break;
					}

					default: {
						throw new InternalServerErrorException(
							ErrorString({
								entity: properties.entity,
								type: EErrorStringAction.INVALID_DYNAMIC_VALUE_SPECIFIED,
							}),
						);
					}
				}
			} else {
				throw new InternalServerErrorException(
					ErrorString({
						entity: properties.entity,
						type: EErrorStringAction.INVALID_DYNAMIC_VALUE_SPECIFIED,
					}),
				);
			}

			break;
		}

		case EApiControllerRequestTransformerType.STATIC: {
			const staticValue: string = transformer.value;
			handleTransformation(objectToTransform, transformer.key, staticValue, properties.entity, transformer.shouldSetValueEvenIfMissing);

			break;
		}
	}
}
