import { ApiPropertyString } from "../../../../../decorator/api/property/string.decorator";
export class DtoPropertyFactoryString {
    create(metadata, entity, config, _method, _dtoType, _propertyName) {
        const { type, ...restProperties } = metadata;
        return ApiPropertyString({
            entity,
            ...config,
            ...restProperties,
        });
    }
}
//# sourceMappingURL=string.class.js.map