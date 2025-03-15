import { ApiPropertyObject } from "../../../../../decorator/api/property/object.decorator";
import { ApiPropertyUUID } from "../../../../../decorator/api/property/uuid.decorator";
import { EApiDtoType } from "../../../../../enum";
import { DtoGenerateRelationResponse } from "../../../../../utility/dto/generate-relation-response.utility";
export class DtoPropertyFactoryRelation {
    create(metadata, entity, config, method, dtoType, propertyName) {
        const { type, ...restProperties } = metadata;
        return dtoType === EApiDtoType.RESPONSE ? ApiPropertyObject({ description: metadata.description, entity, isArray: false, type: DtoGenerateRelationResponse(entity, method, dtoType, propertyName), ...config, ...restProperties }) : ApiPropertyUUID({ description: metadata.description, entity, isArray: false, ...config, ...restProperties });
    }
}
//# sourceMappingURL=relation.class.js.map