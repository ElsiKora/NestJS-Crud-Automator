import type { EntityManager, FindOneOptions, Repository } from "typeorm";

import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated";
import { ApiControllerGeneratedRelationCacheContract } from "@class/api/controller/generated/relation-cache-contract.class";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction/scope.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionGet } from "@decorator/api/function/get/decorator";
import { EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { HttpStatus } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTransactionFixture } from "@test/unit/fixture";

class GetEntity {
	public id?: string;
	public name?: string;
}

class GetService {
	public constructor(public repository: Repository<GetEntity>) {}

	@ApiFunctionGet({ entity: GetEntity })
	public async get(properties: { where?: Partial<GetEntity> }): Promise<GetEntity> {
		void properties;

		return {} as GetEntity;
	}
}

describe("ApiFunctionGet", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns entities when found", async () => {
		const repository = {
			findOne: vi.fn(async () => ({ id: "id-1", name: "found" })),
		} as unknown as Repository<GetEntity>;
		const service = new GetService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await service.get({ where: { id: "id-1" } });

		expect(result).toMatchObject({ id: "id-1", name: "found" });
	});

	it("reapplies generated-route criteria after a before-subscriber replaces GET options", async () => {
		const findOne = vi.fn(async (_options: FindOneOptions<GetEntity>) => ({ id: "id-required", name: "found" }));
		const repository = {
			findOne,
		} as unknown as Repository<GetEntity>;
		const service = new GetService(repository);
		const request = { where: { id: "id-required" } };
		const subscriberResult = Object.assign(Object.create({ cache: { id: "shared-generated-read" } }) as FindOneOptions<GetEntity>, { where: { id: "id-foreign" } });

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(subscriberResult);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, request, request.where, async () => await service.get(request));

		const protectedWhere = findOne.mock.calls[0]?.[0].where as Record<string, unknown>;

		expect(protectedWhere.id).toMatchObject({
			_type: "and",
			_value: [
				{ _type: "equal", _value: "id-foreign" },
				{ _type: "equal", _value: "id-required" },
			],
		});
		expect(findOne.mock.calls[0]?.[0].cache).toBe(false);
		expect(Object.hasOwn(findOne.mock.calls[0]?.[0] ?? {}, "cache")).toBe(true);

		findOne.mockClear();
		await service.get({ where: { id: "id-direct" } });

		expect(findOne.mock.calls[0]?.[0].cache).toEqual({ id: "shared-generated-read" });
		expect(findOne.mock.calls[0]?.[0].where).toEqual({ id: "id-foreign" });
	});

	it("dispatches protected GET setup failures exactly once through BEFORE_ERROR", async () => {
		const findOne = vi.fn(async () => ({ id: "id-required", name: "found" }));
		const repository = { findOne } as unknown as Repository<GetEntity>;
		const service = new GetService(repository);
		const request = { where: { id: "id-required" } };
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		vi.spyOn(ApiControllerGeneratedRelationCacheContract, "assertSafe").mockImplementation(() => {
			throw new Error("generated GET setup failed");
		});

		await expect(ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, request, request.where, async () => await service.get(request))).rejects.toThrow("generated GET setup failed");
		expect(errorSpy).toHaveBeenCalledTimes(1);
		expect(errorSpy.mock.calls[0]?.[3]).toBe(EApiSubscriberOnType.BEFORE_ERROR);
		expect(findOne).not.toHaveBeenCalled();
	});

	it("uses event manager repository when provided", async () => {
		const repository = {
			findOne: vi.fn(async () => ({ id: "id-1", name: "direct" })),
		} as unknown as Repository<GetEntity>;
		const eventRepository = {
			findOne: vi.fn(async () => ({ id: "id-2", name: "event" })),
		} as unknown as Repository<GetEntity>;
		const eventManager = {
			getRepository: vi.fn(() => eventRepository),
		} as unknown as EntityManager;
		const service = new GetService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await ApiFunctionTransactionScope.runWithDataSource(createTransactionFixture(eventManager).dataSource, { name: "get" }, async () => await service.get({ where: { id: "id-2" } }));

		expect(eventManager.getRepository).toHaveBeenCalledWith(GetEntity);
		expect(eventRepository.findOne).toHaveBeenCalledWith({ where: { id: "id-2" } });
		expect(repository.findOne).not.toHaveBeenCalled();
		expect(result).toMatchObject({ id: "id-2", name: "event" });
	});

	it("allows metadata-proven TypeORM lazy relation accessors during protected mutation hydration", async () => {
		const item: GetEntity = { id: "id-1", name: "found" };
		Object.defineProperty(item, "owner", {
			configurable: true,
			enumerable: false,
			get: (): Promise<GetEntity> => Promise.resolve({ id: "owner-1" }),
			set: (): void => undefined,
		});
		const repository = {
			findOne: vi.fn(async () => item),
			metadata: {
				relations: [{ isLazy: true, propertyName: "owner" }],
			},
		} as unknown as Repository<GetEntity>;
		const service = new GetService(repository);
		const request = { where: { id: "id-1" } };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await expect(ApiControllerGeneratedReadScopeStorage.runWriteHydration(request, request.where, async () => await service.get(request))).resolves.toBe(item);
	});

	it("rejects unproven accessors and raw alias mutations during protected mutation hydration", async () => {
		const item: GetEntity = { id: "id-1", name: "found" };
		Object.defineProperty(item, "computed", {
			configurable: true,
			enumerable: false,
			get: (): string => "unsafe",
		});
		const repository = {
			findOne: vi.fn(async () => item),
			metadata: {
				relations: [],
			},
		} as unknown as Repository<GetEntity>;
		const service = new GetService(repository);
		const request = { where: { id: "id-1" } };
		const afterSubscriber = vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await expect(ApiControllerGeneratedReadScopeStorage.runWriteHydration(request, request.where, async () => await service.get(request))).rejects.toMatchObject({
			cause: {
				message: expect.stringContaining("must contain data properties only"),
			},
		});
		expect(afterSubscriber.mock.calls.some((call): boolean => call[3] === EApiSubscriberOnType.AFTER)).toBe(false);

		Reflect.deleteProperty(item, "computed");
		afterSubscriber.mockClear();
		afterSubscriber.mockImplementation(async (...arguments_) => {
			if (arguments_[3] === EApiSubscriberOnType.AFTER) {
				item.id = "foreign";
			}

			return undefined;
		});

		await expect(ApiControllerGeneratedReadScopeStorage.runWriteHydration(request, request.where, async () => await service.get(request))).rejects.toMatchObject({
			cause: {
				message: expect.stringContaining("changed the protected hydration entity"),
			},
		});
	});

	it("throws not found when entity is missing", async () => {
		const repository = {
			findOne: vi.fn(async () => null),
		} as unknown as Repository<GetEntity>;
		const service = new GetService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.get({ where: { id: "missing" } })).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
	});

	it("throws when repository is missing", async () => {
		const service = new GetService(undefined as unknown as Repository<GetEntity>);
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.get({ where: { id: "id-1" } })).rejects.toThrow("Repository is not available in this context");
		expect(errorSpy).toHaveBeenCalled();
	});
});
