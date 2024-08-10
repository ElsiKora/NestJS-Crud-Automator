import type { IApiBaseEntity, IErrorStringProperties } from "../interface";

export function ErrorString<T extends IApiBaseEntity>(options: IErrorStringProperties<T>): string {
	return options.type.replace("{entity}", options.entity.name.toUpperCase());
}
