import type { EntitySubscriberInterface, InsertEvent, Repository } from "typeorm";

import { ApiFunctionCreateInsertGuard } from "@class/api/function/create-insert-guard.class";
import { ConflictException } from "@nestjs/common";
import { CreateGuardBindingEntity, CreateGuardChildEntity, CreateGuardCounterEntity, CreateGuardIdentityEntity, CreateGuardItemEntity, CreateGuardOwnerEntity, CreateGuardSlotEntity, CreateGuardTagEntity, ECreateGuardKind } from "@test/unit/class/api/function/fixture/create-insert-guard.entity";
import { DataSource } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

	// better-sqlite3 hands every save the same query runner, so only the asynchronous context tells the saves apart.
	it.each([
		["the create first", true],
		["the other saves first", false],
	])("leaves saves that run next to a create free to update rows, with %s", async (_name: string, isCreateFirst: boolean) => {
		const create = (): Promise<unknown> => ApiFunctionCreateInsertGuard.save(items, { id: "item-2", name: "New", owner: { id: "owner-1" } }, CreateGuardItemEntity);
		const others = (): Array<Promise<unknown>> => [items.save({ id: "item-1", name: "Changed" }), dataSource.getRepository(CreateGuardOwnerEntity).save({ id: "owner-1", name: "Renamed" })];
		const results: Array<PromiseSettledResult<unknown>> = await Promise.allSettled(isCreateFirst ? [create(), ...others()] : [...others(), create()]);

		expect(results.map((result: PromiseSettledResult<unknown>): string => result.status)).toEqual(["fulfilled", "fulfilled", "fulfilled"]);
		expect(await items.findOneOrFail({ relations: { owner: true }, where: { id: "item-1" } })).toMatchObject({ name: "Changed", owner: { name: "Renamed" } });
		expect(await items.count()).toBe(2);
	});

	it("registers itself once on the DataSource of the repository", async () => {
		await ApiFunctionCreateInsertGuard.save(items, { id: "item-2", name: "New" }, CreateGuardItemEntity);
		await ApiFunctionCreateInsertGuard.save(items, { id: "item-3", name: "New" }, CreateGuardItemEntity);

		expect(dataSource.subscribers.filter((subscriber: unknown): boolean => subscriber instanceof ApiFunctionCreateInsertGuard)).toHaveLength(1);
	});
});

