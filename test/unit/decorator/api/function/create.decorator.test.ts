import type { EntityManager, Repository } from "typeorm";

import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGeneratedInsertedKeyStorage } from "@class/api/controller/generated/inserted-key-storage.class";
import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated/read-scope-storage.class";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction/scope.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionCreate } from "@decorator/api/function/create.decorator";
import { EApiFunctionTransactionMode, EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { HttpStatus } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTransactionFixture } from "@test/unit/fixture";

class CreateEntity {
	public id?: string;
	public name?: string;
}

class CreateService {
	public constructor(public repository: Repository<CreateEntity>) {}

	@ApiFunctionCreate({ entity: CreateEntity })
	public async create(properties: Partial<CreateEntity>): Promise<CreateEntity> {
		void properties;

		return {} as CreateEntity;
	}
}

class NoneCreateService {
	public constructor(public repository: Repository<CreateEntity>) {}

	@ApiFunctionCreate({ entity: CreateEntity, transaction: { mode: EApiFunctionTransactionMode.NONE } })
	public async create(properties: Partial<CreateEntity>): Promise<CreateEntity> {
		void properties;

		return {} as CreateEntity;
	}
}

const buildQueryFailedError = (code: string, message: string) => ({
	driverError: { code, message },
	name: "QueryFailedError",
});

describe("ApiFunctionCreate", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("uses before/after subscribers and returns after result", async () => {
		const repository = {
			save: vi.fn(async (value: Partial<CreateEntity>) => ({ id: "id-1", ...value })),
		} as unknown as Repository<CreateEntity>;
		const service = new CreateService(repository);

		const subscriberSpy = vi
			.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers")
			.mockResolvedValueOnce({ name: "before" } as CreateEntity)
			.mockResolvedValueOnce({ id: "after", name: "after" } as CreateEntity);

		const result = await service.create({ name: "initial" } as CreateEntity);

		expect(repository.save).toHaveBeenCalledWith({ name: "before" });
		expect(result).toMatchObject({ id: "after", name: "after" });
		expect(subscriberSpy).toHaveBeenCalledTimes(2);
	});

	it("uses event manager repository when provided", async () => {
		const eventRepository = {
			save: vi.fn(async () => ({ id: "event" })),
		} as unknown as Repository<CreateEntity>;
		const eventManager = {
			getRepository: vi.fn(() => eventRepository),
		} as unknown as EntityManager;
		const { dataSource } = createTransactionFixture(eventManager);
		const repository = {
			manager: { dataSource },
			save: vi.fn(async () => ({ id: "repo" })),
		} as unknown as Repository<CreateEntity>;
		const service = new CreateService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "create" }, async () => await service.create({ name: "txn" } as CreateEntity));

		expect(eventRepository.save).toHaveBeenCalled();
		expect(repository.save).not.toHaveBeenCalled();
		expect(result).toMatchObject({ id: "event" });
	});

	it("marks a directly decorated create as the protected generated create function", () => {
		const service = new CreateService({} as Repository<CreateEntity>);

		expect(ApiControllerGeneratedFunctionCapability.resolve(service as never, "create", EApiFunctionType.CREATE, CreateEntity)).toBe(CreateService.prototype.create);
	});

	it("reports the saved row to a generated create before after subscribers replace the result", async () => {
		const repository = {
			metadata: { primaryColumns: [{ createValueMap: (value: unknown) => ({ id: value }), getEntityValue: (entity: Partial<CreateEntity>) => entity.id }] },
			save: vi.fn(async (value: Partial<CreateEntity>) => ({ id: "stored", ...value })),
		} as unknown as Repository<CreateEntity>;
		const service = new CreateService(repository);
		const input: Partial<CreateEntity> = { name: "initial" };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers")
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce({ id: "decoy", name: "decoy" } as CreateEntity);

		const insertedKey: object = await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.CREATE, input, undefined, async () => await ApiControllerGeneratedInsertedKeyStorage.run(input, async () => await service.create(input)));

		expect(insertedKey).toEqual({ id: "stored" });
	});

	it("binds the preflight error repository to the active transaction", async () => {
		const eventRepository = { name: "transaction" } as unknown as Repository<CreateEntity>;
		const eventManager = {
			getRepository: vi.fn(() => eventRepository),
		} as unknown as EntityManager;
		const { dataSource } = createTransactionFixture(eventManager);
		const repository = { manager: { dataSource }, name: "service" } as unknown as Repository<CreateEntity>;
		const service = new NoneCreateService(repository);
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "create" }, async () => await service.create({ name: "txn" } as CreateEntity))).rejects.toThrow("ApiFunction transaction mode NONE cannot run inside an active transaction");
		expect(errorSpy).toHaveBeenCalledWith(NoneCreateService, expect.any(CreateEntity), EApiFunctionType.CREATE, EApiSubscriberOnType.BEFORE_ERROR, expect.objectContaining({ DATA: { eventManager, repository: eventRepository } }), expect.any(Error));
	});

	it("throws when repository is missing", async () => {
		const service = new CreateService(undefined as unknown as Repository<CreateEntity>);
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.create({ name: "missing" } as CreateEntity)).rejects.toThrow("Repository is not available in this context");
		expect(errorSpy).toHaveBeenCalled();
	});

	it("maps unique constraint violations to conflict", async () => {
		const repository = {
			save: vi.fn(async () => {
				throw buildQueryFailedError("SQLITE_CONSTRAINT", "UNIQUE constraint failed");
			}),
		} as unknown as Repository<CreateEntity>;
		const service = new CreateService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.create({ name: "dup" } as CreateEntity)).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
	});

	it("maps foreign key violations to bad request", async () => {
		const repository = {
			save: vi.fn(async () => {
				throw buildQueryFailedError("23503", "violates foreign key constraint");
			}),
		} as unknown as Repository<CreateEntity>;
		const service = new CreateService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.create({ name: "bad-ref" } as CreateEntity)).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
	});
});
