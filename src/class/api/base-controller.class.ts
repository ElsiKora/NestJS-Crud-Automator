import type { BaseEntity } from "typeorm";

export class BaseApiController<E extends BaseEntity> {
	get(_properties?: any): Promise<E> {
		return null as any;
	}
}
