import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { isDeepStrictEqual } from "node:util";

import { ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated/security-snapshot.class";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Isolates generated mutation hydration from GET AFTER subscriber replacements and mutations.
 */
export class ApiControllerGeneratedWriteHydrationContract {
	public static assertUnchanged<E extends IApiBaseEntity>(rawItem: E, rawSnapshot: E, subscriberItem: E, subscriberSnapshot: E, subscriberResult: E | undefined, allowedRootAccessors: ReadonlySet<PropertyKey>): void {
		this.assertDataGraph(rawItem, allowedRootAccessors);
		this.assertDataGraph(subscriberItem, allowedRootAccessors);

		if ((subscriberResult !== undefined && subscriberResult !== subscriberItem) || !isDeepStrictEqual(rawItem, rawSnapshot) || !isDeepStrictEqual(subscriberItem, subscriberSnapshot)) {
			throw ErrorException("Generated mutation GET subscriber changed the protected hydration entity");
		}
	}

	public static createSnapshot<E extends IApiBaseEntity>(item: E, allowedRootAccessors: ReadonlySet<PropertyKey>): E {
		this.assertDataGraph(item, allowedRootAccessors);

		return ApiControllerGeneratedSecuritySnapshot.detach(item);
	}

	private static assertDataGraph(value: unknown, allowedRootAccessors: ReadonlySet<PropertyKey>, visited: WeakSet<object> = new WeakSet<object>(), isRoot: boolean = true): void {
		if (typeof value === "function") {
			throw ErrorException("Generated mutation hydration entity cannot contain function values");
		}

		if (!value || typeof value !== "object" || visited.has(value)) {
			return;
		}

		visited.add(value);

		if (value instanceof ArrayBuffer || ArrayBuffer.isView(value) || value instanceof Date || value instanceof RegExp) {
			return;
		}

		if (value instanceof Promise || value instanceof WeakMap || value instanceof WeakSet) {
			throw ErrorException("Generated mutation hydration entity contains an unsupported mutable value");
		}

		if (value instanceof Map) {
			for (const [key, item] of value) {
				this.assertDataGraph(key, allowedRootAccessors, visited, false);
				this.assertDataGraph(item, allowedRootAccessors, visited, false);
			}

			return;
		}

		if (value instanceof Set) {
			for (const item of value) {
				this.assertDataGraph(item, allowedRootAccessors, visited, false);
			}

			return;
		}

		for (const key of Reflect.ownKeys(value)) {
			if (Array.isArray(value) && key === "length") {
				continue;
			}

			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);

			if (!descriptor) {
				continue;
			}

			if (!("value" in descriptor)) {
				if (isRoot && !descriptor.enumerable && allowedRootAccessors.has(key)) {
					continue;
				}

				throw ErrorException("Generated mutation hydration entity must contain data properties only");
			}

			this.assertDataGraph(descriptor.value, allowedRootAccessors, visited, false);
		}
	}
}
