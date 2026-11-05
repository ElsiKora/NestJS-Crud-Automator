import "reflect-metadata";

import type { INestApplication, Type } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { Repository } from "typeorm";

import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { getMetadataStorage } from "class-validator";
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType, EFilterOperation } from "../../src/index";

// This file imports nothing the relation filter added, so it also runs on the commit before it.
const DISABLED = { generation: { isEnabled: false } } as const;
const UUID: string = "a0000000-0000-4000-8000-000000000001";

const describeId = (): PropertyDecorator => ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID });

const describeName = (): PropertyDecorator => ApiPropertyDescribe({ description: "name", exampleValue: "name", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });

@Entity("rf_undeclared_tags")
class UndeclaredTagEntity {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeName()
	public name!: string;
}

@Entity("rf_undeclared_companies")
class UndeclaredCompanyEntity {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Entity("rf_undeclared_owners")
class UndeclaredOwnerEntity {
	@ApiPropertyDescribe({ description: "company", type: EApiPropertyDescribeType.RELATION })
	@ManyToOne(() => UndeclaredCompanyEntity)
	public company!: UndeclaredCompanyEntity;

	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

// Every relation is described and visible, which is the shape that once published a to-many filter.
@Entity("rf_undeclared_games")
class UndeclaredGameEntity {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION })
	@ManyToOne(() => UndeclaredOwnerEntity)
	public owner!: UndeclaredOwnerEntity;

	@ApiPropertyDescribe({ description: "tags", type: EApiPropertyDescribeType.RELATION })
	@JoinTable()
	@ManyToMany(() => UndeclaredTagEntity)
	public tags!: Array<UndeclaredTagEntity>;
}

const ENTITIES: Array<Type<unknown>> = [UndeclaredCompanyEntity, UndeclaredGameEntity, UndeclaredOwnerEntity, UndeclaredTagEntity];

@Injectable()
@ApiService({ entity: UndeclaredGameEntity } as never)
class UndeclaredGameService extends ApiServiceBase<UndeclaredGameEntity> {
	@InjectRepository(UndeclaredGameEntity)
	public readonly repository!: Repository<UndeclaredGameEntity>;
}

const createController = (name: string, query: unknown): Type<unknown> => {
	class UndeclaredController {
		@Inject(UndeclaredGameService)
		public readonly service!: UndeclaredGameService;
	}

	Object.defineProperty(UndeclaredController, "name", { value: name });

	return ApiController<UndeclaredGameEntity>({
		entity: UndeclaredGameEntity,
		name,
		path: name,
		routes: {
			[EApiRouteType.CREATE]: DISABLED,
			[EApiRouteType.DELETE]: DISABLED,
			[EApiRouteType.GET]: DISABLED,
			[EApiRouteType.GET_LIST]: query === undefined ? {} : { request: { [EApiControllerRequestTarget.QUERY]: query } },
			[EApiRouteType.PARTIAL_UPDATE]: DISABLED,
			[EApiRouteType.UPDATE]: DISABLED,
		},
	} as never)(UndeclaredController) as Type<unknown>;
};

const ROUTES: ReadonlyArray<{ controller: Type<unknown>; isTyped: boolean; route: string }> = [
	{ controller: createController("undeclaredLegacy", undefined), isTyped: false, route: "undeclaredLegacy" },
	{ controller: createController("undeclaredInherit", { filter: { fields: {}, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT } }), isTyped: true, route: "undeclaredInherit" },
	{ controller: createController("undeclaredReject", { filter: { fields: { "owner.id": { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } }), isTyped: true, route: "undeclaredReject" },
];

const PATHS: ReadonlyArray<{ key: string; value: string }> = [
	{ key: "tags.id", value: UUID },
	{ key: "tags.name", value: "name" },
	{ key: "owner.company.id", value: UUID },
];

const readQueryDtoKeys = (controller: Type<unknown>): Array<string> => {
	const parameterTypes: Array<new () => unknown> = Reflect.getMetadata("design:paramtypes", controller.prototype as object, "getList") as Array<new () => unknown>;

	return parameterTypes.flatMap((parameterType: new () => unknown): Array<string> =>
		getMetadataStorage()
			.getTargetValidationMetadatas(parameterType, "", true, false)
			.map(({ propertyName }: { propertyName: string }) => propertyName),
	);
};

describe("A filter path nobody declared", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;
	let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: ROUTES.map(({ controller }: { controller: Type<unknown> }) => controller),
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: ENTITIES, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(ENTITIES), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [UndeclaredGameService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		fastify = app.getHttpAdapter().getInstance();
		await (fastify as unknown as { ready: () => Promise<void> }).ready();
	});

	afterAll(async () => {
		await app?.close();
	});

	describe.each(ROUTES.map(({ controller, isTyped, route }: { controller: Type<unknown>; isTyped: boolean; route: string }) => ({ controller, isTyped, route })))("on $route", ({ controller, isTyped, route }: { controller: Type<unknown>; isTyped: boolean; route: string }) => {
		it.each(PATHS.map(({ key, value }: { key: string; value: string }) => ({ key, value })))("answers 400 for $key", async ({ key, value }: { key: string; value: string }) => {
			const response = await fastify.inject({ method: "GET", url: `/${route}?limit=10&page=1&${key}[operator]=eq&${key}[value]=${value}` });

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);

			if (isTyped) {
				expect((response.json() as { message: unknown }).message).toBe("FILTER_NOT_VALID");
			}
		});

		it("publishes none of them in OpenAPI", () => {
			const names: Array<string> = ((document.paths[`/${route}`]?.get?.parameters ?? []) as Array<{ name: string }>).map(({ name }: { name: string }) => name);

			// The one-hop path every one of these routes offers shows that the list holds filters at all.
			expect(names.some((name: string): boolean => name.startsWith("owner.id"))).toBe(true);
			expect(names.filter((name: string): boolean => name.startsWith("tags.") || name.startsWith("owner.company"))).toEqual([]);
		});

		it("publishes none of them in the query DTO", () => {
			const keys: Array<string> = readQueryDtoKeys(controller);

			expect(keys.some((key: string): boolean => key.includes("owner.id"))).toBe(true);
			expect(keys.filter((key: string): boolean => key.includes("tags.") || key.includes("owner.company"))).toEqual([]);
		});
	});

	describe("an explicit entry of a typed plan", () => {
		it.each(PATHS.map(({ key }: { key: string }) => ({ key })))("reaches $key", ({ key }: { key: string }) => {
			expect(() => createController(`undeclaredExplicit${key.replaceAll(".", "")}`, { filter: { fields: { [key]: { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } })).not.toThrow();
		});
	});
});
