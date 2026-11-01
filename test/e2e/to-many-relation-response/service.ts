import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eToManyCursorParentEntity, E2eToManyLedgerEntity, E2eToManyOrderEntity, E2eToManyPostEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eToManyPostEntity })
export class E2eToManyPostService extends ApiServiceBase<E2eToManyPostEntity> {
	@InjectRepository(E2eToManyPostEntity)
	public readonly repository!: Repository<E2eToManyPostEntity>;
}

@Injectable()
@ApiService({ entity: E2eToManyOrderEntity })
export class E2eToManyOrderService extends ApiServiceBase<E2eToManyOrderEntity> {
	@InjectRepository(E2eToManyOrderEntity)
	public readonly repository!: Repository<E2eToManyOrderEntity>;
}

@Injectable()
@ApiService({ entity: E2eToManyLedgerEntity })
export class E2eToManyLedgerService extends ApiServiceBase<E2eToManyLedgerEntity> {
	@InjectRepository(E2eToManyLedgerEntity)
	public readonly repository!: Repository<E2eToManyLedgerEntity>;
}

@Injectable()
@ApiService({ entity: E2eToManyCursorParentEntity })
export class E2eToManyCursorParentService extends ApiServiceBase<E2eToManyCursorParentEntity> {
	@InjectRepository(E2eToManyCursorParentEntity)
	public readonly repository!: Repository<E2eToManyCursorParentEntity>;
}
