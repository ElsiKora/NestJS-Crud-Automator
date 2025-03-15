import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { MetadataStorage } from "../../../class";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../../../constant";
import { EApiDtoType, EApiPropertyDescribeType } from "../../../enum";
import { CamelCaseString } from "../../camel-case-string.utility";
import { DtoGenerate } from "../../dto";
export function ApiControllerWriteDtoSwagger(target, entity, properties, method, routeConfig, entityMetadata) {
    const swaggerModels = (Reflect.getMetadata(DECORATORS.API_EXTRA_MODELS, target) ?? []);
    const requestDto = routeConfig.dto?.request ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.REQUEST, routeConfig.autoDto?.[EApiDtoType.REQUEST], routeConfig.authentication?.guard);
    const queryDto = routeConfig.dto?.query ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.QUERY, routeConfig.autoDto?.[EApiDtoType.QUERY], routeConfig.authentication?.guard);
    const bodyDto = routeConfig.dto?.body ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.BODY, routeConfig.autoDto?.[EApiDtoType.BODY], routeConfig.authentication?.guard);
    const responseDto = routeConfig.dto?.response ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.RESPONSE, routeConfig.autoDto?.[EApiDtoType.RESPONSE], routeConfig.authentication?.guard);
    const dtoList = [requestDto, queryDto, bodyDto, responseDto];
    for (const dto of dtoList) {
        if (dto && !swaggerModels.includes(dto)) {
            swaggerModels.push(dto);
            const storage = MetadataStorage.getInstance();
            const metadata = storage.getMetadata(entityMetadata.name ?? "UnknownResource");
            if (metadata)
                for (const key of Object.keys(metadata)) {
                    if (metadata[key]?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME] && metadata[key]?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME].type === EApiPropertyDescribeType.RELATION) {
                        const relationClass = class GeneratedDTO {
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
                            value: `${String(entityMetadata.name)}${CamelCaseString(method)}${CamelCaseString(EApiDtoType.BODY)}${key}DTO`,
                        });
                        swaggerModels.push(relationClass);
                    }
                }
            Reflect.defineMetadata(DECORATORS.API_EXTRA_MODELS, swaggerModels, target);
        }
    }
}
//# sourceMappingURL=write-dto-swagger.utility.js.map