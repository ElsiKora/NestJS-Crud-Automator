import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository } from "@nestjs/typeorm";
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

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

@ApiController<UserEntity>({ entity: UserEntity, path: "users", routes: { [EApiRouteType.GET]: {} } })
class UserController {
	public constructor(public service: UserService) {}
}

const USER_ID: string = "aaaaaaaa-0000-4000-8000-000000000001";

let app: INestApplication;
let dataSource: DataSource;
let repository: Repository<UserEntity>;

beforeAll(async () => {
	dataSource = await new DataSource({ database: ":memory:", entities: [UserEntity], synchronize: true, type: "better-sqlite3" }).initialize();
	repository = dataSource.getRepository(UserEntity);
	vi.spyOn(repository, "findOne").mockResolvedValue({ id: USER_ID, username: "john_doe" });

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
	await dataSource?.destroy();
});

it("serves a generated route from the stubbed repository", async () => {
	const response = await app
		.getHttpAdapter()
		.getInstance()
		.inject({ method: "GET", url: `/users/${USER_ID}` });

	expect(response.statusCode).toBe(200);
	expect(response.json()).toEqual({ id: USER_ID, username: "john_doe" });
	expect(repository.findOne).toHaveBeenCalledOnce();
});
