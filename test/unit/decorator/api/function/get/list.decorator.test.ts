import type { EntityManager, FindManyOptions, Repository } from "typeorm";

import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated-read-scope-storage.class";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction/scope.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionGetList } from "@decorator/api/function/get/list.decorator";
import { EApiFunctionType } from "@enum/decorator/api";
import type { IApiGetListResponseResult } from "@interface/decorator/api";
import { HttpStatus } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTransactionFixture } from "@test/unit/fixture";

class GetListEntity {
	public id?: string;
	public name?: string;
}

class GetListService {
	public constructor(public repository: Repository<GetListEntity>) {}

	@ApiFunctionGetList({ entity: GetListEntity })
	public async getList(properties: { skip?: number; take?: number; where?: Partial<GetListEntity> }): Promise<IApiGetListResponseResult<GetListEntity>> {
		void properties;

		return { count: 0, currentPage: 0, items: [], totalCount: 0, totalPages: 0 };
	}
}

describe("ApiFunctionGetList", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns paging information for lists", async () => {
		const repository = {
			findAndCount: vi.fn(async () => [[{ id: "id-1" }], 5]),
		} as unknown as Repository<GetListEntity>;
		const service = new GetListService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await service.getList({ take: 2, skip: 2 });

		expect(result.items).toHaveLength(1);
		expect(result.totalCount).toBe(5);
		expect(result.currentPage).toBe(2);
		expect(result.totalPages).toBe(3);
	});

	it("reapplies generated-route criteria after a before-subscriber replaces GET_LIST options", async () => {
		const findAndCount = vi.fn(async (_options?: FindManyOptions<GetListEntity>) => [[], 0] as [Array<GetListEntity>, number]);
		const repository = {
			findAndCount,
		} as unknown as Repository<GetListEntity>;
		const service = new GetListService(repository);
		const request = { take: 10, where: { name: "required" } };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockImplementation(async () => ({ take: 1, where: { name: "foreign" } }));
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_LIST, request, request.where, async () => await service.getList(request));

		const protectedWhere = findAndCount.mock.calls[0]?.[0]?.where as Record<string, unknown>;

		expect(protectedWhere.name).toMatchObject({
			_type: "and",
			_value: [
				{ _type: "equal", _value: "foreign" },
				{ _type: "equal", _value: "required" },
			],
		});

		findAndCount.mockClear();
		await service.getList({ take: 5 });

		expect(findAndCount).toHaveBeenCalledWith({ take: 1, where: { name: "foreign" } });
	});

	it("uses event manager repository when provided", async () => {
		const repository = {
			findAndCount: vi.fn(async () => [[{ id: "id-1" }], 1]),
		} as unknown as Repository<GetListEntity>;
		const eventRepository = {
			findAndCount: vi.fn(async () => [[{ id: "id-2" }], 2]),
		} as unknown as Repository<GetListEntity>;
		const eventManager = {
			getRepository: vi.fn(() => eventRepository),
		} as unknown as EntityManager;
		const service = new GetListService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await ApiFunctionTransactionScope.runWithDataSource(createTransactionFixture(eventManager).dataSource, { name: "getList" }, async () => await service.getList({ take: 1 }));

		expect(eventManager.getRepository).toHaveBeenCalledWith(GetListEntity);
		expect(eventRepository.findAndCount).toHaveBeenCalledWith({ take: 1 });
		expect(repository.findAndCount).not.toHaveBeenCalled();
		expect(result.items[0]).toMatchObject({ id: "id-2" });
		expect(result.totalCount).toBe(2);
	});

	it("returns currentPage 0 when no items", async () => {
		const repository = {
			findAndCount: vi.fn(async () => [[], 0]),
		} as unknown as Repository<GetListEntity>;
		const service = new GetListService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await service.getList({ take: 10 });

		expect(result.currentPage).toBe(0);
		expect(result.totalPages).toBe(0);
	});

	it("throws when repository is missing", async () => {
		const service = new GetListService(undefined as unknown as Repository<GetListEntity>);
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.getList({ take: 1 })).rejects.toThrow("Repository is not available in this context");
		expect(errorSpy).toHaveBeenCalled();
	});

	it("propagates not found errors as not found responses", async () => {
		const repository = {
			findAndCount: vi.fn(async () => {
				throw { name: "EntityNotFoundError" };
			}),
		} as unknown as Repository<GetListEntity>;
		const service = new GetListService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.getList({ take: 1 })).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
	});
});
