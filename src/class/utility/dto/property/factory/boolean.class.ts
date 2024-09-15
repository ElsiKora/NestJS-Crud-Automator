import { ApiPropertyBoolean } from "../../../../../decorator";

import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeBooleanProperties, TApiPropertyDescribeDtoProperties } from "../../../../../type";

export class DtoPropertyFactoryBoolean implements IDtoGenerateFactory {
	create(metadata: TApiPropertyDescribeBooleanProperties, entity: IApiEntity, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		return ApiPropertyBoolean({
			description: metadata.description,
			entity,
			...config,
		});
	}
}
