import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { EntityManager, Repository } from "typeorm";

import { ApiServiceBase } from "@class/api";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiService } from "@decorator/api/service/decorator";
import { EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createTransactionFixture } from "@test/unit/fixture";

const CONTROLLER_ENTITY_ID: string = "11111111-1111-4111-8111-111111111111";

@Entity("controller_entities")
class ControllerEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "Name",
		format: EApiPropertyStringType.STRING,
		maxLength: 50,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "count",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 10,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	public count!: number;
}

// Generated CREATE runs in a route transaction, whose manager hands out this same repository.
const repository: Repository<ControllerEntity> = {
	find: vi.fn(async (): Promise<Array<ControllerEntity>> => [{ count: 1, id: "id-1", name: "saved" }]),
	findAndCount: vi.fn(async (): Promise<[Array<ControllerEntity>, number]> => [[{ count: 1, id: "id-1", name: "item" }], 1]),
	findOne: vi.fn(async (): Promise<ControllerEntity> => ({ count: 2, id: "id-1", name: "found" })),
	metadata: { primaryColumns: [], relations: [] },
	remove: vi.fn(async (entity: ControllerEntity): Promise<ControllerEntity> => entity),
	save: vi.fn(async (entity: Partial<ControllerEntity>): Promise<ControllerEntity> => ({ count: entity.count ?? 1, id: entity.id ?? "id-1", name: entity.name ?? "saved" })),
} as unknown as Repository<ControllerEntity>;

Object.assign(repository, { manager: { dataSource: createTransactionFixture({ getRepository: vi.fn(() => repository) } as unknown as EntityManager).dataSource } });

@ApiService({ entity: ControllerEntity })
class ControllerService extends ApiServiceBase<ControllerEntity> {
	public constructor(public readonly repository: Repository<ControllerEntity>) {
		super();
	}
}

let controllerRepository: Repository<ControllerEntity>;

class ControllerClass {
	public service: ControllerService;

	public constructor() {
		this.service = new ControllerService(controllerRepository);
	}
}

const ControllerFactory = ApiController<IApiBaseEntity>({
	entity: ControllerEntity,
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: {},
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: {},
		[EApiRouteType.PARTIAL_UPDATE]: {},
		[EApiRouteType.UPDATE]: {},
	},
})(ControllerClass);

describe("ApiController (E2E)", () => {
	let dataSource: DataSource;

	// The documented testing recipe: a real repository of an in-memory DataSource with stubbed methods.
	beforeAll(async () => {
		dataSource = await new DataSource({ database: ":memory:", entities: [ControllerEntity], synchronize: true, type: "better-sqlite3" }).initialize();
		controllerRepository = dataSource.getRepository(ControllerEntity);
		// The create checks its stored row through the transaction, past the stubs, so the row the stubbed save answers with is stored. The create body leaves its key out, because a body that names the key of a stored row answers 409.
		await controllerRepository.insert({ count: 1, id: CONTROLLER_ENTITY_ID, name: "saved" });
		vi.spyOn(controllerRepository, "find").mockResolvedValue([{ count: 1, id: CONTROLLER_ENTITY_ID, name: "saved" }]);
		vi.spyOn(controllerRepository, "findAndCount").mockResolvedValue([[{ count: 1, id: CONTROLLER_ENTITY_ID, name: "item" }], 1]);
		vi.spyOn(controllerRepository, "findOne").mockResolvedValue({ count: 2, id: CONTROLLER_ENTITY_ID, name: "found" });
		vi.spyOn(controllerRepository, "remove").mockImplementation(async (entity: unknown): Promise<never> => entity as never);
		vi.spyOn(controllerRepository, "save").mockImplementation(async (entity: unknown): Promise<never> => ({ count: 1, id: CONTROLLER_ENTITY_ID, name: "saved", ...(entity as object) }) as never);
	});

	afterAll(async () => {
		await dataSource.destroy();
	});

	it("executes CRUD methods through generated routes", async () => {
		const controller = new ControllerFactory() as ControllerClass & Record<string, any>;
		const headers: Record<string, string> = {};
		const ip = "127.0.0.1";

		await controller.onApplicationBootstrap();
		await controller.create({ name: "created", count: 1 }, headers, ip);
		await controller.get({ id: CONTROLLER_ENTITY_ID }, headers, ip);
		await controller.getList({ limit: 10, page: 1 }, headers, ip);
		await controller.update({ id: CONTROLLER_ENTITY_ID }, { name: "updated" }, headers, ip);
		await controller.partialUpdate({ id: CONTROLLER_ENTITY_ID }, { name: "patched" }, headers, ip);
		await controller.delete({ id: CONTROLLER_ENTITY_ID }, headers, ip);

		expect(controllerRepository.save).toHaveBeenCalled();
		expect(controllerRepository.findOne).toHaveBeenCalled();
		expect(controllerRepository.findAndCount).toHaveBeenCalled();
		expect(controllerRepository.remove).toHaveBeenCalled();
	});

	it("rejects a mocked service at bootstrap, because it has no TypeORM repository", async () => {
		class MockedServiceController {
			public service: object = { get: vi.fn(), getList: vi.fn() };
		}

		const Decorated = ApiController<IApiBaseEntity>({ entity: ControllerEntity, routes: {} })(MockedServiceController as never) as unknown as new () => { onApplicationBootstrap: () => Promise<void> };
		const controller = new Decorated();

		await expect(controller.onApplicationBootstrap()).rejects.toThrow('Controller "MockedServiceController" of entity "ControllerEntity": service.repository is not a usable TypeORM repository because the service has no repository.');
	});
});
