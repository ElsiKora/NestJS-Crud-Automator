import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import type { ClassConstructor } from "class-transformer";
import type { ValidationError } from "class-validator";
import type { Observable } from "rxjs";

import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { Injectable } from "@nestjs/common";
import { PARAMTYPES_METADATA, ROUTE_ARGS_METADATA, RouteParamtypes } from "@nestjs/common/internal";
import { ApiControllerPathPlanGet } from "@utility/api/controller/path/plan/get.utility";
import { ApiRouteGetNonCanonicalUuidFailures } from "@utility/api/route/get-non-canonical-uuid-failures.utility";

interface IRequestUuidCanonicalTarget {
	dto: ClassConstructor<unknown>;
	key?: string;
	source: "body" | "query";
}

const PLAIN_PARAMETER_TYPES: ReadonlySet<unknown> = new Set<unknown>([Array, Boolean, Number, Object, String]);

/**
 * Refuses, on every route of `ApiMethod`, a body or query UUID that is not in lower case, where the route's `@Body()` or `@Query()` DTO validates the property as a UUID.
 * A database reads an upper-case UUID as the lower-case one while IAM compares text, so the value is refused with a `uuidNotCanonical` failure instead of being lower-cased. An interceptor runs after every guard and before any pipe, so the refusal is an `ApiRequestValidationException` with or without a host `ValidationPipe`, and no query has run.
 * The query of a generated GET_LIST is left to its filter parser, which refuses such a filter value with `FILTER_NOT_VALID`.
 */
@Injectable()
export class UuidCanonicalInterceptor implements NestInterceptor {
	private readonly TARGETS: WeakMap<object, WeakMap<object, Array<IRequestUuidCanonicalTarget>>> = new WeakMap<object, WeakMap<object, Array<IRequestUuidCanonicalTarget>>>();

	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request: { body?: unknown; query?: unknown } = context.switchToHttp().getRequest<{ body?: unknown; query?: unknown }>();
		const failures: Array<ValidationError> = [];

		for (const { dto, key, source } of this.resolveTargets(context.getClass(), context.getHandler())) {
			const sent: unknown = request[source];

			if (key === undefined) {
				failures.push(...ApiRouteGetNonCanonicalUuidFailures(dto, sent, ""));
			} else if (typeof sent === "object" && sent !== null && Object.hasOwn(sent, key)) {
				failures.push(...ApiRouteGetNonCanonicalUuidFailures(dto, Reflect.get(sent, key), key));
			}
		}

		if (failures.length > 0) {
			throw new ApiRequestValidationException(failures);
		}

		return next.handle();
	}

	/**
	 * Reads the DTO classes a pipe would validate the body and query of a handler with, once per controller and handler.
	 * @param {object} controller - Controller class that serves the route.
	 * @param {object} handler - Handler function.
	 * @returns {Array<IRequestUuidCanonicalTarget>} Each `@Body()` and `@Query()` argument typed as a class, with the key it reads when it names one.
	 */
	private resolveTargets(controller: object, handler: object): Array<IRequestUuidCanonicalTarget> {
		let handlerTargets: undefined | WeakMap<object, Array<IRequestUuidCanonicalTarget>> = this.TARGETS.get(controller);
		const cached: Array<IRequestUuidCanonicalTarget> | undefined = handlerTargets?.get(handler);

		if (cached) {
			return cached;
		}

		const targets: Array<IRequestUuidCanonicalTarget> = [];
		const prototype: unknown = (controller as { prototype?: unknown }).prototype;
		const methodName: string | undefined = typeof prototype === "object" && prototype !== null ? findMethodName(prototype, handler) : undefined;

		if (methodName !== undefined && typeof prototype === "object" && prototype !== null) {
			const routeArguments: Record<string, { data?: unknown; index: number }> = (Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, methodName) ?? {}) as Record<string, { data?: unknown; index: number }>;
			const parameterTypes: Array<unknown> = (Reflect.getMetadata(PARAMTYPES_METADATA, prototype, methodName) ?? []) as Array<unknown>;
			const sources: Map<string, "body" | "query"> = new Map<string, "body" | "query">([[String(RouteParamtypes.BODY), "body"]]);

			// The only query of a generated route is a GET_LIST query, whose filter parser refuses such a value.
			if (ApiControllerPathPlanGet(prototype, methodName) === undefined) {
				sources.set(String(RouteParamtypes.QUERY), "query");
			}

			for (const [argumentKey, argument] of Object.entries(routeArguments)) {
				const source: "body" | "query" | undefined = sources.get(argumentKey.split(":")[0] ?? "");
				const dto: unknown = parameterTypes[argument.index];

				if (source && typeof dto === "function" && !PLAIN_PARAMETER_TYPES.has(dto)) {
					targets.push({ dto: dto as ClassConstructor<unknown>, key: typeof argument.data === "string" ? argument.data : undefined, source });
				}
			}
		}

		handlerTargets ??= new WeakMap<object, Array<IRequestUuidCanonicalTarget>>();
		handlerTargets.set(handler, targets);
		this.TARGETS.set(controller, handlerTargets);

		return targets;
	}
}

/**
 * Finds the name under which a controller prototype, or one it inherits from, holds a handler.
 * @param {object} prototype - Controller prototype.
 * @param {object} handler - Handler function.
 * @returns {string | undefined} The method name, or undefined when no prototype holds the handler.
 */
function findMethodName(prototype: object, handler: object): string | undefined {
	for (let current: null | object = prototype; current && current !== Object.prototype; current = Object.getPrototypeOf(current) as null | object) {
		for (const name of Object.getOwnPropertyNames(current)) {
			if (name !== "constructor" && Object.getOwnPropertyDescriptor(current, name)?.value === handler) {
				return name;
			}
		}
	}

	return undefined;
}
