import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eLegacyQueryItemEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eLegacyQueryItemEntity })
export class E2eLegacyQueryItemService extends ApiServiceBase<E2eLegacyQueryItemEntity> {
	@InjectRepository(E2eLegacyQueryItemEntity)
	public readonly repository!: Repository<E2eLegacyQueryItemEntity>;
}
