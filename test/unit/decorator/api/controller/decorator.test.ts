import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { ApiServiceBase } from "@class/api";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiControllerObservable } from "@decorator/api/controller/observable.decorator";
import { ApiControllerSecurable } from "@decorator/api/controller/securable.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it, vi } from "vitest";

@Entity("factory_entities")
class FactoryEntity {
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

class FactoryService extends ApiServiceBase<FactoryEntity> {
	public override create = vi.fn(async (properties: Partial<FactoryEntity>) => ({ id: properties.id ?? "id-1", name: properties.name ?? "created", count: 1 }) as FactoryEntity);
	public override get = vi.fn(async (properties: { where?: Partial<FactoryEntity> }) => ({ id: properties.where?.id ?? "id-1", name: "found", count: 2 }) as FactoryEntity);
	public override update = vi.fn(async (criteria: Partial<FactoryEntity>, properties: Partial<FactoryEntity>) => ({ id: criteria.id ?? "id-1", name: properties.name ?? "updated", count: 3 }) as FactoryEntity);
	public override delete = vi.fn(async () => undefined);
	public override getList = vi.fn(async () => ({
		count: 1,
		currentPage: 1,
		items: [{ id: "id-1", name: "item", count: 1 }],
		totalCount: 1,
		totalPages: 1,
	}));
}

class FactoryController {
	public service: FactoryService;

	public constructor() {
		this.service = new FactoryService();
	}
}

describe("ApiController", () => {
	it("initializes factory routes and executes CRUD methods", async () => {
		const ControllerClass = ApiController<IApiBaseEntity>({
			entity: FactoryEntity,
			routes: {
				[EApiRouteType.CREATE]: {},
				[EApiRouteType.DELETE]: {},
				[EApiRouteType.GET]: {},
				[EApiRouteType.GET_LIST]: {},
				[EApiRouteType.PARTIAL_UPDATE]: {},
				[EApiRouteType.UPDATE]: {},
			},
		})(FactoryController);

		const controller = new ControllerClass() as FactoryController & Record<string, any>;
		const headers: Record<string, string> = {};
		const ip = "127.0.0.1";

		await controller.create({ id: "id-1", name: "created", count: 1 }, headers, ip);
		await controller.get({ id: "id-1" }, headers, ip);
		await controller.getList({ limit: 10, page: 1 }, headers, ip);
		await controller.update({ id: "id-1" }, { name: "updated" }, headers, ip);
		await controller.partialUpdate({ id: "id-1" }, { name: "patched" }, headers, ip);
		await controller.delete({ id: "id-1" }, headers, ip);

		expect(controller.service.create).toHaveBeenCalled();
		expect(controller.service.get).toHaveBeenCalled();
		expect(controller.service.getList).toHaveBeenCalled();
		expect(controller.service.update).toHaveBeenCalled();
		expect(controller.service.delete).toHaveBeenCalled();
		expect(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.ENTITY_METADATA_KEY, ControllerClass)).toBe(FactoryEntity);
	});

	it("marks controller as observable", () => {
		@ApiControllerObservable()
		class ObservableController {}

		expect(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, ObservableController)).toBe(true);
	});

	it("marks controller as securable", () => {
		@ApiControllerSecurable()
		class SecurableController {}

		expect(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, SecurableController)).toBe(true);
	});

	it("preserves controller name and constructor behavior", () => {
		class BaseController {
			public service: FactoryService = new FactoryService();

			public constructor(public readonly token: string) {}
		}

		const Decorated = ApiController<IApiBaseEntity>({
			entity: FactoryEntity,
			routes: {},
		})(BaseController as unknown as { new (...arguments_: Array<any>): { service: ApiServiceBase<any> } });

		const instance = new Decorated("secret") as BaseController;

		expect(Decorated.name).toBe("BaseController");
		expect(instance).toBeInstanceOf(BaseController);
		expect(instance.token).toBe("secret");
	});
});
