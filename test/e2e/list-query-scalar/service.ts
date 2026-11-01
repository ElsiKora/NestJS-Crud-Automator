import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eListScalarKeyEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eListScalarKeyEntity })
export class E2eListScalarKeyService extends ApiServiceBase<E2eListScalarKeyEntity> {
	@InjectRepository(E2eListScalarKeyEntity)
	public readonly repository!: Repository<E2eListScalarKeyEntity>;
}
