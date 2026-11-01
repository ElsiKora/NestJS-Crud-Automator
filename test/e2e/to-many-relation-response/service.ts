import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eToManyPostEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eToManyPostEntity })
export class E2eToManyPostService extends ApiServiceBase<E2eToManyPostEntity> {
	@InjectRepository(E2eToManyPostEntity)
	public readonly repository!: Repository<E2eToManyPostEntity>;
}
