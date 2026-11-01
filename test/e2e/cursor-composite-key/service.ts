import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eCursorTransactionEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eCursorTransactionEntity })
export class E2eCursorTransactionService extends ApiServiceBase<E2eCursorTransactionEntity> {
	@InjectRepository(E2eCursorTransactionEntity)
	public readonly repository!: Repository<E2eCursorTransactionEntity>;
}
