import { DtoSetGeneratedName } from "@utility/dto/set-generated-name.utility";
import { describe, expect, it } from "vitest";

describe("DtoSetGeneratedName", () => {
	it("names the generated class", () => {
		class GeneratedDTO {}

		DtoSetGeneratedName(GeneratedDTO, "SetGeneratedNameFirstDTO", "the first route");

		expect(GeneratedDTO.name).toBe("SetGeneratedNameFirstDTO");
	});

	it("accepts the same class under the same name again", () => {
		class GeneratedDTO {}

		DtoSetGeneratedName(GeneratedDTO, "SetGeneratedNameRepeatedDTO", "the first route");

		expect(() => DtoSetGeneratedName(GeneratedDTO, "SetGeneratedNameRepeatedDTO", "the first route")).not.toThrow();
	});

	it("fails when a different class already has the name, naming both sources", () => {
		class FirstDTO {}
		class SecondDTO {}

		DtoSetGeneratedName(FirstDTO, "SetGeneratedNameTakenDTO", "the first route");

		expect(() => DtoSetGeneratedName(SecondDTO, "SetGeneratedNameTakenDTO", "the second route")).toThrow('Generated DTO name "SetGeneratedNameTakenDTO" belongs to two different DTO classes, generated for the first route and for the second route');
		expect(SecondDTO.name).toBe("SecondDTO");
	});
});
