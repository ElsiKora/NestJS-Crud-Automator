import type { DataSource, Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";

import { ApiFunction, ApiFunctionCustom, ApiFunctionTransactionScope, ApiService, ApiServiceBase, ApiServiceObservable, EApiFunctionTransactionMode, EApiFunctionType } from "../../../src/index";

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
		return this.dataSource.transaction(async (entityManager) => ApiFunctionTransactionScope.runWithEntityManager(entityManager, async () => await this.create(body)));
	}

	@ApiFunctionCustom<E2eEntity>({
		action: "custom.mandatory",
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.MANDATORY,
		},
	})
	public async createWithCustomMandatory(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.getApiFunctionContext<E2eEntity>().operations.create(body);
	}

	@ApiFunctionCustom<E2eEntity>({
		action: "custom.none",
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.NONE,
		},
	})
	public async createWithCustomNone(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.getApiFunctionContext<E2eEntity>().operations.create(body);
	}

	@ApiFunctionCustom<E2eEntity>({
		action: "custom.required",
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.REQUIRED,
		},
	})
	public async createWithCustomRequired(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.getApiFunctionContext<E2eEntity>().operations.create(body);
	}

	@ApiFunctionCustom<E2eEntity>({
		action: "custom.supports",
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.SUPPORTS,
		},
	})
	public async createWithCustomSupports(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.getApiFunctionContext<E2eEntity>().operations.create(body);
	}

	public async createWithCustomNoneInsideTransaction(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await ApiFunctionTransactionScope.runWithDataSource(this.dataSource, async () => await this.createWithCustomNone(body));
	}

	@ApiFunction<E2eEntity, E2eEntity>({
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.MANDATORY,
		},
		type: EApiFunctionType.CREATE,
	})
	public async createWithBuiltinMandatory(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return body as E2eEntity;
	}

	@ApiFunction<E2eEntity, E2eEntity>({
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.NONE,
		},
		type: EApiFunctionType.CREATE,
	})
	public async createWithBuiltinNone(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return body as E2eEntity;
	}

	@ApiFunction<E2eEntity, E2eEntity>({
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.REQUIRED,
		},
		type: EApiFunctionType.CREATE,
	})
	public async createWithBuiltinRequired(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return body as E2eEntity;
	}

	@ApiFunction<E2eEntity, E2eEntity>({
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.SUPPORTS,
		},
		type: EApiFunctionType.CREATE,
	})
	public async createWithBuiltinSupports(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return body as E2eEntity;
	}

	public async createWithBuiltinNoneInsideTransaction(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await ApiFunctionTransactionScope.runWithDataSource(this.dataSource, async () => await this.createWithBuiltinNone(body));
	}
}
