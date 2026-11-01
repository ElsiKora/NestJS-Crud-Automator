import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { StiTemporalEntryEntity } from "./root.entity";

@Injectable()
@ApiService({ entity: StiTemporalEntryEntity })
export class StiTemporalEntryService extends ApiServiceBase<StiTemporalEntryEntity> {
	@InjectRepository(StiTemporalEntryEntity)
	public readonly repository!: Repository<StiTemporalEntryEntity>;
}
