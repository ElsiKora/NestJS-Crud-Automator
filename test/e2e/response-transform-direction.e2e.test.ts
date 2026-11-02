import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Repository } from "typeorm";

import { ClassSerializerInterceptor, Controller, HttpStatus, Inject, Injectable, RequestMethod, UseInterceptors, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Expose, Transform } from "class-transformer";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiControllerObservable, ApiPropertyBoolean, ApiPropertyDescribe, ApiPropertyString, ApiPropertyUUID, ApiRouteCustom, ApiService, ApiServiceBase, ApiSubscriberModule, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType, EFilterOrderDirection } from "../../src/index";

const SHOWN_PROVIDERS: ReadonlySet<unknown> = new Set(["email", "phone", "username"]);
const STORED_SUBJECT = "stored-google-subject";

const transformCalls: { undirected: number } = { undirected: 0 };

@Entity("e2e_transform_rows")
class E2eTransformRowEntity {
	@ApiPropertyDescribe({ description: "transformRowId", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ description: "transformRowIdentifier", exampleValue: "first", format: EApiPropertyStringType.STRING, maxLength: 40, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ type: "varchar" })
	public identifier!: string;

	@ApiPropertyDescribe({ description: "transformRowLabel", exampleValue: "first", format: EApiPropertyStringType.STRING, maxLength: 40, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ type: "varchar" })
	public label!: string;

	// The list response publishes it under another name, so no client may filter by it.
	@ApiPropertyDescribe({ description: "transformRowProvider", exampleValue: "first", format: EApiPropertyStringType.STRING, maxLength: 40, minLength: 1, pattern: "/^.+$/", properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.QUERY]: { isEnabled: false } } }, type: EApiPropertyDescribeType.STRING })
	@Column({ type: "varchar" })
	public provider!: string;

	// The list response publishes only a value read from it, so no client may filter by it.
	@ApiPropertyDescribe({ description: "transformRowVerifiedAt", exampleValue: "first", format: EApiPropertyStringType.STRING, isNullable: true, maxLength: 40, minLength: 1, pattern: "/^.+$/", properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.QUERY]: { isEnabled: false } } }, type: EApiPropertyDescribeType.STRING })
	@Column({ nullable: true, type: "varchar" })
	public verifiedAt?: null | string;
}

const STRING_OPTIONS = { entity: E2eTransformRowEntity, exampleValue: "first", format: EApiPropertyStringType.STRING, isResponse: true, maxLength: 40, minLength: 1, pattern: "/^.+$/" };

// The shape of a public identity list item: `toClassOnly` masks the stored identifier of other providers and reads a column the DTO does not declare.
class E2eTransformItemDto {
	@ApiPropertyUUID({ entity: E2eTransformRowEntity, isRequired: true, isResponse: true })
	public id!: string;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "identifier", isNullable: true })
	@Transform(({ obj }: { obj: E2eTransformRowEntity }): null | string => (SHOWN_PROVIDERS.has(obj.provider) ? obj.identifier : null), { toClassOnly: true })
	public identifier!: null | string;

	@ApiPropertyBoolean({ description: "isVerified", entity: E2eTransformRowEntity, isResponse: true })
	@Transform(({ obj }: { obj: E2eTransformRowEntity }): boolean => obj.verifiedAt !== null && obj.verifiedAt !== undefined, { toClassOnly: true })
	public isVerified!: boolean;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "label" })
	@Transform(({ value }: { value: string }): string => `plain:${value}`, { toPlainOnly: true })
	public label!: string;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "provider" })
	@Expose({ name: "provider_wire" })
	public provider!: string;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "summary" })
	@Expose({ name: "summary_wire" })
	@Transform(({ obj }: { obj: E2eTransformRowEntity }): string => {
		transformCalls.undirected += 1;

		return `${obj.label}:${obj.provider}`;
	})
	public summary!: string;
}

