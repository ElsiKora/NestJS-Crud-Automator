import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2ePathParameterIntItemEntity, E2ePathParameterUuidItemEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2ePathParameterIntItemEntity })
export class E2ePathParameterIntItemService extends ApiServiceBase<E2ePathParameterIntItemEntity> {
	@InjectRepository(E2ePathParameterIntItemEntity)
	public readonly repository!: Repository<E2ePathParameterIntItemEntity>;
}

@Injectable()
@ApiService({ entity: E2ePathParameterUuidItemEntity })
export class E2ePathParameterUuidItemService extends ApiServiceBase<E2ePathParameterUuidItemEntity> {
	@InjectRepository(E2ePathParameterUuidItemEntity)
	public readonly repository!: Repository<E2ePathParameterUuidItemEntity>;
}
