import { InternalServerErrorException } from "@nestjs/common";
import { TRANSFORMER_VALUE_DTO_CONSTANT } from "../../../constant/dto/transformer-value.constant";
import { EApiControllerRequestTransformerType, EApiDtoType, EErrorStringAction } from "../../../enum";
import { ErrorString } from "../../error-string.utility";
export function ApiControllerTransformData(transformers, properties, objectToTransform, data) {
    if (!transformers)
        return;
    if (EApiDtoType.BODY in transformers && transformers[EApiDtoType.BODY]) {
        for (const transformer of transformers[EApiDtoType.BODY]) {
            if (objectToTransform.body)
                processTransformer(transformer, objectToTransform.body, properties, data);
        }
    }
    if (EApiDtoType.QUERY in transformers && transformers[EApiDtoType.QUERY]) {
        for (const transformer of transformers[EApiDtoType.QUERY]) {
            if (objectToTransform.query)
                processTransformer(transformer, objectToTransform.query, properties, data);
        }
    }
    if (EApiDtoType.REQUEST in transformers && transformers[EApiDtoType.REQUEST]) {
        for (const transformer of transformers[EApiDtoType.REQUEST]) {
            if (objectToTransform.parameters)
                processTransformer(transformer, objectToTransform.parameters, properties, data);
        }
    }
    if (EApiDtoType.RESPONSE in transformers && transformers[EApiDtoType.RESPONSE]) {
        for (const transformer of transformers[EApiDtoType.RESPONSE]) {
            if (objectToTransform.response)
                processTransformer(transformer, objectToTransform.response, properties, data);
        }
    }
}
function handleTransformation(object, key, value) {
    if (isApiGetListResponseResult(object)) {
        if (key in object) {
            object[key] = value;
        }
    }
    else if (isApiFunctionGetListProperties(object)) {
        if (key in object) {
            object[key] = value;
        }
    }
    else if (isPartialE(object) && key in object) {
        object[key] = value;
    }
}
function isApiFunctionGetListProperties(object) {
    return "limit" in object && "page" in object;
}
function isApiGetListResponseResult(object) {
    return "items" in object && "totalCount" in object;
}
function isPartialE(object) {
    return !isApiGetListResponseResult(object) && !isApiFunctionGetListProperties(object);
}
function processTransformer(transformer, objectToTransform, properties, data) {
    switch (transformer.type) {
        case EApiControllerRequestTransformerType.DYNAMIC: {
            if (Object.values(TRANSFORMER_VALUE_DTO_CONSTANT).includes(transformer.value)) {
                switch (transformer.value) {
                    case TRANSFORMER_VALUE_DTO_CONSTANT.AUTHORIZED_ENTITY: {
                        if (!data.authenticationRequest) {
                            throw new InternalServerErrorException(ErrorString({
                                entity: properties.entity,
                                type: EErrorStringAction.AUTHORIZED_ENTITY_NOT_FOUND,
                            }));
                        }
                        handleTransformation(objectToTransform, transformer.key, data.authenticationRequest.user);
                        break;
                    }
                    case TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_IP: {
                        handleTransformation(objectToTransform, transformer.key, data.ip);
                        break;
                    }
                    case TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_SIGNATURE: {
                        if (!data.headers["x-signature"]) {
                            throw new InternalServerErrorException(ErrorString({
                                entity: properties.entity,
                                type: EErrorStringAction.REQUEST_SIGNATURE_NOT_FOUND,
                            }));
                        }
                        handleTransformation(objectToTransform, transformer.key, data.headers["x-signature"]);
                        break;
                    }
                    case TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_TIMESTAMP: {
                        if (!data.headers["x-timestamp"]) {
                            throw new InternalServerErrorException(ErrorString({
                                entity: properties.entity,
                                type: EErrorStringAction.REQUEST_TIMESTAMP_NOT_FOUND,
                            }));
                        }
                        handleTransformation(objectToTransform, transformer.key, data.headers["x-timestamp"]);
                        break;
                    }
                    case TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_USER_AGENT: {
                        if (!data.headers["user-agent"]) {
                            throw new InternalServerErrorException(ErrorString({
                                entity: properties.entity,
                                type: EErrorStringAction.REQUEST_USER_AGENT_NOT_FOUND,
                            }));
                        }
                        handleTransformation(objectToTransform, transformer.key, data.headers["user-agent"]);
                        break;
                    }
                    default: {
                        throw new InternalServerErrorException(ErrorString({
                            entity: properties.entity,
                            type: EErrorStringAction.INVALID_DYNAMIC_VALUE_SPECIFIED,
                        }));
                    }
                }
            }
            else {
                throw new InternalServerErrorException(ErrorString({
                    entity: properties.entity,
                    type: EErrorStringAction.INVALID_DYNAMIC_VALUE_SPECIFIED,
                }));
            }
            break;
        }
        case EApiControllerRequestTransformerType.STATIC: {
            const staticValue = transformer.value;
            handleTransformation(objectToTransform, transformer.key, staticValue);
            break;
        }
    }
}
//# sourceMappingURL=transform-data.utility.js.map