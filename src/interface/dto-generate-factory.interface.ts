import type { EApiDtoType, EApiRouteType } from "../enum";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "../type";

import type { IApiEntity } from "./entity";

export interface IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, method?: EApiRouteType, dtoType?: EApiDtoType, propertyName?: string): PropertyDecorator;
}
