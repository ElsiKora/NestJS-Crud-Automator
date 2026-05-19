import type { EApiRouteType } from "@enum/decorator/api";
import type { IDtoGenerateFactory } from "@interface/dto-generate-factory.interface";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeUuidProperties } from "@type/decorator/api/property";

import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiDtoType } from "@enum/decorator/api";
import { DtoGenerateRelationResponse } from "@utility/dto/generate/relation-response.utility";
import { ErrorException } from "@utility/error/exception.utility";

export class DtoPropertyFactoryRelation<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeUuidProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, method: EApiRouteType, dtoType: EApiDtoType, propertyName: string): PropertyDecorator {
		const { description, type, ...restProperties }: TApiPropertyDescribeUuidProperties = metadata;
		const relationColumn: IApiEntityColumn<E> | undefined = entity.columns.find((column: IApiEntityColumn<E>): boolean => column.name == propertyName);
		const relationDescriptionCandidate: string | undefined = description?.trim();
		let relationDescription: string = propertyName;
		const relationName: string = `${String(entity.name)}.${propertyName}`;

		if (relationDescriptionCandidate) {
			relationDescription = relationDescriptionCandidate;
		}

		if (!relationColumn?.relation?.target) {
			throw ErrorException(`Property ${relationName} is marked as RELATION but TypeORM relation target metadata was not found. Add a TypeORM relation decorator such as @ManyToOne(() => TargetEntity).`);
		}

		if (dtoType === EApiDtoType.RESPONSE) {
			return ApiPropertyObject({
				description: relationDescription,
				entity,
				isArray: false,
				type: DtoGenerateRelationResponse(entity, method, dtoType, propertyName, {
					relationDescription,
				}),
				...config,
				...restProperties,
			});
		}

		return ApiPropertyUUID({ description: relationDescription, entity, isArray: false, ...config, ...restProperties });
	}
}
