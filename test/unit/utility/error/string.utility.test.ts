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
			type: EErrorStringAction.ID_NOT_VALID,
		});

		expect(result).toBe("ERRORENTITY_ID_NOT_VALID");
	});

	it("formats the not valid composite error string with the property after the entity", () => {
		const result = ErrorString({
			entity: ErrorEntity as unknown as IApiBaseEntity,
			property: "email",
			type: EErrorStringCompositeAction.NOT_VALID,
		});

		expect(EErrorStringCompositeAction.NOT_VALID).toBe("{property}_NOT_VALID");
		expect(result).toBe("ERRORENTITY_EMAIL_NOT_VALID");
	});

	it("puts the property before the not valid suffix for named aspects", () => {
		const result = ErrorString({
			entity: ErrorEntity as unknown as IApiBaseEntity,
			property: "email",
			type: EErrorStringCompositeAction.FORMAT_NOT_VALID,
		});

		expect(result).toBe("ERRORENTITY_EMAIL_FORMAT_NOT_VALID");
	});

	it("renders entity-level not valid codes with the entity first", () => {
		expect(ErrorString({ entity: ErrorEntity as unknown as IApiBaseEntity, type: EErrorStringAction.REFERENCE_NOT_VALID })).toBe("ERRORENTITY_REFERENCE_NOT_VALID");
		expect(ErrorString({ entity: ErrorEntity as unknown as IApiBaseEntity, type: EErrorStringAction.SIGNATURE_NOT_VALID })).toBe("ERRORENTITY_SIGNATURE_NOT_VALID");
		expect(ErrorString({ entity: ErrorEntity as unknown as IApiBaseEntity, type: EErrorStringAction.KEY_FOR_TRANSFORM_NOT_IN_OBJECT })).toBe("ERRORENTITY_KEY_FOR_TRANSFORM_NOT_IN_OBJECT");
		expect(ErrorString({ entity: ErrorEntity as unknown as IApiBaseEntity, type: EErrorStringAction.HASHING_ALGORITHM_NOT_VALID })).toBe("HASHING_ALGORITHM_NOT_VALID");
	});

	it("keeps a single not valid form in both error string enums", () => {
		const keys: Array<string> = [...Object.keys(EErrorStringAction), ...Object.keys(EErrorStringCompositeAction)];

		expect(keys.filter((key: string) => /^(INVALID_|WRONG_|MALFORMED|INCORRECT_)|_INVALID$|^INVALID$|^BAD$/u.test(key))).toEqual([]);
		expect(Object.values(EErrorStringAction).filter((value: string) => /INVALID(?!ATING)|WRONG|MALFORMED|INCORRECT/u.test(value))).toEqual([]);
		expect(Object.values(EErrorStringCompositeAction).filter((value: string) => !value.includes("{property}"))).toEqual([]);
	});
});
