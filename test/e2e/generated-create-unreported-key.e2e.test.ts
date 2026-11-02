import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { Repository } from "typeorm";

import { Inject, Logger } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

// SQLite fills an integer primary key through its rowid, but TypeORM does not read back a key it was not told is generated.
@Entity("e2e_unreported_key_items")
class UnreportedKeyItemEntity {
	@ApiPropertyDescribe({ description: "id", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1_000_000, minimum: 1, multipleOf: 1, properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isEnabled: false } } }, type: EApiPropertyDescribeType.NUMBER })
	@PrimaryColumn({ type: "integer" })
	public id!: number;

	@ApiPropertyDescribe({ description: "name", exampleValue: "Item", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^[A-Za-z]+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ type: "varchar" })
	public name!: string;
}

@ApiService<UnreportedKeyItemEntity>({ entity: UnreportedKeyItemEntity })
class UnreportedKeyItemService extends ApiServiceBase<UnreportedKeyItemEntity> {
	public constructor(@InjectRepository(UnreportedKeyItemEntity) public readonly repository: Repository<UnreportedKeyItemEntity>) {
		super();
	}
}

@ApiController<UnreportedKeyItemEntity>({
	entity: UnreportedKeyItemEntity,
	name: "UnreportedKeyItems",
	path: "unreported-key-items",
	routes: {
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
class UnreportedKeyItemController {
	public constructor(@Inject(UnreportedKeyItemService) public readonly service: UnreportedKeyItemService) {}
}

describe("Generated POST on a primary key the database fills without TypeORM knowing (E2E)", () => {
	let app: INestApplication;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [UnreportedKeyItemController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [UnreportedKeyItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([UnreportedKeyItemEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [UnreportedKeyItemService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
	});

	afterAll(async () => {
		await app.close();
	});

	it("answers 500 and logs that the key must be declared as generated", async () => {
		const loggerError = vi.spyOn(Logger.prototype, "error").mockImplementation((): void => undefined);
		const fastify: { inject: (options: { method: string; payload: object; url: string }) => Promise<{ statusCode: number }> } = app.getHttpAdapter().getInstance();

		try {
			const response: { statusCode: number } = await fastify.inject({ method: "POST", payload: { name: "Item" }, url: "/unreported-key-items" });

			expect(response.statusCode).toBe(500);
			expect(loggerError.mock.calls.flat().map(String).join("\n")).toContain("Generated CREATE route cannot read the UnreportedKeyItemEntity row it inserted: the saved entity has no primary key value TypeORM knows.");
		} finally {
			loggerError.mockRestore();
		}
	});
});
