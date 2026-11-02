import { ErrorException } from "@utility/error/exception.utility";

// A name as path-to-regexp, the router of Express, reads it after ":", plain or quoted.
// An escaped character ("\\:") is literal text, so it is matched first and names nothing; "::" never reaches a request, because path-to-regexp refuses it.
const PATH_TO_REGEXP_PARAMETER_PATTERN: RegExp = /\\.|::|:(?:"(?<quoted>(?:[^"\\]|\\.)*)"|(?<plain>[$_\p{ID_Start}][$\u200C\u200D\p{ID_Continue}]*))/gu;

// An escaped character, which path-to-regexp reads as literal text.
const ESCAPED_CHARACTER_PATTERN: RegExp = /\\./gu;

// A doubled colon, which find-my-way reads as one literal colon.
const LITERAL_COLON: string = "::";

// The characters that end a name for find-my-way, the router of Fastify: a regular expression, a static part, or the next segment.
const FIND_MY_WAY_NAME_ENDS: ReadonlySet<string> = new Set<string>(["-", ".", "(", "/"]);

/**
 * Lists the path parameters of one part of a route path: the global prefix, the `RouterModule` path, the controller path, or the route path, as the router of the running HTTP adapter reads it.
 * - Express (path-to-regexp) reads `:name` and `:"name"`, and `\:x` is literal text.
 * - Fastify (find-my-way) reads `:name` up to `(`, `-`, `.` or `/`, and `a::b` is literal text; it does not read `\` as an escape, so `\:x` names the parameter `x`.
 * - Another adapter, or none known, gets every name either router reads, so no parameter it serves can be missed.
 * A wildcard (`*`, `*name`, `{*name}`) is refused, because its value reaches a policy and the handler under no name a PARAMETERS DTO can describe: Fastify names it `*`, and Express keeps it out of what a policy reads while the handler gets it.
 * @param {unknown} path - Nest path metadata or a prefix: a string or a list of strings.
 * @param {string} route - Controller and method, for the error message.
 * @param {string | undefined} adapterType - Type of the running HTTP adapter, `express` or `fastify`, as `AbstractHttpAdapter.getType()` names it.
 * @returns {Array<string>} Parameter names, in path order.
 * @throws {Error} When the path has a wildcard.
 */
export function ApiControllerParametersReadPath(path: unknown, route: string, adapterType: string | undefined): Array<string> {
	const parameters: Array<string> = [];

	for (const entry of [path].flat()) {
		if (typeof entry !== "string") {
			continue;
		}

		// Only path-to-regexp reads "\*" as literal text; find-my-way serves a wildcard at any "*".
		if ((adapterType === "express" ? entry.replaceAll(ESCAPED_CHARACTER_PATTERN, "") : entry).includes("*")) {
			throw ErrorException(`${route} is served under the wildcard path "${entry}", whose value reaches a policy and the handler under no name a PARAMETERS DTO can describe: name each value as a path parameter, such as ":name", and describe it in the PARAMETERS DTO`);
		}

		const names: Array<string> = [...(adapterType === "fastify" ? [] : readPathToRegexpParameters(entry)), ...(adapterType === "express" ? [] : readFindMyWayParameters(entry))];

		for (const name of names) {
			if (!parameters.includes(name)) {
				parameters.push(name);
			}
		}
	}

	return parameters;
}

/**
 * Finds the parenthesis that closes a find-my-way regular expression, skipping escaped characters, as find-my-way does.
 * @param {string} entry - Route path.
 * @param {number} start - Index of the opening parenthesis.
 * @returns {number} Index of the closing parenthesis, or the path length when there is none.
 */
function findClosingParenthesis(entry: string, start: number): number {
	let depth: number = 1;

	for (let index: number = start + 1; index < entry.length; index++) {
		if (entry[index] === "\\") {
			index++;

			continue;
		}

		if (entry[index] === ")") {
			depth--;
		} else if (entry[index] === "(") {
			depth++;
		}

		if (depth === 0) {
			return index;
		}
	}

	return entry.length;
}

/**
 * Lists the parameter names find-my-way reads from a route path.
 * @param {string} entry - Route path.
 * @returns {Array<string>} Parameter names, in path order.
 */
function readFindMyWayParameters(entry: string): Array<string> {
	const names: Array<string> = [];
	let index: number = 0;

	while (index < entry.length) {
		if (entry[index] !== ":") {
			index++;

			continue;
		}

		if (entry.startsWith(LITERAL_COLON, index)) {
			index += LITERAL_COLON.length;

			continue;
		}

		let end: number = index + 1;

		while (end < entry.length && !FIND_MY_WAY_NAME_ENDS.has(entry[end] ?? "")) {
			end++;
		}

		names.push(entry.slice(index + 1, end));
		index = entry[end] === "(" ? findClosingParenthesis(entry, end) + 1 : end;
	}

	return names;
}

/**
 * Lists the parameter names path-to-regexp reads from a route path.
 * @param {string} entry - Route path.
 * @returns {Array<string>} Parameter names, in path order.
 */
function readPathToRegexpParameters(entry: string): Array<string> {
	const names: Array<string> = [];

	for (const match of entry.matchAll(PATH_TO_REGEXP_PARAMETER_PATTERN)) {
		const name: string | undefined = match.groups?.quoted ?? match.groups?.plain;

		if (name !== undefined) {
			names.push(name);
		}
	}

	return names;
}
