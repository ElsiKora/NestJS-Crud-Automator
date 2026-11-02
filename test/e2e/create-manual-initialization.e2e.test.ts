import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, DataSource, Entity, PrimaryGeneratedColumn, Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, AuthorizationResolveDefaultPrincipal, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src";

@Entity("create_manual_initialization_items")
class ManualItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ type: EApiPropertyDescribeType.UUID } as never)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "name", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isRequired: true } } }, type: EApiPropertyDescribeType.STRING })
	public name!: string;
}

@Injectable()
@ApiService({ entity: ManualItemEntity })
class ManualItemService extends ApiServiceBase<ManualItemEntity> {
	@InjectRepository(ManualItemEntity)
	public readonly repository!: Repository<ManualItemEntity>;
}

@ApiController<ManualItemEntity>({
	entity: ManualItemEntity,
	name: "manualItem",
	path: "manual-items",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
class ManualItemController {
	@Inject(ManualItemService)
	public readonly service!: ManualItemService;
}

@Module({
	controllers: [ManualItemController],
	imports: [ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [ManualItemEntity], logging: false, manualInitialization: true, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([ManualItemEntity])],
	providers: [ManualItemService],
})
class ManualInitializationModule {}

describe("Generated CREATE with a DataSource that starts after the application (E2E)", () => {
	let app: INestApplication;
	let dataSource: DataSource;

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({ imports: [ManualInitializationModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		dataSource = moduleRef.get(DataSource);
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
	});

	afterAll(async () => {
		await app?.close();
	});

	it("serves the route once the DataSource is up", async () => {
		await dataSource.initialize();

		const response = await app
			.getHttpAdapter()
			.getInstance()
			.inject({ method: "POST", payload: { name: "created" }, url: "/manual-items" });

		expect(response.statusCode).toBe(201);
		expect(await dataSource.getRepository(ManualItemEntity).count()).toBe(1);
	});
});
