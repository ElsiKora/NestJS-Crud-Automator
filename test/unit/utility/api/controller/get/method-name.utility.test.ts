import { EApiRouteType } from "@enum/decorator/api";
import { ApiControllerGetMethodName } from "@utility/api/controller/get/method-name.utility";
import { describe, expect, it } from "vitest";

describe("ApiControllerGetMethodName", () => {
	it("builds method names with reserved prefix", () => {
		const methodName = ApiControllerGetMethodName(EApiRouteType.GET_LIST);

		expect(methodName).toBe("getList");
	});
});
