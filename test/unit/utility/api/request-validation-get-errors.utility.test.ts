import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { BadRequestException, HttpException, HttpStatus } from "@nestjs/common";
import { ApiRequestValidationGetErrors } from "@utility/api/request-validation-get-errors.utility";
import { ValidationError } from "class-validator";
import { describe, expect, it } from "vitest";

const MESSAGE: string = "request body must not hold an object with more than 1000 keys";

/**
 * Builds a failure the way the request body check does.
 * @returns {ValidationError} One failure with one constraint.
 */
function failure(): ValidationError {
	return Object.assign(new ValidationError(), { children: [], constraints: { requestBodyMaximumKeys: MESSAGE }, property: "payload" });
}

/**
 * Wraps a value in the given number of causes.
 * @param {unknown} value - The innermost cause.
 * @param {number} count - Causes around it.
 * @returns {unknown} The outermost error.
 */
function wrapped(value: unknown, count: number): unknown {
	let current: unknown = value;

	for (let index: number = 0; index < count; index += 1) {
		current = Object.assign(new Error("wrapper"), { cause: current });
	}

	return current;
}

describe("ApiRequestValidationException", () => {
	it("answers the message list a ValidationPipe answers with, and no failure detail", () => {
		const exception: ApiRequestValidationException = new ApiRequestValidationException([failure()]);

		expect(exception).toBeInstanceOf(BadRequestException);
		expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
		expect(exception.getResponse()).toEqual({ error: "Bad Request", message: [MESSAGE], statusCode: HttpStatus.BAD_REQUEST });
	});

	it("keeps the failures it was given", () => {
		const errors: Array<ValidationError> = [failure()];

		expect(new ApiRequestValidationException(errors).validationErrors).toBe(errors);
	});
});

describe("ApiRequestValidationGetErrors", () => {
	const errors: Array<ValidationError> = [failure()];
	const exception: ApiRequestValidationException = new ApiRequestValidationException(errors);

	it("reads the exception itself", () => {
		expect(ApiRequestValidationGetErrors(exception)).toBe(errors);
	});

	it("reads the exception through an HttpException cause, as the correlation interceptor keeps it", () => {
		expect(ApiRequestValidationGetErrors(new HttpException({}, HttpStatus.BAD_REQUEST, { cause: exception }))).toBe(errors);
	});

	it("reads the exception further down the cause chain", () => {
		expect(ApiRequestValidationGetErrors(wrapped(exception, 15))).toBe(errors);
	});

	it("stops at the bound of a chain", () => {
		expect(ApiRequestValidationGetErrors(wrapped(exception, 16))).toBeUndefined();
	});

	it("ends on a cycle of causes", () => {
		const cycle: { cause?: unknown } = {};
		cycle.cause = cycle;

		expect(ApiRequestValidationGetErrors(cycle)).toBeUndefined();
	});

	it.each([
		{ name: "undefined", value: undefined },
		{ name: "null", value: null },
		{ name: "a string", value: "thrown" },
		{ name: "a number", value: 0 },
		{ name: "a function", value: (): void => {} },
		{ name: "an object with no cause", value: {} },
		{ name: "another exception", value: new BadRequestException("other") },
		{ name: "an error with a falsy cause", value: Object.assign(new Error("wrapper"), { cause: 0 }) },
		{ name: "a null-prototype object", value: Object.create(null) as object },
	])("answers undefined for $name", ({ value }: { value: unknown }) => {
		expect(ApiRequestValidationGetErrors(value)).toBeUndefined();
	});

	it("answers undefined for a value that throws on being read", () => {
		const throwingGetter: object = Object.defineProperty({}, "cause", {
			get(): never {
				throw new Error("read");
			},
		});
		const throwingProxy: object = new Proxy(
			{},
			{
				get(): never {
					throw new Error("read");
				},
				getPrototypeOf(): never {
					throw new Error("read");
				},
			},
		);

		expect(ApiRequestValidationGetErrors(throwingGetter)).toBeUndefined();
		expect(ApiRequestValidationGetErrors(throwingProxy)).toBeUndefined();
		expect(ApiRequestValidationGetErrors(wrapped(throwingProxy, 2))).toBeUndefined();
	});
});
