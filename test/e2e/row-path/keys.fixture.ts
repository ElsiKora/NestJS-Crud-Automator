import "reflect-metadata";

import type { Relation, Repository } from "typeorm";

import { HttpStatus, Injectable, Module, Param, RequestMethod } from "@nestjs/common";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import type { TRowPathDriver, TRowPathFixture } from "./fixture";

import { ApiController, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, EApiControllerRelationReferenceShape, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

const TEXT_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING };
const UUID_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "id", type: EApiPropertyDescribeType.UUID };
const RELATION_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "relation", type: EApiPropertyDescribeType.RELATION };
const RECORDED_AT_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE };
const SITE_RESPONSE_RELATIONS = { response: { load: { include: { site: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } } as const;

@Entity("row_path_key_parents")
export class RowPathKeyParentEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe(UUID_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;
}

@Entity("row_path_key_items")
export class RowPathKeyItemEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe(UUID_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@ApiPropertyDescribe(RELATION_PROPERTY)
	@JoinColumn({ name: "parentId" })
	@ManyToOne(() => RowPathKeyParentEntity, { nullable: false })
	public parent?: Relation<RowPathKeyParentEntity>;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe(UUID_PROPERTY)
	public parentId!: string;
}

@Entity("row_path_key_pairs")
export class RowPathKeyPairEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public a!: string;

	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public b!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;
}

// The database sets the key instant, so only the row the insert returns names it.
@Entity("row_path_key_readings")
export class RowPathPostgresKeyReadingEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public sensorId!: string;

	@PrimaryColumn({ default: () => "clock_timestamp()", precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe(RECORDED_AT_PROPERTY)
	public recordedAt!: Date;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@ApiPropertyDescribe(RELATION_PROPERTY)
	@JoinColumn({ name: "siteId" })
	@ManyToOne(() => RowPathKeyParentEntity, { nullable: true })
	public site?: null | Relation<RowPathKeyParentEntity>;
}

@Entity("row_path_key_readings")
export class RowPathSqliteKeyReadingEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public sensorId!: string;

	@PrimaryColumn({ type: "datetime" })
	@ApiPropertyDescribe(RECORDED_AT_PROPERTY)
	public recordedAt!: Date;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@ApiPropertyDescribe(RELATION_PROPERTY)
	@JoinColumn({ name: "siteId" })
	@ManyToOne(() => RowPathKeyParentEntity, { nullable: true })
	public site?: null | Relation<RowPathKeyParentEntity>;
}

@Injectable()
@ApiService({ entity: RowPathKeyParentEntity })
class RowPathKeyParentService extends ApiServiceBase<RowPathKeyParentEntity> {
	@InjectRepository(RowPathKeyParentEntity)
	public readonly repository!: Repository<RowPathKeyParentEntity>;
}

@Injectable()
@ApiService({ entity: RowPathKeyItemEntity })
class RowPathKeyItemService extends ApiServiceBase<RowPathKeyItemEntity> {
	@InjectRepository(RowPathKeyItemEntity)
	public readonly repository!: Repository<RowPathKeyItemEntity>;
}

@Injectable()
@ApiService({ entity: RowPathKeyPairEntity })
class RowPathKeyPairService extends ApiServiceBase<RowPathKeyPairEntity> {
	@InjectRepository(RowPathKeyPairEntity)
	public readonly repository!: Repository<RowPathKeyPairEntity>;
}

@Injectable()
@ApiService({ entity: RowPathPostgresKeyReadingEntity })
class RowPathPostgresKeyReadingService extends ApiServiceBase<RowPathPostgresKeyReadingEntity> {
	@InjectRepository(RowPathPostgresKeyReadingEntity)
	public readonly repository!: Repository<RowPathPostgresKeyReadingEntity>;
}

@Injectable()
@ApiService({ entity: RowPathSqliteKeyReadingEntity })
class RowPathSqliteKeyReadingService extends ApiServiceBase<RowPathSqliteKeyReadingEntity> {
	@InjectRepository(RowPathSqliteKeyReadingEntity)
	public readonly repository!: Repository<RowPathSqliteKeyReadingEntity>;
}

@ApiController<RowPathKeyItemEntity>({ entity: RowPathKeyItemEntity, path: "parent/:parentId/item", pathScope: { parameters: [{ field: "parentId", parameter: "parentId" }] }, routes: {} })
class RowPathKeyItemController {
	constructor(public readonly service: RowPathKeyItemService) {}
}

@ApiController<RowPathKeyPairEntity>({ entity: RowPathKeyPairEntity, path: "pair", routes: {} })
class RowPathKeyPairController {
	constructor(public readonly service: RowPathKeyPairService) {}
}

@ApiController<RowPathKeyPairEntity>({ entity: RowPathKeyPairEntity, path: "pair-by-a", rowPath: { fields: ["a"] }, routes: { [EApiRouteType.CREATE]: { generation: { isEnabled: false } }, [EApiRouteType.GET_LIST]: { generation: { isEnabled: false } } } })
class RowPathKeyPairByFirstController {
	constructor(public readonly service: RowPathKeyPairService) {}
}

@ApiController<RowPathPostgresKeyReadingEntity>({ entity: RowPathPostgresKeyReadingEntity, path: "reading", routes: { [EApiRouteType.PARTIAL_UPDATE]: { relations: SITE_RESPONSE_RELATIONS }, [EApiRouteType.UPDATE]: { relations: SITE_RESPONSE_RELATIONS } } })
class RowPathPostgresKeyReadingController {
	constructor(public readonly service: RowPathPostgresKeyReadingService) {}

	@ApiRouteCustom<RowPathPostgresKeyReadingEntity>({
		relations: SITE_RESPONSE_RELATIONS,
		resource: { action: "custom.byName", entity: RowPathPostgresKeyReadingEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "by-name/:sensorId/:name" },
	})
	public async byName(@Param("sensorId") sensorId: string, @Param("name") name: string): Promise<RowPathPostgresKeyReadingEntity> {
		return await this.service.repository.findOneOrFail({ where: { name, sensorId } });
	}
}

@ApiController<RowPathSqliteKeyReadingEntity>({ entity: RowPathSqliteKeyReadingEntity, path: "reading", routes: { [EApiRouteType.PARTIAL_UPDATE]: { relations: SITE_RESPONSE_RELATIONS }, [EApiRouteType.UPDATE]: { relations: SITE_RESPONSE_RELATIONS } } })
class RowPathSqliteKeyReadingController {
	constructor(public readonly service: RowPathSqliteKeyReadingService) {}

	@ApiRouteCustom<RowPathSqliteKeyReadingEntity>({
		relations: SITE_RESPONSE_RELATIONS,
		resource: { action: "custom.byName", entity: RowPathSqliteKeyReadingEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "by-name/:sensorId/:name" },
	})
	public async byName(@Param("sensorId") sensorId: string, @Param("name") name: string): Promise<RowPathSqliteKeyReadingEntity> {
		return await this.service.repository.findOneOrFail({ where: { name, sensorId } });
	}
}

const POSTGRES_ENTITIES: Array<new () => object> = [RowPathKeyItemEntity, RowPathKeyPairEntity, RowPathKeyParentEntity, RowPathPostgresKeyReadingEntity];
const SQLITE_ENTITIES: Array<new () => object> = [RowPathKeyItemEntity, RowPathKeyPairEntity, RowPathKeyParentEntity, RowPathSqliteKeyReadingEntity];

@Module({ controllers: [RowPathKeyItemController, RowPathKeyPairByFirstController, RowPathKeyPairController, RowPathPostgresKeyReadingController], imports: [TypeOrmModule.forFeature(POSTGRES_ENTITIES)], providers: [RowPathKeyItemService, RowPathKeyPairService, RowPathKeyParentService, RowPathPostgresKeyReadingService] })
class RowPathKeyPostgresModule {}

@Module({ controllers: [RowPathKeyItemController, RowPathKeyPairByFirstController, RowPathKeyPairController, RowPathSqliteKeyReadingController], imports: [TypeOrmModule.forFeature(SQLITE_ENTITIES)], providers: [RowPathKeyItemService, RowPathKeyPairService, RowPathKeyParentService, RowPathSqliteKeyReadingService] })
class RowPathKeySqliteModule {}

export const ROW_PATH_KEY_FIXTURES: Record<TRowPathDriver, TRowPathFixture> = {
	postgres: { entities: POSTGRES_ENTITIES, module: RowPathKeyPostgresModule },
	sqlite: { entities: SQLITE_ENTITIES, module: RowPathKeySqliteModule },
};
