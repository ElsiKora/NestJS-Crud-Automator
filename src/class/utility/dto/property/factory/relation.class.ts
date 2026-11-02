import type { EApiRouteType } from "@enum/decorator/api";
import type { IDtoGenerateFactory } from "@interface/dto-generate-factory.interface";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeUuidProperties } from "@type/decorator/api/property";

import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiDtoType } from "@enum/decorator/api";
import { DtoGenerateRelationResponse } from "@utility/dto/generate/relation-response.utility";
import { ErrorException } from "@utility/error/exception.utility";

const RELATION_COLUMN_TYPES: ReadonlySet<unknown> = new Set<unknown>(["many-to-many", "many-to-one", "one-to-many", "one-to-one"]);

export class DtoPropertyFactoryRelation<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeUuidProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, method: EApiRouteType, dtoType: EApiDtoType, propertyName: string, _generatedDTOs?: Record<string, Type<unknown>>, dtoNameBase?: string, dtoPropertyName?: string, hostDtoName?: string): PropertyDecorator {
		const { description, type, ...restProperties }: TApiPropertyDescribeUuidProperties = metadata;
		const relationColumn: IApiEntityColumn<E> | undefined = entity.columns.find((column: IApiEntityColumn<E>): boolean => column.name == propertyName);
		const relationDescriptionCandidate: string | undefined = description?.trim();
		let relationDescription: string = propertyName;
		const relationName: string = `${String(entity.name)}.${propertyName}`;

		if (relationDescriptionCandidate) {
			relationDescription = relationDescriptionCandidate;
		}

		if (!relationColumn?.relation?.target && RELATION_COLUMN_TYPES.has(relationColumn?.type)) {
			throw ErrorException(`Property ${relationName} has a TypeORM relation, but its target class has no name or is not loaded yet. Give the target class a name, or check that its module has loaded.`);
		}

		if (!relationColumn?.relation?.target) {
			throw ErrorException(`Property ${relationName} is marked as RELATION but TypeORM relation target metadata was not found. Add a TypeORM relation decorator such as @ManyToOne(() => TargetEntity).`);
		}

		if (dtoType === EApiDtoType.RESPONSE) {
			const relationResponseDto: Type<unknown> = DtoGenerateRelationResponse(entity, method, dtoType, propertyName, {
				dtoNameBase,
				dtoPropertyName,
				hostDtoName,
				relationDescription,
			});

			if (config.isResponse === true && (relationColumn.type === "one-to-many" || relationColumn.type === "many-to-many")) {
				// A to-many relation has no row limit on the wire, so its response array declares no maxItems.
				return ApiPropertyObject({
					description: relationDescription,
					entity,
					type: relationResponseDto,
					...config,
					...restProperties,
					isArray: true,
					isResponse: true,
					minItems: 0,
				});
			}

			return ApiPropertyObject({
				description: relationDescription,
				entity,
				isArray: false,
				type: relationResponseDto,
				...config,
				...restProperties,
			});
		}

		return ApiPropertyUUID({ description: relationDescription, entity, isArray: false, ...config, ...restProperties });
	}
}
