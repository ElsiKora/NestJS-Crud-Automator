import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eKeepRecordEntity, E2eKeepResponseRecordEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eKeepRecordEntity })
export class E2eKeepRecordService extends ApiServiceBase<E2eKeepRecordEntity> {
	@InjectRepository(E2eKeepRecordEntity)
	public readonly repository!: Repository<E2eKeepRecordEntity>;
}

@Injectable()
@ApiService({ entity: E2eKeepResponseRecordEntity })
export class E2eKeepResponseRecordService extends ApiServiceBase<E2eKeepResponseRecordEntity> {
	@InjectRepository(E2eKeepResponseRecordEntity)
	public readonly repository!: Repository<E2eKeepResponseRecordEntity>;
}
