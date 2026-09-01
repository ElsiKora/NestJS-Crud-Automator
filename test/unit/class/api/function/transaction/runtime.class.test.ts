import type { IApiFunctionTransaction } from "@interface/class/api/function";
import type { EntityManager } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionRuntime } from "@class/api/function/transaction/runtime.class";
import { EApiFunctionTransactionOwnerKind, EApiRouteType } from "@enum/decorator/api";
import { LoggerUtility } from "@utility/logger.utility";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTransactionFixture } from "@test/unit/fixture";

describe("ApiFunctionTransactionRuntime", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("binds a route-shaped owner and manager through the owning transaction", async () => {
		const { dataSource, entityManager, queryRunner } = createTransactionFixture();
		let transaction: Readonly<IApiFunctionTransaction> | undefined;

		const result = await ApiFunctionTransactionRuntime.execute({
			callback: async (manager: EntityManager) => {
				expect(manager).toBe(entityManager);
				expect(ApiFunctionContextStorage.getEventManager()).toBe(entityManager);
				transaction = ApiFunctionContextStorage.getTransactionRegistry()?.getTransaction();

				return "result";
			},
			dataSource,
			owner: {
				entityName: "RouteEntity",
				kind: EApiFunctionTransactionOwnerKind.ROUTE,
				methodName: "create",
				routeType: EApiRouteType.CREATE,
			},
		});

		expect(result).toBe("result");
		expect(transaction).toEqual({
			id: expect.any(String),
			owner: {
				entityName: "RouteEntity",
				kind: EApiFunctionTransactionOwnerKind.ROUTE,
				methodName: "create",
				routeType: EApiRouteType.CREATE,
			},
		});
		expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		expect(queryRunner.release).toHaveBeenCalledTimes(1);
		expect(ApiFunctionContextStorage.getTransactionRegistry()).toBeUndefined();
	});

	it("logs only bounded evidence when query-runner release fails", async () => {
		const { dataSource, queryRunner } = createTransactionFixture();
		const secretSentinel: string = "SECRET_RELEASE_QUERY_PARAMETERS_MESSAGE_STACK";
		const driverError: Error & { code?: string; query?: string } = new Error(secretSentinel);
		driverError.code = "08006";
		driverError.query = secretSentinel;
		const releaseError = Object.assign(new Error(secretSentinel, { cause: driverError }), {
			driverError,
			name: "QueryFailedError",
			parameters: [secretSentinel],
			query: secretSentinel,
		});
		const errorLog = vi.spyOn(LoggerUtility.prototype, "error").mockImplementation(() => undefined);

		vi.mocked(queryRunner.release).mockRejectedValue(releaseError);

		await expect(
			ApiFunctionTransactionRuntime.execute({
				callback: async () => "result",
				dataSource,
				owner: { kind: EApiFunctionTransactionOwnerKind.SCOPE, name: "release-evidence" },
			}),
		).resolves.toBe("result");

		expect(errorLog).toHaveBeenCalledTimes(1);
		expect(errorLog.mock.calls[0]).toEqual(["Failed to release transaction query runner: errorType=QueryFailedError sqlState=08006"]);
		expect(errorLog.mock.calls.flat().join(" ")).not.toContain(secretSentinel);
	});
});
