import type { EntityManager, FindOneOptions, Repository } from "typeorm";

import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated";
import { ApiControllerGeneratedRelationCacheContract } from "@class/api/controller/generated/relation-cache-contract.class";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction/scope.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionGet } from "@decorator/api/function/get/decorator";
import { EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { HttpStatus, NotFoundException } from "@nestjs/common";
import { Equal } from "typeorm";
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

	it("captures the protected effective projection after BEFORE and before the initial query", async () => {
		const request = { where: { id: "id-required" } };
		const options: FindOneOptions<GetEntity> = { select: { id: true }, where: { name: "allowed" } };
		let captured: FindOneOptions<GetEntity> | undefined;
		const findOne = vi.fn(async (properties: FindOneOptions<GetEntity>) => {
			expect(captured).toEqual(properties);
			expect(captured).not.toBe(properties);
			(options.select as { id: boolean }).id = false;
			return { id: "id-required" };
		});
		const service = new GetService({ findOne } as unknown as Repository<GetEntity>);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(options);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await ApiControllerGeneratedReadScopeStorage.runWriteHydration(
			request,
			request.where,
			async () => await service.get(request),
			(properties) => {
				captured = properties;
			},
		);

		expect(findOne).toHaveBeenCalledOnce();
		expect(captured).toMatchObject({ cache: false, select: { id: true }, where: { id: Equal("id-required"), name: Equal("allowed") } });
	});

	it("reports capture validation through protected GET BEFORE_ERROR without querying", async () => {
		const request = { where: { id: "id-required" } };
		const repository = { findOne: vi.fn() } as unknown as Repository<GetEntity>;
		const service = new GetService(repository);
		const error = new Error("invalid PATCH projection");
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		const errors = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(
			ApiControllerGeneratedReadScopeStorage.runWriteHydration(
				request,
				request.where,
				async () => await service.get(request),
				() => {
					throw error;
				},
			),
		).rejects.toBe(error);
		expect(repository.findOne).not.toHaveBeenCalled();
		expect(errors).toHaveBeenCalledOnce();
		expect(errors.mock.calls[0]?.[3]).toBe(EApiSubscriberOnType.BEFORE_ERROR);
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
		const eventRepository = {
			findOne: vi.fn(async () => ({ id: "id-2", name: "event" })),
		} as unknown as Repository<GetEntity>;
		const eventManager = {
			getRepository: vi.fn(() => eventRepository),
		} as unknown as EntityManager;
		const { dataSource } = createTransactionFixture(eventManager);
		const repository = {
			findOne: vi.fn(async () => ({ id: "id-1", name: "direct" })),
			manager: { dataSource },
		} as unknown as Repository<GetEntity>;
		const service = new GetService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "get" }, async () => await service.get({ where: { id: "id-2" } }));

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

	it("reports only the repository miss of the generated read input", async () => {
		const request = { where: { id: "missing" } };
		const service = new GetService({ findOne: vi.fn(async () => null) } as unknown as Repository<GetEntity>);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(
			ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, request, request.where, async () => {
				await expect(service.get({ where: { id: "nested" } })).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
				expect(ApiControllerGeneratedReadScopeStorage.isReadMissed(request)).toBe(false);

				await expect(service.get(request)).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
				expect(ApiControllerGeneratedReadScopeStorage.isReadMissed(request)).toBe(true);
				expect(ApiControllerGeneratedReadScopeStorage.isReadMissed({})).toBe(false);

				return "checked";
			}),
		).resolves.toBe("checked");
	});

	it("keeps the 404 of a direct miss that has no input", async () => {
		const service = new GetService({ findOne: vi.fn(async () => null) } as unknown as Repository<GetEntity>);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue({ where: { id: "missing" } });

		await expect(service.get(undefined as never)).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
	});

	it.each([
		["BEFORE", "executeFunctionBeforeSubscribers"],
		["AFTER", "executeFunctionSubscribers"],
	] as const)("does not report a 404 raised by a %s subscriber as a read miss", async (_onType: string, executor: "executeFunctionBeforeSubscribers" | "executeFunctionSubscribers") => {
		const request = { where: { id: "found" } };
		const service = new GetService({ findOne: vi.fn(async () => ({ id: "found" })) } as unknown as Repository<GetEntity>);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, executor).mockRejectedValue(new NotFoundException());

		await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, request, request.where, async () => {
			await expect(service.get(request)).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
			expect(ApiControllerGeneratedReadScopeStorage.isReadMissed(request)).toBe(false);
		});
	});

	it("throws when repository is missing", async () => {
		const service = new GetService(undefined as unknown as Repository<GetEntity>);
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.get({ where: { id: "id-1" } })).rejects.toThrow("Repository is not available in this context");
		expect(errorSpy).toHaveBeenCalled();
	});
});
