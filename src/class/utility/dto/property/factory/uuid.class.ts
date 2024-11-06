import { ApiPropertyUUID } from "../../../../../decorator/api/property/uuid.decorator";
import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeUuidProperties } from "../../../../../type";

export class DtoPropertyFactoryUuid<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeUuidProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		return ApiPropertyUUID({ description: metadata.description, entity, ...config });
	}
}
