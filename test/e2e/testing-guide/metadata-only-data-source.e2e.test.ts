import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";

import { Injectable } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository } from "@nestjs/typeorm";
import { Column, DataSource, Entity, PrimaryGeneratedColumn, Repository } from "typeorm";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiRouteType, EFilterOrderDirection } from "../../../src/index";

class MetadataDataSource extends DataSource {
	public async buildWithoutConnection(): Promise<void> {
		await this.buildMetadatas();
	}
}

@Entity("users")
class UserEntity {
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, type: EApiPropertyDescribeType.DATE })
	@Column({ type: "timestamptz" })
	public createdAt!: Date;
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

const USER: UserEntity = { createdAt: new Date("2026-01-01T00:00:00.000Z"), id: "aaaaaaaa-0000-4000-8000-000000000001" };

let app: INestApplication;
let dataSource: MetadataDataSource;
let repository: Repository<UserEntity>;

beforeAll(async () => {
	dataSource = new MetadataDataSource({ entities: [UserEntity], type: "postgres" });
	await dataSource.buildWithoutConnection();
	repository = new Repository(UserEntity, dataSource.manager);
	vi.spyOn(repository, "find").mockResolvedValue([USER]);

	const moduleReference = await Test.createTestingModule({
		controllers: [UserController],
		imports: [ApiAuthorizationModule.forRoot()],
		providers: [UserService, { provide: getRepositoryToken(UserEntity), useValue: repository }],
	}).compile();

	app = moduleReference.createNestApplication(new FastifyAdapter());
	await app.init();
});

afterAll(async () => {
	await app?.close();
});

it("starts and serves a CURSOR route without a database connection", async () => {
	const response = await app.getHttpAdapter().getInstance().inject({ method: "GET", url: "/users?limit=10" });

	expect(dataSource.isInitialized).toBe(false);
	expect(response.statusCode).toBe(200);
	expect(response.json()).toEqual({ items: [{ createdAt: "2026-01-01T00:00:00.000Z", id: USER.id }], nextCursor: null, previousCursor: null });
	expect(repository.find).toHaveBeenCalledOnce();
});
