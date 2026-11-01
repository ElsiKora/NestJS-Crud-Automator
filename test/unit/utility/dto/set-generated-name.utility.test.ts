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

	it("fails when a different class already has the name, naming both origins", () => {
		class FirstDTO {}
		class SecondDTO {}

		DtoSetGeneratedName(FirstDTO, "SetGeneratedNameTakenDTO", "the first route");

		expect(() => DtoSetGeneratedName(SecondDTO, "SetGeneratedNameTakenDTO", "the second route")).toThrow('OpenAPI component name "SetGeneratedNameTakenDTO" belongs to two different classes: the first route, and the second route');
		expect(SecondDTO.name).toBe("SecondDTO");
	});

	it("replaces the class of the same origin, because a re-evaluated module generates its classes again", () => {
		class FirstEvaluationDTO {}
		class SecondEvaluationDTO {}
		class OtherOriginDTO {}

		DtoSetGeneratedName(FirstEvaluationDTO, "SetGeneratedNameReevaluatedDTO", "the first route");

		expect(() => DtoSetGeneratedName(SecondEvaluationDTO, "SetGeneratedNameReevaluatedDTO", "the first route")).not.toThrow();
		expect(SecondEvaluationDTO.name).toBe("SetGeneratedNameReevaluatedDTO");
		expect(() => DtoSetGeneratedName(OtherOriginDTO, "SetGeneratedNameReevaluatedDTO", "the second route")).toThrow('OpenAPI component name "SetGeneratedNameReevaluatedDTO" belongs to two different classes: the first route, and the second route');
	});
});
