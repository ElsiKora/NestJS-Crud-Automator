import "reflect-metadata";

import { describe, expect, it, vi } from "vitest";

import * as library from "../../../../../src/index";

(globalThis as { reevaluationLibrary?: typeof library }).reevaluationLibrary = library;

describe("ApiController module re-evaluation", () => {
	it("starts again when a controller module is evaluated a second time in one process, with the same class names and path", async () => {
		const first: typeof import("./fixture/reevaluation") = await import("./fixture/reevaluation");

		vi.resetModules();

		const second: typeof import("./fixture/reevaluation") = await import("./fixture/reevaluation");

		expect(second.ReevaluationItemController).not.toBe(first.ReevaluationItemController);
		expect(second.ReevaluationItemResponseDto).not.toBe(first.ReevaluationItemResponseDto);
		expect(second.ReevaluationItemNoteDto).not.toBe(first.ReevaluationItemNoteDto);
	});

	it("still fails for another controller class with that prefix on another path", async () => {
		const { ReevaluationItemEntity }: typeof import("./fixture/reevaluation") = await import("./fixture/reevaluation");
		const routes = { [library.EApiRouteType.CREATE]: { generation: { isEnabled: false } }, [library.EApiRouteType.DELETE]: { generation: { isEnabled: false } }, [library.EApiRouteType.GET_LIST]: { generation: { isEnabled: false } }, [library.EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } }, [library.EApiRouteType.UPDATE]: { generation: { isEnabled: false } } } as const;
		const createController = (): new () => { service: library.ApiServiceBase<never> } =>
			class ReevaluationOtherController {
				public service!: library.ApiServiceBase<never>;
			};

		library.ApiController({ entity: ReevaluationItemEntity, path: "reevaluation/others", routes })(createController());

		expect(() => library.ApiController({ entity: ReevaluationItemEntity, path: "reevaluation/others-moved", routes })(createController())).toThrow('Controllers ReevaluationOtherController (path "reevaluation/others") and ReevaluationOtherController (path "reevaluation/others-moved") have the same schema prefix "ReevaluationOther"');
	});
});
