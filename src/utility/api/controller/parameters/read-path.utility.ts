import { ErrorException } from "@utility/error/exception.utility";

// A name as path-to-regexp reads it after ":", plain or quoted; find-my-way names are a subset of the plain form.
const PATH_PARAMETER_PATTERN: RegExp = /:(?:"(?<quoted>(?:[^"\\]|\\.)*)"|(?<plain>[$_\p{ID_Start}][$\u200C\u200D\p{ID_Continue}]*))/gu;

/**
 * Lists the path parameters of one part of a route path: the global prefix, the `RouterModule` path, the controller path, or the route path.
 * A wildcard (`*`, `*name`, `{*name}`) is refused, because its value reaches a policy and the handler under no name a PARAMETERS DTO can describe: Fastify names it `*`, and Express keeps it out of what a policy reads while the handler gets it.
 * @param {unknown} path - Nest path metadata or a prefix: a string or a list of strings.
 * @param {string} route - Controller and method, for the error message.
 * @returns {Array<string>} Parameter names, in path order.
 * @throws {Error} When the path has a wildcard.
 */
export function ApiControllerParametersReadPath(path: unknown, route: string): Array<string> {
	const parameters: Array<string> = [];

	for (const entry of [path].flat()) {
		if (typeof entry !== "string") {
			continue;
		}

		if (entry.includes("*")) {
			throw ErrorException(`${route} is served under the wildcard path "${entry}", whose value reaches a policy and the handler under no name a PARAMETERS DTO can describe: name each value as a path parameter, such as ":name", and describe it in the PARAMETERS DTO`);
		}

		for (const match of entry.matchAll(PATH_PARAMETER_PATTERN)) {
			parameters.push(match.groups?.quoted ?? match.groups?.plain ?? "");
		}
	}

	return parameters;
}
