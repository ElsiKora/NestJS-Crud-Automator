import type { EApiRouteType } from "@enum/decorator/api";
import type { IDtoGenerateFactory } from "@interface/dto-generate-factory.interface";
import type { IApiEntity } from "@interface/entity";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeNumberProperties } from "@type/decorator/api/property";

import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { EApiDtoType } from "@enum/decorator/api";

export class DtoPropertyFactoryNumber<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeNumberProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, _method: EApiRouteType, dtoType: EApiDtoType, _propertyName: string): PropertyDecorator {
		const { type, ...restProperties }: TApiPropertyDescribeNumberProperties = metadata;

		return ApiPropertyNumber({
			entity,
			...config,
			...restProperties,
			// @ts-ignore
			multipleOf: dtoType === EApiDtoType.REQUEST ? undefined : metadata.multipleOf,
		});
	}
}
