import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IDtoGenerateFactory } from "@interface/dto-generate-factory.interface";
import type { IApiEntity } from "@interface/entity";
import type { TApiPropertyDescribeBooleanProperties, TApiPropertyDescribeDtoProperties } from "@type/decorator/api/property";

import { ApiPropertyBoolean } from "@decorator/api/property/boolean.decorator";

export class DtoPropertyFactoryBoolean<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeBooleanProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, _method: EApiRouteType, _dtoType: EApiDtoType, _propertyName: string): PropertyDecorator {
		const { type, ...restProperties }: TApiPropertyDescribeBooleanProperties = metadata;

		return ApiPropertyBoolean({
			entity,
			...config,
			...restProperties,
		});
	}
}
