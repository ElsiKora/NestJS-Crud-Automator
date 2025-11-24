import type { Type } from "@nestjs/common";
import type { IDtoAutoContextMetadata } from "@type/auto-context-metadata.type";

import { DTO_AUTO_CONTEXT_METADATA_KEY } from "@constant/dto/auto-context.constant";
import { FlushAutoDtoContextExecutions } from "@utility/auto-dto-context-queue.utility";

const AUTO_DTO_CHILDREN: WeakMap<object, Set<Type<unknown>>> = new WeakMap<object, Set<Type<unknown>>>();

/**
 * Returns registered child DTO constructors for the provided parent prototype.
 * @param {object} parentPrototype - Parent DTO prototype.
 * @returns {Set<Type<unknown>> | undefined} Set of registered child constructors.
 */
export function GetRegisteredAutoDtoChildren(parentPrototype: object): Set<Type<unknown>> | undefined {
	return AUTO_DTO_CHILDREN.get(parentPrototype);
}

/**
 * Registers DTO constructors as children of the provided parent prototype.
 * Used to propagate auto DTO context to nested manual DTOs.
 * @param {object} parentPrototype - Parent DTO prototype.
 * @param {unknown} child - Child constructor or array of constructors.
 */
export function RegisterAutoDtoChild(parentPrototype: object, child: unknown): void {
	if (!parentPrototype || !child) return;

	if (Array.isArray(child)) {
		for (const entry of child) {
			RegisterAutoDtoChild(parentPrototype, entry);
		}

		return;
	}

	if (typeof child === "function") {
		const childConstructor: Type<unknown> = child as Type<unknown>;
		let children: Set<Type<unknown>> | undefined = AUTO_DTO_CHILDREN.get(parentPrototype);

		if (!children) {
			children = new Set<Type<unknown>>();
			AUTO_DTO_CHILDREN.set(parentPrototype, children);
		}

		if (!children.has(childConstructor)) {
			children.add(childConstructor);
			inheritExistingContexts(parentPrototype, childConstructor.prototype as object);
		}
	}
}

/**
 * Copies currently active auto DTO contexts from parent prototype to child prototype.
 * @param {object} parentPrototype - Parent DTO prototype.
 * @param {object} childPrototype - Child DTO prototype.
 */
function inheritExistingContexts(parentPrototype: object, childPrototype: object): void {
	const parentStack: Array<IDtoAutoContextMetadata> | undefined = Reflect.getMetadata?.(DTO_AUTO_CONTEXT_METADATA_KEY, parentPrototype) as Array<IDtoAutoContextMetadata> | undefined;

	if (!parentStack || parentStack.length === 0) {
		return;
	}

	const childStack: Array<IDtoAutoContextMetadata> = (Reflect.getMetadata?.(DTO_AUTO_CONTEXT_METADATA_KEY, childPrototype) as Array<IDtoAutoContextMetadata>) ?? [];

	if (childStack.length < parentStack.length) {
		const updatedStack: Array<IDtoAutoContextMetadata> = [...childStack, ...parentStack.slice(childStack.length)];
		Reflect.defineMetadata?.(DTO_AUTO_CONTEXT_METADATA_KEY, updatedStack, childPrototype);
		FlushAutoDtoContextExecutions(childPrototype);
	}

	const grandchildren: Set<Type<unknown>> | undefined = AUTO_DTO_CHILDREN.get(childPrototype);

	if (!grandchildren) return;

	for (const grandchild of grandchildren) {
		inheritExistingContexts(childPrototype, grandchild.prototype as object);
	}
}
