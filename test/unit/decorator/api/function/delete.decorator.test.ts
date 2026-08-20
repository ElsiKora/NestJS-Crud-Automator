import type { EntityManager, Repository } from "typeorm";

import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction/scope.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionDelete } from "@decorator/api/function/delete.decorator";
import { EApiFunctionType } from "@enum/decorator/api";
import { HttpStatus } from "@nestjs/common";
import { createTransactionFixture } from "@test/unit/fixture";
import { afterEach, describe, expect, it, vi } from "vitest";

class DeleteEntity {
	public id?: string;

	public name?: string;

	public payload?: Buffer;

	public status?: string;

	public tenantId?: string;
}

const buildDeleteService = (repository: Repository<DeleteEntity>) => {
	class DeleteService {
		public constructor(public repository: Repository<DeleteEntity>) {}

		@ApiFunctionDelete({ entity: DeleteEntity })
		public async delete(criteria: Partial<DeleteEntity>): Promise<DeleteEntity> {
			void criteria;

			return {};
		}
	}

	return new DeleteService(repository);
};

const buildQueryFailedError = (code: string, message: string) => ({
	driverError: { code, message },
	name: "QueryFailedError",
});

describe("ApiFunctionDelete", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("deletes existing entities", async () => {
		const repository = {
			findOne: vi.fn(async () => ({ id: "id-1", name: "old" })),
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await service.delete({ id: "id-1" });

		expect(repository.remove).toHaveBeenCalled();
		expect(result).toMatchObject({ id: "id-1", name: "old" });
	});

	it("keeps generated delete criteria and its internal GET inside the detached owner scope", async () => {
		const existingEntity: { ownerId: string } & DeleteEntity = { id: "id-required", name: "old", ownerId: "owner-required" };

		const repository = {
			findOne: vi.fn(async () => existingEntity),
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);
		const criteria = { id: "id-required", ownerId: "owner-required" };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockImplementation(async (_constructor, _entity, functionType) => {
			if (functionType === EApiFunctionType.DELETE) {
				return { id: "id-delete-foreign", ownerId: "owner-delete-foreign" };
			}

			if (functionType === EApiFunctionType.GET) {
				const prototype = { cache: { id: "shared-cross-owner", milliseconds: 60_000 } };
				const hostileProperties = Object.create(prototype) as { where: object };
				hostileProperties.where = { id: "id-get-foreign", ownerId: "owner-get-foreign" };

				return hostileProperties;
			}

			return;
		});
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.DELETE, criteria, criteria, async () => await service.delete(criteria));
		const findOptions = (repository.findOne as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0]?.[0];

		expect(Object.prototype.hasOwnProperty.call(findOptions, "cache")).toBe(true);
		expect(findOptions?.cache).toBe(false);
		expect(findOptions?.where).toMatchObject({
			id: { _type: "and", _value: [{ _value: "id-get-foreign" }, { _type: "and", _value: [{ _value: "id-delete-foreign" }, { _value: "id-required" }] }] },
			ownerId: { _type: "and", _value: [{ _value: "owner-get-foreign" }, { _type: "and", _value: [{ _value: "owner-delete-foreign" }, { _value: "owner-required" }] }] },
		});
		expect(repository.remove).toHaveBeenCalledWith(existingEntity);
		expect(result).toBe(existingEntity);
	});

	it.each(["unchanged", "narrowed", "missing"] as const)("keeps 40-branch generated delete scope linear for %s subscriber criteria", async (mode) => {
		const criteria: Array<Partial<DeleteEntity>> = Array.from({ length: 40 }, (_value: unknown, index: number): Partial<DeleteEntity> => ({ id: "id-required", tenantId: `tenant-${index}` }));
		const subscriberCriteria: Array<Partial<DeleteEntity>> = criteria.map((branch: Partial<DeleteEntity>, index: number): Partial<DeleteEntity> => {
			if (mode === "missing" && index === criteria.length - 1) {
				return { id: branch.id };
			}

			return mode === "narrowed" ? { ...branch, status: "active" } : branch;
		});
		const existingEntity: DeleteEntity = { id: "id-required", name: "old", status: "active", tenantId: "tenant-0" };
		const repository = {
			findOne: vi.fn(async () => existingEntity),
			metadata: { relations: [] },
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockImplementation(async (_constructor, _entity, functionType) => (functionType === EApiFunctionType.DELETE ? subscriberCriteria : undefined));
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.DELETE, criteria as never, criteria as never, async () => await service.delete(criteria as never));

		const findOptions = (repository.findOne as unknown as { mock: { calls: Array<[{ where: Array<Record<string, unknown>> }]> } }).mock.calls[0]?.[0];
		const protectedWhere: Array<Record<string, unknown>> = findOptions?.where ?? [];

		expect(protectedWhere).toHaveLength(mode === "missing" ? 1600 : 40);
		expect(protectedWhere.every((branch: Record<string, unknown>): boolean => Object.hasOwn(branch, "tenantId"))).toBe(true);

		if (mode === "narrowed") {
			expect(protectedWhere.every((branch: Record<string, unknown>): boolean => Object.hasOwn(branch, "status"))).toBe(true);
		}
	});

	it.each(["unchanged", "mutation"] as const)("%s Buffer data during protected generated delete hydration", async (mode) => {
		const existingEntity: DeleteEntity = { id: "id-required", name: "old", payload: Buffer.from([1, 2, 3]) };
		const repository = {
			findOne: vi.fn(async () => existingEntity),
			metadata: { relations: [] },
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);
		const criteria = { id: "id-required" };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockImplementation(async (_constructor, entity, functionType) => {
			if (mode === "mutation" && functionType === EApiFunctionType.GET) {
				(entity as DeleteEntity).payload![0] = 9;
			}

			return undefined;
		});

		const operation = ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.DELETE, criteria, criteria, async () => await service.delete(criteria));

		if (mode === "mutation") {
			await expect(operation).rejects.toMatchObject({ cause: { message: expect.stringContaining("changed the protected hydration entity") } });
			expect(repository.remove).not.toHaveBeenCalled();
		} else {
			await expect(operation).resolves.toMatchObject({ id: "id-required", name: "old", payload: Buffer.from([1, 2, 3]) });
			expect(repository.remove).toHaveBeenCalledOnce();
		}

		expect(existingEntity.payload).toEqual(Buffer.from([1, 2, 3]));
	});

	it.each(["mutation", "replacement"] as const)("rejects GET-after %s before a generated delete can remove", async (mode) => {
		const existingEntity: DeleteEntity = { id: "id-required", name: "old" };
		const foreignEntity: DeleteEntity = { id: "id-foreign", name: "foreign" };
		const repository = {
			findOne: vi.fn(async () => existingEntity),
			metadata: { relations: [] },
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);
		const criteria = { id: "id-required" };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockImplementation(async (_constructor, entity, functionType) => {
			if (functionType !== EApiFunctionType.GET) {
				return undefined;
			}

			if (mode === "replacement") {
				return foreignEntity;
			}

			(entity as DeleteEntity).id = "id-foreign";

			return undefined;
		});

		await expect(ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.DELETE, criteria, criteria, async () => await service.delete(criteria))).rejects.toMatchObject({
			cause: {
				message: expect.stringContaining("changed the protected hydration entity"),
			},
		});
		expect(repository.remove).not.toHaveBeenCalled();
		expect(existingEntity).toEqual({ id: "id-required", name: "old" });
	});

	it("uses the current service instance for each internal GET", async () => {
		const firstEntity: DeleteEntity = { id: "first", name: "first" };
		const secondEntity: DeleteEntity = { id: "second", name: "second" };
		const firstRepository = {
			findOne: vi.fn(async () => firstEntity),
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const secondRepository = {
			findOne: vi.fn(async () => secondEntity),
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const firstService = buildDeleteService(firstRepository);
		const ServiceConstructor = firstService.constructor as new (repository: Repository<DeleteEntity>) => typeof firstService;
		const secondService = new ServiceConstructor(secondRepository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await firstService.delete({ id: "first" });
		await secondService.delete({ id: "second" });

		expect(firstRepository.findOne).toHaveBeenCalledTimes(1);
		expect(secondRepository.findOne).toHaveBeenCalledTimes(1);
		expect(firstRepository.remove).toHaveBeenCalledWith(firstEntity);
		expect(secondRepository.remove).toHaveBeenCalledWith(secondEntity);
	});

	it("exposes the active transaction repository to DELETE before subscribers", async () => {
		const eventRepository = {
			findOne: vi.fn(async () => ({ id: "event", name: "event" })),
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const eventManager = {
			getRepository: vi.fn(() => eventRepository),
		} as unknown as EntityManager;
		const transaction = createTransactionFixture(eventManager);
		const repository = {
			findOne: vi.fn(async () => ({ id: "base", name: "base" })),
			manager: { connection: transaction.dataSource },
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);
		const before = vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await ApiFunctionTransactionScope.runWithDataSource(transaction.dataSource, { name: "delete" }, async () => await service.delete({ id: "event" }));

		const deleteCall = before.mock.calls.find(([, , functionType]) => functionType === EApiFunctionType.DELETE);
		const deleteContext = deleteCall?.[3] as { DATA: { repository: Repository<DeleteEntity> } } | undefined;

		expect(deleteContext?.DATA.repository).toBe(eventRepository);
		expect(eventRepository.findOne).toHaveBeenCalledOnce();
		expect(eventRepository.remove).toHaveBeenCalledOnce();
		expect(repository.findOne).not.toHaveBeenCalled();
		expect(repository.remove).not.toHaveBeenCalled();
	});

	it("throws not found when entity is missing", async () => {
		const repository = {
			findOne: vi.fn(async () => null),
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.delete({ id: "missing" })).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
	});

	it("throws when repository is missing", async () => {
		const service = buildDeleteService(undefined as unknown as Repository<DeleteEntity>);
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.delete({ id: "id-1" })).rejects.toThrow("Repository is not available in this context");
		expect(errorSpy).toHaveBeenCalled();
	});

	it("maps foreign key violations to bad request", async () => {
		const repository = {
			findOne: vi.fn(async () => ({ id: "id-1", name: "old" })),
			remove: vi.fn(async () => {
				throw buildQueryFailedError("23503", "violates foreign key constraint");
			}),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.delete({ id: "id-1" })).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
	});
});
