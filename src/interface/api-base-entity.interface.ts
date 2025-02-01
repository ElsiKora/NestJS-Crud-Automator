import type { ObjectLiteral } from "typeorm";

export interface IApiBaseEntity extends ObjectLiteral {
	name?: string;
}
