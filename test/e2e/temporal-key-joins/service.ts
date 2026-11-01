import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eTemporalEagerLedgerEntity } from "./eager-ledger.entity";
import { E2eTemporalLedgerEntity } from "./ledger.entity";

@Injectable()
@ApiService({ entity: E2eTemporalLedgerEntity })
export class E2eTemporalLedgerService extends ApiServiceBase<E2eTemporalLedgerEntity> {
	@InjectRepository(E2eTemporalLedgerEntity)
	public readonly repository!: Repository<E2eTemporalLedgerEntity>;
}

@Injectable()
@ApiService({ entity: E2eTemporalEagerLedgerEntity })
export class E2eTemporalEagerLedgerService extends ApiServiceBase<E2eTemporalEagerLedgerEntity> {
	@InjectRepository(E2eTemporalEagerLedgerEntity)
	public readonly repository!: Repository<E2eTemporalEagerLedgerEntity>;
}
