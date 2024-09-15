import { ApiPropertyNumber } from "../../../../../decorator";

import type { IApiEntity, IDtoGenerateFactory } from "src/interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeNumberProperties } from "src/type";

export class DtoPropertyFactoryNumber implements IDtoGenerateFactory {
	create(metadata: TApiPropertyDescribeNumberProperties, entity: IApiEntity, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
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
