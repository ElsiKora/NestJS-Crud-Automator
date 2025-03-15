import { ApiPropertyNumber } from "../../../../../decorator/api/property/number.decorator";
import { EApiDtoType } from "../../../../../enum";
export class DtoPropertyFactoryNumber {
    create(metadata, entity, config, _method, dtoType, _propertyName) {
        const { type, ...restProperties } = metadata;
        return ApiPropertyNumber({
            entity,
            ...config,
            ...restProperties,
            multipleOf: dtoType === EApiDtoType.REQUEST ? undefined : metadata.multipleOf,
        });
    }
}
//# sourceMappingURL=number.class.js.map