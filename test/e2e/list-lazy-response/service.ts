import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eListLazyResponseItemEntity } from "./item.entity";

@Injectable()
@ApiService({ entity: E2eListLazyResponseItemEntity })
export class E2eListLazyResponseItemService extends ApiServiceBase<E2eListLazyResponseItemEntity> {
	@InjectRepository(E2eListLazyResponseItemEntity)
	public readonly repository!: Repository<E2eListLazyResponseItemEntity>;
}