@Injectable()
@ApiService({ entity: E2eTransformRowEntity })
class E2eTransformRowService extends ApiServiceBase<E2eTransformRowEntity> {
	@InjectRepository(E2eTransformRowEntity)
	public readonly repository!: Repository<E2eTransformRowEntity>;
}

const DISABLED = { generation: { isEnabled: false } };

const DISABLED_ROUTES = {
	[EApiRouteType.CREATE]: DISABLED,
	[EApiRouteType.DELETE]: DISABLED,
	[EApiRouteType.GET]: DISABLED,
	[EApiRouteType.PARTIAL_UPDATE]: DISABLED,
	[EApiRouteType.UPDATE]: DISABLED,
};

const customRoute = (action: string): MethodDecorator => ApiRouteCustom<E2eTransformRowEntity>({ resource: { action, entity: E2eTransformRowEntity }, response: { serialization: { isEnabled: true }, status: HttpStatus.OK, type: E2eTransformItemDto }, route: { method: RequestMethod.GET, path: "list" } });

@ApiController<E2eTransformRowEntity>({ entity: E2eTransformRowEntity, name: "E2eTransformLibraryRows", path: "transform-library", routes: { ...DISABLED_ROUTES, [EApiRouteType.GET_LIST]: { dto: { response: { itemType: E2eTransformItemDto } } } } })
class E2eTransformLibraryController {
	public constructor(@Inject(E2eTransformRowService) public readonly service: E2eTransformRowService) {}
}

@ApiController<E2eTransformRowEntity>({ entity: E2eTransformRowEntity, name: "E2eTransformInterceptedRows", path: "transform-intercepted", routes: { ...DISABLED_ROUTES, [EApiRouteType.GET_LIST]: { dto: { response: { itemType: E2eTransformItemDto } } } } })
@UseInterceptors(ClassSerializerInterceptor)
class E2eTransformInterceptedController {
	public constructor(@Inject(E2eTransformRowService) public readonly service: E2eTransformRowService) {}
}

