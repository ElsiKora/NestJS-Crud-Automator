import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties, IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiRequestTransformer } from "@type/api-request-transformer.type";
import type { TApiControllerGetListQuery, TApiControllerReadParameterTransformer } from "@type/decorator/api/controller";
import type { TApiControllerTransformDataData, TApiControllerTransformDataObjectToTransform, TApiTransformDataIsValidationProperties } from "@type/utility";

import { TRANSFORMER_VALUE_DTO_CONSTANT } from "@constant/dto";
import { EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiControllerResponseTarget } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { InternalServerErrorException } from "@nestjs/common";
import { ErrorString } from "@utility/error/string.utility";

type TApiControllerRuntimeTransformer<E> = TApiControllerReadParameterTransformer<E> | TApiRequestTransformer<E>;
type TApiControllerTransformDataTargets<E> = {
	[EApiControllerRequestTarget.BODY]?: { transformers?: Array<TApiRequestTransformer<E>> };
	[EApiControllerRequestTarget.PARAMETERS]?: { transformers?: Array<TApiControllerRuntimeTransformer<E>> };
	[EApiControllerRequestTarget.QUERY]?: { transformers?: Array<TApiRequestTransformer<E>> };
	[EApiControllerResponseTarget.RESPONSE]?: { transformers?: Array<TApiRequestTransformer<E>> };
};

/**
 * Transforms data between request/response objects and entity objects.
 * Handles both static and dynamic transformations for body, query, parameters, and response data.
 * @template E - The entity type.
 * @param {object | undefined} targets - Target-specific transformer configuration.
 * @param {IApiControllerProperties<E>} properties - Controller configuration properties
 * @param {TApiControllerTransformDataObjectToTransform<E>} objectToTransform - The object to apply transformations to
 * @param {TApiControllerTransformDataData} data - Data sources to use for transformations including headers, IP address, and authentication
 * @returns {void}
 */
export function ApiControllerTransformData<E extends IApiBaseEntity>(targets: Partial<Record<EApiControllerRequestTarget | EApiControllerResponseTarget, { transformers?: Array<TApiRequestTransformer<E>> }>> | undefined, properties: IApiControllerProperties<E>, objectToTransform: TApiControllerTransformDataObjectToTransform<E>, data: TApiControllerTransformDataData): void {
	const runtimeTargets: TApiControllerTransformDataTargets<E> | undefined = targets;

	if (!runtimeTargets) return;

	if (EApiControllerRequestTarget.BODY in runtimeTargets && runtimeTargets[EApiControllerRequestTarget.BODY]?.transformers) {
		for (const transformer of runtimeTargets[EApiControllerRequestTarget.BODY].transformers) {
			if (objectToTransform.body) processTransformer(transformer, objectToTransform.body as TApiTransformDataIsValidationProperties<E>, properties, data);
		}
	}

	if (EApiControllerRequestTarget.QUERY in runtimeTargets && runtimeTargets[EApiControllerRequestTarget.QUERY]?.transformers) {
		for (const transformer of runtimeTargets[EApiControllerRequestTarget.QUERY].transformers) {
			if (objectToTransform.query) processTransformer(transformer, objectToTransform.query, properties, data);
		}
	}

	if (EApiControllerRequestTarget.PARAMETERS in runtimeTargets && runtimeTargets[EApiControllerRequestTarget.PARAMETERS]?.transformers) {
		for (const transformer of runtimeTargets[EApiControllerRequestTarget.PARAMETERS].transformers) {
			if (objectToTransform.parameters) processTransformer(transformer, objectToTransform.parameters, properties, data);
		}
	}

	if (EApiControllerResponseTarget.RESPONSE in runtimeTargets && runtimeTargets[EApiControllerResponseTarget.RESPONSE]?.transformers) {
		for (const transformer of runtimeTargets[EApiControllerResponseTarget.RESPONSE].transformers) {
			if (objectToTransform.response) processTransformer(transformer, objectToTransform.response, properties, data);
		}
	}
}

/**
 * Handles transformation of object properties, setting values with appropriate type handling.
 * @param {TApiTransformDataIsValidationProperties<E>} object - The object to transform
 * @param {PropertyKey} key - The property key
 * @param {unknown} value - The value to set
 * @param {IApiBaseEntity} entity - The entity metadata
 * @param {boolean} [shouldSetValueEvenIfMissing] - Whether to set the value even if the key is missing
 * @returns {void}
 * @throws {InternalServerErrorException} When key not found in object and not forced
 * @private
 */
function handleTransformation<E>(object: TApiTransformDataIsValidationProperties<E>, key: PropertyKey, value: unknown, entity: IApiBaseEntity, shouldSetValueEvenIfMissing: boolean = false): void {
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
 * Checks if an object is a get list query properties instance.
 * @param {TApiTransformDataIsValidationProperties<E>} object - The object to check
 * @returns {boolean} True if the object is a get list query object
 * @private
 */
function isApiFunctionGetListProperties<E>(object: TApiTransformDataIsValidationProperties<E>): object is TApiControllerGetListQuery<E> {
	return "limit" in object && "page" in object;
}

/**
 * Checks if an object is a get list response result instance.
 * @param {TApiTransformDataIsValidationProperties<E>} object - The object to check
 * @returns {boolean} True if the object is a get list response result
 * @private
 */
function isApiGetListResponseResult<E>(object: TApiTransformDataIsValidationProperties<E>): object is IApiGetListResponseResult<E> {
	return "items" in object && "totalCount" in object;
}

/**
 * Checks if an object is a partial entity instance.
 * @param {TApiTransformDataIsValidationProperties<E>} object - The object to check
 * @returns {boolean} True if the object is a partial entity
 * @private
 */
function isPartialE<E>(object: TApiTransformDataIsValidationProperties<E>): object is Partial<E> {
	return !isApiGetListResponseResult(object) && !isApiFunctionGetListProperties(object);
}

/**
 * Processes a single transformer, applying the transformation to the object.
 * Handles both static and dynamic transformations including special values like user, IP, and headers.
 * @param {TApiRequestTransformer<E>} transformer - The transformer configuration
 * @param {TApiTransformDataIsValidationProperties<E>} objectToTransform - The object to transform
 * @param {IApiControllerProperties<E>} properties - Controller configuration properties
 * @param {TApiControllerTransformDataData} data - The data sources for transformation
 * @returns {void}
 * @throws {InternalServerErrorException} When required data for transformation is missing
 * @private
 */
function processTransformer<E extends IApiBaseEntity>(transformer: TApiControllerRuntimeTransformer<E>, objectToTransform: TApiTransformDataIsValidationProperties<E>, properties: IApiControllerProperties<E>, data: TApiControllerTransformDataData): void {
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
