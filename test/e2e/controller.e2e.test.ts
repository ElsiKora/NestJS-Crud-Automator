import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { Repository } from "typeorm";

import { ApiServiceBase } from "@class/api";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiService } from "@decorator/api/service/decorator";
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

@ApiService({ entity: ControllerEntity })
class ControllerService extends ApiServiceBase<ControllerEntity> {
	public readonly repository = {
		findAndCount: vi.fn(async (): Promise<[Array<ControllerEntity>, number]> => [[{ count: 1, id: "id-1", name: "item" }], 1]),
		findOne: vi.fn(async (): Promise<ControllerEntity> => ({ count: 2, id: "id-1", name: "found" })),
		metadata: { relations: [] },
		remove: vi.fn(async (entity: ControllerEntity): Promise<ControllerEntity> => entity),
		save: vi.fn(async (entity: Partial<ControllerEntity>): Promise<ControllerEntity> => ({ count: entity.count ?? 1, id: entity.id ?? "id-1", name: entity.name ?? "saved" })),
	} as unknown as Repository<ControllerEntity>;
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

		expect(controller.service.repository.save).toHaveBeenCalled();
		expect(controller.service.repository.findOne).toHaveBeenCalled();
		expect(controller.service.repository.findAndCount).toHaveBeenCalled();
		expect(controller.service.repository.remove).toHaveBeenCalled();
	});
});
