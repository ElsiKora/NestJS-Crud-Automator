import type { Repository } from "typeorm";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionDelete } from "@decorator/api/function/delete.decorator";
import { HttpStatus } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

class DeleteEntity {
	public id?: string;
	public name?: string;
}

const buildDeleteService = (repository: Repository<DeleteEntity>) => {
	class DeleteService {
		public constructor(public repository: Repository<DeleteEntity>) {}

		@ApiFunctionDelete({ entity: DeleteEntity })
		public async delete(criteria: Partial<DeleteEntity>): Promise<DeleteEntity> {
			void criteria;

			return {} as DeleteEntity;
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
