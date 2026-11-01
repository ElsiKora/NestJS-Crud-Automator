import type { IApiEntity } from "@interface/entity";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiPropertyDescribeType } from "@enum/decorator/api";

/**
 * Writes the request values of the entity's UUID columns in their canonical lower-case form before they are stored, on every database.
 * A UUID stored in a text column then reads back by either letter case, like a PostgreSQL `uuid` column.
 * @template E - Entity type.
 * @param {IApiEntity<E>} entityMetadata - Entity metadata.
 * @param {unknown} body - Request body, changed in place.
 * @returns {void}
 */
export function ApiControllerWriteLowerCaseUuid<E>(entityMetadata: IApiEntity<E>, body: unknown): void {
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		return;
	}

	for (const column of entityMetadata.columns) {
		const metadata: TApiPropertyDescribeProperties | undefined = column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;
		const key: string = String(column.name);

		if (metadata?.type !== EApiPropertyDescribeType.UUID || !Object.hasOwn(body, key)) {
			continue;
		}

		const value: unknown = Reflect.get(body, key);
		Reflect.set(body, key, Array.isArray(value) ? value.map((item: unknown): unknown => lowerCaseText(item)) : lowerCaseText(value));
	}
}

/**
 * Lower-cases text, leaving any other value for the validator.
 * @param {unknown} value - Request value.
 * @returns {unknown} The lower-case text, or the value itself.
 */
function lowerCaseText(value: unknown): unknown {
	return typeof value === "string" ? value.toLowerCase() : value;
}
