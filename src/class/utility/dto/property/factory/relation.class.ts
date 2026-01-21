import type { EApiRouteType } from "@enum/decorator/api";
import type { IDtoGenerateFactory } from "@interface/dto-generate-factory.interface";
import type { IApiEntity } from "@interface/entity";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeUuidProperties } from "@type/decorator/api/property";

import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiDtoType } from "@enum/decorator/api";
import { DtoGenerateRelationResponse } from "@utility/dto/generate/relation-response.utility";

export class DtoPropertyFactoryRelation<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeUuidProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, method: EApiRouteType, dtoType: EApiDtoType, propertyName: string): PropertyDecorator {
		const { type, ...restProperties }: TApiPropertyDescribeUuidProperties = metadata;

		return dtoType === EApiDtoType.RESPONSE ? ApiPropertyObject({ description: metadata.description, entity, isArray: false, type: DtoGenerateRelationResponse(entity, method, dtoType, propertyName), ...config, ...restProperties }) : ApiPropertyUUID({ description: metadata.description, entity, isArray: false, ...config, ...restProperties });
	}
}
