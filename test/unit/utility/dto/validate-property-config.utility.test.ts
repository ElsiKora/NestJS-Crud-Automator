import type { TApiPropertyDescribeDtoProperties } from "@type/decorator/api/property";

import { DtoValidatePropertyConfig } from "@utility/dto/validate-property-config.utility";
import { describe, expect, it } from "vitest";

describe("DtoValidatePropertyConfig", () => {
	it("accepts property config without throwing", () => {
		const config = {} as TApiPropertyDescribeDtoProperties;

		expect(() => DtoValidatePropertyConfig(config, "example")).not.toThrow();
	});
});
