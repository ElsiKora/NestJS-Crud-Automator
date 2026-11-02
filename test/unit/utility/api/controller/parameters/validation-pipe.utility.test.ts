import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { ApiControllerParametersAssertValidationPipePackages } from "@utility/api/controller/parameters/validation-pipe.utility";
import { defaultMetadataStorage } from "class-transformer/cjs/storage.js";
import { getMetadataStorage } from "class-validator";
import { describe, expect, it, vi } from "vitest";

const ROUTE: string = 'Controller "ValidationPipeController" method "read"';

/**
 * Tells whether class-validator or class-transformer holds metadata of a class with the probe name.
 * @returns {boolean} Whether the probe DTO is declared.
 */
function isProbeDeclared(): boolean {
	const validated: Map<unknown, unknown> = (getMetadataStorage() as unknown as { validationMetadatas: Map<unknown, unknown> }).validationMetadatas;
	const transformed: Map<unknown, unknown> = (defaultMetadataStorage as unknown as { _transformMetadatas: Map<unknown, unknown> })._transformMetadatas;

	return [...validated.keys(), ...transformed.keys()].some((target: unknown): boolean => (target as { name?: unknown }).name === "ApiControllerParametersValidationPipeProbe");
}

describe("ApiControllerParametersAssertValidationPipePackages", () => {
	it("declares no probe DTO when the module is only imported, and declares it on the first check", async () => {
		expect(isProbeDeclared()).toBe(false);

		await ApiControllerParametersAssertValidationPipePackages(new ValidationPipe(), ROUTE, "method");

		expect(isProbeDeclared()).toBe(true);
	});

	it.each([{ transform: false }, { transform: true }, { groups: ["other"], transform: true, whitelist: true }, { forbidNonWhitelisted: true, forbidUnknownValues: true, whitelist: true }])("never calls the exceptionFactory of a pipe with options %j, because the probe passes every check", async (options: Record<string, unknown>) => {
		const exceptionFactory: ReturnType<typeof vi.fn<(errors: Array<unknown>) => Error>> = vi.fn<(errors: Array<unknown>) => Error>((): Error => new Error("user code"));

		await expect(ApiControllerParametersAssertValidationPipePackages(new ValidationPipe({ ...options, exceptionFactory }), ROUTE, "controller")).resolves.toBeUndefined();
		expect(exceptionFactory).not.toHaveBeenCalled();
	});

	it("refuses a pipe that runs another class-transformer, which skips the @Transform of the probe", async () => {
		const pipe: ValidationPipe = new ValidationPipe({ transform: true, transformerPackage: { classToPlain: (value: unknown): unknown => value, plainToInstance: (type: new () => object, plain: object): object => Object.assign(new type(), plain) } as never });

		await expect(ApiControllerParametersAssertValidationPipePackages(pipe, ROUTE, "method")).rejects.toThrow(`${ROUTE} runs ValidationPipe from @UsePipes on the method with another class-transformer or class-validator`);
		expect(new ValidationPipe()).toBeInstanceOf(ValidationPipe);
	});

	it("refuses a pipe that runs another class-validator, which skips the rule of the probe", async () => {
		const pipe: ValidationPipe = new ValidationPipe({ validatorPackage: { validate: async (): Promise<Array<never>> => await Promise.resolve([]) } as never });

		await expect(ApiControllerParametersAssertValidationPipePackages(pipe, ROUTE, "controller")).rejects.toThrow(`${ROUTE} runs ValidationPipe from @UsePipes on the controller with another class-transformer or class-validator`);
		expect(new ValidationPipe()).toBeInstanceOf(ValidationPipe);
	});

	it("checks pipes run at once without mixing their probe values", async () => {
		await expect(Promise.all([ApiControllerParametersAssertValidationPipePackages(new ValidationPipe(), ROUTE, "method"), ApiControllerParametersAssertValidationPipePackages(new ValidationPipe({ transform: true }), ROUTE, "method")])).resolves.toEqual([undefined, undefined]);
	});
});
