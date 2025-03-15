import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "../../enum";
import { DtoGenerateDecorator } from "./generate-decorator.utility";
import { DtoGetDecoratorConfig } from "./get-decorator-config.utility";
import { DtoHandleDateProperty } from "./handle-date-property.utility";
import { DtoIsPropertyExposedForGuard } from "./is-property-exposed-for-guard.utility";
export function DtoBuildDecorator(method, propertyMetadata, entity, dtoType, propertyName, currentGuard) {
    const properties = propertyMetadata.properties?.[method];
    if (properties?.[dtoType]?.isEnabled === false || (properties?.[dtoType]?.isResponse && properties?.[dtoType]?.isExpose === false)) {
        return undefined;
    }
    if (!DtoIsPropertyExposedForGuard(method, propertyMetadata, dtoType, currentGuard)) {
        return undefined;
    }
    if (propertyMetadata.type === EApiPropertyDescribeType.DATE) {
        const dateMetadata = propertyMetadata;
        if ((method === EApiRouteType.UPDATE || method === EApiRouteType.PARTIAL_UPDATE) && dtoType === EApiDtoType.BODY) {
            return undefined;
        }
        if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
            const dateProperties = DtoHandleDateProperty(propertyName, dateMetadata.identifier);
            return dateProperties.map((property) => {
                const newMetadata = { ...dateMetadata, identifier: property.identifier };
                const config = DtoGetDecoratorConfig(method, newMetadata, dtoType, property.name);
                return DtoGenerateDecorator(newMetadata, entity, config, method, dtoType, propertyName);
            });
        }
    }
    const config = DtoGetDecoratorConfig(method, propertyMetadata, dtoType, propertyName);
    return [DtoGenerateDecorator(propertyMetadata, entity, config, method, dtoType, propertyName)];
}
//# sourceMappingURL=build-decorator.utility.js.map