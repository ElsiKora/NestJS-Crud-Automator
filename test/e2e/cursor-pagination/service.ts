import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase, ApiServiceObservable } from "../../../src/index";

import { CursorPaginationEntity } from "./entity";

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: CursorPaginationEntity })
export class CursorPaginationService extends ApiServiceBase<CursorPaginationEntity> {
	@InjectRepository(CursorPaginationEntity)
	public readonly repository!: Repository<CursorPaginationEntity>;

	public async reset(): Promise<void> {
		await this.repository.clear();
	}
}
