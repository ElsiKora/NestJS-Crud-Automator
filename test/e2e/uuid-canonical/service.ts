import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";
import { E2eUuidCanonicalItemEntity, E2eUuidCanonicalParentEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eUuidCanonicalItemEntity })
export class E2eUuidCanonicalItemService extends ApiServiceBase<E2eUuidCanonicalItemEntity> {
	@InjectRepository(E2eUuidCanonicalItemEntity)
	public readonly repository!: Repository<E2eUuidCanonicalItemEntity>;
}

@Injectable()
@ApiService({ entity: E2eUuidCanonicalParentEntity })
export class E2eUuidCanonicalParentService extends ApiServiceBase<E2eUuidCanonicalParentEntity> {
	@InjectRepository(E2eUuidCanonicalParentEntity)
	public readonly repository!: Repository<E2eUuidCanonicalParentEntity>;
}
