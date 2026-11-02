import "reflect-metadata";

import type { Repository } from "typeorm";

import { Injectable, Module } from "@nestjs/common";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

import { ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

export type TRowPathDriver = "postgres" | "sqlite";
export type TRowPathFixture = { entities: Array<new () => object>; module: new () => object };

const TEXT_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING };
const CREATED_AT_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, type: EApiPropertyDescribeType.DATE };

@Entity("row_path_probes")
export class RowPathProbeEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public tenantId!: string;
}

@Entity("row_path_items")
export class RowPathItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public parentId!: string;
}

// A key column holding finer values than a millisecond, as a partitioned ledger keeps them: Postgres stores microseconds in timestamptz(6).
@Entity("row_path_transactions")
export class RowPathPostgresTransactionEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@PrimaryColumn({ precision: 6, type: "timestamptz" })
	@ApiPropertyDescribe(CREATED_AT_PROPERTY)
	public createdAt!: Date;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;
}

@Entity("row_path_transactions")
export class RowPathSqliteTransactionEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@PrimaryColumn({ type: "datetime" })
	@ApiPropertyDescribe(CREATED_AT_PROPERTY)
	public createdAt!: Date;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;
}

@Injectable()
@ApiService({ entity: RowPathProbeEntity })
class RowPathProbeService extends ApiServiceBase<RowPathProbeEntity> {
	@InjectRepository(RowPathProbeEntity)
	public readonly repository!: Repository<RowPathProbeEntity>;
}

@Injectable()
@ApiService({ entity: RowPathItemEntity })
class RowPathItemService extends ApiServiceBase<RowPathItemEntity> {
	@InjectRepository(RowPathItemEntity)
	public readonly repository!: Repository<RowPathItemEntity>;
}

@Injectable()
@ApiService({ entity: RowPathPostgresTransactionEntity })
class RowPathPostgresTransactionService extends ApiServiceBase<RowPathPostgresTransactionEntity> {
	@InjectRepository(RowPathPostgresTransactionEntity)
	public readonly repository!: Repository<RowPathPostgresTransactionEntity>;
}

@Injectable()
@ApiService({ entity: RowPathSqliteTransactionEntity })
class RowPathSqliteTransactionService extends ApiServiceBase<RowPathSqliteTransactionEntity> {
	@InjectRepository(RowPathSqliteTransactionEntity)
	public readonly repository!: Repository<RowPathSqliteTransactionEntity>;
}

@ApiController<RowPathProbeEntity>({ entity: RowPathProbeEntity, path: "probe", routes: {} })
class RowPathProbeController {
	constructor(public readonly service: RowPathProbeService) {}
}

@ApiController<RowPathItemEntity>({ entity: RowPathItemEntity, path: "parent/:parentId/item", pathScope: { parameters: [{ field: "parentId", parameter: "parentId" }] }, routes: {} })
class RowPathItemController {
	constructor(public readonly service: RowPathItemService) {}
}

@ApiController<RowPathPostgresTransactionEntity>({ entity: RowPathPostgresTransactionEntity, path: "transaction", rowPath: { fields: ["id"] }, routes: {} })
class RowPathPostgresTransactionController {
	constructor(public readonly service: RowPathPostgresTransactionService) {}
}

@ApiController<RowPathSqliteTransactionEntity>({ entity: RowPathSqliteTransactionEntity, path: "transaction", rowPath: { fields: ["id"] }, routes: {} })
class RowPathSqliteTransactionController {
	constructor(public readonly service: RowPathSqliteTransactionService) {}
}

const POSTGRES_ENTITIES: Array<new () => object> = [RowPathItemEntity, RowPathPostgresTransactionEntity, RowPathProbeEntity];
const SQLITE_ENTITIES: Array<new () => object> = [RowPathItemEntity, RowPathProbeEntity, RowPathSqliteTransactionEntity];

@Module({ controllers: [RowPathItemController, RowPathPostgresTransactionController, RowPathProbeController], imports: [TypeOrmModule.forFeature(POSTGRES_ENTITIES)], providers: [RowPathItemService, RowPathPostgresTransactionService, RowPathProbeService] })
class RowPathPostgresModule {}

@Module({ controllers: [RowPathItemController, RowPathProbeController, RowPathSqliteTransactionController], imports: [TypeOrmModule.forFeature(SQLITE_ENTITIES)], providers: [RowPathItemService, RowPathProbeService, RowPathSqliteTransactionService] })
class RowPathSqliteModule {}

export const ROW_PATH_FIXTURES: Record<TRowPathDriver, TRowPathFixture> = {
	postgres: { entities: POSTGRES_ENTITIES, module: RowPathPostgresModule },
	sqlite: { entities: SQLITE_ENTITIES, module: RowPathSqliteModule },
};
