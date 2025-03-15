import { Validate } from "class-validator";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../../constant";
import { DTO_GENERATE_CONSTANT } from "../../constant/utility/dto/generate.constant";
import { EApiDtoType, EApiRouteType } from "../../enum";
import { HasPairedCustomSuffixesFields } from "../../validator/has-paired-custom-suffixes-fields.validator";
import { CamelCaseString } from "../camel-case-string.utility";
import { ErrorException } from "../error-exception.utility";
import { DtoBuildDecorator } from "./build-decorator.utility";
import { DtoGenerateFilterDecorator } from "./generate-filter-decorator.utility";
import { DtoGenerateGetListResponse } from "./generate-get-list-response.utility";
import { DtoGetGetListQueryBaseClass } from "./get-get-list-query-base-class.utility";
import { DtoIsPropertyShouldBeMarked } from "./is-property-should-be-marked.utility";
import { DtoIsShouldBeGenerated } from "./is-should-be-generated.utility";
export function DtoGenerate(entity, entityMetadata, method, dtoType, dtoConfig, currentGuard) {
    if (!DtoIsShouldBeGenerated(method, dtoType)) {
        return undefined;
    }
    if (!entityMetadata.primaryKey?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME]) {
        throw ErrorException(`Primary key for entity ${String(entityMetadata.name)} not found in metadata storage`);
    }
    const markedProperties = [];
    for (const column of entityMetadata.columns) {
        if (column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME] && DtoIsPropertyShouldBeMarked(method, dtoType, column.name, column.metadata[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME], column.isPrimary, currentGuard)) {
            markedProperties.push({
                isPrimary: column.isPrimary,
                metadata: column.metadata[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME],
                name: column.name,
            });
        }
    }
    const BaseClass = method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY ? DtoGetGetListQueryBaseClass(entity, entityMetadata, method, dtoType) : class {
    };
    class GeneratedDTO extends BaseClass {
        constructor() {
            super();
            for (const property of markedProperties) {
                if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
                    Object.defineProperty(this, `${property.name}[value]`, {
                        configurable: true,
                        enumerable: true,
                        value: undefined,
                        writable: true,
                    });
                    Object.defineProperty(this, `${property.name}[values]`, {
                        configurable: true,
                        enumerable: true,
                        value: undefined,
                        writable: true,
                    });
                    Object.defineProperty(this, `${property.name}[operator]`, {
                        configurable: true,
                        enumerable: true,
                        value: undefined,
                        writable: true,
                    });
                }
                else {
                    Object.defineProperty(this, property.name, {
                        configurable: true,
                        enumerable: true,
                        value: undefined,
                        writable: true,
                    });
                }
            }
        }
    }
    for (const property of markedProperties) {
        const decorators = DtoBuildDecorator(method, property.metadata, entityMetadata, dtoType, property.name, currentGuard);
        if (decorators) {
            for (const [, decorator] of decorators.entries()) {
                if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
                    decorator(GeneratedDTO.prototype, `${property.name}[value]`);
                    DtoGenerateFilterDecorator(property.metadata, entityMetadata)(GeneratedDTO.prototype, `${property.name}[operator]`);
                }
                else {
                    decorator(GeneratedDTO.prototype, property.name);
                }
            }
        }
        if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
            const metadataArray = { ...property.metadata, isArray: true, isUniqueItems: false, maxItems: DTO_GENERATE_CONSTANT.MAXIMUM_FILTER_PROPERTIES, minItems: DTO_GENERATE_CONSTANT.MINIMUM_FILTER_PROPERTIES };
            const decoratorsArray = DtoBuildDecorator(method, metadataArray, entityMetadata, dtoType, property.name, currentGuard);
            if (decoratorsArray) {
                for (const [, decorator] of decoratorsArray.entries()) {
                    decorator(GeneratedDTO.prototype, `${property.name}[values]`);
                }
            }
        }
    }
    if (dtoConfig?.validators) {
        for (const validator of dtoConfig.validators) {
            Validate(validator.constraintClass, validator.options)(GeneratedDTO.prototype, "object");
        }
    }
    if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
        Object.defineProperty(GeneratedDTO.prototype, "object", {
            configurable: true,
            enumerable: true,
            value: function () {
                return this;
            },
            writable: true,
        });
        Validate(HasPairedCustomSuffixesFields, ["operator", ["value", "values"]])(GeneratedDTO.prototype, "object");
    }
    Object.defineProperty(GeneratedDTO, "name", {
        value: `${entityMetadata.name ?? "UnknownResource"}${CamelCaseString(method)}${CamelCaseString(dtoType)}ItemsDTO`,
    });
    return method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.RESPONSE ? DtoGenerateGetListResponse(entity, GeneratedDTO, `${entityMetadata.name ?? "UnknownResource"}${CamelCaseString(method)}${CamelCaseString(dtoType)}DTO`) : GeneratedDTO;
}
//# sourceMappingURL=generate.utility.js.map