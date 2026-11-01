import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eDtoNameRecordEntity } from "./record.entity";

@Injectable()
@ApiService({ entity: E2eDtoNameRecordEntity })
export class E2eDtoNameRecordService extends ApiServiceBase<E2eDtoNameRecordEntity> {
	@InjectRepository(E2eDtoNameRecordEntity)
	public readonly repository!: Repository<E2eDtoNameRecordEntity>;
}
