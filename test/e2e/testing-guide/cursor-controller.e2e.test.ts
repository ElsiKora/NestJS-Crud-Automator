import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType, EFilterOrderDirection } from "../../../src/index";

@Entity("users")
class UserEntity {
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ description: "username", exampleValue: "john_doe", format: EApiPropertyStringType.STRING, maxLength: 50, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ type: "varchar" })
	public username!: string;
}

@Injectable()
@ApiService<UserEntity>({ entity: UserEntity })
class UserService extends ApiServiceBase<UserEntity> {
	public constructor(
		@InjectRepository(UserEntity)
		public repository: Repository<UserEntity>,
	) {
		super();
	}
}

@ApiController<UserEntity>({
	entity: UserEntity,
	path: "users",
	routes: {
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: { fields: {}, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		},
	},
})
class UserController {
	public constructor(public service: UserService) {}
}

const USER_ID: string = "aaaaaaaa-0000-4000-8000-000000000001";

let app: INestApplication;
let container: StartedPostgreSqlContainer;
let dataSource: DataSource;
let repository: Repository<UserEntity>;

beforeAll(async () => {
	container = await new PostgreSqlContainer("postgres:17-alpine").start();
	dataSource = await new DataSource({ entities: [UserEntity], synchronize: true, type: "postgres", url: container.getConnectionUri() }).initialize();
	repository = dataSource.getRepository(UserEntity);
	vi.spyOn(repository, "find").mockResolvedValue([{ id: USER_ID, username: "john_doe" }]);

	const moduleReference = await Test.createTestingModule({
		controllers: [UserController],
		imports: [ApiAuthorizationModule.forRoot()],
		providers: [UserService, { provide: getRepositoryToken(UserEntity), useValue: repository }],
	}).compile();

	app = moduleReference.createNestApplication(new FastifyAdapter());
	await app.init();
}, 120_000);

afterAll(async () => {
	await app?.close();
	await dataSource?.destroy();
	await container?.stop();
}, 120_000);

it("serves a CURSOR route from the stubbed repository", async () => {
	const response = await app.getHttpAdapter().getInstance().inject({ method: "GET", url: "/users?limit=10" });

	expect(response.statusCode).toBe(200);
	expect(response.json()).toEqual({ items: [{ id: USER_ID, username: "john_doe" }], nextCursor: null, previousCursor: null });
	expect(repository.find).toHaveBeenCalledOnce();
});
