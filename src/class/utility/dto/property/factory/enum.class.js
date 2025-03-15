import { ApiPropertyEnum } from "../../../../../decorator/api/property/enum.decorator";
export class DtoPropertyFactoryEnum {
    create(metadata, entity, config, _method, _dtoType, _propertyName) {
        const { type, ...restProperties } = metadata;
        return ApiPropertyEnum({
            entity,
            ...config,
            ...restProperties,
        });
    }
}
//# sourceMappingURL=enum.class.js.map