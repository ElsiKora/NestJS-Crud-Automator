import type { IApiAuthorizationIamConditionValue, IApiAuthorizationIamToken } from "@interface/class/api/authorization";

import { EApiAuthorizationIamTokenType } from "@enum/class/authorization";
import { ErrorException } from "@utility/error/exception.utility";

// A variable path: a root and dot-separated segments of letters, digits, `_` and `-`.
const IAM_VARIABLE_PATH_PATTERN: RegExp = /^[A-Z]\w*(?:\.[\w-]+)*$/i;

// Opening of a variable or an escape.
const IAM_VARIABLE_OPENING: string = "${";

// Length of an escape body: the escaped character and the closing brace.
const IAM_VARIABLE_ESCAPE_LENGTH: number = 2;

// The escapes `${*}`, `${?}` and `${$}`, which read as the literal character.
const IAM_VARIABLE_ESCAPES: ReadonlySet<string> = new Set<string>(["?", "*", "$"]);

/**
 * The IAM variable tokenizer: reads `${root.path}` and `${root.path, 'default'}` variables and the `${*}`, `${?}` and
 * `${$}` escapes out of a pattern or a condition value, and resolves a condition value against the request context.
 */
export class ApiAuthorizationIamVariable {
	/**
	 * Reads a dot-separated path out of a value, walking only plain objects.
	 * @param {unknown} source - Value to read, such as the evaluation context.
	 * @param {string} path - Dot-separated path.
	 * @returns {unknown} The value at the path, or undefined when a segment on the way is not an object.
	 */
	public static readPath(source: unknown, path: string): unknown {
		let currentValue: unknown = source;

		for (const segment of path.split(".").filter(Boolean)) {
			if (!ApiAuthorizationIamVariable.isRecord(currentValue)) {
				return undefined;
			}

			currentValue = currentValue[segment];
		}

		return currentValue;
	}

	/**
	 * Resolves a condition value: a number or a boolean as written, a whole-string variable to the context value at its
	 * path, and any other string to its literal text with the escapes read.
	 * @param {IApiAuthorizationIamConditionValue} value - Condition value read by the grammar.
	 * @param {unknown} context - Evaluation context with the `principal`, `request` and `resource` roots.
	 * @returns {unknown} The value to compare.
	 */
	public static resolveValue(value: IApiAuthorizationIamConditionValue, context: unknown): unknown {
		if (typeof value.source !== "string") {
			return value.source;
		}

		const variableParts: Array<IApiAuthorizationIamToken> = value.parts.filter((part: IApiAuthorizationIamToken): boolean => part.type === EApiAuthorizationIamTokenType.VARIABLE);

		if (variableParts.length === 0) {
			return value.parts.map((part: IApiAuthorizationIamToken): string => part.value ?? "").join("");
		}

		const variablePart: IApiAuthorizationIamToken | undefined = variableParts[0];

		// The grammar refuses an embedded variable and a default until the engine evaluates them, so neither reaches here from a validated document.
		if (value.parts.length !== 1 || !variablePart?.variable || variablePart.variable.defaultValue !== undefined) {
			throw ErrorException(`IAM condition value "${value.source}" uses a variable form the engine does not evaluate yet`);
		}

		return ApiAuthorizationIamVariable.readPath(context, variablePart.variable.path);
	}

	/**
	 * Reads text into literal and variable tokens; in a pattern, `*` and `?` become wildcard tokens. Adjacent literal
	 * characters form one token, and an escape adds its character to the literal around it.
	 * @param {string} text - Pattern or condition value.
	 * @param {boolean} isPattern - Whether `*` and `?` are wildcards.
	 * @returns {Array<IApiAuthorizationIamToken> | undefined} Tokens, or undefined when a `${` has no valid variable or escape after it.
	 */
	public static tokenize(text: string, isPattern: boolean): Array<IApiAuthorizationIamToken> | undefined {
		const parts: Array<IApiAuthorizationIamToken> = [];
		let literal: string = "";
		let index: number = 0;

		const flushLiteral: () => void = (): void => {
			if (literal.length > 0) {
				parts.push({ type: EApiAuthorizationIamTokenType.LITERAL, value: literal });
				literal = "";
			}
		};

		while (index < text.length) {
			const character: string = text.charAt(index);

			if (text.startsWith(IAM_VARIABLE_OPENING, index)) {
				const variable: { end: number; part?: IApiAuthorizationIamToken } | undefined = ApiAuthorizationIamVariable.readVariable(text, index + IAM_VARIABLE_OPENING.length);

				if (!variable) {
					return undefined;
				}

				if (variable.part) {
					flushLiteral();
					parts.push(variable.part);
				} else {
					literal += text.charAt(index + IAM_VARIABLE_OPENING.length);
				}

				index = variable.end;

				continue;
			}

			if (isPattern && (character === "*" || character === "?")) {
				flushLiteral();
				parts.push({ type: character === "*" ? EApiAuthorizationIamTokenType.STAR : EApiAuthorizationIamTokenType.QUESTION_MARK });
			} else {
				literal += character;
			}

			index++;
		}

		flushLiteral();

		return parts;
	}

	/**
	 * Tells whether a value is a plain object whose properties can be read.
	 * @param {unknown} value - Value to check.
	 * @returns {boolean} Whether the value is a non-array object.
	 */
	private static isRecord(value: unknown): value is Record<string, unknown> {
		return Boolean(value) && typeof value === "object" && !Array.isArray(value);
	}

	/**
	 * Reads the body of one `${...}` after its opening `${`: an escape, a path, or a path with a quoted default.
	 * @param {string} text - Whole text.
	 * @param {number} start - Index after the opening `${`.
	 * @returns {{ end: number; part?: IApiAuthorizationIamToken } | undefined} Index after the closing `}`, with the variable token, or no token for an escape; undefined when the body is malformed.
	 */
	private static readVariable(text: string, start: number): { end: number; part?: IApiAuthorizationIamToken } | undefined {
		if (IAM_VARIABLE_ESCAPES.has(text.charAt(start)) && text.charAt(start + 1) === "}") {
			return { end: start + IAM_VARIABLE_ESCAPE_LENGTH };
		}

		let index: number = start;

		while (index < text.length && text.charAt(index) !== "}" && text.charAt(index) !== ",") {
			index++;
		}

		const path: string = text.slice(start, index).trim();

		if (!IAM_VARIABLE_PATH_PATTERN.test(path) || index >= text.length) {
			return undefined;
		}

		if (text.charAt(index) === "}") {
			return { end: index + 1, part: { type: EApiAuthorizationIamTokenType.VARIABLE, variable: { path } } };
		}

		index++;

		while (text.charAt(index) === " ") {
			index++;
		}

		if (text.charAt(index) !== "'") {
			return undefined;
		}

		const defaultEnd: number = text.indexOf("'", index + 1);

		if (defaultEnd === -1) {
			return undefined;
		}

		const defaultValue: string = text.slice(index + 1, defaultEnd);
		index = defaultEnd + 1;

		while (text.charAt(index) === " ") {
			index++;
		}

		if (text.charAt(index) !== "}") {
			return undefined;
		}

		return { end: index + 1, part: { type: EApiAuthorizationIamTokenType.VARIABLE, variable: { defaultValue, path } } };
	}
}
