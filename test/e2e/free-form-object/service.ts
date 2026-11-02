import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eFreeFormRecordEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eFreeFormRecordEntity })
export class E2eFreeFormRecordService extends ApiServiceBase<E2eFreeFormRecordEntity> {
	@InjectRepository(E2eFreeFormRecordEntity)
	public readonly repository!: Repository<E2eFreeFormRecordEntity>;
}
