import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";

/**
 * Owns the generated-route authorization decision used after guard execution.
 * Subscriber-facing decisions are detached views and can never mutate this snapshot.
 */
export class ApiControllerGeneratedSecuritySnapshot {
	public static create<E extends IApiBaseEntity, R>(decision: IApiAuthorizationDecision<E, R> | undefined): IApiAuthorizationDecision<E, R> | undefined {
		return decision ? freezeValue(cloneValue(decision)) : undefined;
	}

	public static createMutableScopeWhere<E extends IApiBaseEntity, R>(snapshot: IApiAuthorizationDecision<E, R> | undefined): TApiAuthorizationScopeWhere<E> {
		return cloneValue(snapshot?.scope?.where);
	}

	public static createSubscriberView<E extends IApiBaseEntity, R>(snapshot: IApiAuthorizationDecision<E, R> | undefined, resource?: E): IApiAuthorizationDecision<E, R> | undefined {
		if (!snapshot) {
			return undefined;
		}

		const view: IApiAuthorizationDecision<E, R> = cloneValue(snapshot);

		if (resource !== undefined) {
			view.resource = resource;
		}

		return view;
	}

	public static detach<T>(value: T): T {
		return cloneValue(value);
	}

	public static withResource<E extends IApiBaseEntity, R>(snapshot: IApiAuthorizationDecision<E, R> | undefined, resource: E | undefined): IApiAuthorizationDecision<E, R> | undefined {
		if (!snapshot || resource === undefined) {
			return snapshot;
		}

		return Object.freeze({
			...snapshot,
			resource,
		});
	}
}

/**
 * Clones a security graph through own descriptors so no mutable container aliases its source.
 * Function values are intentionally retained as executable identities; their containers are detached.
 * @template T - Value type.
 * @param {T} value - Value to clone.
 * @returns {T} Detached clone.
 */
function cloneValue<T>(value: T): T {
	return cloneValueWithReferences(value, new WeakMap<object, object>());
}

/**
 * Clones one value while preserving cycles within the detached graph.
 * @template T - Value type.
 * @param {T} value - Current value.
 * @param {WeakMap<object, object>} references - Source-to-clone references.
 * @returns {T} Detached value.
 */
function cloneValueWithReferences<T>(value: T, references: WeakMap<object, object>): T {
	if (value === null || typeof value !== "object") {
		return value;
	}

	const source: object = value;
	const existing: object | undefined = references.get(source);

	if (existing) {
		return existing as T;
	}

	if (value instanceof Date) {
		return new Date(value) as T;
	}

	if (value instanceof RegExp) {
		return new RegExp(value.source, value.flags) as T;
	}

	if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
		return structuredClone(value);
	}

	if (value instanceof Map) {
		const clone: Map<unknown, unknown> = new Map<unknown, unknown>();

		references.set(source, clone);

		for (const [key, item] of value) {
			clone.set(cloneValueWithReferences(key, references), cloneValueWithReferences(item, references));
		}

		return clone as T;
	}

	if (value instanceof Set) {
		const clone: Set<unknown> = new Set<unknown>();

		references.set(source, clone);

		for (const item of value) {
			clone.add(cloneValueWithReferences(item, references));
		}

		return clone as T;
	}

	const clone: object = Array.isArray(value) ? [] : (Object.create(Object.getPrototypeOf(value) as null | object) as object);

	references.set(source, clone);

	for (const key of Reflect.ownKeys(source)) {
		if (Array.isArray(value) && key === "length") {
			continue;
		}

		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(source, key);

		if (!descriptor) {
			continue;
		}

		Object.defineProperty(clone, key, {
			...descriptor,
			// Subscriber views must remain independently mutable even when cloned from a frozen canonical snapshot.
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			configurable: true,
			...("value" in descriptor
				? {
						value: cloneValueWithReferences(descriptor.value, references),
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						writable: true,
					}
				: {}),
		});
	}

	return clone as T;
}

/**
 * Recursively freezes detached security containers without mutating executable function identities.
 * @template T - Value type.
 * @param {T} value - Detached value.
 * @returns {T} Deeply frozen value.
 */
function freezeValue<T>(value: T): T {
	freezeValueWithReferences(value, new WeakSet<object>());

	return value;
}

/**
 * Freezes one detached value while preserving cyclic graphs.
 * @param {unknown} value - Current value.
 * @param {WeakSet<object>} references - Already visited objects.
 * @returns {void}
 */
function freezeValueWithReferences(value: unknown, references: WeakSet<object>): void {
	if (!value || typeof value !== "object" || references.has(value)) {
		return;
	}

	references.add(value);

	if (value instanceof Map) {
		for (const [key, item] of value) {
			freezeValueWithReferences(key, references);
			freezeValueWithReferences(item, references);
		}
	} else if (value instanceof Set) {
		for (const item of value) {
			freezeValueWithReferences(item, references);
		}
	} else {
		for (const key of Reflect.ownKeys(value)) {
			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);

			if (descriptor && "value" in descriptor) {
				freezeValueWithReferences(descriptor.value, references);
			}
		}
	}

	if (!ArrayBuffer.isView(value)) {
		Object.freeze(value);
	}
}
