import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IDtoGenerateFactory } from "@interface/dto-generate-factory.interface";
import type { IApiEntity } from "@interface/entity";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeUuidProperties } from "@type/decorator/api/property";

import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";

export class DtoPropertyFactoryUuid<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeUuidProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, _method: EApiRouteType, _dtoType: EApiDtoType, _propertyName: string): PropertyDecorator {
		const { type, ...restProperties }: TApiPropertyDescribeUuidProperties = metadata;

		return ApiPropertyUUID({ entity, ...config, ...restProperties });
	}
}
