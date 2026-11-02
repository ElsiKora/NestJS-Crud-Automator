import "reflect-metadata";

import type { Repository } from "typeorm";

import { Injectable, Module } from "@nestjs/common";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

import { ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../src/index";

export type TRowPathFixture = { entities: ReadonlyArray<new () => object>; module: new () => object };

/**
 * Describes a plain string column of a fixture entity.
 * @param {string} description - Property description.
 * @returns {PropertyDecorator} The property decorator.
 */
export function describeText(description: string): PropertyDecorator {
	return ApiPropertyDescribe({ description, exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });
}

/**
 * Builds the entities and controllers of one database, because the temporal column types differ per driver.
 * @param {object} temporal - Column options of a temporal key column on this driver.
 * @param {"datetime" | "timestamptz"} temporal.type - Column type.
 * @param {number} [temporal.widePrecision] - Declared precision of a column that holds finer values.
 * @returns {TRowPathFixture} Entities and module of this database.
 */
export function createRowPathFixture(temporal: { type: "datetime" | "timestamptz"; widePrecision?: number }): TRowPathFixture {
	@Entity("row_path_probes")
	class RowPathProbeEntity {
		@PrimaryColumn({ type: "varchar" })
		@describeText("id")
		public id!: string;

		@Column({ type: "varchar" })
		@describeText("name")
		public name!: string;

		@PrimaryColumn({ type: "varchar" })
		@describeText("tenantId")
		public tenantId!: string;
	}

	@Entity("row_path_items")
	class RowPathItemEntity {
		@PrimaryGeneratedColumn("uuid")
		@ApiPropertyDescribe({ type: EApiPropertyDescribeType.UUID })
		public id!: string;

		@Column({ type: "varchar" })
		@describeText("name")
		public name!: string;

		@Column({ type: "varchar" })
		@describeText("parentId")
		public parentId!: string;
	}

	@Entity("row_path_transactions")
	class RowPathTransactionEntity {
		@PrimaryColumn({ type: "varchar" })
		@describeText("id")
		public id!: string;

		// eslint-disable-next-line @elsikora/perfectionist/sort-classes
		@PrimaryColumn({ ...(temporal.widePrecision === undefined ? {} : { precision: temporal.widePrecision }), type: temporal.type })
		@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, type: EApiPropertyDescribeType.DATE })
		public createdAt!: Date;

		@Column({ type: "varchar" })
		@describeText("name")
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
	@ApiService({ entity: RowPathTransactionEntity })
	class RowPathTransactionService extends ApiServiceBase<RowPathTransactionEntity> {
		@InjectRepository(RowPathTransactionEntity)
		public readonly repository!: Repository<RowPathTransactionEntity>;
	}

	@ApiController<RowPathProbeEntity>({ entity: RowPathProbeEntity, path: "probe", routes: {} })
	class RowPathProbeController {
		constructor(public readonly service: RowPathProbeService) {}
	}

	@ApiController<RowPathItemEntity>({ entity: RowPathItemEntity, path: "parent/:parentId/item", pathScope: { parameters: [{ field: "parentId", parameter: "parentId" }] }, routes: {} } as never)
	class RowPathItemController {
		constructor(public readonly service: RowPathItemService) {}
	}

	@ApiController<RowPathTransactionEntity>({ entity: RowPathTransactionEntity, path: "transaction", rowPath: { fields: ["id"] }, routes: {} } as never)
	class RowPathTransactionController {
		constructor(public readonly service: RowPathTransactionService) {}
	}

	const entities: ReadonlyArray<new () => object> = [RowPathItemEntity, RowPathProbeEntity, RowPathTransactionEntity];

	@Module({ controllers: [RowPathItemController, RowPathProbeController, RowPathTransactionController], imports: [TypeOrmModule.forFeature(entities as Array<new () => object>)], providers: [RowPathItemService, RowPathProbeService, RowPathTransactionService] })
	class RowPathFeatureModule {}

	return { entities, module: RowPathFeatureModule };
}
