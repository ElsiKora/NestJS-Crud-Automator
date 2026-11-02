import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eInheritedOrderStiChildEntity } from "./sti-child.entity";

@Injectable()
@ApiService({ entity: E2eInheritedOrderStiChildEntity })
export class E2eInheritedOrderStiChildService extends ApiServiceBase<E2eInheritedOrderStiChildEntity> {
	@InjectRepository(E2eInheritedOrderStiChildEntity)
	public readonly repository!: Repository<E2eInheritedOrderStiChildEntity>;
}
