import "reflect-metadata";

import { SERVICE_API_DECORATOR_CONSTANT } from "@constant/decorator/api/service.constant";
import { ApiServiceObservable } from "@decorator/api/service/observable.decorator";
import { describe, expect, it } from "vitest";

describe("ApiServiceObservable", () => {
	it("marks service as observable", () => {
		@ApiServiceObservable()
		class ObservableService {}

		expect(Reflect.getMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, ObservableService)).toBe(true);
	});
});
