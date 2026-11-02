import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { Repository } from "typeorm";

import { ApiServiceBase } from "@class/api";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiService } from "@decorator/api/service/decorator";
import { EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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
		vi.spyOn(controllerRepository, "findAndCount").mockResolvedValue([[{ count: 1, id: "id-1", name: "item" }], 1]);
		vi.spyOn(controllerRepository, "findOne").mockResolvedValue({ count: 2, id: "id-1", name: "found" });
		vi.spyOn(controllerRepository, "remove").mockImplementation(async (entity: unknown): Promise<never> => entity as never);
		vi.spyOn(controllerRepository, "save").mockImplementation(async (entity: unknown): Promise<never> => ({ count: 1, id: "id-1", name: "saved", ...(entity as object) }) as never);
	});

	afterAll(async () => {
		await dataSource.destroy();
	});

	it("executes CRUD methods through generated routes", async () => {
		const controller = new ControllerFactory() as ControllerClass & Record<string, any>;
		const headers: Record<string, string> = {};
		const ip = "127.0.0.1";

		await controller.onApplicationBootstrap();
		await controller.create({ id: "id-1", name: "created", count: 1 }, headers, ip);
		await controller.get({ id: "id-1" }, headers, ip);
		await controller.getList({ limit: 10, page: 1 }, headers, ip);
		await controller.update({ id: "id-1" }, { name: "updated" }, headers, ip);
		await controller.partialUpdate({ id: "id-1" }, { name: "patched" }, headers, ip);
		await controller.delete({ id: "id-1" }, headers, ip);

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
