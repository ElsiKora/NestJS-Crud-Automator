import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TErrorStringProperties } from "@type/utility";

/**
 * Generates a formatted error string with the entity name
 * @param {TErrorStringProperties<T>} properties - The error string configuration options
 * @returns {string} The formatted error string with entity name substituted
 * @template T - The entity type
 */
export function ErrorString<T extends IApiBaseEntity>(properties: TErrorStringProperties<T>): string {
	const entityName: string = properties.entity.name === undefined ? "UNKNOWN_RESOURCE" : properties.entity.name.toUpperCase();

	if ("property" in properties) {
		return `${entityName}_${properties.type.replace("{property}", properties.property.toUpperCase())}`;
	} else {
		return String(properties.type).replace("{entity}", entityName);
	}
}
