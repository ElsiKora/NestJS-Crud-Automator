import type { OpenAPIObject } from "@nestjs/swagger";

import { expect } from "vitest";

const COMPONENT_REFERENCE_PATTERN: RegExp = /"#\/components\/schemas\/([^"]+)"/g;

/**
 * Finds the components that no route of a document reaches, directly or through other components.
 * A parameters or query DTO does not count: Swagger flattens it into the parameters of its operation, and the package still lists the DTO as a component on purpose.
 * @param {OpenAPIObject} openApiDocument - The generated document.
 * @returns {Array<string>} Sorted names of the unreachable components.
 */
export function findUnreachableComponents(openApiDocument: OpenAPIObject): Array<string> {
	const schemas: Record<string, { properties?: Record<string, unknown> }> = (openApiDocument.components?.schemas ?? {}) as Record<string, { properties?: Record<string, unknown> }>;
	const getReferences = (value: unknown): Array<string> => [...JSON.stringify(value ?? {}).matchAll(COMPONENT_REFERENCE_PATTERN)].map((match: RegExpExecArray): string => match[1] as string);
	const reached: Set<string> = new Set<string>();
	const pending: Array<string> = getReferences(openApiDocument.paths);

	while (pending.length > 0) {
		const name: string = pending.pop() as string;

		if (!reached.has(name)) {
			reached.add(name);
			pending.push(...getReferences(schemas[name]));
		}
	}

	const operationParameters: Array<Set<string>> = Object.values(openApiDocument.paths).flatMap((path: object): Array<Set<string>> => Object.values(path).map((operation: { parameters?: Array<{ name?: string }> }): Set<string> => new Set<string>((operation.parameters ?? []).map((parameter: { name?: string }): string => parameter.name ?? ""))));
	const isFlattened = (name: string): boolean => {
		const properties: Array<string> = Object.keys(schemas[name]?.properties ?? {});

		return properties.length > 0 && operationParameters.some((parameters: Set<string>): boolean => properties.every((property: string): boolean => parameters.has(property)));
	};

	return Object.keys(schemas)
		.filter((name: string): boolean => !reached.has(name) && !isFlattened(name))
		.toSorted();
}

/**
 * Asserts that a route of a document reaches every component of that document.
 * @param {OpenAPIObject} openApiDocument - The generated document.
 * @param {ReadonlyArray<string>} [expected] - Components that no route reaches on purpose, such as an extra model that a consumer declares.
 * @returns {void}
 */
export function expectEveryComponentToBeReachable(openApiDocument: OpenAPIObject, expected: ReadonlyArray<string> = []): void {
	expect(findUnreachableComponents(openApiDocument)).toEqual([...expected].toSorted());
}
