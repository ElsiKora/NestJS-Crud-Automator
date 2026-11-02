import type { EntitySubscriberInterface, InsertEvent, Repository } from "typeorm";

import { ApiFunctionCreateInsertGuard } from "@class/api/function/create-insert-guard.class";
import { ConflictException } from "@nestjs/common";
import { CreateGuardChildEntity, CreateGuardCounterEntity, CreateGuardItemEntity, CreateGuardOwnerEntity, CreateGuardTagEntity } from "@test/unit/class/api/function/fixture/create-insert-guard.entity";
import { DataSource } from "typeorm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Counts every create of an item in an existing counter row, through a save of its own that the subscriber starts.
class CreateGuardCounterSubscriber implements EntitySubscriberInterface<CreateGuardItemEntity> {
	public async beforeInsert(event: InsertEvent<CreateGuardItemEntity>): Promise<void> {
		const counter: CreateGuardCounterEntity = await event.manager.findOneByOrFail(CreateGuardCounterEntity, { id: "items" });
		await event.manager.save(CreateGuardCounterEntity, { count: counter.count + 1, id: "items" });
	}

	public listenTo(): typeof CreateGuardItemEntity {
		return CreateGuardItemEntity;
	}
}

describe("ApiFunctionCreateInsertGuard", () => {
	let dataSource: DataSource;
	let items: Repository<CreateGuardItemEntity>;

	const readState = async (): Promise<unknown> => ({
		children: await dataSource.getRepository(CreateGuardChildEntity).find({ order: { id: "ASC" }, relations: { parent: true } }),
		items: await items.find({ order: { id: "ASC" }, relations: { owner: true, tags: true }, withDeleted: true }),
		owners: await dataSource.getRepository(CreateGuardOwnerEntity).find({ order: { id: "ASC" } }),
		tags: await dataSource.getRepository(CreateGuardTagEntity).find({ order: { id: "ASC" } }),
	});

	const expectRefused = async (properties: object): Promise<void> => {
		const before: unknown = await readState();
		const failure: unknown = await ApiFunctionCreateInsertGuard.save(items, properties, CreateGuardItemEntity).catch((error: unknown): unknown => error);

		expect(failure).toBeInstanceOf(ConflictException);
		expect((failure as ConflictException).getResponse()).toEqual({ details: { type: "UNIQUE_VIOLATION" }, error: "Conflict", message: "CREATEGUARDITEMENTITY_DUPLICATE_KEY", statusCode: 409 });
		expect(await readState()).toEqual(before);
	};

	beforeEach(async () => {
		dataSource = new DataSource({ database: ":memory:", entities: [CreateGuardChildEntity, CreateGuardCounterEntity, CreateGuardItemEntity, CreateGuardOwnerEntity, CreateGuardTagEntity], synchronize: true, type: "better-sqlite3" });
		await dataSource.initialize();
		items = dataSource.getRepository(CreateGuardItemEntity);
		await dataSource.getRepository(CreateGuardOwnerEntity).save({ id: "owner-1", name: "Owner" });
		await dataSource.getRepository(CreateGuardTagEntity).save({ id: "tag-1", name: "Tag" });
		await items.save({ id: "item-1", name: "Item", owner: { id: "owner-1" }, tags: [{ id: "tag-1" }] });
		await dataSource.getRepository(CreateGuardChildEntity).save({ id: "child-1", name: "Child", parent: { id: "item-1" } });
	});

	afterEach(async () => {
		await dataSource.destroy();
	});

	it("inserts a new row with references and cascaded new rows", async () => {
		const saved: CreateGuardItemEntity = await ApiFunctionCreateInsertGuard.save(items, { children: [{ id: "child-2", name: "New child" }], id: "item-2", name: "New", owner: { id: "owner-2", name: "New owner" }, tags: [{ id: "tag-1" }, { id: "tag-2", name: "New tag" }] }, CreateGuardItemEntity);

		expect(saved.id).toBe("item-2");
		expect(await items.findOneOrFail({ relations: { children: true, owner: true, tags: true }, where: { id: "item-2" } })).toMatchObject({ children: [{ id: "child-2", name: "New child" }], name: "New", owner: { id: "owner-2", name: "New owner" }, tags: expect.arrayContaining([expect.objectContaining({ id: "tag-1", name: "Tag" }), expect.objectContaining({ id: "tag-2" })]) as unknown });
	});

	it("links an existing row named only by its key without changing it", async () => {
		await ApiFunctionCreateInsertGuard.save(items, { id: "item-2", name: "New", owner: { id: "owner-1", name: "Owner" }, tags: [{ id: "tag-1", name: "Tag" }] }, CreateGuardItemEntity);

		expect(await dataSource.getRepository(CreateGuardOwnerEntity).findOneByOrFail({ id: "owner-1" })).toEqual({ id: "owner-1", name: "Owner" });
		expect(await items.count()).toBe(2);
	});

	it("refuses a row whose key exists, with or without changed values, before any write", async () => {
		await expectRefused({ id: "item-1", name: "Changed" });
		await expectRefused({ id: "item-1", name: "Item" });
		await expectRefused({ children: [{ id: "child-2", name: "New child" }], id: "item-1", name: "Item" });
	});

	it("refuses a row whose key belongs to a soft deleted row", async () => {
		await items.softDelete({ id: "item-1" });

		await expectRefused({ id: "item-1", name: "Item" });
	});

	it("refuses a cascade that would change an existing related row", async () => {
		await expectRefused({ id: "item-2", name: "New", owner: { id: "owner-1", name: "Renamed" } });
		await expectRefused({ id: "item-2", name: "New", tags: [{ id: "tag-1", name: "Renamed" }] });
	});

	it("refuses a to-many relation that would move an existing row to the new row", async () => {
		await expectRefused({ children: [{ id: "child-1" }], id: "item-2", name: "New" });
	});

	it("keeps a save that a TypeORM subscriber starts during the create", async () => {
		await dataSource.getRepository(CreateGuardCounterEntity).save({ count: 0, id: "items" });
		dataSource.subscribers.push(new CreateGuardCounterSubscriber());

		await ApiFunctionCreateInsertGuard.save(items, { id: "item-2", name: "New" }, CreateGuardItemEntity);

		expect(await dataSource.getRepository(CreateGuardCounterEntity).findOneByOrFail({ id: "items" })).toEqual({ count: 1, id: "items" });
	});

	it("inserts a new row through a repository whose save drops the save options", async () => {
		const dropping: Repository<CreateGuardItemEntity> = items.extend({
			async save(this: Repository<CreateGuardItemEntity>, entity: CreateGuardItemEntity): Promise<CreateGuardItemEntity> {
				return await dataSource.getRepository(CreateGuardItemEntity).save(entity);
			},
		} as never);

		await ApiFunctionCreateInsertGuard.save(dropping, { id: "item-2", name: "New" }, CreateGuardItemEntity);

		expect(await items.count()).toBe(2);
	});

	it("leaves saves outside a create function free to update rows", async () => {
		await ApiFunctionCreateInsertGuard.save(items, { id: "item-2", name: "New" }, CreateGuardItemEntity);
		await items.save({ id: "item-1", name: "Changed", owner: { id: "owner-1", name: "Renamed" } });

		expect(await items.findOneOrFail({ relations: { owner: true }, where: { id: "item-1" } })).toMatchObject({ name: "Changed", owner: { name: "Renamed" } });
	});

	it("registers itself once on the DataSource of the repository", async () => {
		await ApiFunctionCreateInsertGuard.save(items, { id: "item-2", name: "New" }, CreateGuardItemEntity);
		await ApiFunctionCreateInsertGuard.save(items, { id: "item-3", name: "New" }, CreateGuardItemEntity);

		expect(dataSource.subscribers.filter((subscriber: unknown): boolean => subscriber instanceof ApiFunctionCreateInsertGuard)).toHaveLength(1);
	});
});
