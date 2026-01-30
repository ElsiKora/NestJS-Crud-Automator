import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../../dist/esm/index";

import { E2eOwnerEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eOwnerEntity })
export class E2eOwnerService extends ApiServiceBase<E2eOwnerEntity> {
	@InjectRepository(E2eOwnerEntity)
	public readonly repository!: Repository<E2eOwnerEntity>;

	public async reset(): Promise<void> {
		await this.repository.clear();
	}
}
