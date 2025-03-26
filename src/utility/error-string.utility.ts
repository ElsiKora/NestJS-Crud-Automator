import type { IApiBaseEntity, IErrorStringProperties } from "../interface";

/**
 *
 * @param options
 */
export function ErrorString<T extends IApiBaseEntity>(options: IErrorStringProperties<T>): string {
	return options.type.replace("{entity}", options.entity.name ? options.entity.name.toUpperCase() : "UNKNOWN_RESOURCE");
}
