import { EApiPropertyStringType } from "@enum/decorator/api";
import { GetDefaultStringFormatProperties } from "@utility/api";
import { describe, expect, it } from "vitest";

describe("GetDefaultStringFormatProperties", () => {
	it("returns a clone of default properties", () => {
		const first = GetDefaultStringFormatProperties(EApiPropertyStringType.EMAIL);
		const second = GetDefaultStringFormatProperties(EApiPropertyStringType.EMAIL);

		first.description = "changed";

		expect(second.description).not.toBe("changed");
		expect(second.description).toBeDefined();
	});

	it("returns default bigint string properties", () => {
		const properties = GetDefaultStringFormatProperties(EApiPropertyStringType.BIGINT_STRING);

		expect(properties).toMatchObject({
			description: "bigint decimal string",
			exampleValue: "1000",
			format: EApiPropertyStringType.BIGINT_STRING,
			maxLength: 20,
			minLength: 1,
			pattern: String.raw`/^-?(0|[1-9]\d{0,18})$/`,
		});
	});

	it("returns negative bigint string properties", () => {
		const properties = GetDefaultStringFormatProperties(EApiPropertyStringType.BIGINT_STRING, { sign: "negative" });

		expect(properties).toMatchObject({
			description: "negative bigint decimal string",
			exampleValue: "-1000",
			format: EApiPropertyStringType.BIGINT_STRING,
			maxLength: 20,
			minLength: 2,
			pattern: String.raw`/^-[1-9]\d{0,18}$/`,
		});
	});

	it("returns unsigned bigint string properties without mutating defaults", () => {
		const unsignedProperties = GetDefaultStringFormatProperties(EApiPropertyStringType.BIGINT_STRING, { sign: "unsigned" });
		const defaultProperties = GetDefaultStringFormatProperties(EApiPropertyStringType.BIGINT_STRING);

		expect(unsignedProperties).toMatchObject({
			description: "unsigned bigint decimal string",
			exampleValue: "1000",
			format: EApiPropertyStringType.BIGINT_STRING,
			maxLength: 20,
			minLength: 1,
			pattern: String.raw`/^(0|[1-9]\d{0,19})$/`,
		});
		expect(defaultProperties.pattern).toBe(String.raw`/^-?(0|[1-9]\d{0,18})$/`);
	});

	it("types format-specific options", () => {
		const assertTypes = (): void => {
			GetDefaultStringFormatProperties(EApiPropertyStringType.BIGINT_STRING, { sign: "signed" });
			const dynamicFormat: EApiPropertyStringType.BIGINT_STRING | EApiPropertyStringType.EMAIL = EApiPropertyStringType.BIGINT_STRING as EApiPropertyStringType.BIGINT_STRING | EApiPropertyStringType.EMAIL;

			// @ts-expect-error BIGINT_STRING-only options must not be available for EMAIL.
			GetDefaultStringFormatProperties(EApiPropertyStringType.EMAIL, { sign: "signed" });

			// @ts-expect-error BIGINT_STRING options require the selected format to be exactly BIGINT_STRING.
			GetDefaultStringFormatProperties(dynamicFormat, { sign: "signed" });

			// @ts-expect-error BIGINT_STRING sign only supports signed, unsigned, and negative.
			GetDefaultStringFormatProperties(EApiPropertyStringType.BIGINT_STRING, { sign: "positive" });
		};

		expect(assertTypes).toBeDefined();
	});
});
