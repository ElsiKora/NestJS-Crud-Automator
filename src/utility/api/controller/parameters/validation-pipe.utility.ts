import type { Type } from "@nestjs/common";

import { ValidationPipe } from "@nestjs/common";
import { PIPES_METADATA } from "@nestjs/common/internal";
import { ErrorException } from "@utility/error/exception.utility";
import { Expose, Transform } from "class-transformer";
import { ValidateBy } from "class-validator";

// The prefix class-transformer puts before a probe value, and the probe values a real class-validator has seen.
const PROBE_KEPT_PREFIX: string = "crud-automator-probe-kept:";
const PROBE_SEEN_VALUES: Set<string> = new Set<string>();
let probeCounter: number = 0;
let probeClass: Type<unknown> | undefined;

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
 * Nest keeps `transformerPackage` and `validatorPackage` in variables shared by every `ValidationPipe` of the process, not on the instance, so the pipe is run once on a probe DTO: another class-transformer would skip its `@Transform`, and another class-validator would skip its rule, either of which could give the handler another value than the policy saw.
 * The probe passes every check, so the pipe never calls its `exceptionFactory`; it does run the packages of the pipe, which is what is checked. The probe DTO is declared on the first check, see {@link getProbeClass}.
 * @param {ValidationPipe} pipe - Pipe instance that Nest runs.
 * @param {string} route - Controller and method, for the error message.
 * @param {"controller" | "method"} place - Where `@UsePipes` declares the pipe.
 * @returns {Promise<void>} Resolves when the pipe reads the probe as the guard does.
 * @throws {Error} When the pipe reads the probe with other packages.
 */
export async function ApiControllerParametersAssertValidationPipePackages(pipe: ValidationPipe, route: string, place: "controller" | "method"): Promise<void> {
	probeCounter += 1;
	const sent: string = String(probeCounter);
	const kept: string = `${PROBE_KEPT_PREFIX}${sent}`;

	await pipe.transform({ value: sent }, { data: undefined, metatype: getProbeClass(), type: "param" }).catch((): undefined => undefined);

	const isRead: boolean = PROBE_SEEN_VALUES.has(kept);
	PROBE_SEEN_VALUES.delete(kept);
	PROBE_SEEN_VALUES.delete(sent);

	if (!isRead) {
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

/**
 * Returns the probe DTO, declared on first use, so an application without `ValidationPipe` in `@UsePipes` on a route with a path parameter never registers it.
 * Its one property is changed by a `@Transform` and checked by a class-validator rule that records the value it sees and always accepts it, so a pipe never fails on it and never calls its `exceptionFactory`.
 * Declaring it leaves one class in the metadata of class-transformer and class-validator for the life of the process, with a property named `value`.
 * @returns {Type<unknown>} The probe DTO class.
 */
function getProbeClass(): Type<unknown> {
	if (probeClass) {
		return probeClass;
	}

	class ApiControllerParametersValidationPipeProbe {
		@Expose()
		@Transform(({ value }: { value: unknown }): string => `${PROBE_KEPT_PREFIX}${String(value)}`, { toClassOnly: true })
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		@ValidateBy({ name: "crudAutomatorValidationPipeProbe", validator: { validate: recordProbeValue } }, { always: true })
		public value!: string;
	}

	probeClass = ApiControllerParametersValidationPipeProbe;

	return probeClass;
}

/**
 * Records a value the probe rule sees and accepts it.
 * @param {unknown} value - Value of the probe property after class-transformer.
 * @returns {boolean} Always true, so the pipe never fails on the probe.
 */
function recordProbeValue(value: unknown): boolean {
	if (typeof value === "string") {
		PROBE_SEEN_VALUES.add(value);
	}

	return true;
}
