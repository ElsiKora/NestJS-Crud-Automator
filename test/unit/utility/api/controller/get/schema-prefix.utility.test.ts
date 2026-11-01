import { ApiControllerGetSchemaPrefix } from "@utility/api/controller/get/schema-prefix.utility";
import { describe, expect, it } from "vitest";

describe("ApiControllerGetSchemaPrefix", () => {
	it("drops a trailing Controller from the class name", () => {
		class InternalBonusCampaignController {}

		expect(ApiControllerGetSchemaPrefix(InternalBonusCampaignController)).toBe("InternalBonusCampaign");
	});

	it("keeps a class name without the Controller suffix", () => {
		class OrderAdminApi {}

		expect(ApiControllerGetSchemaPrefix(OrderAdminApi)).toBe("OrderAdminApi");
	});

	it("keeps the full name when nothing is left after the suffix", () => {
		class Controller {}

		expect(ApiControllerGetSchemaPrefix(Controller)).toBe("Controller");
	});

	it("rejects a controller class without a name", () => {
		expect(() => ApiControllerGetSchemaPrefix({})).toThrow("Controller class has no name");
		expect(() => ApiControllerGetSchemaPrefix({ name: "" })).toThrow("Controller class has no name");
	});
});
