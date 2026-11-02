import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eListOrderRuleItemEntity } from "./item.entity";

@Injectable()
@ApiService({ entity: E2eListOrderRuleItemEntity })
export class E2eListOrderRuleItemService extends ApiServiceBase<E2eListOrderRuleItemEntity> {
	@InjectRepository(E2eListOrderRuleItemEntity)
	public readonly repository!: Repository<E2eListOrderRuleItemEntity>;
}
