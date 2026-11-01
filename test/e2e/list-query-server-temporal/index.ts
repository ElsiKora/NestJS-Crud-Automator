import "reflect-metadata";

import type { Type } from "@nestjs/common";
import type { Repository, ValueTransformer } from "typeorm";

import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn } from "typeorm";

import { ApiController, ApiControllerObservable, ApiPropertyDescribe, ApiRouteSubscriber, ApiRouteSubscriberBase, ApiService, ApiServiceBase, EApiControllerGetListQueryFilterMissingBehavior, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType, EFilterOperation } from "../../../src/index";

export interface IServerTemporalEvent {
	happenedAt: Date;
	id: string;
	label: string;
	stampedAt: Date;
}

export interface IServerTemporalFixture {
	controllers: Array<Type<unknown>>;
	createDefaultConditionController: (value: Date | string, path: string) => Type<unknown>;
	entity: Type<IServerTemporalEvent>;
	service: Type<ApiServiceBase<IServerTemporalEvent> & { repository: Repository<IServerTemporalEvent> }>;
	subscriber: Type<unknown>;
}

// A query flag a route subscriber reads to write a server-side filter before validation.
export interface IServerTemporalRewrite {
	field: "happenedAt" | "stampedAt";
	operation: EFilterOperation.BETWEEN | EFilterOperation.GTE;
	value: Array<Date | string> | Date | string;
}

export const SERVER_TEMPORAL_REWRITES: Map<string, IServerTemporalRewrite> = new Map<string, IServerTemporalRewrite>();

// Accepts only a Date, so a filter that binds text fails instead of passing.
const DATE_ONLY_TRANSFORMER: ValueTransformer = {
	from: (value: unknown): unknown => value,
	to: (value: unknown): unknown => {
		if (value === null || value === undefined || value instanceof Date) {
			return value;
		}

		throw new TypeError("server temporal transformer expects a Date");
	},
};

const disabledRoute = { generation: { isEnabled: false } } as const;
const disabledRoutes = {
	[EApiRouteType.CREATE]: disabledRoute,
	[EApiRouteType.DELETE]: disabledRoute,
	[EApiRouteType.GET]: disabledRoute,
	[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
	[EApiRouteType.UPDATE]: disabledRoute,
} as const;

/**
 * Creates the server-side temporal filter fixture for one database: SQLite has no `timestamptz`, so the instant column type depends on it.
 * @param {boolean} isPostgres - Whether the fixture runs on PostgreSQL
 * @returns {IServerTemporalFixture} Entity, service, subscriber and controllers of the fixture
 */
export const createServerTemporalFixture = (isPostgres: boolean): IServerTemporalFixture => {
	const instantType: string = isPostgres ? "timestamptz" : "datetime";

	@Entity("e2e_server_temporal_events")
	class E2eServerTemporalEventEntity implements IServerTemporalEvent {
		@PrimaryColumn({ type: "uuid" })
		@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
		public id!: string;

		@Column({ type: "varchar" })
		@ApiPropertyDescribe({ description: "label", exampleValue: "Alpha", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
		public label!: string;

		@Column({ type: instantType as "timestamptz" })
		@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
		public happenedAt!: Date;

		@Column({ transformer: DATE_ONLY_TRANSFORMER, type: instantType as "timestamptz" })
		@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
		public stampedAt!: Date;
	}

	@Injectable()
	@ApiService({ entity: E2eServerTemporalEventEntity })
	class E2eServerTemporalEventService extends ApiServiceBase<E2eServerTemporalEventEntity> {
		@InjectRepository(E2eServerTemporalEventEntity)
		public readonly repository!: Repository<E2eServerTemporalEventEntity>;
	}

	@Injectable()
	@ApiRouteSubscriber({ entity: E2eServerTemporalEventEntity })
	class E2eServerTemporalEventSubscriber extends ApiRouteSubscriberBase<E2eServerTemporalEventEntity> {
		public async onBeforeGetList(context: { result: { query?: Record<string, unknown> } }): Promise<void> {
			const query: Record<string, unknown> | undefined = context.result.query;
			const key: unknown = query?.rewrite;

			if (!query || typeof key !== "string") {
				return;
			}

			const rewrite: IServerTemporalRewrite | undefined = SERVER_TEMPORAL_REWRITES.get(key);

			delete query.rewrite;

			if (!rewrite) {
				return;
			}

			query[`${rewrite.field}[operator]`] = rewrite.operation;
			query[Array.isArray(rewrite.value) ? `${rewrite.field}[values]` : `${rewrite.field}[value]`] = rewrite.value;
		}
	}

	@ApiControllerObservable()
	@ApiController<E2eServerTemporalEventEntity>({
		entity: E2eServerTemporalEventEntity,
		name: "E2eServerTemporalDefaultEvents",
		path: "server-temporal/default-events",
		routes: { ...disabledRoutes },
	})
	class E2eServerTemporalDefaultEventController {
		@Inject(E2eServerTemporalEventService)
		public readonly service!: E2eServerTemporalEventService;
	}

	@ApiControllerObservable()
	@ApiController<E2eServerTemporalEventEntity>({
		entity: E2eServerTemporalEventEntity,
		name: "E2eServerTemporalPageEvents",
		path: "server-temporal/page-events",
		routes: {
			...disabledRoutes,
			[EApiRouteType.GET_LIST]: {
				request: {
					[EApiControllerRequestTarget.QUERY]: {
						filter: {
							fields: {
								happenedAt: { allowedOperations: [EFilterOperation.BETWEEN, EFilterOperation.GTE], isEnabled: true },
								stampedAt: { allowedOperations: [EFilterOperation.BETWEEN, EFilterOperation.GTE], isEnabled: true },
							},
							unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
						},
						order: { fields: { label: { isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
					},
				},
			},
		},
	})
	class E2eServerTemporalPageEventController {
		@Inject(E2eServerTemporalEventService)
		public readonly service!: E2eServerTemporalEventService;
	}

	const createDefaultConditionController = (value: Date | string, path: string): Type<unknown> => {
		@ApiControllerObservable()
		@ApiController<E2eServerTemporalEventEntity>({
			entity: E2eServerTemporalEventEntity,
			name: `E2eServerTemporal${path.replaceAll("-", "")}Events`,
			path: `server-temporal/${path}`,
			routes: {
				...disabledRoutes,
				[EApiRouteType.GET_LIST]: {
					request: {
						[EApiControllerRequestTarget.QUERY]: {
							filter: {
								fields: {
									happenedAt: { allowedOperations: [EFilterOperation.GTE], defaultCondition: { operator: EFilterOperation.GTE, value }, isEnabled: true, missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.USE_DEFAULT },
								},
								unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
							},
							order: { fields: { label: { isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
						},
					},
				},
			},
		})
		class E2eServerTemporalDefaultConditionEventController {
			@Inject(E2eServerTemporalEventService)
			public readonly service!: E2eServerTemporalEventService;
		}

		return E2eServerTemporalDefaultConditionEventController;
	};

	return {
		controllers: [E2eServerTemporalDefaultEventController, E2eServerTemporalPageEventController],
		createDefaultConditionController,
		entity: E2eServerTemporalEventEntity,
		service: E2eServerTemporalEventService,
		subscriber: E2eServerTemporalEventSubscriber,
	};
};
