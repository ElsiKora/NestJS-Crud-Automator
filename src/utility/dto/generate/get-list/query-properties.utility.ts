import type { EFilterOperation } from "@enum/filter";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { GET_LIST_QUERY_DTO_FACTORY_CONSTANT } from "@constant/factory-dto-get-list-query.constant";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { DtoIsPropertyShouldBeMarked } from "@utility/dto/is/property/should-be-marked.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";

/**
 * Resolves metadata-backed GET_LIST filter properties for legacy or normalized-plan DTO generation.
 * @param {IApiEntity<E>} entityMetadata - Root entity metadata.
 * @param {Array<{isPrimary: boolean; metadata: TApiPropertyDescribeProperties; name: keyof E}>} markedProperties - Legacy metadata-visible root properties.
 * @param {Type<CanActivate>} currentGuard - Active route guard used by legacy visibility checks.
 * @param {IApiControllerGetListQueryPlan} queryPlan - Optional normalized typed query plan.
 * @returns {Array<object>} Filter properties consumed by the dynamic DTO generator.
 * @template E - Root entity type.
 */
export function DtoGenerateGetListQueryProperties<E>(
	entityMetadata: IApiEntity<E>,
	markedProperties: Array<{
		isPrimary: boolean;
		metadata: TApiPropertyDescribeProperties;
		name: keyof E;
	}>,
	currentGuard?: Type<CanActivate>,
	queryPlan?: IApiControllerGetListQueryPlan,
): Array<{
	allowedOperations?: ReadonlyArray<EFilterOperation>;
	entityMetadata: IApiEntity<unknown>;
	metadata: TApiPropertyDescribeProperties;
	name: string;
}> {
	const queryFilterProperties: Array<{
		allowedOperations?: ReadonlyArray<EFilterOperation>;
		entityMetadata: IApiEntity<unknown>;
		metadata: TApiPropertyDescribeProperties;
		name: string;
	}> = [];

	if (queryPlan && !queryPlan.filter.isLegacy) {
		for (const field of Object.values(queryPlan.filter.fields)) {
			if (!field.isEnabled) {
				continue;
			}

			const path: Array<string> = field.path.split(".");
			let propertyEntityMetadata: IApiEntity<unknown> = entityMetadata as IApiEntity<unknown>;

			if (path.length === GET_LIST_QUERY_DTO_FACTORY_CONSTANT.NESTED_FILTER_PATH_SEGMENT_COUNT) {
				const relationColumn: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((column: IApiEntityColumn<E>): boolean => String(column.name) === path[0]);

				if (!relationColumn?.relation?.target) {
					throw ErrorException(`Relation metadata for GET_LIST query field "${field.path}" is unavailable`);
				}

				propertyEntityMetadata = GenerateEntityInformation(relationColumn.relation.target);
			}

			queryFilterProperties.push({
				allowedOperations: field.allowedOperations,
				entityMetadata: propertyEntityMetadata,
				metadata: field.metadata,
				name: field.path,
			});
		}

		return queryFilterProperties;
	}

	for (const property of markedProperties) {
		if (property.metadata.type !== EApiPropertyDescribeType.RELATION) {
			queryFilterProperties.push({
				entityMetadata: entityMetadata as IApiEntity<unknown>,
				metadata: property.metadata,
				name: property.name as string,
			});

			continue;
		}

		const relationColumn: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((column: IApiEntityColumn<E>): boolean => column.name == property.name);

		if (!relationColumn?.relation?.target) continue;

		let relationEntityMetadata: IApiEntity<unknown>;

		try {
			relationEntityMetadata = GenerateEntityInformation(relationColumn.relation.target);
		} catch {
			continue;
		}

		for (const relationProperty of relationEntityMetadata.columns) {
			const relationPropertyMetadata: TApiPropertyDescribeProperties | undefined = relationProperty.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

			if (!relationPropertyMetadata || relationPropertyMetadata.type === EApiPropertyDescribeType.RELATION || relationPropertyMetadata.type === EApiPropertyDescribeType.OBJECT) continue;

			if (!DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, relationProperty.name, relationPropertyMetadata, false, currentGuard)) continue;

			queryFilterProperties.push({
				entityMetadata: relationEntityMetadata,
				metadata: relationPropertyMetadata,
				name: `${property.name as string}.${relationProperty.name as string}`,
			});
		}
	}

	return queryFilterProperties;
}
