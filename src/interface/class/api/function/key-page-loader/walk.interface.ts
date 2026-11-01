import type { EntityMetadata } from "typeorm";

export interface IApiFunctionKeyPageLoaderWalk {
	checkedEntities: Set<EntityMetadata>;
	isEager: boolean;
	isQueryStrategy: boolean;
	sourcePrefix: string;
}
