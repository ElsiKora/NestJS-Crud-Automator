import "reflect-metadata";

import type { TestingModule } from "@nestjs/testing";

import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";

import * as library from "../../../../../src/index";

(globalThis as { reevaluationLibrary?: typeof library }).reevaluationLibrary = library;

type TFirstModule = typeof import("./fixture/reevaluation/first.controller");
type TSecondModule = typeof import("./fixture/reevaluation/second.controller");

/**
 * Starts a testing application with the library modules and the given controllers, running the bootstrap hooks.
 * @param {Array<new (...arguments_: Array<never>) => unknown>} controllers - Controllers of the application.
 * @returns {Promise<TestingModule>} The started application.
 */
async function start(controllers: Array<new (...arguments_: Array<never>) => unknown>): Promise<TestingModule> {
	const application: TestingModule = await Test.createTestingModule({ controllers, imports: [library.ApiAuthorizationModule.forRoot(), library.ApiSubscriberModule] }).compile();

	return application.init();
}

describe("ApiController module re-evaluation", () => {
	it.each([
		["the same order", ["first", "second"]],
		["a changed order", ["second", "first"]],
	] as const)("evaluates controller modules again in %s and starts with the new classes, which share one hand-written DTO", async (_order: string, secondOrder: ReadonlyArray<"first" | "second">) => {
		const firstEvaluation: { first: TFirstModule; second: TSecondModule } = { first: await import("./fixture/reevaluation/first.controller"), second: await import("./fixture/reevaluation/second.controller") };

		vi.resetModules();

		const modules: Partial<{ first: TFirstModule; second: TSecondModule }> = {};

		for (const name of secondOrder) {
			modules[name] = (name === "first" ? await import("./fixture/reevaluation/first.controller") : await import("./fixture/reevaluation/second.controller")) as never;
		}

		const { first, second }: { first: TFirstModule; second: TSecondModule } = modules as { first: TFirstModule; second: TSecondModule };

		expect(first.ReevaluationFirstController).not.toBe(firstEvaluation.first.ReevaluationFirstController);
		expect(second.ReevaluationSecondController).not.toBe(firstEvaluation.second.ReevaluationSecondController);

		const application: TestingModule = await start([first.ReevaluationFirstController, second.ReevaluationSecondController]);

		await application.close();
	});

	it("fails startup for an application that has the old and the new class of one controller", async () => {
		const { ReevaluationFirstController: oldController }: TFirstModule = await import("./fixture/reevaluation/first.controller");

		vi.resetModules();

		const { ReevaluationFirstController: newController }: TFirstModule = await import("./fixture/reevaluation/first.controller");

		await expect(start([oldController, newController])).rejects.toThrow('have the same schema prefix "ReevaluationFirst" in one application');
	});
});
