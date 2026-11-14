import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal/interface";

import { ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated/security-snapshot.class";
import { ApiFunctionPrincipalStorage } from "@class/api/function/principal-storage.class";
import { EApiAuthorizationPrincipalType } from "@enum/class/authorization";
import { describe, expect, it } from "vitest";

/**
 * Builds a deep-frozen principal, as a security snapshot holds it.
 * @param {string} id - Principal id.
 * @returns {Readonly<IApiAuthorizationPrincipal>} The frozen principal.
 */
function frozenPrincipal(id: string): Readonly<IApiAuthorizationPrincipal> {
	return ApiControllerGeneratedSecuritySnapshot.freeze({ attributes: { team: { name: "core" } }, id, roles: ["editor"], type: EApiAuthorizationPrincipalType.USER });
}

/**
 * Yields to the event loop so concurrent work interleaves.
 * @returns {Promise<void>} Resolves on the next macrotask.
 */
async function nextTask(): Promise<void> {
	await new Promise<void>((resolve: () => void): void => {
		setImmediate(resolve);
	});
}

describe("ApiFunctionPrincipalStorage", () => {
	it("has no principal outside a run", () => {
		expect(ApiFunctionPrincipalStorage.get()).toBeUndefined();
	});

	it("gives the same frozen principal through awaits and timers the run starts, and none after it", async () => {
		const principal: Readonly<IApiAuthorizationPrincipal> = frozenPrincipal("user-1");

		const seen: Array<unknown> = await ApiFunctionPrincipalStorage.run(principal, async (): Promise<Array<unknown>> => {
			const before: unknown = ApiFunctionPrincipalStorage.get();
			await nextTask();
			const fromTimer: unknown = await new Promise<unknown>((resolve: (value: unknown) => void): void => {
				setTimeout((): void => resolve(ApiFunctionPrincipalStorage.get()), 1);
			});

			return [before, ApiFunctionPrincipalStorage.get(), fromTimer];
		});

		expect(seen).toEqual([principal, principal, principal]);
		expect(seen.every((entry: unknown): boolean => entry === principal)).toBe(true);
		expect(Object.isFrozen((seen[0] as IApiAuthorizationPrincipal).attributes.team)).toBe(true);
		expect(ApiFunctionPrincipalStorage.get()).toBeUndefined();
	});

	it("runs without a principal for a route without authorization", async () => {
		expect(await ApiFunctionPrincipalStorage.run(undefined, async (): Promise<unknown> => ApiFunctionPrincipalStorage.get())).toBeUndefined();
	});

	it("refuses a principal that is not frozen", () => {
		const principal: IApiAuthorizationPrincipal = { attributes: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER };

		expect(() => ApiFunctionPrincipalStorage.run(principal, async (): Promise<void> => {})).toThrow("[NestJS-Crud-Automator] The principal of a route request must be deep-frozen before functions read it");
	});

	it("keeps concurrent runs apart, each seeing only its own principal", async () => {
		const first: Readonly<IApiAuthorizationPrincipal> = frozenPrincipal("user-1");
		const second: Readonly<IApiAuthorizationPrincipal> = frozenPrincipal("user-2");

		const collect = async (): Promise<Array<string | undefined>> => {
			const ids: Array<string | undefined> = [];

			for (let step: number = 0; step < 3; step++) {
				ids.push(ApiFunctionPrincipalStorage.get()?.id);
				await nextTask();
			}

			return ids;
		};

		const [firstIds, secondIds] = await Promise.all([ApiFunctionPrincipalStorage.run(first, collect), ApiFunctionPrincipalStorage.run(second, collect)]);

		expect(firstIds).toEqual(["user-1", "user-1", "user-1"]);
		expect(secondIds).toEqual(["user-2", "user-2", "user-2"]);
	});

	it("restores the outer principal after a nested run", async () => {
		const outer: Readonly<IApiAuthorizationPrincipal> = frozenPrincipal("outer");
		const inner: Readonly<IApiAuthorizationPrincipal> = frozenPrincipal("inner");

		const ids: Array<string | undefined> = await ApiFunctionPrincipalStorage.run(outer, async (): Promise<Array<string | undefined>> => {
			const nested: string | undefined = await ApiFunctionPrincipalStorage.run(inner, async (): Promise<string | undefined> => ApiFunctionPrincipalStorage.get()?.id);

			return [nested, ApiFunctionPrincipalStorage.get()?.id];
		});

		expect(ids).toEqual(["inner", "outer"]);
	});
});
