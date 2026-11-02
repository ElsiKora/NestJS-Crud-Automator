import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase, ApiServiceObservable } from "../../../../src/index";

import { SameNameItemEntity } from "./entity";

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: SameNameItemEntity })
export class SameNameFirstItemService extends ApiServiceBase<SameNameItemEntity> {
	@InjectRepository(SameNameItemEntity)
	public readonly repository!: Repository<SameNameItemEntity>;
}
