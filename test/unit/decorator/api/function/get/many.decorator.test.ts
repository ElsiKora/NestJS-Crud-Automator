import type { FindManyOptions, Repository } from "typeorm";

import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated";
import { ApiControllerGeneratedGetManyContract } from "@class/api/controller/generated/get-many-contract.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionGetMany } from "@decorator/api/function/get/many.decorator";
import { EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Equal, MoreThan, Raw } from "typeorm";

class GetManyEntity {
	public id?: string;
	public name?: string;
}

class GetManyService {
	public constructor(public repository: Repository<GetManyEntity>) {}

	@ApiFunctionGetMany({ entity: GetManyEntity })
	public async getMany(properties: { where: Array<Partial<GetManyEntity>> | Partial<GetManyEntity> }): Promise<Array<GetManyEntity>> {
		void properties;

		return [];
	}
}

function createGeneratedRepository(find: Repository<GetManyEntity>["find"]): Repository<GetManyEntity> {
	return {
		find,
		manager: { connection: { subscribers: [] } },
		metadata: { afterLoadListeners: [], target: GetManyEntity },
	} as unknown as Repository<GetManyEntity>;
}

describe("ApiFunctionGetMany", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns multiple entities", async () => {
		const repository = {
			find: vi.fn(async () => [{ id: "id-1" }, { id: "id-2" }]),
		} as unknown as Repository<GetManyEntity>;
		const service = new GetManyService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await service.getMany({ where: { id: "id-1" } });

		expect(result).toHaveLength(2);
	});

	it("returns an empty list when no entities match", async () => {
		const repository = {
			find: vi.fn(async () => []),
		} as unknown as Repository<GetManyEntity>;
		const service = new GetManyService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.getMany({ where: { id: "missing" } })).resolves.toEqual([]);
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it("does not add BEFORE_ERROR dispatch for a direct GET_MANY before-subscriber failure", async () => {
		const repository = createGeneratedRepository(vi.fn(async () => []));
		const service = new GetManyService(repository);
		const beforeError = new Error("direct-before-error");
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockRejectedValue(beforeError);

		await expect(service.getMany({ where: { id: "direct" } })).rejects.toBe(beforeError);
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it("preserves direct GET_MANY repository rebinding performed by a before subscriber", async () => {
		const originalFind = vi.fn(async () => [{ id: "original" }]);
		const replacementFind = vi.fn(async () => [{ id: "replacement" }]);
		const service = new GetManyService({ find: originalFind } as unknown as Repository<GetManyEntity>);
		const replacementRepository = { find: replacementFind } as unknown as Repository<GetManyEntity>;

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockImplementation(async () => {
			service.repository = replacementRepository;

			return undefined;
		});
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await expect(service.getMany({ where: { id: "direct" } })).resolves.toEqual([{ id: "replacement" }]);
		expect(originalFind).not.toHaveBeenCalled();
		expect(replacementFind).toHaveBeenCalledOnce();
	});

	it("preserves the direct GET_MANY truthy AFTER replacement rule", async () => {
		const items: Array<GetManyEntity> = [{ id: "stored" }];
		const service = new GetManyService({ find: vi.fn(async () => items) } as unknown as Repository<GetManyEntity>);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(false as never);

		await expect(service.getMany({ where: { id: "direct" } })).resolves.toBe(items);
	});

	it("reapplies generated cursor predicates after a before-subscriber replaces GET_MANY options", async () => {
		const find = vi.fn(async (_options?: FindManyOptions<GetManyEntity>) => [] as Array<GetManyEntity>);
		const repository = createGeneratedRepository(find);
		const service = new GetManyService(repository);
		const request = { order: { id: "ASC" as const }, take: 11, where: { name: "required-window" } };
		const subscriberResult = Object.assign(Object.create({ cache: { id: "shared-generated-many" }, join: { alias: "generated" }, lock: { mode: "pessimistic_read" }, select: { name: true }, skip: 7, withDeleted: true }) as FindManyOptions<GetManyEntity>, { order: { name: "DESC" as const }, take: 1, where: { name: "foreign-window" } });

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(subscriberResult);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_MANY, request, request.where, async () => await service.getMany(request));

		const protectedWhere = find.mock.calls[0]?.[0]?.where as Record<string, unknown>;

		expect(protectedWhere.name).toMatchObject({
			_type: "and",
			_value: [
				{ _type: "equal", _value: "foreign-window" },
				{ _type: "equal", _value: "required-window" },
			],
		});
		expect(find.mock.calls[0]?.[0]).toMatchObject({ order: { id: "ASC" }, take: 11 });
		expect(find.mock.calls[0]?.[0]?.cache).toBe(false);
		expect(find.mock.calls[0]?.[0]?.join).toBeUndefined();
		expect(find.mock.calls[0]?.[0]?.lock).toBeUndefined();
		expect(find.mock.calls[0]?.[0]?.select).toBeUndefined();
		expect(find.mock.calls[0]?.[0]?.skip).toBeUndefined();
		expect(find.mock.calls[0]?.[0]?.withDeleted).toBeUndefined();
		expect(Object.hasOwn(find.mock.calls[0]?.[0] ?? {}, "cache")).toBe(true);
		expect(Object.hasOwn(find.mock.calls[0]?.[0] ?? {}, "join")).toBe(true);
		expect(Object.hasOwn(find.mock.calls[0]?.[0] ?? {}, "lock")).toBe(true);
		expect(Object.hasOwn(find.mock.calls[0]?.[0] ?? {}, "select")).toBe(true);
		expect(Object.hasOwn(find.mock.calls[0]?.[0] ?? {}, "skip")).toBe(true);
		expect(Object.hasOwn(find.mock.calls[0]?.[0] ?? {}, "withDeleted")).toBe(true);

		find.mockClear();
		await service.getMany({ where: { id: "direct" } });

		expect(find.mock.calls[0]?.[0]).toMatchObject({ cache: { id: "shared-generated-many" }, join: { alias: "generated" }, lock: { mode: "pessimistic_read" }, order: { name: "DESC" }, select: { name: true }, skip: 7, take: 1, where: { name: "foreign-window" }, withDeleted: true });
	});

	it("does not duplicate an unchanged generated base scope after the one-shot before hook", async () => {
		const find = vi.fn(async (_properties?: FindManyOptions<GetManyEntity>) => [] as Array<GetManyEntity>);
		const repository = createGeneratedRepository(find);
		const service = new GetManyService(repository);
		const where = Array.from({ length: 40 }, (_value: unknown, index: number) => ({ id: `scope-${String(index)}` }));
		const request = { order: { id: "ASC" as const }, take: 3, where };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await ApiControllerGeneratedGetManyContract.run(request, async () => await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_MANY, request, request.where, async () => await service.getMany(request)));

		expect(find.mock.calls[0]?.[0]?.where).toHaveLength(40);
	});

	it("does not Cartesian-expand a branch-by-branch narrowing of an OR base scope", async () => {
		const find = vi.fn(async (_properties?: FindManyOptions<GetManyEntity>) => [] as Array<GetManyEntity>);
		const repository = createGeneratedRepository(find);
		const service = new GetManyService(repository);
		const where = Array.from({ length: 40 }, (_value: unknown, index: number) => ({ id: `scope-${String(index)}` }));
		const request = { order: { id: "ASC" as const }, take: 3, where };
		const narrowedWhere = where.map((branch: { id: string }): { id: string; name: string } => ({ ...branch, name: "active" }));
		const genericScopeProtector = vi.spyOn(ApiControllerGeneratedReadScopeStorage, "protect");

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue({ where: narrowedWhere });
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await ApiControllerGeneratedGetManyContract.run(request, async () => await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_MANY, request, request.where, async () => await service.getMany(request)));

		expect(find.mock.calls[0]?.[0]?.where).toHaveLength(40);
		expect(find.mock.calls[0]?.[0]?.where).toEqual(narrowedWhere);
		expect(genericScopeProtector).not.toHaveBeenCalled();
	});

	it("dispatches generated cursor setup contract failures once through BEFORE_ERROR", async () => {
		const find = vi.fn(async () => [] as Array<GetManyEntity>);
		const repository = createGeneratedRepository(find);
		const service = new GetManyService(repository);
		const request = { order: { id: "ASC" as const }, take: 3, where: { id: "safe" } };
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue({ where: { id: Raw("abs(random()) % 2 = 0") } });

		await expect(ApiControllerGeneratedGetManyContract.run(request, async () => await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_MANY, request, request.where, async () => await service.getMany(request)))).rejects.toThrow("candidate WHERE cannot contain raw SQL operators");

		expect(errorSpy).toHaveBeenCalledTimes(1);
		expect(errorSpy.mock.calls[0]?.[3]).toBe(EApiSubscriberOnType.BEFORE_ERROR);
		expect(find).not.toHaveBeenCalled();
	});

	it("fails closed when a generated cursor GET_MANY after-subscriber changes the protected row sequence", async () => {
		const items: Array<GetManyEntity> = [
			{ id: "id-1", name: "first" },
			{ id: "id-2", name: "second" },
		];
		const repository = createGeneratedRepository(vi.fn(async () => items));
		const service = new GetManyService(repository);
		const request = { order: { id: "ASC" as const }, take: 3, where: {} };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(items.toReversed());

		await expect(ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_MANY, request, request.where, async () => await service.getMany(request))).rejects.toMatchObject({
			cause: {
				message: expect.stringContaining("changed the protected result window"),
			},
		});
	});

	it("allows a generated cursor GET_MANY after-subscriber to change non-order fields only", async () => {
		const items: Array<GetManyEntity> = [
			{ id: "id-1", name: "first" },
			{ id: "id-2", name: "second" },
		];
		const repository = createGeneratedRepository(vi.fn(async () => items));
		const service = new GetManyService(repository);
		const request = { order: { id: "ASC" as const }, take: 3, where: {} };
		const transformedItems: Array<GetManyEntity> = items.map((item: GetManyEntity): GetManyEntity => ({ ...item, name: `${item.name}-transformed` }));

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(transformedItems);

		await expect(ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_MANY, request, request.where, async () => await service.getMany(request))).resolves.toEqual(transformedItems);
	});

	it("isolates generated cursor GET_MANY results from subscriber-retained items", async () => {
		const items: Array<GetManyEntity> = [
			{ id: "id-1", name: "first" },
			{ id: "id-2", name: "second" },
		];
		const repository = createGeneratedRepository(vi.fn(async () => items));
		const service = new GetManyService(repository);
		const request = { order: { id: "ASC" as const }, take: 3, where: {} };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(items);

		const result = await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_MANY, request, request.where, async () => await service.getMany(request));

		expect(result[0]).not.toBe(items[0]);
		items[0]!.id = "mutated";
		expect(result[0]?.id).toBe("id-1");
	});

	it("rejects unstable candidate WHERE values before main or probe queries", async () => {
		const find = vi.fn(async () => [] as Array<GetManyEntity>);
		const repository = createGeneratedRepository(find);
		const service = new GetManyService(repository);
		const sqlGenerator = vi.fn((alias: string): string => `${alias} = 'unsafe'`);
		const baseRequest = { order: { id: "ASC" as const }, take: 3, where: { id: "safe" } };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue({ where: { id: Raw(sqlGenerator) } });

		await expect(ApiControllerGeneratedGetManyContract.run(baseRequest, async () => await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_MANY, baseRequest, baseRequest.where, async () => await service.getMany(baseRequest)))).rejects.toThrow("candidate WHERE cannot contain raw SQL operators");
		expect(sqlGenerator).not.toHaveBeenCalled();
		expect(find).not.toHaveBeenCalled();

		const rawBaseRequest = { order: { id: "ASC" as const }, take: 3, where: { id: Raw(sqlGenerator) } };

		expect(() => ApiControllerGeneratedGetManyContract.run(rawBaseRequest, async () => [])).toThrow("candidate WHERE cannot contain raw SQL operators");
		expect(sqlGenerator).not.toHaveBeenCalled();

		const staticRawBaseRequest = { order: { id: "ASC" as const }, take: 3, where: { id: Raw("abs(random()) % 2 = 0") } };

		expect(() => ApiControllerGeneratedGetManyContract.run(staticRawBaseRequest, async () => [])).toThrow("candidate WHERE cannot contain raw SQL operators");

		const spoofedRaw = {
			"@instanceof": Symbol.for("FindOperator"),
			getSql: undefined,
			multipleParameters: false,
			objectLiteralParameters: undefined,
			type: "raw",
			useParameter: false,
			value: "abs(random()) % 2 = 0",
		};

		expect(() => ApiControllerGeneratedGetManyContract.run({ ...baseRequest, where: { id: spoofedRaw } }, async () => [])).toThrow("candidate WHERE contains an unsupported executable value");

		const shadowedOperator = MoreThan(0);

		Object.defineProperty(shadowedOperator, "type", { configurable: true, enumerable: true, value: "raw", writable: true });
		Object.defineProperty(shadowedOperator, "useParameter", { configurable: true, enumerable: true, value: false, writable: true });
		expect(() => ApiControllerGeneratedGetManyContract.run({ ...baseRequest, where: { id: shadowedOperator } }, async () => [])).toThrow("candidate WHERE contains a non-canonical TypeORM operator");

		const toPostgres = vi.fn(() => "unsafe");
		const customScalar: object = Object.create({ toPostgres }) as object;
		const customScalarRequest = { order: { id: "ASC" as const }, take: 3, where: { id: Equal(customScalar) } };

		expect(() => ApiControllerGeneratedGetManyContract.run(customScalarRequest, async () => [])).toThrow("candidate WHERE contains an unsupported executable value");
		expect(toPostgres).not.toHaveBeenCalled();

		const dynamicOperator = Equal("safe");
		const dynamicValue = vi.fn(() => "unsafe");
		Object.setPrototypeOf(dynamicOperator, Object.create(Object.getPrototypeOf(dynamicOperator) as object, { value: { get: dynamicValue } }) as object);

		expect(() => ApiControllerGeneratedGetManyContract.run({ ...baseRequest, where: { id: dynamicOperator } }, async () => [])).toThrow("candidate WHERE contains an unsupported executable value");
		expect(dynamicValue).not.toHaveBeenCalled();

		if (typeof SharedArrayBuffer !== "undefined") {
			const sharedView = new Uint8Array(new SharedArrayBuffer(1));

			expect(() => ApiControllerGeneratedGetManyContract.run({ ...baseRequest, where: { id: Equal(sharedView) } }, async () => [])).toThrow("candidate WHERE cannot contain shared-memory values");
		}

		const accessor = vi.fn(() => "unsafe");
		const accessorWhere = Object.defineProperty({}, "id", { enumerable: true, get: accessor });

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue({ where: accessorWhere });
		await expect(ApiControllerGeneratedGetManyContract.run(baseRequest, async () => await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_MANY, baseRequest, baseRequest.where, async () => await service.getMany(baseRequest)))).rejects.toThrow("candidate WHERE must contain data properties only");
		expect(accessor).not.toHaveBeenCalled();
	});

	it("throws when repository is missing", async () => {
		const service = new GetManyService(undefined as unknown as Repository<GetManyEntity>);
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.getMany({ where: { id: "id-1" } })).rejects.toThrow("Repository is not available in this context");
		expect(errorSpy).toHaveBeenCalled();
	});
});
