import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";
import type { DeepPartial } from "typeorm";

export interface IApiAuthorizationRequestMetadata<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> {
	body?: DeepPartial<E>;
	headers?: Record<string, string>;
	ip?: string;
	/** Path values as the canonical text authorization compares. */
	parameters?: Record<string, string>;
	query?: TApiControllerGetListQuery<E, M>;
}
