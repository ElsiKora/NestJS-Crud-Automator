import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IDtoGenerateFactory } from "@interface/dto-generate-factory.interface";
import type { IApiEntity } from "@interface/entity";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeEnumProperties } from "@type/decorator/api/property";

import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";

export class DtoPropertyFactoryEnum<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeEnumProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, _method: EApiRouteType, _dtoType: EApiDtoType, _propertyName: string): PropertyDecorator {
		const { type, ...restProperties }: TApiPropertyDescribeEnumProperties = metadata;

		return ApiPropertyEnum({
			entity,
			...config,
			...restProperties,
		});
	}
}
