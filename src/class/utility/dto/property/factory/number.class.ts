import type { IApiEntity, IDtoGenerateFactory } from "src/interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeNumberProperties } from "src/type";

import { ApiPropertyNumber } from "../../../../../decorator/api/property/number.decorator";

export class DtoPropertyFactoryNumber<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeNumberProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		const { type, ...restProperties }: TApiPropertyDescribeNumberProperties = metadata;

		return ApiPropertyNumber({
			entity,
			...config,
			...restProperties,
		});
	}
}
