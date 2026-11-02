import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eBooleanFilterItemEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eBooleanFilterItemEntity })
export class E2eBooleanFilterItemService extends ApiServiceBase<E2eBooleanFilterItemEntity> {
	@InjectRepository(E2eBooleanFilterItemEntity)
	public readonly repository!: Repository<E2eBooleanFilterItemEntity>;
}
