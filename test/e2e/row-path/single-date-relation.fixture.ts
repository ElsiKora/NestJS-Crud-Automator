import "reflect-metadata";

import type { Relation, Repository } from "typeorm";

import { Injectable, Module } from "@nestjs/common";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import type { TRowPathDriver, TRowPathFixture } from "./fixture";

import { ApiController, ApiControllerObservable, ApiPropertyDescribe, ApiRouteSubscriber, ApiRouteSubscriberBase, ApiService, ApiServiceBase, EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

const TEXT_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING };
const RELATION_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "slot", type: EApiPropertyDescribeType.RELATION };
const AT_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE };
const NULLABLE_AT_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, isNullable: true, type: EApiPropertyDescribeType.DATE } as Parameters<typeof ApiPropertyDescribe>[0];

// A slot is keyed by its instant alone, so a relation to it over one column references a date and time column, which the published body takes as a date and time string and a transforming pipe turns into a Date.
@Entity("row_path_single_date_slots")
export class RowPathPostgresSingleDateSlotEntity {
	@PrimaryColumn({ precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe(AT_PROPERTY)
	public at!: Date;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;
}

@Entity("row_path_single_date_slots")
export class RowPathSqliteSingleDateSlotEntity {
	@PrimaryColumn({ type: "datetime" })
	@ApiPropertyDescribe(AT_PROPERTY)
	public at!: Date;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;
}

// The relation joins a nullable instant that is not a key column.
@Entity("row_path_single_date_events")
export class RowPathPostgresSingleDateEventEntity {
	@Column({ nullable: true, precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe(NULLABLE_AT_PROPERTY)
	public eventAt!: Date | null;

	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@ApiPropertyDescribe(RELATION_PROPERTY)
	@JoinColumn({ name: "eventAt", referencedColumnName: "at" })
	@ManyToOne(() => RowPathPostgresSingleDateSlotEntity, { nullable: true })
	public slot?: null | Relation<RowPathPostgresSingleDateSlotEntity>;
}

@Entity("row_path_single_date_events")
export class RowPathSqliteSingleDateEventEntity {
	@Column({ nullable: true, type: "datetime" })
	@ApiPropertyDescribe(NULLABLE_AT_PROPERTY)
	public eventAt!: Date | null;

	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@ApiPropertyDescribe(RELATION_PROPERTY)
	@JoinColumn({ name: "eventAt", referencedColumnName: "at" })
	@ManyToOne(() => RowPathSqliteSingleDateSlotEntity, { nullable: true })
	public slot?: null | Relation<RowPathSqliteSingleDateSlotEntity>;
}

// The relation joins a key instant, so its row path is /:at/:id.
@Entity("row_path_single_date_bookings")
export class RowPathPostgresSingleDateBookingEntity {
	@PrimaryColumn({ precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe(AT_PROPERTY)
	public at!: Date;

	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@ApiPropertyDescribe(RELATION_PROPERTY)
	@JoinColumn({ name: "at", referencedColumnName: "at" })
	@ManyToOne(() => RowPathPostgresSingleDateSlotEntity)
	public slot?: Relation<RowPathPostgresSingleDateSlotEntity>;
}

@Entity("row_path_single_date_bookings")
export class RowPathSqliteSingleDateBookingEntity {
	@PrimaryColumn({ type: "datetime" })
	@ApiPropertyDescribe(AT_PROPERTY)
	public at!: Date;

	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;

	@ApiPropertyDescribe(RELATION_PROPERTY)
	@JoinColumn({ name: "at", referencedColumnName: "at" })
	@ManyToOne(() => RowPathSqliteSingleDateSlotEntity)
	public slot?: Relation<RowPathSqliteSingleDateSlotEntity>;
}

@Injectable()
@ApiService<RowPathPostgresSingleDateEventEntity>({ entity: RowPathPostgresSingleDateEventEntity })
class RowPathPostgresSingleDateEventService extends ApiServiceBase<RowPathPostgresSingleDateEventEntity> {
	constructor(@InjectRepository(RowPathPostgresSingleDateEventEntity) public readonly repository: Repository<RowPathPostgresSingleDateEventEntity>) {
		super();
	}
}

@Injectable()
@ApiService<RowPathSqliteSingleDateEventEntity>({ entity: RowPathSqliteSingleDateEventEntity })
class RowPathSqliteSingleDateEventService extends ApiServiceBase<RowPathSqliteSingleDateEventEntity> {
	constructor(@InjectRepository(RowPathSqliteSingleDateEventEntity) public readonly repository: Repository<RowPathSqliteSingleDateEventEntity>) {
		super();
	}
}

@Injectable()
@ApiService<RowPathPostgresSingleDateBookingEntity>({ entity: RowPathPostgresSingleDateBookingEntity })
class RowPathPostgresSingleDateBookingService extends ApiServiceBase<RowPathPostgresSingleDateBookingEntity> {
	constructor(@InjectRepository(RowPathPostgresSingleDateBookingEntity) public readonly repository: Repository<RowPathPostgresSingleDateBookingEntity>) {
		super();
	}
}

@Injectable()
@ApiService<RowPathSqliteSingleDateBookingEntity>({ entity: RowPathSqliteSingleDateBookingEntity })
class RowPathSqliteSingleDateBookingService extends ApiServiceBase<RowPathSqliteSingleDateBookingEntity> {
	constructor(@InjectRepository(RowPathSqliteSingleDateBookingEntity) public readonly repository: Repository<RowPathSqliteSingleDateBookingEntity>) {
		super();
	}
}

@ApiController<RowPathPostgresSingleDateEventEntity>({ entity: RowPathPostgresSingleDateEventEntity, path: "single-date-event", routes: {} })
class RowPathPostgresSingleDateEventController {
	constructor(public readonly service: RowPathPostgresSingleDateEventService) {}
}

@ApiController<RowPathSqliteSingleDateEventEntity>({ entity: RowPathSqliteSingleDateEventEntity, path: "single-date-event", routes: {} })
class RowPathSqliteSingleDateEventController {
	constructor(public readonly service: RowPathSqliteSingleDateEventService) {}
}

@ApiController<RowPathPostgresSingleDateBookingEntity>({ entity: RowPathPostgresSingleDateBookingEntity, path: "single-date-booking", routes: {} })
class RowPathPostgresSingleDateBookingController {
	constructor(public readonly service: RowPathPostgresSingleDateBookingService) {}
}

@ApiController<RowPathSqliteSingleDateBookingEntity>({ entity: RowPathSqliteSingleDateBookingEntity, path: "single-date-booking", routes: {} })
class RowPathSqliteSingleDateBookingController {
	constructor(public readonly service: RowPathSqliteSingleDateBookingService) {}
}

// A transformer that removes the relation, or sets it to null, leaves the own column to the body the route writes.
const routesWith = (value: null | undefined): never => {
	const route = { request: { [EApiControllerRequestTarget.BODY]: { transformers: [{ key: "slot", shouldSetValueEvenIfMissing: true, type: EApiControllerRequestTransformerType.STATIC, value }] } } };

	return { [EApiRouteType.CREATE]: route, [EApiRouteType.PARTIAL_UPDATE]: route, [EApiRouteType.UPDATE]: route } as never;
};

@ApiController<RowPathPostgresSingleDateEventEntity>({ entity: RowPathPostgresSingleDateEventEntity, path: "single-date-event-removed", routes: routesWith(undefined) })
class RowPathPostgresSingleDateEventRemovedController {
	constructor(public readonly service: RowPathPostgresSingleDateEventService) {}
}

@ApiController<RowPathSqliteSingleDateEventEntity>({ entity: RowPathSqliteSingleDateEventEntity, path: "single-date-event-removed", routes: routesWith(undefined) })
class RowPathSqliteSingleDateEventRemovedController {
	constructor(public readonly service: RowPathSqliteSingleDateEventService) {}
}

@ApiController<RowPathPostgresSingleDateEventEntity>({ entity: RowPathPostgresSingleDateEventEntity, path: "single-date-event-cleared", routes: routesWith(null) })
class RowPathPostgresSingleDateEventClearedController {
	constructor(public readonly service: RowPathPostgresSingleDateEventService) {}
}

@ApiController<RowPathSqliteSingleDateEventEntity>({ entity: RowPathSqliteSingleDateEventEntity, path: "single-date-event-cleared", routes: routesWith(null) })
class RowPathSqliteSingleDateEventClearedController {
	constructor(public readonly service: RowPathSqliteSingleDateEventService) {}
}

@ApiControllerObservable()
@ApiController<RowPathPostgresSingleDateEventEntity>({ entity: RowPathPostgresSingleDateEventEntity, path: "single-date-event-observed", routes: {} })
class RowPathPostgresSingleDateEventObservedController {
	constructor(public readonly service: RowPathPostgresSingleDateEventService) {}
}

@ApiControllerObservable()
@ApiController<RowPathSqliteSingleDateEventEntity>({ entity: RowPathSqliteSingleDateEventEntity, path: "single-date-event-observed", routes: {} })
class RowPathSqliteSingleDateEventObservedController {
	constructor(public readonly service: RowPathSqliteSingleDateEventService) {}
}

// A subscriber that removes the relation the client sent, before the route writes the body.
const removeSlot = <T extends { result: { body?: Record<string, unknown> } }>(context: T): T["result"] => {
	if (context.result.body) {
		Reflect.deleteProperty(context.result.body, "slot");
	}

	return context.result;
};

@Injectable()
@ApiRouteSubscriber({ entity: RowPathPostgresSingleDateEventEntity })
class RowPathPostgresSingleDateEventSubscriber extends ApiRouteSubscriberBase<RowPathPostgresSingleDateEventEntity> {
	public async onBeforeCreate(context: never): Promise<never> {
		return await Promise.resolve(removeSlot(context) as never);
	}

	public async onBeforePartialUpdate(context: never): Promise<never> {
		return await Promise.resolve(removeSlot(context) as never);
	}
}

@Injectable()
@ApiRouteSubscriber({ entity: RowPathSqliteSingleDateEventEntity })
class RowPathSqliteSingleDateEventSubscriber extends ApiRouteSubscriberBase<RowPathSqliteSingleDateEventEntity> {
	public async onBeforeCreate(context: never): Promise<never> {
		return await Promise.resolve(removeSlot(context) as never);
	}

	public async onBeforePartialUpdate(context: never): Promise<never> {
		return await Promise.resolve(removeSlot(context) as never);
	}
}

const POSTGRES_ENTITIES: Array<new () => object> = [RowPathPostgresSingleDateBookingEntity, RowPathPostgresSingleDateEventEntity, RowPathPostgresSingleDateSlotEntity];
const SQLITE_ENTITIES: Array<new () => object> = [RowPathSqliteSingleDateBookingEntity, RowPathSqliteSingleDateEventEntity, RowPathSqliteSingleDateSlotEntity];

@Module({
	controllers: [RowPathPostgresSingleDateBookingController, RowPathPostgresSingleDateEventClearedController, RowPathPostgresSingleDateEventController, RowPathPostgresSingleDateEventObservedController, RowPathPostgresSingleDateEventRemovedController],
	imports: [TypeOrmModule.forFeature(POSTGRES_ENTITIES)],
	providers: [RowPathPostgresSingleDateBookingService, RowPathPostgresSingleDateEventService, RowPathPostgresSingleDateEventSubscriber],
})
class RowPathSingleDatePostgresModule {}

@Module({
	controllers: [RowPathSqliteSingleDateBookingController, RowPathSqliteSingleDateEventClearedController, RowPathSqliteSingleDateEventController, RowPathSqliteSingleDateEventObservedController, RowPathSqliteSingleDateEventRemovedController],
	imports: [TypeOrmModule.forFeature(SQLITE_ENTITIES)],
	providers: [RowPathSqliteSingleDateBookingService, RowPathSqliteSingleDateEventService, RowPathSqliteSingleDateEventSubscriber],
})
class RowPathSingleDateSqliteModule {}

export const ROW_PATH_SINGLE_DATE_FIXTURES: Record<TRowPathDriver, TRowPathFixture> = {
	postgres: { entities: POSTGRES_ENTITIES, module: RowPathSingleDatePostgresModule },
	sqlite: { entities: SQLITE_ENTITIES, module: RowPathSingleDateSqliteModule },
};
