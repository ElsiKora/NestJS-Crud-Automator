import { ApiPropertyObject } from "../../../../../decorator/api/property/object.decorator";
export class DtoPropertyFactoryObject {
    create(metadata, entity, config, _method, _dtoType, _propertyName) {
        const { dataType, type, ...restProperties } = metadata;
        return ApiPropertyObject({
            entity,
            type: dataType,
            ...config,
            ...restProperties,
        });
    }
}
//# sourceMappingURL=object.class.js.map