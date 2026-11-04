import type { IApiAuthorizationIamResourceSegment, IApiAuthorizationIamToken } from "@interface/class/api/authorization";

import { ApiAuthorizationIamVariable } from "@class/api/authorization/iam/variable.class";
import { EApiAuthorizationIamTokenType } from "@enum/class/authorization";
import { ErrorException } from "@utility/error/exception.utility";

// Pattern symbol of a `*` token: any sequence of code points, the empty one included.
const IAM_GLOB_STAR: number = -1;

// Pattern symbol of a `?` token: exactly one code point.
const IAM_GLOB_QUESTION_MARK: number = -2;

// Template symbol of an unresolved placeholder: any value a row can hold. Only a pattern `*` covers it.
const IAM_GLOB_PLACEHOLDER: number = -3;

// Code point of `:`, which separates the segments of an Arn value.
const IAM_GLOB_SEGMENT_SEPARATOR: number = 58;

/**
 * Matches IAM `Action` and `Resource` patterns with glob semantics. `*` matches any sequence of characters, the empty
 * one and `:` or `/` included, at any position; `?` matches exactly one Unicode code point; every other character
 * matches itself, and the escapes `${*}`, `${?}` and `${$}` read as the literal character. Every check walks code
 * points with bounded loops and no regular expression, so a long pattern cannot make it backtrack exponentially.
 */
export class ApiAuthorizationIamGlob {
	/**
	 * Tells whether a pattern matches every resource string a resource can render: the literal segments stay as they
	 * are, and each unresolved placeholder may hold any value, which only a `*` of the pattern covers. With no
	 * placeholder left it is a plain match of the rendered string.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken> | string} pattern - Pattern tokens, or pattern text.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceSegment>} segments - Resource segments; a segment with a placeholder is unresolved.
	 * @returns {boolean} Whether the pattern matches whatever value the placeholders hold.
	 */
	public static isCovering(pattern: ReadonlyArray<IApiAuthorizationIamToken> | string, segments: ReadonlyArray<IApiAuthorizationIamResourceSegment>): boolean {
		return ApiAuthorizationIamGlob.matchSymbols(ApiAuthorizationIamGlob.readPatternSymbols(pattern), ApiAuthorizationIamGlob.readTemplateSymbols(segments));
	}

	/**
	 * Tells whether a pattern matches a concrete value. A greedy two-pointer walk: on a mismatch it returns to the last
	 * `*` and lets it absorb one more character, so it runs in O(pattern × value) steps at most.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken> | string} pattern - Pattern tokens, or pattern text such as `ns:*:delete`.
	 * @param {string} value - Concrete action or resource string; a `*` or `?` in it is a literal character.
	 * @returns {boolean} Whether the whole value matches the whole pattern.
	 */
	public static isMatched(pattern: ReadonlyArray<IApiAuthorizationIamToken> | string, value: string): boolean {
		return ApiAuthorizationIamGlob.matchSymbols(ApiAuthorizationIamGlob.readPatternSymbols(pattern), ApiAuthorizationIamGlob.readCodePoints(value));
	}

