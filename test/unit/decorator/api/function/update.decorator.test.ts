import type { TApiSubscriberFunctionBeforeUpdateContext } from "@type/class/api/subscriber/function/before/update-context.type";
import type { EntityManager, Repository } from "typeorm";

import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionUpdate } from "@decorator/api/function/update.decorator";
import { EApiFunctionTransactionMode, EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { HttpStatus } from "@nestjs/common";
import { createTransactionFixture } from "@test/unit/fixture";
import { afterEach, describe, expect, it, vi } from "vitest";

class UpdateEntity {
	public count?: number;

	public id?: string;

	public metadata?: { label: string };

	public name?: string;

	public payload?: Buffer;

	public status?: string;

	public tenantId?: string;
}

const buildUpdateService = (repository: Repository<UpdateEntity>, transactionMode: EApiFunctionTransactionMode = EApiFunctionTransactionMode.SUPPORTS) => {
	class UpdateService {
		public constructor(public repository: Repository<UpdateEntity>) {}

		@ApiFunctionUpdate({ entity: UpdateEntity, transaction: { mode: transactionMode } })
		public async update(criteria: Partial<UpdateEntity>, properties: Partial<UpdateEntity>): Promise<UpdateEntity> {
			void criteria;
			void properties;

			return {};
		}
	}

	return new UpdateService(repository);
};

const buildQueryFailedError = (code: string, message: string) => ({
	driverError: { code, message },
	name: "QueryFailedError",
});

describe("ApiFunctionUpdate", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("loads one frozen current-entity snapshot before update subscribers and reuses the internal original", async () => {
		const lifecycle: Array<string> = [];
		const metadata: { label: string } = { label: "nested" };
		let mutationError: unknown;
		const existingEntity: UpdateEntity = { count: 1, id: "id-1", metadata, name: "old" };
		const updateProperties: { extra: string } & Partial<UpdateEntity> = { extra: "ignored", name: "new" };

		const repository = {
			findOne: vi.fn(async () => {
				lifecycle.push("get:query");

				return existingEntity;
			}),
			save: vi.fn(async (value: UpdateEntity) => {
				lifecycle.push("update:save");

				return value;
			}),
		} as unknown as Repository<UpdateEntity>;
		const service = buildUpdateService(repository);

		const beforeSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockImplementation(async (_constructor, _entity, functionType, context) => {
			lifecycle.push(`${functionType}:before`);

			if (functionType === EApiFunctionType.UPDATE) {
				const updateContext = context as TApiSubscriberFunctionBeforeUpdateContext<UpdateEntity>;

				try {
					(updateContext.DATA.currentEntity as UpdateEntity).name = "mutated";
				} catch (error) {
					mutationError = error;
				}
			}

			return;
		});
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockImplementation(async (_constructor, _entity, functionType) => {
			lifecycle.push(`${functionType}:after`);

			return;
		});

		const result = await service.update({ id: "id-1" }, updateProperties);
		const updateCall = beforeSpy.mock.calls.find(([, , functionType]) => functionType === EApiFunctionType.UPDATE);
		const updateContext = updateCall?.[3] as TApiSubscriberFunctionBeforeUpdateContext<UpdateEntity> | undefined;
		const currentEntity: Readonly<UpdateEntity> | undefined = updateContext?.DATA.currentEntity;

		const savedCall = (repository.save as unknown as { mock: { calls: Array<[UpdateEntity]> } }).mock.calls[0];
		const saved = savedCall?.[0]!;
		expect(lifecycle).toEqual(["get:before", "get:query", "get:after", "update:before", "update:save", "update:after"]);
		expect(repository.findOne).toHaveBeenCalledTimes(1);
		expect(repository.findOne).toHaveBeenCalledWith({ where: { id: "id-1" } });
		expect(updateContext?.result).toBe(updateProperties);
		expect(updateContext?.DATA.eventManager).toBeUndefined();
		expect(updateContext?.DATA.repository).toBe(repository);
		expect(currentEntity).toEqual(existingEntity);
		expect(currentEntity).not.toBe(existingEntity);
		expect(Object.isFrozen(currentEntity)).toBe(true);
		expect(currentEntity?.metadata).toBe(metadata);
		expect(Object.isFrozen(currentEntity?.metadata)).toBe(false);
		expect(mutationError).toBeInstanceOf(TypeError);
		expect(existingEntity.name).toBe("old");
		expect(saved).toMatchObject({ count: 1, id: "id-1", metadata, name: "new" });
		expect(saved).not.toHaveProperty("extra");
		expect(saved).not.toBe(existingEntity);
		expect(saved).not.toBe(currentEntity);
		expect(result).toMatchObject({ id: "id-1", name: "new" });
	});

	it("merges a subscriber-replaced patch into the already loaded internal original", async () => {
		const existingEntity: UpdateEntity = { count: 1, id: "id-1", name: "old" };

		const repository = {
			findOne: vi.fn(async () => existingEntity),
			save: vi.fn(async (value: UpdateEntity) => value),
		} as unknown as Repository<UpdateEntity>;
		const service = buildUpdateService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockImplementation(async (_constructor, _entity, functionType) => (functionType === EApiFunctionType.UPDATE ? { count: 2, name: "subscriber" } : undefined));
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await service.update({ id: "id-1" }, { name: "incoming" });

		expect(repository.findOne).toHaveBeenCalledTimes(1);
		expect(repository.save).toHaveBeenCalledWith({ count: 2, id: "id-1", name: "subscriber" });
	});

	it("keeps a generated update internal GET inside its detached owner scope and strips inherited cache ids", async () => {
		const existingEntity: { ownerId: string } & UpdateEntity = { id: "id-required", name: "old", ownerId: "owner-required" };

		const repository = {
			findOne: vi.fn(async () => existingEntity),
			save: vi.fn(async (value: UpdateEntity) => value),
		} as unknown as Repository<UpdateEntity>;
		const service = buildUpdateService(repository);
		const criteria = { id: "id-required", ownerId: "owner-required" };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockImplementation(async (_constructor, _entity, functionType) => {
			if (functionType !== EApiFunctionType.GET) {
				return;
			}

			const prototype = { cache: { id: "shared-cross-owner", milliseconds: 60_000 } };
			const hostileProperties = Object.create(prototype) as { where: object };
			hostileProperties.where = { id: "id-foreign", ownerId: "owner-foreign" };

			return hostileProperties;
		});
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.UPDATE, criteria, criteria, async () => await service.update(criteria, { name: "new" }));
		const findOptions = (repository.findOne as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0]?.[0];

		expect(Object.prototype.hasOwnProperty.call(findOptions, "cache")).toBe(true);
		expect(findOptions?.cache).toBe(false);
		expect(findOptions?.where).toMatchObject({
			id: { _type: "and", _value: [{ _value: "id-foreign" }, { _value: "id-required" }] },
			ownerId: { _type: "and", _value: [{ _value: "owner-foreign" }, { _value: "owner-required" }] },
		});
		expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ id: "id-required", name: "new", ownerId: "owner-required" }));
		expect(result).toMatchObject({ id: "id-required", ownerId: "owner-required" });
	});

	it.each(["unchanged", "narrowed", "missing"] as const)("keeps 40-branch generated update scope linear for %s subscriber criteria", async (mode) => {
		const criteria: Array<Partial<UpdateEntity>> = Array.from({ length: 40 }, (_value: unknown, index: number): Partial<UpdateEntity> => ({ id: "id-required", tenantId: `tenant-${index}` }));
		const subscriberCriteria: Array<Partial<UpdateEntity>> = criteria.map((branch: Partial<UpdateEntity>, index: number): Partial<UpdateEntity> => {
			if (mode === "missing" && index === criteria.length - 1) {
				return { id: branch.id };
			}

			return mode === "narrowed" ? { ...branch, status: "active" } : branch;
		});
		const existingEntity: UpdateEntity = { id: "id-required", name: "old", status: "active", tenantId: "tenant-0" };
		const repository = {
			findOne: vi.fn(async () => existingEntity),
			metadata: { relations: [] },
			save: vi.fn(async (value: UpdateEntity) => value),
		} as unknown as Repository<UpdateEntity>;
		const service = buildUpdateService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockImplementation(async (_constructor, _entity, functionType) => (functionType === EApiFunctionType.GET ? { where: subscriberCriteria } : undefined));
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.UPDATE, criteria as never, criteria as never, async () => await service.update(criteria as never, { name: "new" }));

		const findOptions = (repository.findOne as unknown as { mock: { calls: Array<[{ where: Array<Record<string, unknown>> }]> } }).mock.calls[0]?.[0];
		const protectedWhere: Array<Record<string, unknown>> = findOptions?.where ?? [];

		expect(protectedWhere).toHaveLength(mode === "missing" ? 1600 : 40);
		expect(protectedWhere.every((branch: Record<string, unknown>): boolean => Object.hasOwn(branch, "tenantId"))).toBe(true);

		if (mode === "narrowed") {
			expect(protectedWhere.every((branch: Record<string, unknown>): boolean => Object.hasOwn(branch, "status"))).toBe(true);
		}
	});

	it.each(["unchanged", "mutation"] as const)("%s Buffer data during protected generated update hydration", async (mode) => {
		const existingEntity: UpdateEntity = { id: "id-required", name: "old", payload: Buffer.from([1, 2, 3]) };
		const repository = {
			findOne: vi.fn(async () => existingEntity),
			metadata: { relations: [] },
			save: vi.fn(async (value: UpdateEntity) => value),
		} as unknown as Repository<UpdateEntity>;
		const service = buildUpdateService(repository);
		const criteria = { id: "id-required" };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockImplementation(async (_constructor, entity, functionType) => {
			if (mode === "mutation" && functionType === EApiFunctionType.GET) {
				(entity as UpdateEntity).payload![0] = 9;
			}

			return undefined;
		});

		const operation = ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.UPDATE, criteria, criteria, async () => await service.update(criteria, { name: "new" }));

		if (mode === "mutation") {
			await expect(operation).rejects.toMatchObject({ cause: { message: expect.stringContaining("changed the protected hydration entity") } });
			expect(repository.save).not.toHaveBeenCalled();
		} else {
			await expect(operation).resolves.toMatchObject({ id: "id-required", name: "new", payload: Buffer.from([1, 2, 3]) });
			expect(repository.save).toHaveBeenCalledOnce();
		}

		expect(existingEntity.payload).toEqual(Buffer.from([1, 2, 3]));
	});

	it.each(["mutation", "replacement"] as const)("rejects GET-after %s before a generated update can save", async (mode) => {
		const existingEntity: UpdateEntity = { id: "id-required", name: "old" };
		const foreignEntity: UpdateEntity = { id: "id-foreign", name: "foreign" };
		const repository = {
			findOne: vi.fn(async () => existingEntity),
			metadata: { relations: [] },
			save: vi.fn(async (value: UpdateEntity) => value),
		} as unknown as Repository<UpdateEntity>;
		const service = buildUpdateService(repository);
		const criteria = { id: "id-required" };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockImplementation(async (_constructor, entity, functionType) => {
			if (functionType !== EApiFunctionType.GET) {
				return undefined;
			}

			if (mode === "replacement") {
				return foreignEntity;
			}

			(entity as UpdateEntity).id = "id-foreign";

			return undefined;
		});

		await expect(ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.UPDATE, criteria, criteria, async () => await service.update(criteria, { name: "new" }))).rejects.toMatchObject({
			cause: {
				message: expect.stringContaining("changed the protected hydration entity"),
			},
		});
		expect(repository.save).not.toHaveBeenCalled();
		expect(existingEntity).toEqual({ id: "id-required", name: "old" });
	});

	it("uses the active transaction manager repository for load, subscriber data, and save", async () => {
		const existingEntity: UpdateEntity = { count: 1, id: "id-1", name: "uncommitted" };

		const eventRepository = {
			findOne: vi.fn(async () => existingEntity),
			save: vi.fn(async (value: UpdateEntity) => value),
		} as unknown as Repository<UpdateEntity>;

		const eventManager = {
			getRepository: vi.fn(() => eventRepository),
		} as unknown as EntityManager;
		const transaction = createTransactionFixture(eventManager);

		const repository = {
			findOne: vi.fn(async () => ({ id: "base", name: "stale" })),
			manager: { connection: transaction.dataSource },
			save: vi.fn(async (value: UpdateEntity) => value),
		} as unknown as Repository<UpdateEntity>;
		const service = buildUpdateService(repository, EApiFunctionTransactionMode.REQUIRED);
		const beforeSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await service.update({ id: "id-1" }, { count: 2 });
		const getCall = beforeSpy.mock.calls.find(([, , functionType]) => functionType === EApiFunctionType.GET);
		const updateCall = beforeSpy.mock.calls.find(([, , functionType]) => functionType === EApiFunctionType.UPDATE);
		const getContext = getCall?.[3] as { DATA: { eventManager?: EntityManager; repository: Repository<UpdateEntity> } } | undefined;
		const updateContext = updateCall?.[3] as TApiSubscriberFunctionBeforeUpdateContext<UpdateEntity> | undefined;

		expect(transaction.dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
		expect(transaction.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		expect(eventRepository.findOne).toHaveBeenCalledTimes(1);
		expect(eventRepository.save).toHaveBeenCalledWith({ count: 2, id: "id-1", name: "uncommitted" });
		expect(repository.findOne).not.toHaveBeenCalled();
		expect(repository.save).not.toHaveBeenCalled();
		expect(getContext?.DATA.eventManager).toBe(eventManager);
		expect(getContext?.DATA.repository).toBe(eventRepository);
		expect(updateContext?.DATA.eventManager).toBe(eventManager);
		expect(updateContext?.DATA.repository).toBe(eventRepository);
		expect(updateContext?.DATA.currentEntity).toMatchObject(existingEntity);
		expect(result).toMatchObject({ count: 2, id: "id-1", name: "uncommitted" });
	});

	it("runs get then update error lifecycle without invoking update-before when the row is missing", async () => {
		const lifecycle: Array<string> = [];

		const repository = {
			findOne: vi.fn(async () => null),
			save: vi.fn(async (value: UpdateEntity) => value),
		} as unknown as Repository<UpdateEntity>;
		const service = buildUpdateService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockImplementation(async (_constructor, _entity, functionType) => {
			lifecycle.push(`${functionType}:${EApiSubscriberOnType.BEFORE}`);

			return;
		});
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockImplementation(async (_constructor, _entity, functionType, onType) => {
			lifecycle.push(`${functionType}:${onType}`);
		});

		await expect(service.update({ id: "missing" }, { name: "new" })).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });

		expect(lifecycle).toEqual(["get:Before", "get:AfterError", "update:AfterError"]);
		expect(lifecycle).not.toContain("update:Before");
		expect(repository.findOne).toHaveBeenCalledTimes(1);
		expect(repository.save).not.toHaveBeenCalled();
	});

	it("throws when repository is missing", async () => {
		const service = buildUpdateService(undefined as unknown as Repository<UpdateEntity>);
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.update({ id: "id-1" }, { name: "new" })).rejects.toThrow("Repository is not available in this context");
		expect(errorSpy).toHaveBeenCalled();
	});

	it("maps unique constraint violations to conflict", async () => {
		const repository = {
			findOne: vi.fn(async () => ({ id: "id-1", name: "old" })),
			save: vi.fn(async () => {
				throw buildQueryFailedError("SQLITE_CONSTRAINT", "UNIQUE constraint failed");
			}),
		} as unknown as Repository<UpdateEntity>;
		const service = buildUpdateService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.update({ id: "id-1" }, { name: "dup" })).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
	});

	it("maps foreign key violations to bad request", async () => {
		const repository = {
			findOne: vi.fn(async () => ({ id: "id-1", name: "old" })),
			save: vi.fn(async () => {
				throw buildQueryFailedError("23503", "violates foreign key constraint");
			}),
		} as unknown as Repository<UpdateEntity>;
		const service = buildUpdateService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.update({ id: "id-1" }, { name: "bad-ref" })).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
	});
});
