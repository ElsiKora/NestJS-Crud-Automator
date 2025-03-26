import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IErrorStringProperties } from "@interface/utility";

/**
 * Generates a formatted error string with the entity name
 * @param {IErrorStringProperties<T>} options - The error string configuration options
 * @returns {string} The formatted error string with entity name substituted
 * @template T - The entity type
 */
export function ErrorString<T extends IApiBaseEntity>(options: IErrorStringProperties<T>): string {
	return options.type.replace("{entity}", options.entity.name ? options.entity.name.toUpperCase() : "UNKNOWN_RESOURCE");
}
