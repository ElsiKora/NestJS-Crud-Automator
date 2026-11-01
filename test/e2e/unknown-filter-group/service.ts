import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eUnknownFilterItemEntity, E2eUnknownFilterOwnerEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eUnknownFilterItemEntity })
export class E2eUnknownFilterItemService extends ApiServiceBase<E2eUnknownFilterItemEntity> {
	@InjectRepository(E2eUnknownFilterItemEntity)
	public readonly repository!: Repository<E2eUnknownFilterItemEntity>;
}

@Injectable()
@ApiService({ entity: E2eUnknownFilterOwnerEntity })
export class E2eUnknownFilterOwnerService extends ApiServiceBase<E2eUnknownFilterOwnerEntity> {
	@InjectRepository(E2eUnknownFilterOwnerEntity)
	public readonly repository!: Repository<E2eUnknownFilterOwnerEntity>;
}
