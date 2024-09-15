import { ApiPropertyString } from "../../../../../decorator";

import type { IApiEntity, IApiPropertyStringProperties, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeStringProperties } from "../../../../../type";

export class DtoPropertyFactoryString implements IDtoGenerateFactory {
	create(metadata: TApiPropertyDescribeStringProperties, entity: IApiEntity, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		return ApiPropertyString({
			entity,
			...config,
			...metadata,
		} as unknown as IApiPropertyStringProperties<typeof entity>);
	}
}
