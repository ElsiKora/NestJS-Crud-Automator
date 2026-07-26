import { ManyToOne } from "typeorm";

import { RuntimeRouteRelationEntity } from "./relation.entity";

export class RuntimeRouteEntity {
	public id?: string;

	@ManyToOne(() => RuntimeRouteRelationEntity)
	public relation?: RuntimeRouteRelationEntity;

	public responseSource?: string;

	public source?: string;
}
