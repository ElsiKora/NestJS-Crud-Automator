import type { Repository } from "typeorm";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionUpdate } from "@decorator/api/function/update.decorator";
import { HttpStatus } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

class UpdateEntity {
	public id?: string;
	public name?: string;
	public count?: number;
}

const buildUpdateService = (repository: Repository<UpdateEntity>) => {
	class UpdateService {
		public constructor(public repository: Repository<UpdateEntity>) {}

		@ApiFunctionUpdate({ entity: UpdateEntity })
		public async update(criteria: Partial<UpdateEntity>, properties: Partial<UpdateEntity>): Promise<UpdateEntity> {
			void criteria;
			void properties;

			return {} as UpdateEntity;
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

	it("updates only existing fields", async () => {
		const repository = {
			findOne: vi.fn(async () => ({ id: "id-1", name: "old", count: 1 })),
			save: vi.fn(async (value: UpdateEntity) => value),
		} as unknown as Repository<UpdateEntity>;
		const service = buildUpdateService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await service.update({ id: "id-1" }, { name: "new", extra: "nope" } as UpdateEntity);

		const savedCall = (repository.save as unknown as { mock: { calls: Array<[UpdateEntity]> } }).mock.calls[0];
		const saved = savedCall?.[0] as UpdateEntity;
		expect(saved).toMatchObject({ id: "id-1", name: "new", count: 1 });
		expect(saved).not.toHaveProperty("extra");
		expect(result).toMatchObject({ id: "id-1", name: "new" });
	});

	it("throws not found when entity is missing", async () => {
		const repository = {
			findOne: vi.fn(async () => null),
			save: vi.fn(async (value: UpdateEntity) => value),
		} as unknown as Repository<UpdateEntity>;
		const service = buildUpdateService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.update({ id: "missing" }, { name: "new" } as UpdateEntity)).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
	});

	it("throws when repository is missing", async () => {
		const service = buildUpdateService(undefined as unknown as Repository<UpdateEntity>);
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.update({ id: "id-1" }, { name: "new" } as UpdateEntity)).rejects.toThrow("Repository is not available in this context");
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

		await expect(service.update({ id: "id-1" }, { name: "dup" } as UpdateEntity)).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
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

		await expect(service.update({ id: "id-1" }, { name: "bad-ref" } as UpdateEntity)).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
	});
});
