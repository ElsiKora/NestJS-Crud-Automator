import { ApiPropertyObject } from "../../../../../decorator/api/property/object.decorator";
import { ApiPropertyUUID } from "../../../../../decorator/api/property/uuid.decorator";
import { EApiDtoType } from "../../../../../enum";

import { DtoGenerateRelationResponse } from "../../../../../utility/dto/generate-relation-response.utility";

import type { EApiRouteType } from "../../../../../enum";
import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeUuidProperties } from "../../../../../type";

export class DtoPropertyFactoryRelation<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeUuidProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, method: EApiRouteType, dtoType: EApiDtoType, propertyName: string): PropertyDecorator {
		if (dtoType === EApiDtoType.RESPONSE) {
			console.log("PIDOR CONFIG", { description: metadata.description, entity, type: DtoGenerateRelationResponse(entity, method, dtoType, propertyName), ...config });

			return ApiPropertyObject({ description: metadata.description, entity, type: DtoGenerateRelationResponse(entity, method, dtoType, propertyName), ...config });
		} else {
			return ApiPropertyUUID({ description: metadata.description, entity, ...config });
		}
	}
}
