import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationIamConditionValue, IApiAuthorizationIamToken, IApiAuthorizationPrincipal, IApiAuthorizationRequestMetadata } from "@interface/class/api/authorization";

import { EApiAuthorizationIamTokenType } from "@enum/class/authorization";
import { AuthorizationSerializeValue } from "@utility/authorization/serialize-value.utility";

// Prefix of a variable that reads the loaded resource.
const IAM_VARIABLE_RESOURCE_PREFIX: string = "resource.";

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
	 * Builds the context a condition key and a variable read for one request.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {IApiAuthorizationPrincipal} principal - Principal.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} requestMetadata - Request metadata.
	 * @param {E} [resource] - Loaded resource, when available.
	 * @returns {Record<string, unknown>} The `principal`, `request` and `resource` roots.
	 */
	public static createContext<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(principal: IApiAuthorizationPrincipal, requestMetadata: IApiAuthorizationRequestMetadata<E, M>, resource?: E): Record<string, unknown> {
		return {
			principal,
			request: {
				body: requestMetadata.body,
				headers: requestMetadata.headers,
				ip: requestMetadata.ip,
				parameters: requestMetadata.parameters,
				query: requestMetadata.query,
				sourceIp: requestMetadata.ip,
				time: requestMetadata.time,
			},
			resource,
		};
	}

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
	 * Resolves the tokens of a pattern for one request: a variable becomes a literal of its text, so a `*` or `?` it
	 * holds is no wildcard.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} tokens - Pattern tokens read by the grammar.
	 * @param {unknown} context - Evaluation context with the `principal`, `request` and `resource` roots.
	 * @returns {Array<IApiAuthorizationIamToken> | undefined} Literal, `*` and `?` tokens, or undefined when a variable does not resolve.
	 */
	public static resolveTokens(tokens: ReadonlyArray<IApiAuthorizationIamToken>, context: unknown): Array<IApiAuthorizationIamToken> | undefined {
		const resolved: Array<IApiAuthorizationIamToken> = [];

		for (const part of tokens) {
			if (part.type !== EApiAuthorizationIamTokenType.VARIABLE) {
				resolved.push(part);

				continue;
			}

			const text: string | undefined = AuthorizationSerializeValue(ApiAuthorizationIamVariable.resolveVariable(part, context));

			if (text === undefined) {
				return undefined;
			}

			resolved.push({ type: EApiAuthorizationIamTokenType.LITERAL, value: text });
		}

		return resolved;
	}

	/**
	 * Resolves a condition value: a number or a boolean as written, a variable alone to the context value at its path
	 * with its type kept, text around a variable to the text of them all, and any other string to its literal text with
	 * the escapes read. A variable that names nothing, or holds nothing a comparison can read, such as NULL, `""`, a list
	 * or an object, gives its default; a `resource.*` variable without a loaded resource gives nothing, default or not.
	 * @param {IApiAuthorizationIamConditionValue} value - Condition value read by the grammar.
	 * @param {unknown} context - Evaluation context with the `principal`, `request` and `resource` roots.
	 * @returns {unknown} The value to compare, or undefined when a variable does not resolve, which fails the key closed.
	 */
	public static resolveValue(value: IApiAuthorizationIamConditionValue, context: unknown): unknown {
		if (typeof value.source !== "string") {
			return value.source;
		}

		const onlyToken: IApiAuthorizationIamToken | undefined = value.parts.length === 1 ? value.parts[0] : undefined;

		if (onlyToken?.type === EApiAuthorizationIamTokenType.VARIABLE) {
			return ApiAuthorizationIamVariable.resolveVariable(onlyToken, context);
		}

		const parts: Array<IApiAuthorizationIamToken> | undefined = ApiAuthorizationIamVariable.resolveTokens(value.parts, context);

		return parts
			?.map((token: IApiAuthorizationIamToken): string => {
				if (token.type === EApiAuthorizationIamTokenType.STAR) {
					return "*";
				}

				return token.type === EApiAuthorizationIamTokenType.QUESTION_MARK ? "?" : (token.value ?? "");
			})
			.join("");
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

	/**
	 * Resolves one variable token against the request.
	 * @param {IApiAuthorizationIamToken} token - Variable token.
	 * @param {unknown} context - Evaluation context with the `principal`, `request` and `resource` roots.
	 * @returns {unknown} The context value with its type, the default as text, or undefined when the variable does not resolve.
	 */
	private static resolveVariable(token: IApiAuthorizationIamToken, context: unknown): unknown {
		const path: string = token.variable?.path ?? "";

		// A row has no value before it is loaded, so a default cannot stand in for it.
		if (path.startsWith(IAM_VARIABLE_RESOURCE_PREFIX) && ApiAuthorizationIamVariable.readPath(context, "resource") === undefined) {
			return undefined;
		}

		const value: unknown = ApiAuthorizationIamVariable.readPath(context, path);

		return value === "" || AuthorizationSerializeValue(value) === undefined ? token.variable?.defaultValue : value;
	}
}
