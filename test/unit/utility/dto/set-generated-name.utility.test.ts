import "reflect-metadata";

import { DtoSetGeneratedName } from "@utility/dto/set-generated-name.utility";
import { describe, expect, it } from "vitest";

describe("DtoSetGeneratedName", () => {
	it("names the generated class", () => {
		class GeneratedDTO {}

		DtoSetGeneratedName(GeneratedDTO, "SetGeneratedNameFirstDTO", "the first route");

		expect(GeneratedDTO.name).toBe("SetGeneratedNameFirstDTO");
	});

	it("names two different classes with one name, since uniqueness is checked per application at bootstrap", () => {
		class FirstDTO {}
		class SecondDTO {}

		DtoSetGeneratedName(FirstDTO, "SetGeneratedNameTakenDTO", "the first route");

		expect(() => DtoSetGeneratedName(SecondDTO, "SetGeneratedNameTakenDTO", "the second route")).not.toThrow();
		expect(SecondDTO.name).toBe("SetGeneratedNameTakenDTO");
	});
});
