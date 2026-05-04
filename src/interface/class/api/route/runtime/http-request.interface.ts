import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

export interface IApiRouteRuntimeHttpRequest<E extends IApiBaseEntity> {
	body?: Partial<E>;
	headers?: Record<string, Array<string> | string | undefined>;
	ip?: string;
	params?: Partial<E>;
	query?: Partial<E>;
}
