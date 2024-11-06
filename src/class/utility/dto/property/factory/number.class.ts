import { ApiPropertyNumber } from "../../../../../decorator/api/property/number.decorator";

import type { IApiEntity, IDtoGenerateFactory } from "src/interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeNumberProperties } from "src/type";

export class DtoPropertyFactoryNumber<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeNumberProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		return ApiPropertyNumber({
			description: metadata.description,
			entity,
			...config,
			maximum: metadata.maximum,
			minimum: metadata.minimum,
			multipleOf: metadata.multipleOf,
			type: metadata.dataType,
		});
	}
}
