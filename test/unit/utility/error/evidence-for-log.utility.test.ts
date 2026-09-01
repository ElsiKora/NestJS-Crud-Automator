import { FormatErrorEvidenceForLog } from "@utility/error";
import { describe, expect, it, vi } from "vitest";

const SECRET_SENTINEL: string = "SECRET_QUERY_PARAMETER_STACK_MESSAGE_URL_PROFILE_IP";

class QueryFailedError extends Error {}

function defineDataProperty(target: object, property: PropertyKey, value: unknown): void {
	Object.defineProperty(target, property, {
		configurable: true,
		enumerable: true,
		value,
		writable: true,
	});
}

describe("FormatErrorEvidenceForLog", () => {
	it("emits only the error type and validated SQLSTATE from an error graph", () => {
		const driverError: Error & { code?: string } = new Error(SECRET_SENTINEL);
		driverError.code = "23505";
		const error = new QueryFailedError(SECRET_SENTINEL, { cause: driverError });

		defineDataProperty(error, "driverError", driverError);
		defineDataProperty(error, "parameters", [SECRET_SENTINEL]);
		defineDataProperty(error, "query", SECRET_SENTINEL);

		const evidence: string = FormatErrorEvidenceForLog(error);

		expect(evidence).toBe("errorType=QueryFailedError sqlState=23505");
		expect(evidence).not.toContain(SECRET_SENTINEL);
	});

	it("rejects unsafe type names and non-SQLSTATE codes", () => {
		const error: object = Object.create(null) as object;

		defineDataProperty(error, "code", "23505\nSECRET");
		defineDataProperty(error, "name", "Query.Failed");

		expect(FormatErrorEvidenceForLog(error)).toBe("errorType=UnknownError");
		expect(FormatErrorEvidenceForLog({ name: "A".repeat(64) })).toBe(`errorType=${"A".repeat(64)}`);
		expect(FormatErrorEvidenceForLog({ name: "A".repeat(65) })).toBe("errorType=UnknownError");
	});

	it("never invokes getters, enumeration, string conversion, or JSON conversion", () => {
		const executableProperty = vi.fn(() => SECRET_SENTINEL);
		const target: object = Object.create(null) as object;

		for (const property of ["cause", "code", "driverError", "message", "name", "parameters", "query", "stack"]) {
			Object.defineProperty(target, property, { configurable: true, enumerable: true, get: executableProperty });
		}

		defineDataProperty(target, "toJSON", executableProperty);
		defineDataProperty(target, "toString", executableProperty);

		const error = new Proxy(target, {
			get: () => {
				throw new Error("property access is forbidden");
			},
			ownKeys: () => {
				throw new Error("enumeration is forbidden");
			},
		});

		expect(FormatErrorEvidenceForLog(error)).toBe("errorType=UnknownError");
		expect(executableProperty).not.toHaveBeenCalled();
	});

	it("fails closed for hostile and revoked proxies", () => {
		const hostile = new Proxy(Object.create(null) as object, {
			getOwnPropertyDescriptor: () => {
				throw new Error(SECRET_SENTINEL);
			},
			getPrototypeOf: () => {
				throw new Error(SECRET_SENTINEL);
			},
		});
		const revocable = Proxy.revocable(Object.create(null) as object, {});
		revocable.revoke();

		expect(FormatErrorEvidenceForLog(hostile)).toBe("errorType=UnknownError");
		expect(FormatErrorEvidenceForLog(revocable.proxy)).toBe("errorType=UnknownError");
	});

	it("visits at most eight unique linked objects", () => {
		const objects: Array<Record<string, unknown>> = Array.from({ length: 9 }, () => Object.create(null) as Record<string, unknown>);

		for (let index: number = 0; index < objects.length - 1; index += 1) {
			defineDataProperty(objects[index]!, "cause", objects[index + 1]);
		}

		defineDataProperty(objects[0]!, "name", "QueryFailedError");
		defineDataProperty(objects[8]!, "code", "23505");

		expect(FormatErrorEvidenceForLog(objects[0])).toBe("errorType=QueryFailedError");

		defineDataProperty(objects[7]!, "code", "40001");
		expect(FormatErrorEvidenceForLog(objects[0])).toBe("errorType=QueryFailedError sqlState=40001");
	});

	it("returns fixed evidence for primitives", () => {
		expect(FormatErrorEvidenceForLog(SECRET_SENTINEL)).toBe("errorType=UnknownError");
		expect(FormatErrorEvidenceForLog(null)).toBe("errorType=UnknownError");
	});
});
