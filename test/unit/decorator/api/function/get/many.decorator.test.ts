import type { Repository } from "typeorm";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionGetMany } from "@decorator/api/function/get/many.decorator";
import { HttpStatus } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

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

	it("throws not found when list is empty", async () => {
		const repository = {
			find: vi.fn(async () => []),
		} as unknown as Repository<GetManyEntity>;
		const service = new GetManyService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.getMany({ where: { id: "missing" } })).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
	});

	it("throws when repository is missing", async () => {
		const service = new GetManyService(undefined as unknown as Repository<GetManyEntity>);
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.getMany({ where: { id: "id-1" } })).rejects.toThrow("Repository is not available in this context");
		expect(errorSpy).toHaveBeenCalled();
	});
});
