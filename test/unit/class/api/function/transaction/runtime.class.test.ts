import type { IApiFunctionTransaction } from "@interface/class/api/function";
import type { EntityManager } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionRuntime } from "@class/api/function/transaction/runtime.class";
import { EApiFunctionTransactionOwnerKind, EApiRouteType } from "@enum/decorator/api";
import { describe, expect, it } from "vitest";

import { createTransactionFixture } from "@test/unit/fixture";

describe("ApiFunctionTransactionRuntime", () => {
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
});
