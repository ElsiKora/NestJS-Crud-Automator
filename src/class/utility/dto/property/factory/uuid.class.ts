import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeUuidProperties } from "../../../../../type";

import { ApiPropertyUUID } from "../../../../../decorator/api/property/uuid.decorator";

export class DtoPropertyFactoryUuid<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeUuidProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		const { type, ...restProperties }: TApiPropertyDescribeUuidProperties = metadata;

		return ApiPropertyUUID({ entity, ...config, ...restProperties });
	}
}
