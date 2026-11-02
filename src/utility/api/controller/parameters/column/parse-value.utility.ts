import type { IApiControllerParametersColumnValue } from "@interface/class/api/controller/parameters-column-value.interface";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { ClassConstructor } from "class-transformer";
import type { ValidationError } from "class-validator";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { DtoGenerateDecorator } from "@utility/dto/generate/decorator.utility";
import { DtoGetDecoratorConfig } from "@utility/dto/get/decorator-config.utility";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

const columnValueDtoCache: WeakMap<object, Map<string, null | Type<unknown>>> = new WeakMap<object, Map<string, null | Type<unknown>>>();

/**
 * Parses one value for an entity column with the same decorators that validate and convert a path value of that column.
 * The value is parsed from its string form, so `"16"` and `16` both become `16` for an integer NUMBER column and `"016"` is rejected the same way as in a path.
 * @template E - Entity type that owns the column.
 * @param {IApiEntity<E>} entityMetadata - Entity metadata.
 * @param {string} columnName - Entity property name.
 * @param {bigint | boolean | number | string} value - Scalar value to parse.
 * @returns {Promise<IApiControllerParametersColumnValue>} The converted value; `isDescribed` is false for an undescribed, relation, object or array column, which is left to the database.
 */
export async function ApiControllerParametersParseColumnValue<E>(entityMetadata: IApiEntity<E>, columnName: string, value: bigint | boolean | number | string): Promise<IApiControllerParametersColumnValue> {
	const dto: null | Type<unknown> = resolveColumnValueDto(entityMetadata, columnName);

	if (!dto) {
		return { isDescribed: false, isValid: true, value };
	}

	const instance: Record<string, unknown> = plainToInstance(dto as ClassConstructor<Record<string, unknown>>, { [columnName]: String(value) });
	const errors: Array<ValidationError> = await validate(instance);

	return { isDescribed: true, isValid: errors.length === 0, value: instance[columnName] };
}

/**
 * Builds, once per entity and column, a single-property DTO with the PARAMETERS decorators of the column.
 * @template E - Entity type that owns the column.
 * @param {IApiEntity<E>} entityMetadata - Entity metadata.
 * @param {string} columnName - Entity property name.
 * @returns {null | Type<unknown>} Column DTO, or null when the column is not a described scalar.
 */
function resolveColumnValueDto<E>(entityMetadata: IApiEntity<E>, columnName: string): null | Type<unknown> {
	let entityCache: Map<string, null | Type<unknown>> | undefined = columnValueDtoCache.get(entityMetadata);

	if (!entityCache) {
		entityCache = new Map<string, null | Type<unknown>>();
		columnValueDtoCache.set(entityMetadata, entityCache);
	}

	const cached: null | Type<unknown> | undefined = entityCache.get(columnName);

	if (cached !== undefined) {
		return cached;
	}

	const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((candidate: IApiEntityColumn<E>): boolean => String(candidate.name) === columnName);
	const metadata: TApiPropertyDescribeProperties | undefined = column?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

	if (!metadata || metadata.type === EApiPropertyDescribeType.OBJECT || metadata.type === EApiPropertyDescribeType.RELATION || (metadata as { isArray?: boolean }).isArray === true) {
		entityCache.set(columnName, null);

		return null;
	}

	class ColumnValueDTO {}

	const config: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(EApiRouteType.GET, metadata, EApiDtoType.PARAMETERS);
	DtoGenerateDecorator(metadata, entityMetadata, config, EApiRouteType.GET, EApiDtoType.PARAMETERS, columnName)(ColumnValueDTO.prototype, columnName);
	entityCache.set(columnName, ColumnValueDTO);

	return ColumnValueDTO;
}
