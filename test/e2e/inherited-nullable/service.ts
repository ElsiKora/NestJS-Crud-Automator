import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eInheritedNullableItemEntity } from "./item.entity";

@Injectable()
@ApiService({ entity: E2eInheritedNullableItemEntity })
export class E2eInheritedNullableItemService extends ApiServiceBase<E2eInheritedNullableItemEntity> {
	@InjectRepository(E2eInheritedNullableItemEntity)
	public readonly repository!: Repository<E2eInheritedNullableItemEntity>;
}
