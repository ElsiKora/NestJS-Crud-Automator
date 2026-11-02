import "reflect-metadata";

import type { TApiControllerTargetMethod } from "@type/factory/api/controller";
import type { Repository } from "typeorm";

import { ApiServiceBase } from "@class/api";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiService } from "@decorator/api/service/decorator";
import { EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerGetMethodName } from "@utility/api/controller/get/method-name.utility";
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

@Entity("generated_method_name_entities")
class GeneratedMethodNameEntity {
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
}

type TGeneratedController = InstanceType<TApiControllerTargetMethod<GeneratedMethodNameEntity>>;

@ApiService({ entity: GeneratedMethodNameEntity })
class GeneratedMethodNameService extends ApiServiceBase<GeneratedMethodNameEntity> {
	public constructor(public readonly repository: Repository<GeneratedMethodNameEntity>) {
		super();
	}
}

@ApiController<GeneratedMethodNameEntity>({
	entity: GeneratedMethodNameEntity,
	routes: {},
})
class GeneratedMethodNameController {
	public constructor(public service: GeneratedMethodNameService) {}
}

/**
 * Narrows a decorated controller to the exported controller type once every route's generated method exists.
 * @param {object} controller Decorated controller instance.
 * @returns {void}
 */
function assertGeneratedController(controller: object): asserts controller is TGeneratedController {
	for (const route of Object.values(EApiRouteType)) {
		expect(typeof Reflect.get(controller, ApiControllerGetMethodName(route)), route).toBe("function");
	}
}

describe("generated controller methods called by their typed names", () => {
	const HEADERS: Record<string, string> = {};
	const IP_ADDRESS: string = "127.0.0.1";
	let controller: TGeneratedController;
	let dataSource: DataSource;

	beforeAll(async () => {
		dataSource = await new DataSource({
			database: ":memory:",
			entities: [GeneratedMethodNameEntity],
			synchronize: true,
			type: "better-sqlite3",
		}).initialize();

		const decorated: GeneratedMethodNameController = new GeneratedMethodNameController(new GeneratedMethodNameService(dataSource.getRepository(GeneratedMethodNameEntity)));

		assertGeneratedController(decorated);
		controller = decorated;
	});

	afterAll(async () => {
		await dataSource.destroy();
	});

	it("runs every route type through its method on a real database", async () => {
		const created: GeneratedMethodNameEntity = await controller.create({ name: "created" }, HEADERS, IP_ADDRESS);

		expect(created.name).toBe("created");
		await expect(controller.get({ id: created.id }, HEADERS, IP_ADDRESS)).resolves.toMatchObject({ id: created.id, name: "created" });
		await expect(controller.getList({ limit: 10, page: 1 }, HEADERS, IP_ADDRESS)).resolves.toMatchObject({ totalCount: 1 });
		await expect(controller.update({ id: created.id }, { name: "updated" }, HEADERS, IP_ADDRESS)).resolves.toMatchObject({ id: created.id, name: "updated" });
		await expect(controller.partialUpdate({ id: created.id }, { name: "patched" }, HEADERS, IP_ADDRESS)).resolves.toMatchObject({ id: created.id, name: "patched" });
		await controller.delete({ id: created.id }, HEADERS, IP_ADDRESS);
		await expect(dataSource.getRepository(GeneratedMethodNameEntity).count()).resolves.toBe(0);
	});
});
