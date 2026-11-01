import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eTemporalStampEntity } from "./stamp.entity";

@Injectable()
@ApiService({ entity: E2eTemporalStampEntity })
export class E2eTemporalStampService extends ApiServiceBase<E2eTemporalStampEntity> {
	@InjectRepository(E2eTemporalStampEntity)
	public readonly repository!: Repository<E2eTemporalStampEntity>;
}
