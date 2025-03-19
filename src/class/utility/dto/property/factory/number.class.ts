import type { EApiRouteType } from "../../../../../enum";
import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeNumberProperties } from "../../../../../type";

import { ApiPropertyNumber } from "../../../../../decorator/api/property/number.decorator";
import { EApiDtoType } from "../../../../../enum";

export class DtoPropertyFactoryNumber<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeNumberProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, _method: EApiRouteType, dtoType: EApiDtoType, _propertyName: string): PropertyDecorator {
		const { type, ...restProperties }: TApiPropertyDescribeNumberProperties = metadata;

		return ApiPropertyNumber({
			entity,
			...config,
			...restProperties,
			multipleOf: dtoType === EApiDtoType.REQUEST ? undefined : metadata.multipleOf,
		});
	}
}
