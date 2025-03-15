import { ApiPropertyBoolean } from "../../../../../decorator/api/property/boolean.decorator";
export class DtoPropertyFactoryBoolean {
    create(metadata, entity, config, _method, _dtoType, _propertyName) {
        const { type, ...restProperties } = metadata;
        return ApiPropertyBoolean({
            entity,
            ...config,
            ...restProperties,
        });
    }
}
//# sourceMappingURL=boolean.class.js.map