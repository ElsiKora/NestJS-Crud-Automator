import "reflect-metadata";

import type { INestApplicationContext } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { Injectable } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, Entity, ManyToOne, PrimaryColumn, type Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiService, ApiServiceBase, ApiSubscriberModule } from "../../src/index";

const OWNER_A_ID: string = "00000000-0000-0000-0000-00000000000a";
const OWNER_B_ID: string = "00000000-0000-0000-0000-00000000000b";
const ITEM_A_ID: string = "00000000-0000-0000-0000-000000000001";
const ITEM_B_ID: string = "00000000-0000-0000-0000-000000000002";

@Entity("effective_where_owners")
class EffectiveWhereOwnerEntity {
	@PrimaryColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;
}

@Entity("effective_where_items")
class EffectiveWhereItemEntity {
	@PrimaryColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;

	@ManyToOne(() => EffectiveWhereOwnerEntity, { nullable: false })
	public owner!: EffectiveWhereOwnerEntity;
}

@Injectable()
@ApiService({ entity: EffectiveWhereItemEntity })
class EffectiveWhereItemService extends ApiServiceBase<EffectiveWhereItemEntity> {
	@InjectRepository(EffectiveWhereItemEntity)
	public readonly repository!: Repository<EffectiveWhereItemEntity>;
}

describe("WHERE criteria that would widen a query (Postgres E2E)", () => {
	let container: StartedPostgreSqlContainer;
	let context: INestApplicationContext | undefined;
	let service: EffectiveWhereItemService;

	const readNames = async (): Promise<Array<string>> => (await service.repository.find({ order: { id: "ASC" } })).map(({ name }: EffectiveWhereItemEntity): string => name);

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
		const moduleReference = await Test.createTestingModule({
			imports: [
				TypeOrmModule.forRoot({
					dropSchema: true,
					entities: [EffectiveWhereOwnerEntity, EffectiveWhereItemEntity],
					synchronize: true,
					type: "postgres",
					url: container.getConnectionUri(),
				}),
				TypeOrmModule.forFeature([EffectiveWhereItemEntity]),
				ApiSubscriberModule,
			],
			providers: [EffectiveWhereItemService],
		}).compile();

		context = await moduleReference.init();
		service = context.get(EffectiveWhereItemService);
	}, 120_000);

	beforeEach(async () => {
		await service.repository.query('TRUNCATE "effective_where_items", "effective_where_owners"');
		await service.repository.manager.save(EffectiveWhereOwnerEntity, [
			{ id: OWNER_A_ID, name: "owner-a" },
			{ id: OWNER_B_ID, name: "owner-b" },
		]);
		await service.repository.save([
			{ id: ITEM_A_ID, name: "item-a", owner: { id: OWNER_A_ID } },
			{ id: ITEM_B_ID, name: "item-b", owner: { id: OWNER_B_ID } },
		]);
	});

	afterAll(async () => {
		await context?.close();
		await container?.stop();
	});

	it("keeps effective criteria working", async () => {
		await expect(service.get({ where: { id: ITEM_B_ID } })).resolves.toMatchObject({ name: "item-b" });
		await expect(service.getMany({ where: { owner: { id: OWNER_A_ID } } })).resolves.toEqual([expect.objectContaining({ name: "item-a" })]);
		await expect(service.getList({ order: { id: "ASC" }, take: 10 })).resolves.toMatchObject({ totalCount: 2 });
	});

	it("refuses a single-row GET whose criteria are undefined or empty instead of returning the first row", async () => {
		await expect(service.get({ where: { id: undefined } })).rejects.toMatchObject({ status: 500 });
		await expect(service.get({ where: {} })).rejects.toMatchObject({ status: 500 });
		await expect(service.get({ where: { owner: {} } })).rejects.toMatchObject({ status: 500 });
		await expect(service.get({})).rejects.toMatchObject({ status: 500 });
	});

	it("refuses list reads whose criteria would silently match every row", async () => {
		await expect(service.getMany({ where: { owner: { id: undefined } } })).rejects.toMatchObject({ status: 500 });
		await expect(service.getMany({ where: [{ id: ITEM_A_ID }, {}] })).rejects.toMatchObject({ status: 500 });
		await expect(service.getMany({ where: [] })).rejects.toMatchObject({ status: 500 });
		await expect(service.getList({ take: 10, where: { name: undefined } })).rejects.toMatchObject({ status: 500 });
	});

	it("refuses UPDATE and DELETE with undefined criteria and leaves every row untouched", async () => {
		await expect(service.update({ id: undefined }, { name: "changed" })).rejects.toMatchObject({ status: 500 });
		await expect(service.delete({ id: undefined })).rejects.toMatchObject({ status: 500 });

		await expect(readNames()).resolves.toEqual(["item-a", "item-b"]);
	});
});
