import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IDtoGenerateFactory } from "@interface/dto-generate-factory.interface";
import type { IApiEntity } from "@interface/entity";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeStringProperties } from "@type/decorator/api/property";

import { ApiPropertyString } from "@decorator/api/property/string.decorator";

export class DtoPropertyFactoryString<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeStringProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, _method: EApiRouteType, _dtoType: EApiDtoType, _propertyName: string): PropertyDecorator {
		const { type, ...restProperties }: TApiPropertyDescribeStringProperties = metadata;

		return ApiPropertyString({
			entity,
			...config,
			...restProperties,
		});
	}
}
