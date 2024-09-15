import { ApiPropertyUUID } from "../../../../../decorator";

import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeUuidProperties } from "../../../../../type";

export class DtoPropertyFactoryUuid implements IDtoGenerateFactory {
	create(metadata: TApiPropertyDescribeUuidProperties, entity: IApiEntity, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		return ApiPropertyUUID({ description: metadata.description, entity, ...config });
	}
}
