import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";

export interface IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, method?: EApiRouteType, dtoType?: EApiDtoType, propertyName?: string, generatedDTOs?: Record<string, Type<unknown>>): PropertyDecorator;
}
