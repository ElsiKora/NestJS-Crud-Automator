import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eUuidCurrencyEntity, E2eUuidTransactionEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eUuidCurrencyEntity })
export class E2eUuidCurrencyService extends ApiServiceBase<E2eUuidCurrencyEntity> {
	@InjectRepository(E2eUuidCurrencyEntity)
	public readonly repository!: Repository<E2eUuidCurrencyEntity>;
}

@Injectable()
@ApiService({ entity: E2eUuidTransactionEntity })
export class E2eUuidTransactionService extends ApiServiceBase<E2eUuidTransactionEntity> {
	@InjectRepository(E2eUuidTransactionEntity)
	public readonly repository!: Repository<E2eUuidTransactionEntity>;
}