	/**
	 * Tells whether a pattern matches at least one resource string a collection resource can render: the literal
	 * segments stay as they are and each unresolved placeholder may take any value. Both sides are globs then, and a
	 * dynamic-programming walk over their symbols decides whether they share a string in O(pattern × template) steps.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken> | string} pattern - Pattern tokens, or pattern text.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceSegment>} segments - Collection resource segments; a segment with a placeholder takes any value.
	 * @returns {boolean} Whether some row of the collection can match the pattern.
	 */
	public static isOverlapping(pattern: ReadonlyArray<IApiAuthorizationIamToken> | string, segments: ReadonlyArray<IApiAuthorizationIamResourceSegment>): boolean {
		const patternSymbols: Array<number> = ApiAuthorizationIamGlob.readPatternSymbols(pattern);
		const templateSymbols: Array<number> = ApiAuthorizationIamGlob.readTemplateSymbols(segments);
		// reachable[t] tells whether the first p pattern symbols and the first t template symbols can render one string.
		let reachable: Array<boolean> = [];

		for (let patternIndex: number = 0; patternIndex <= patternSymbols.length; patternIndex++) {
			const next: Array<boolean> = [];
			const patternSymbol: number | undefined = patternIndex > 0 ? patternSymbols[patternIndex - 1] : undefined;

			for (let templateIndex: number = 0; templateIndex <= templateSymbols.length; templateIndex++) {
				const templateSymbol: number | undefined = templateIndex > 0 ? templateSymbols[templateIndex - 1] : undefined;
				const isAfterPattern: boolean = reachable[templateIndex] === true;
				const isAfterTemplate: boolean = next[templateIndex - 1] === true;
				const isAfterBoth: boolean = reachable[templateIndex - 1] === true;
				const isTemplateLiteral: boolean = templateSymbol !== undefined && templateSymbol >= 0;
				let isReachable: boolean = patternIndex === 0 && templateIndex === 0;

				if (patternSymbol === IAM_GLOB_STAR) {
					// A `*` renders empty, or absorbs the last literal of the template.
					isReachable ||= isAfterPattern || (isTemplateLiteral && isAfterTemplate);
				}

				if (templateSymbol === IAM_GLOB_PLACEHOLDER) {
					// A placeholder renders empty, or absorbs the last literal or `?` of the pattern.
					isReachable ||= isAfterTemplate || (patternSymbol !== undefined && patternSymbol !== IAM_GLOB_STAR && isAfterPattern);
				}

				if (patternSymbol !== undefined && isTemplateLiteral && (patternSymbol === templateSymbol || patternSymbol === IAM_GLOB_QUESTION_MARK)) {
					isReachable ||= isAfterBoth;
				}

				next[templateIndex] = isReachable;
			}

			reachable = next;
		}

		return reachable[templateSymbols.length] === true;
	}

	/**
	 * Tells whether a pattern matches a value segment by segment, as an Arn operator does: both split on `:`, the counts
	 * of their segments must be equal, and `*` and `?` stay within one segment.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} pattern - Pattern tokens; an escaped or substituted `*` or `?` is a literal.
	 * @param {string} value - Concrete value.
	 * @returns {boolean} Whether every segment of the value matches its segment of the pattern.
	 */
	public static isSegmentMatched(pattern: ReadonlyArray<IApiAuthorizationIamToken>, value: string): boolean {
		const symbols: Array<number> = ApiAuthorizationIamGlob.readPatternSymbols(pattern);
		const patternSegments: Array<Array<number>> = [[]];

		for (const symbol of symbols) {
			if (symbol === IAM_GLOB_SEGMENT_SEPARATOR) {
				patternSegments.push([]);
			} else {
				patternSegments.at(-1)?.push(symbol);
			}
		}

		const valueSegments: Array<string> = value.split(":");

		return patternSegments.length === valueSegments.length && patternSegments.every((segment: ReadonlyArray<number>, index: number): boolean => ApiAuthorizationIamGlob.matchSymbols(segment, ApiAuthorizationIamGlob.readCodePoints(valueSegments[index] ?? "")));
	}

	/**
	 * Reads a pattern that is literal text, optionally followed by one trailing `*`: the only forms a placeholder
	 * constraint can map exactly.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} tokens - Pattern tokens.
	 * @returns {{ isPrefix: boolean; value: string } | undefined} The literal text and whether a trailing `*` makes it a prefix, or undefined for any other form.
	 */
	public static readLiteralPrefix(tokens: ReadonlyArray<IApiAuthorizationIamToken>): { isPrefix: boolean; value: string } | undefined {
		const isPrefix: boolean = tokens.at(-1)?.type === EApiAuthorizationIamTokenType.STAR;
		const literalTokens: ReadonlyArray<IApiAuthorizationIamToken> = isPrefix ? tokens.slice(0, -1) : tokens;

		if (literalTokens.some((token: IApiAuthorizationIamToken): boolean => token.type !== EApiAuthorizationIamTokenType.LITERAL)) {
			return undefined;
		}

		return { isPrefix, value: literalTokens.map((token: IApiAuthorizationIamToken): string => token.value ?? "").join("") };
	}

	/**
	 * Reads pattern text into tokens, with `*` and `?` wildcards and the `${*}`, `${?}` and `${$}` escapes.
	 * @param {string} pattern - Pattern text.
	 * @returns {Array<IApiAuthorizationIamToken>} Pattern tokens.
	 * @throws {Error} When the pattern holds a malformed `${...}` or a variable, which must be resolved before matching.
	 */
	public static readTokens(pattern: string): Array<IApiAuthorizationIamToken> {
		const parts: Array<IApiAuthorizationIamToken> | undefined = ApiAuthorizationIamVariable.tokenize(pattern, true);

		if (!parts) {
			throw ErrorException(`IAM pattern "${pattern}" holds a malformed \${...}`);
		}

		return parts;
	}

