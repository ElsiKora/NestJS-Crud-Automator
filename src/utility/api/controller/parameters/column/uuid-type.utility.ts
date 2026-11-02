import type { IApiEntityColumn } from "@interface/entity";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiPropertyDescribeType } from "@enum/decorator/api";

/**
 * Tells whether a column holds a UUID, by its database type or by its described type, so a database may read either letter case of a value as one key.
 * @param {IApiEntityColumn<unknown>} column - Entity column.
 * @returns {boolean} Whether the column holds a UUID.
 */
export function ApiControllerParametersIsUuidColumn(column: IApiEntityColumn<unknown>): boolean {
	const metadata: TApiPropertyDescribeProperties | undefined = column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

	return column.type === "uuid" || metadata?.type === EApiPropertyDescribeType.UUID;
}
