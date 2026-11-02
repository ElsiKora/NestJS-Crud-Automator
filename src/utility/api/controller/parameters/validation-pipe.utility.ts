import { ValidationPipe } from "@nestjs/common";
import { PIPES_METADATA } from "@nestjs/common/internal";
import { ErrorException } from "@utility/error/exception.utility";
import { Expose, Transform } from "class-transformer";
import { Equals } from "class-validator";

// The value the probe DTO gives its property, through class-transformer, and the value it refuses, through class-validator.
const PROBE_KEPT_VALUE: string = "crud-automator-probe-kept";
const PROBE_REFUSED_VALUE: string = "crud-automator-probe-refused";

/**
 * A DTO whose property class-transformer replaces and class-validator then accepts, so a pipe that reads it with other packages refuses it.
 */
class ApiControllerParametersValidationPipeKeptProbe {
	// eslint-disable-next-line @elsikora/typescript/naming-convention
	@Equals(PROBE_KEPT_VALUE, { always: true })
	@Expose()
	@Transform((): string => PROBE_KEPT_VALUE, { toClassOnly: true })
	public value!: string;
}

/**
 * A DTO whose property class-validator refuses, so a pipe that accepts it validates with another package.
 */
class ApiControllerParametersValidationPipeRefusedProbe {
	// eslint-disable-next-line @elsikora/typescript/naming-convention
	@Equals(PROBE_REFUSED_VALUE, { always: true })
	@Expose()
	public value!: string;
}

/**
 * Rejects a `ValidationPipe` instance in `@UsePipes` whose `expectedType` replaces the PARAMETERS DTO with another class, which would convert a path value by another rule than the guard ran.
 * @param {unknown} pipe - A `ValidationPipe` entry of `@UsePipes`, as a class or an instance.
 * @param {string} route - Controller and method, for the error message.
 * @param {"controller" | "method"} place - Where `@UsePipes` declares the pipe.
 * @returns {void}
 * @throws {Error} When the instance has an `expectedType`.
 */
export function ApiControllerParametersAssertValidationPipeOptions(pipe: unknown, route: string, place: "controller" | "method"): void {
	if (pipe instanceof ValidationPipe && (pipe as unknown as { expectedType?: unknown }).expectedType !== undefined) {
		throw ErrorException(`${route} runs ValidationPipe from @UsePipes on the ${place} with expectedType, which converts a path value as another class than the PARAMETERS DTO, so the handler could read another value than the policy saw: remove expectedType`);
	}
}

/**
 * Checks that a `ValidationPipe` converts a path value with the class-transformer and class-validator a PARAMETERS DTO is declared with.
 * Nest keeps `transformerPackage` and `validatorPackage` in variables shared by every `ValidationPipe` of the process, not on the instance, so the pipe is run on two probe DTOs: another class-transformer would skip a `@Transform`, and another class-validator would skip a rule, either of which could give the handler another value than the policy saw.
 * @param {ValidationPipe} pipe - Pipe instance that Nest runs.
 * @param {string} route - Controller and method, for the error message.
 * @param {"controller" | "method"} place - Where `@UsePipes` declares the pipe.
 * @returns {Promise<void>} Resolves when the pipe reads the probes as the guard does.
 * @throws {Error} When the pipe reads a probe with other packages.
 */
export async function ApiControllerParametersAssertValidationPipePackages(pipe: ValidationPipe, route: string, place: "controller" | "method"): Promise<void> {
	const isKeptAccepted: boolean = await pipe.transform({ value: "probe" }, { data: undefined, metatype: ApiControllerParametersValidationPipeKeptProbe, type: "param" }).then(
		(): boolean => true,
		(): boolean => false,
	);

	const isRefusedAccepted: boolean = await pipe.transform({ value: "probe" }, { data: undefined, metatype: ApiControllerParametersValidationPipeRefusedProbe, type: "param" }).then(
		(): boolean => true,
		(): boolean => false,
	);

	if (!isKeptAccepted || isRefusedAccepted) {
		throw ErrorException(`${route} runs ValidationPipe from @UsePipes on the ${place} with another class-transformer or class-validator than its PARAMETERS DTO is declared with, set by transformerPackage or validatorPackage on some ValidationPipe of the application, so it could convert a path value to another value than the policy saw: remove transformerPackage and validatorPackage`);
	}
}

/**
 * Lists the `ValidationPipe` entries of `@UsePipes` on a handler and on its controller, as a class or an instance.
 * @param {object} controller - Controller class.
 * @param {object} handler - Handler function.
 * @returns {Array<{ pipe: unknown; place: "controller" | "method" }>} Each `ValidationPipe` entry, with where it is declared.
 */
export function ApiControllerParametersReadValidationPipes(controller: object, handler: object): Array<{ pipe: unknown; place: "controller" | "method" }> {
	const entries: Array<{ pipe: unknown; place: "controller" | "method" }> = [];

	for (const [place, target] of [
		["method", handler],
		["controller", controller],
	] as const) {
		for (const pipe of (Reflect.getMetadata(PIPES_METADATA, target) as Array<unknown> | undefined) ?? []) {
			if (pipe === ValidationPipe || (pipe as { constructor?: unknown } | null | undefined)?.constructor === ValidationPipe) {
				entries.push({ pipe, place });
			}
		}
	}

	return entries;
}
