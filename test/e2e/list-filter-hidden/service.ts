import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eListHiddenItemEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eListHiddenItemEntity })
export class E2eListHiddenItemService extends ApiServiceBase<E2eListHiddenItemEntity> {
	@InjectRepository(E2eListHiddenItemEntity)
	public readonly repository!: Repository<E2eListHiddenItemEntity>;
}
