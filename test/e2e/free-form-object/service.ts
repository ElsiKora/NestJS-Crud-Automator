import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eFreeFormRecordEntity, E2eFreeFormUndeclaredRecordEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eFreeFormRecordEntity })
export class E2eFreeFormRecordService extends ApiServiceBase<E2eFreeFormRecordEntity> {
	@InjectRepository(E2eFreeFormRecordEntity)
	public readonly repository!: Repository<E2eFreeFormRecordEntity>;
}

@Injectable()
@ApiService({ entity: E2eFreeFormUndeclaredRecordEntity })
export class E2eFreeFormUndeclaredRecordService extends ApiServiceBase<E2eFreeFormUndeclaredRecordEntity> {
	@InjectRepository(E2eFreeFormUndeclaredRecordEntity)
	public readonly repository!: Repository<E2eFreeFormUndeclaredRecordEntity>;
}
