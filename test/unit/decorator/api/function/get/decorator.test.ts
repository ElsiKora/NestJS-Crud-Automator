import type { EntityManager, Repository } from "typeorm";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionGet } from "@decorator/api/function/get/decorator";
import { HttpStatus } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

class GetEntity {
	public id?: string;
	public name?: string;
}

class GetService {
	public constructor(public repository: Repository<GetEntity>) {}

	@ApiFunctionGet({ entity: GetEntity })
	public async get(properties: { where?: Partial<GetEntity> }, eventManager?: EntityManager): Promise<GetEntity> {
		void properties;
		void eventManager;

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

		const result = await service.get({ where: { id: "id-2" } }, eventManager);

		expect(eventManager.getRepository).toHaveBeenCalledWith(GetEntity);
		expect(eventRepository.findOne).toHaveBeenCalledWith({ where: { id: "id-2" } });
		expect(repository.findOne).not.toHaveBeenCalled();
		expect(result).toMatchObject({ id: "id-2", name: "event" });
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
