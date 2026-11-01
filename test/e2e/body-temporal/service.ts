import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eBodyTemporalEventEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eBodyTemporalEventEntity })
export class E2eBodyTemporalEventService extends ApiServiceBase<E2eBodyTemporalEventEntity> {
	@InjectRepository(E2eBodyTemporalEventEntity)
	public readonly repository!: Repository<E2eBodyTemporalEventEntity>;
}
