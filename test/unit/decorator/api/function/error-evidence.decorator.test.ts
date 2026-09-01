import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { Repository } from "typeorm";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionCreate } from "@decorator/api/function/create.decorator";
import { ApiFunctionDelete } from "@decorator/api/function/delete.decorator";
import { ApiFunctionGet } from "@decorator/api/function/get/decorator";
import { ApiFunctionGetList } from "@decorator/api/function/get/list.decorator";
import { ApiFunctionGetMany } from "@decorator/api/function/get/many.decorator";
import { ApiFunctionUpdate } from "@decorator/api/function/update.decorator";
import { HttpStatus } from "@nestjs/common";
import { LoggerUtility } from "@utility/logger.utility";
import { afterEach, describe, expect, it, vi } from "vitest";

const SAFE_SQL_STATE: string = "XX001";
const SECRET_SENTINEL: string = "SECRET_SQL_PARAMETERS_DRIVER_MESSAGE_STACK_PROFILE_IP_URL";

class ErrorEvidenceEntity {
	public id?: string;

	public name?: string;
}

class ErrorEvidenceService {
	public constructor(public repository: Repository<ErrorEvidenceEntity>) {}

	@ApiFunctionCreate({ entity: ErrorEvidenceEntity })
	public async create(properties: Partial<ErrorEvidenceEntity>): Promise<ErrorEvidenceEntity> {
		void properties;

		return {};
	}

	@ApiFunctionDelete({ entity: ErrorEvidenceEntity })
	public async delete(criteria: Partial<ErrorEvidenceEntity>): Promise<ErrorEvidenceEntity> {
		void criteria;

		return {};
	}

	@ApiFunctionGet({ entity: ErrorEvidenceEntity })
	public async get(properties: { where?: Partial<ErrorEvidenceEntity> }): Promise<ErrorEvidenceEntity> {
		void properties;

		return {};
	}

	@ApiFunctionGetList({ entity: ErrorEvidenceEntity })
	public async getList(properties: { skip?: number; take?: number; where?: Partial<ErrorEvidenceEntity> }): Promise<IApiGetListResponseResult<ErrorEvidenceEntity>> {
		void properties;

		return { count: 0, currentPage: 0, items: [], totalCount: 0, totalPages: 0 };
	}

	@ApiFunctionGetMany({ entity: ErrorEvidenceEntity })
	public async getMany(properties: { where?: Partial<ErrorEvidenceEntity> }): Promise<Array<ErrorEvidenceEntity>> {
		void properties;

		return [];
	}

	@ApiFunctionUpdate({ entity: ErrorEvidenceEntity })
	public async update(criteria: Partial<ErrorEvidenceEntity>, properties: Partial<ErrorEvidenceEntity>): Promise<ErrorEvidenceEntity> {
		void criteria;
		void properties;

		return {};
	}
}

function createQueryFailedError(): Error {
	const driverError: Error & { code?: string; parameters?: Array<string>; query?: string } = new Error(SECRET_SENTINEL);
	driverError.code = SAFE_SQL_STATE;
	driverError.parameters = [SECRET_SENTINEL];
	driverError.query = SECRET_SENTINEL;

	return Object.assign(new Error(SECRET_SENTINEL, { cause: driverError }), {
		driverError,
		name: "QueryFailedError",
		parameters: [SECRET_SENTINEL],
		query: SECRET_SENTINEL,
	});
}

function createRepository(operation: string, error: Error): Repository<ErrorEvidenceEntity> {
	const existingEntity: ErrorEvidenceEntity = { id: "entity-id", name: "existing" };

	return {
		find: vi.fn(async () => {
			throw error;
		}),
		findAndCount: vi.fn(async () => {
			throw error;
		}),
		findOne: vi.fn(async () => {
			if (operation === "delete" || operation === "update") {
				return existingEntity;
			}

			throw error;
		}),
		remove: vi.fn(async () => {
			throw error;
		}),
		save: vi.fn(async () => {
			throw error;
		}),
	} as unknown as Repository<ErrorEvidenceEntity>;
}

describe("CRUD error log evidence", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each([
		["create", (service: ErrorEvidenceService): Promise<unknown> => service.create({ name: "new" })],
		["delete", (service: ErrorEvidenceService): Promise<unknown> => service.delete({ id: "entity-id" })],
		["get", (service: ErrorEvidenceService): Promise<unknown> => service.get({ where: { id: "entity-id" } })],
		["getList", (service: ErrorEvidenceService): Promise<unknown> => service.getList({ take: 1 })],
		["getMany", (service: ErrorEvidenceService): Promise<unknown> => service.getMany({ where: { id: "entity-id" } })],
		["update", (service: ErrorEvidenceService): Promise<unknown> => service.update({ id: "entity-id" }, { name: "updated" })],
	] as const)("logs bounded evidence for %s failures", async (operation, execute) => {
		const queryFailedError: Error = createQueryFailedError();
		const service = new ErrorEvidenceService(createRepository(operation, queryFailedError));
		const verbose = vi.spyOn(LoggerUtility.prototype, "verbose").mockImplementation(() => undefined);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(execute(service)).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });

		expect(verbose).toHaveBeenCalledTimes(1);
		expect(verbose.mock.calls[0]).toHaveLength(1);
		expect(verbose.mock.calls[0]?.[0]).toContain(`errorType=QueryFailedError sqlState=${SAFE_SQL_STATE}`);
		expect(verbose.mock.calls.flat().join(" ")).not.toContain(SECRET_SENTINEL);
	});
});
