import { ApiPropertyUUID } from "../../../../../decorator/api/property/uuid.decorator";
export class DtoPropertyFactoryUuid {
    create(metadata, entity, config, _method, _dtoType, _propertyName) {
        const { type, ...restProperties } = metadata;
        return ApiPropertyUUID({ entity, ...config, ...restProperties });
    }
}
//# sourceMappingURL=uuid.class.js.map