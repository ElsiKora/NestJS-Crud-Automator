import type { ObjectLiteral } from "typeorm";

export interface IApiControllerGeneratedInsertedKeyEntry {
	entityName?: string;
	input: object;
	isClaimed: boolean;
	key?: ObjectLiteral;
}
