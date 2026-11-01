import { DtoSchemaNameStripSuffix } from "@utility/dto/schema-name/strip-suffix.utility";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Turns a property or variant name into the segment that it adds to a nested generated DTO name.
 * Separators (`_`, `-`, `.` and spaces) are removed, the first letter and every letter after a separator are uppercased, every other letter is kept as written,
 * and a trailing `DTO` in any case is removed unless nothing else is left, so `userID` gives `UserID`, `HTMLContent` gives `HTMLContent`, `created_by` gives `CreatedBy`, `pageDto` gives `Page` and `dto` gives `Dto`.
 * @param {string} value - Property or variant name.
 * @param {string} hostName - Name of the DTO that holds the property or variant, for the error.
 * @returns {string} The PascalCase name segment.
 * @throws {Error} When the name consists of separators only, because the nested DTO would get the name of its host.
 */
export function DtoSchemaNameGetSegment(value: string, hostName: string): string {
	const segment: string = value
		.split(/[\s._-]+/)
		.map((part: string): string => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");

	if (segment === "") {
		throw ErrorException(`Property or variant "${value}" of ${hostName} leaves nothing for its generated DTO name once separators are removed. Rename the property or variant`);
	}

	return DtoSchemaNameStripSuffix(segment);
}
