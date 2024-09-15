import { ApiPropertyDate } from "../../../../../decorator";

import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDateProperties, TApiPropertyDescribeDtoProperties } from "../../../../../type";

export class DtoPropertyFactoryDate implements IDtoGenerateFactory {
	create(metadata: TApiPropertyDescribeDateProperties, entity: IApiEntity, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		return ApiPropertyDate({
			entity,
			...config,
			type: metadata.dataType,
		});
	}
}