@ApiController<E2eTransformRowEntity>({
	entity: E2eTransformRowEntity,
	name: "E2eTransformCursorRows",
	path: "transform-cursor",
	routes: {
		...DISABLED_ROUTES,
		[EApiRouteType.GET_LIST]: {
			dto: { response: { itemType: E2eTransformItemDto } },
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: { fields: {}, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		},
	},
})
class E2eTransformCursorController {
	public constructor(@Inject(E2eTransformRowService) public readonly service: E2eTransformRowService) {}
}

@ApiController<E2eTransformRowEntity>({
	entity: E2eTransformRowEntity,
	name: "E2eTransformCursorInterceptedRows",
	path: "transform-cursor-intercepted",
	routes: {
		...DISABLED_ROUTES,
		[EApiRouteType.GET_LIST]: {
			dto: { response: { itemType: E2eTransformItemDto } },
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: { fields: {}, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		},
	},
})
@UseInterceptors(ClassSerializerInterceptor)
class E2eTransformCursorInterceptedController {
	public constructor(@Inject(E2eTransformRowService) public readonly service: E2eTransformRowService) {}
}

@ApiControllerObservable()
@Controller("transform-custom")
class E2eTransformCustomController {
	public constructor(@Inject(E2eTransformRowService) public readonly service: E2eTransformRowService) {}

	@customRoute("transformCustom.list")
	public async list(): Promise<Array<E2eTransformRowEntity>> {
		return this.service.repository.find();
	}
}

@ApiControllerObservable()
@Controller("transform-custom-intercepted")
@UseInterceptors(ClassSerializerInterceptor)
class E2eTransformCustomInterceptedController {
	public constructor(@Inject(E2eTransformRowService) public readonly service: E2eTransformRowService) {}

	@customRoute("transformCustomIntercepted.list")
	public async list(): Promise<Array<E2eTransformRowEntity>> {
		return this.service.repository.find();
	}
}

// Path, URL, and whether the route has a class-to-plain step today: the host's interceptor or the cursor serialization.
const PATHS: ReadonlyArray<[string, string, boolean]> = [
	["generated GET_LIST", "/transform-library?limit=10&page=1", false],
	["generated GET_LIST with the interceptor", "/transform-intercepted?limit=10&page=1", true],
	["cursor GET_LIST", "/transform-cursor?limit=10", true],
	["cursor GET_LIST with the interceptor", "/transform-cursor-intercepted?limit=10", true],
	["custom route", "/transform-custom/list", false],
	["custom route with the interceptor", "/transform-custom-intercepted/list", true],
];

describe("response transforms keep their direction on every path (E2E)", () => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer | undefined;
	let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; payload: string; statusCode: number }> };

	const readItems = async (url: string): Promise<Array<Record<string, unknown>>> => {
		const response = await fastify.inject({ method: "GET", url });

		expect(response.statusCode, response.payload).toBe(HttpStatus.OK);
		expect(response.payload).not.toContain(STORED_SUBJECT);

		const body: unknown = response.json();
		const items: unknown = Array.isArray(body) ? body : (body as { items: unknown }).items;

		return (items as Array<Record<string, unknown>>).toSorted((left: Record<string, unknown>, right: Record<string, unknown>): number => String(left.provider_wire).localeCompare(String(right.provider_wire)));
	};

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eTransformCursorController, E2eTransformCursorInterceptedController, E2eTransformCustomController, E2eTransformCustomInterceptedController, E2eTransformInterceptedController, E2eTransformLibraryController],
			imports: [TypeOrmModule.forRoot({ dropSchema: true, entities: [E2eTransformRowEntity], logging: false, synchronize: true, type: "postgres", url: container.getConnectionUri() }), TypeOrmModule.forFeature([E2eTransformRowEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [{ provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, whitelist: true }) }, E2eTransformRowService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		fastify = app.getHttpAdapter().getInstance();

		const rowRepository: Repository<E2eTransformRowEntity> = moduleReference.get(getRepositoryToken(E2eTransformRowEntity));

		await rowRepository.save([
			{ identifier: "shown@example.com", label: "a", provider: "email", verifiedAt: "2026-01-01" },
			{ identifier: STORED_SUBJECT, label: "b", provider: "google", verifiedAt: null },
		]);
	}, 120_000);

	beforeEach(() => {
		transformCalls.undirected = 0;
	});

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	it.each(PATHS)("keeps a toClassOnly transform masking from a column the DTO does not declare on %s", async (_path: string, url: string) => {
		const items = await readItems(url);

		expect(items).toEqual([expect.objectContaining({ identifier: "shown@example.com", isVerified: true, provider_wire: "email" }), expect.objectContaining({ identifier: null, isVerified: false, provider_wire: "google" })]);
	});

	it.each(PATHS)("sends the exposed name and not the property key on %s", async (_path: string, url: string) => {
		const items = await readItems(url);

		expect(Object.keys(items[0] ?? {}).toSorted()).toEqual(["id", "identifier", "isVerified", "label", "provider_wire", "summary_wire"]);
	});

	it.each(PATHS)("runs toPlainOnly only where a class-to-plain step runs today, on %s", async (_path: string, url: string, hasPlainStep: boolean) => {
		const items = await readItems(url);

		expect(items.map(({ label }: Record<string, unknown>): unknown => label)).toEqual(hasPlainStep ? ["plain:a", "plain:b"] : ["a", "b"]);
	});

	it.each(PATHS.filter(([, , hasPlainStep]: [string, string, boolean]) => !hasPlainStep))("runs an undirected transform once per row with the full row as obj on %s", async (_path: string, url: string) => {
		const items = await readItems(url);

		expect(items.map(({ summary_wire: summary }: Record<string, unknown>): unknown => summary)).toEqual(["a:email", "b:google"]);
		expect(transformCalls.undirected).toBe(2);
	});
});
