import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository } from "@nestjs/typeorm";
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const USER_ID: string = "aaaaaaaa-0000-4000-8000-000000000001";

@Entity("recipe_users")
class RecipeUserEntity {
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ description: "username", exampleValue: "john_doe", format: EApiPropertyStringType.STRING, maxLength: 50, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ type: "varchar" })
	public username!: string;
}

@Injectable()
@ApiService<RecipeUserEntity>({ entity: RecipeUserEntity })
class RecipeUserService extends ApiServiceBase<RecipeUserEntity> {
	public constructor(
		@InjectRepository(RecipeUserEntity)
		public repository: Repository<RecipeUserEntity>,
	) {
		super();
	}
}

@ApiController<RecipeUserEntity>({
	entity: RecipeUserEntity,
	name: "RecipeUsers",
	path: "recipe-users",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: {},
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: {},
		[EApiRouteType.PARTIAL_UPDATE]: {},
		[EApiRouteType.UPDATE]: {},
	},
})
class RecipeUserController {
	public constructor(public service: RecipeUserService) {}
}

// Mirrors the recipe in docs/guides/testing: a real repository of an in-memory DataSource, with stubbed methods.
describe("Testing recipe (E2E)", () => {
	let app: INestApplication;
	let dataSource: DataSource;
	let repository: Repository<RecipeUserEntity>;

	beforeAll(async () => {
		dataSource = await new DataSource({ database: ":memory:", entities: [RecipeUserEntity], synchronize: true, type: "better-sqlite3" }).initialize();
		repository = dataSource.getRepository(RecipeUserEntity);
		vi.spyOn(repository, "findOne").mockResolvedValue({ id: USER_ID, username: "john_doe" });

		const moduleReference = await Test.createTestingModule({
			controllers: [RecipeUserController],
			imports: [ApiAuthorizationModule.forRoot()],
			providers: [RecipeUserService, { provide: getRepositoryToken(RecipeUserEntity), useValue: repository }],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
	});

	afterAll(async () => {
		await app.close();
		await dataSource.destroy();
	});

	it("serves a generated route from the stubbed repository", async () => {
		const response = await (app.getHttpAdapter().getInstance() as { inject: (request: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> }).inject({ method: "GET", url: `/recipe-users/${USER_ID}` });

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ id: USER_ID, username: "john_doe" });
		expect(repository.findOne).toHaveBeenCalledOnce();
	});
});
