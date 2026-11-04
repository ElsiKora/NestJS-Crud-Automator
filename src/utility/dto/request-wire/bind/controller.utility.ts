import { PATH_METADATA } from "@nestjs/common/internal";
import { DtoRequestWireBindRoute } from "@utility/dto/request-wire/bind/route.utility";

/**
 * Binds the request DTO classes of every route of a controller, inherited handlers included, with `DtoRequestWireBindRoute`.
 * It runs at bootstrap for each controller of the application, so a plain Nest route binds its DTOs as an `ApiMethod` route does when it is declared.
 * @param {object} controller - Controller class.
 * @returns {void}
 * @throws {Error} When a DTO class is read both from a JSON body and from a query or a path.
 */
export function DtoRequestWireBindController(controller: object): void {
	const seenMethodNames: Set<string> = new Set<string>(["constructor"]);

	for (let prototype: null | object = (controller as { prototype?: object }).prototype ?? null; prototype && prototype !== Object.prototype; prototype = Object.getPrototypeOf(prototype) as null | object) {
		for (const methodName of Object.getOwnPropertyNames(prototype)) {
			const handler: unknown = Object.getOwnPropertyDescriptor(prototype, methodName)?.value;

			if (seenMethodNames.has(methodName) || typeof handler !== "function" || Reflect.getMetadata(PATH_METADATA, handler) === undefined) {
				continue;
			}

			seenMethodNames.add(methodName);
			DtoRequestWireBindRoute(controller, methodName);
		}
	}
}
