import { ApiPropertyDate } from "../../../../../decorator/api/property/date.decorator";
export class DtoPropertyFactoryDate {
    create(metadata, entity, config, _method, _dtoType, _propertyName) {
        const { type, ...restProperties } = metadata;
        return ApiPropertyDate({
            entity,
            ...config,
            ...restProperties,
        });
    }
}
//# sourceMappingURL=date.class.js.map