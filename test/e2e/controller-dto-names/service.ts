import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eDtoNameItemEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eDtoNameItemEntity })
export class E2eDtoNameItemService extends ApiServiceBase<E2eDtoNameItemEntity> {
	@InjectRepository(E2eDtoNameItemEntity)
	public readonly repository!: Repository<E2eDtoNameItemEntity>;
}
