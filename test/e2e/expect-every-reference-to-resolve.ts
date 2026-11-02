import type { OpenAPIObject } from "@nestjs/swagger";

import { expect } from "vitest";

/**
 * Asserts that every component reference of a document points at a component of that document.
 * @param {OpenAPIObject} openApiDocument - The generated document.
 * @returns {void}
 */
export function expectEveryReferenceToResolve(openApiDocument: OpenAPIObject): void {
	const references: Array<string> = [...JSON.stringify(openApiDocument).matchAll(/"#\/components\/schemas\/([^"]+)"/g)].map((match: RegExpExecArray): string => match[1] as string);

	expect(references.length).toBeGreaterThan(0);
	expect(references.filter((name: string): boolean => !openApiDocument.components?.schemas?.[name])).toEqual([]);
}
