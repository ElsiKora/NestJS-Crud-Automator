import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eRelationWriteCompositeEntity, E2eRelationWritePostEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eRelationWritePostEntity })
export class E2eRelationWritePostService extends ApiServiceBase<E2eRelationWritePostEntity> {
	@InjectRepository(E2eRelationWritePostEntity)
	public readonly repository!: Repository<E2eRelationWritePostEntity>;
}

@Injectable()
@ApiService({ entity: E2eRelationWriteCompositeEntity })
export class E2eRelationWriteCompositeService extends ApiServiceBase<E2eRelationWriteCompositeEntity> {
	@InjectRepository(E2eRelationWriteCompositeEntity)
	public readonly repository!: Repository<E2eRelationWriteCompositeEntity>;
}
