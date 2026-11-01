import type { Repository } from "typeorm";

import { ApiService, ApiServiceBase, ApiServiceObservable } from "@elsikora/nestjs-crud-automator";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { SmokeItemEntity, SmokeOwnerEntity } from "./entity.js";

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: SmokeItemEntity })
export class SmokeItemService extends ApiServiceBase<SmokeItemEntity> {
	@InjectRepository(SmokeItemEntity)
	public readonly repository!: Repository<SmokeItemEntity>;
}

@Injectable()
@ApiService({ entity: SmokeOwnerEntity })
export class SmokeOwnerService extends ApiServiceBase<SmokeOwnerEntity> {
	@InjectRepository(SmokeOwnerEntity)
	public readonly repository!: Repository<SmokeOwnerEntity>;
}
