import type { DataSource, Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase, ApiServiceObservable } from "../../../dist/esm/index";

import { E2eEntity } from "./entity";

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: E2eEntity })
export class E2eService extends ApiServiceBase<E2eEntity> {
	@InjectRepository(E2eEntity)
	public readonly repository!: Repository<E2eEntity>;

	@InjectDataSource()
	public readonly dataSource!: DataSource;

	public async reset(): Promise<void> {
		await this.repository.clear();
	}

	public async createWithTransaction(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return this.dataSource.transaction(async (manager) => this.create(body, manager));
	}
}
