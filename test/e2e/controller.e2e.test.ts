import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { ApiServiceBase } from "@class/api";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it, vi } from "vitest";

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

class ControllerService extends ApiServiceBase<ControllerEntity> {
	public override create = vi.fn(
		async (properties: Partial<ControllerEntity>) =>
			({
				id: properties.id ?? "id-1",
				name: properties.name ?? "created",
				count: 1,
			}) as ControllerEntity,
	);
	public override get = vi.fn(
		async (properties: { where?: Partial<ControllerEntity> }) =>
			({
				id: properties.where?.id ?? "id-1",
				name: "found",
				count: 2,
			}) as ControllerEntity,
	);
	public override update = vi.fn(
		async (criteria: Partial<ControllerEntity>, properties: Partial<ControllerEntity>) =>
			({
				id: criteria.id ?? "id-1",
				name: properties.name ?? "updated",
				count: 3,
			}) as ControllerEntity,
	);
	public override delete = vi.fn(async () => undefined);
	public override getList = vi.fn(async () => ({
		count: 1,
		currentPage: 1,
		items: [{ id: "id-1", name: "item", count: 1 }],
		totalCount: 1,
		totalPages: 1,
	}));
}

class ControllerClass {
	public service: ControllerService;

	public constructor() {
		this.service = new ControllerService();
	}
}

describe("ApiController (E2E)", () => {
	it("executes CRUD methods through generated routes", async () => {
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

		const controller = new ControllerFactory() as ControllerClass & Record<string, any>;
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
	});
});