describe("ApiFunctionCreateInsertGuard keys", () => {
	let dataSource: DataSource;
	let bindings: Repository<CreateGuardBindingEntity>;
	let slots: Repository<CreateGuardSlotEntity>;

	const readBindings = async (): Promise<Array<Record<string, unknown>>> => (await bindings.find({ order: { sourceId: "ASC" }, withDeleted: true })).map((row: CreateGuardBindingEntity): Record<string, unknown> => ({ isDeleted: Boolean(row.deletedAt), kind: row.kind, label: row.label, sourceId: row.sourceId }));

	const expectRefused = async <E extends object>(repository: Repository<E>, properties: object, message: string, read: () => Promise<unknown>): Promise<void> => {
		const before: unknown = await read();
		const failure: unknown = await ApiFunctionCreateInsertGuard.save(repository, properties as never, repository.target as never).catch((error: unknown): unknown => error);

		expect(failure).toBeInstanceOf(ConflictException);
		expect((failure as ConflictException).getResponse()).toEqual({ details: { type: "UNIQUE_VIOLATION" }, error: "Conflict", message, statusCode: 409 });
		expect(await read()).toEqual(before);
	};

	beforeEach(async () => {
		dataSource = new DataSource({ database: ":memory:", entities: [CreateGuardBindingEntity, CreateGuardIdentityEntity, CreateGuardSlotEntity], synchronize: true, type: "better-sqlite3" });
		await dataSource.initialize();
		bindings = dataSource.getRepository(CreateGuardBindingEntity);
		slots = dataSource.getRepository(CreateGuardSlotEntity);
		await dataSource.getRepository(CreateGuardIdentityEntity).save([
			{ kind: ECreateGuardKind.ACCOUNT, name: "Stored", sourceId: "s-1" },
			{ kind: ECreateGuardKind.DEVICE, name: "Removed", sourceId: "s-2" },
			{ kind: ECreateGuardKind.ACCOUNT, name: "New", sourceId: "s-3" },
		]);
		await bindings.save([
			{ kind: ECreateGuardKind.ACCOUNT, label: "Stored", sourceId: "s-1" },
			{ kind: ECreateGuardKind.DEVICE, label: "Removed", sourceId: "s-2" },
		]);
		await bindings.softDelete({ kind: ECreateGuardKind.DEVICE, sourceId: "s-2" });
		await slots.save({ key: { code: "abc", region: "eu" }, name: "Stored", tenantId: "t-1" });
	});

	afterEach(async () => {
		await dataSource.destroy();
	});

	it.each([
		["the key columns", { kind: ECreateGuardKind.ACCOUNT, label: "New", sourceId: "s-3" }],
		["only the relation that joins them", { identity: { kind: ECreateGuardKind.ACCOUNT, sourceId: "s-3" }, label: "New" }],
		["the key columns and the relation", { identity: { kind: ECreateGuardKind.ACCOUNT, name: "New", sourceId: "s-3" }, kind: ECreateGuardKind.ACCOUNT, label: "New", sourceId: "s-3" }],
	])("reads the value of each key column a relation also joins from %s", (_name: string, row: object) => {
		expect(ApiFunctionCreateInsertGuard.readKey(bindings.metadata, row)).toEqual({ kind: ECreateGuardKind.ACCOUNT, sourceId: "s-3" });
	});

	it("reads a key column of the relation the row holds, which TypeORM writes, over its own property", () => {
		expect(ApiFunctionCreateInsertGuard.readKey(bindings.metadata, { identity: { kind: ECreateGuardKind.DEVICE, sourceId: "s-2" }, kind: ECreateGuardKind.ACCOUNT, sourceId: "s-3" })).toEqual({ kind: ECreateGuardKind.DEVICE, sourceId: "s-2" });
	});

	it("reads a key inside an embedded property under that property, before the column transformer", () => {
		expect(ApiFunctionCreateInsertGuard.readKey(slots.metadata, { key: { code: "ABC", region: "eu" }, name: "Slot", tenantId: "t-1" })).toEqual({ key: { code: "ABC", region: "eu" }, tenantId: "t-1" });
	});

	it.each([
		["a key column", { kind: ECreateGuardKind.ACCOUNT, label: "New" }],
		["a key column set to null", { kind: ECreateGuardKind.ACCOUNT, label: "New", sourceId: null }],
		["a key column of the relation", { identity: { kind: ECreateGuardKind.ACCOUNT }, label: "New" }],
	])("reads no key when the row misses %s", (_name: string, row: object) => {
		expect(ApiFunctionCreateInsertGuard.readKey(bindings.metadata, row)).toBeUndefined();
	});

	it("looks a key up by the scalar value of each column when a relation joins the key columns", async () => {
		const exists = vi.spyOn(bindings, "exists");

		await ApiFunctionCreateInsertGuard.save(bindings, { identity: { kind: ECreateGuardKind.ACCOUNT, sourceId: "s-3" }, label: "New" }, CreateGuardBindingEntity);

		expect(exists).toHaveBeenCalledWith({ where: { kind: ECreateGuardKind.ACCOUNT, sourceId: "s-3" }, withDeleted: true });
		expect(await readBindings()).toEqual([
			{ isDeleted: false, kind: ECreateGuardKind.ACCOUNT, label: "Stored", sourceId: "s-1" },
			{ isDeleted: true, kind: ECreateGuardKind.DEVICE, label: "Removed", sourceId: "s-2" },
			{ isDeleted: false, kind: ECreateGuardKind.ACCOUNT, label: "New", sourceId: "s-3" },
		]);
	});

	it.each([
		["the key columns of a stored row", { kind: ECreateGuardKind.ACCOUNT, label: "Changed", sourceId: "s-1" }],
		["the relation to a stored row", { identity: { kind: ECreateGuardKind.ACCOUNT, sourceId: "s-1" }, label: "Changed" }],
		["the key columns and the relation to a stored row", { identity: { kind: ECreateGuardKind.ACCOUNT, sourceId: "s-1" }, kind: ECreateGuardKind.ACCOUNT, label: "Changed", sourceId: "s-1" }],
		["the relation to a soft deleted row", { identity: { kind: ECreateGuardKind.DEVICE, sourceId: "s-2" }, label: "Changed" }],
	])("refuses a row named by %s before any write", async (_name: string, properties: object) => {
		await expectRefused(bindings, properties, "CREATEGUARDBINDINGENTITY_DUPLICATE_KEY", readBindings);
	});

	it("refuses an embedded key that the column transformer makes the stored one", async () => {
		await expectRefused(slots, { key: { code: "ABC", region: "eu" }, name: "Changed", tenantId: "t-1" }, "CREATEGUARDSLOTENTITY_DUPLICATE_KEY", async (): Promise<unknown> => await slots.find({ order: { tenantId: "ASC" } }));
	});

	it("inserts an embedded key that differs from the stored one", async () => {
		await ApiFunctionCreateInsertGuard.save(slots, { key: { code: "ABC", region: "us" }, name: "New", tenantId: "t-1" }, CreateGuardSlotEntity);

		expect(await slots.count()).toBe(2);
	});
});