	/**
	 * Walks pattern symbols over value symbols greedily: on a mismatch it returns to the last `*` and lets it absorb one
	 * more symbol. A placeholder symbol in the value matches only inside a `*`.
	 * @param {ReadonlyArray<number>} pattern - Pattern symbols.
	 * @param {ReadonlyArray<number>} value - Value symbols: code points, and placeholder symbols.
	 * @returns {boolean} Whether the whole value matches the whole pattern.
	 */
	private static matchSymbols(pattern: ReadonlyArray<number>, value: ReadonlyArray<number>): boolean {
		let patternIndex: number = 0;
		let valueIndex: number = 0;
		let starIndex: number = -1;
		let starValueIndex: number = 0;

		while (valueIndex < value.length) {
			const patternSymbol: number | undefined = pattern[patternIndex];
			const valueSymbol: number = value[valueIndex] ?? IAM_GLOB_PLACEHOLDER;

			if (patternSymbol === IAM_GLOB_STAR) {
				starIndex = patternIndex;
				starValueIndex = valueIndex;
				patternIndex++;
			} else if (patternSymbol !== undefined && valueSymbol >= 0 && (patternSymbol === valueSymbol || patternSymbol === IAM_GLOB_QUESTION_MARK)) {
				patternIndex++;
				valueIndex++;
			} else if (starIndex === -1) {
				return false;
			} else {
				starValueIndex++;
				patternIndex = starIndex + 1;
				valueIndex = starValueIndex;
			}
		}

		while (pattern[patternIndex] === IAM_GLOB_STAR) {
			patternIndex++;
		}

		return patternIndex === pattern.length;
	}

	/**
	 * Splits text into Unicode code points, so a character outside the Basic Multilingual Plane is one symbol.
	 * @param {string} text - Text to split.
	 * @returns {Array<number>} Code points of the text.
	 */
	private static readCodePoints(text: string): Array<number> {
		const points: Array<number> = [];

		for (const point of text) {
			points.push(point.codePointAt(0) ?? 0);
		}

		return points;
	}

	/**
	 * Reads a pattern into symbols: code points of its literals, and the `*` and `?` symbols.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken> | string} pattern - Pattern tokens, or pattern text.
	 * @returns {Array<number>} Pattern symbols.
	 * @throws {Error} When the pattern holds a variable, which must be resolved before matching.
	 */
	private static readPatternSymbols(pattern: ReadonlyArray<IApiAuthorizationIamToken> | string): Array<number> {
		const parts: ReadonlyArray<IApiAuthorizationIamToken> = typeof pattern === "string" ? ApiAuthorizationIamGlob.readTokens(pattern) : pattern;
		const symbols: Array<number> = [];

		for (const part of parts) {
			switch (part.type) {
				case EApiAuthorizationIamTokenType.LITERAL: {
					symbols.push(...ApiAuthorizationIamGlob.readCodePoints(part.value ?? ""));

					break;
				}

				case EApiAuthorizationIamTokenType.QUESTION_MARK: {
					symbols.push(IAM_GLOB_QUESTION_MARK);

					break;
				}

				case EApiAuthorizationIamTokenType.STAR: {
					symbols.push(IAM_GLOB_STAR);

					break;
				}

				case EApiAuthorizationIamTokenType.VARIABLE: {
					throw ErrorException(`IAM pattern variable "\${${part.variable?.path ?? ""}}" must be resolved before matching`);
				}
			}
		}

		return symbols;
	}

	/**
	 * Reads resource segments into symbols: code points of the literal segments, and one placeholder symbol per unresolved placeholder.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceSegment>} segments - Resource segments.
	 * @returns {Array<number>} Template symbols.
	 */
	private static readTemplateSymbols(segments: ReadonlyArray<IApiAuthorizationIamResourceSegment>): Array<number> {
		return segments.flatMap((segment: IApiAuthorizationIamResourceSegment): Array<number> => (segment.placeholder === undefined ? ApiAuthorizationIamGlob.readCodePoints(segment.value) : [IAM_GLOB_PLACEHOLDER]));
	}
}
