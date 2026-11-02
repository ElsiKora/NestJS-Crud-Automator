import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eRelationSoftPostEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eRelationSoftPostEntity })
export class E2eRelationSoftPostService extends ApiServiceBase<E2eRelationSoftPostEntity> {
	@InjectRepository(E2eRelationSoftPostEntity)
	public readonly repository!: Repository<E2eRelationSoftPostEntity>;
}
