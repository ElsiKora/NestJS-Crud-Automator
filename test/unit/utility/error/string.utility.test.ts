import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { EErrorStringAction, EErrorStringCompositeAction } from "@enum/utility/error-string";
import { ErrorString } from "@utility/error/string.utility";
import { describe, expect, it } from "vitest";

class ErrorEntity {
	public id?: string;
}

describe("ErrorString", () => {
	it("formats base error strings using entity name", () => {
		const result = ErrorString({
			entity: ErrorEntity as unknown as IApiBaseEntity,
			type: EErrorStringAction.INVALID_ID,
		});

		expect(result).toBe("ERRORENTITY_INVALID_ID");
	});

	it("formats composite error strings using property name", () => {
		const result = ErrorString({
			entity: ErrorEntity as unknown as IApiBaseEntity,
			property: "email",
			type: EErrorStringCompositeAction.INVALID,
		});

		expect(result).toBe("ERRORENTITY_INVALID_EMAIL");
	});
});
