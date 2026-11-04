import type { IApiAuthorizationIamResourceSegment } from "@interface/class/api/authorization";

/**
 * Matches IAM Deny patterns with glob semantics: each `*` matches any sequence of characters, the empty one and `:` or
 * `/` included, at any position of the pattern; every other character, `?` included, matches itself. Both checks walk
 * code points with bounded loops and no regular expression, so a long pattern cannot make them backtrack exponentially.
 */
export class ApiAuthorizationIamGlob {
	/**
	 * Tells whether a pattern matches a concrete value. A greedy two-pointer walk: on a mismatch it returns to the last
	 * `*` and lets it absorb one more character, so it runs in O(pattern × value) steps at most.
	 * @param {string} pattern - Glob pattern, such as `ns:*:delete`.
	 * @param {string} value - Concrete action or resource string; a `*` in it is a literal character.
	 * @returns {boolean} Whether the whole value matches the whole pattern.
	 */
	public static isMatched(pattern: string, value: string): boolean {
		const patternPoints: Array<string> = ApiAuthorizationIamGlob.readCodePoints(pattern);
		const valuePoints: Array<string> = ApiAuthorizationIamGlob.readCodePoints(value);
		let patternIndex: number = 0;
		let valueIndex: number = 0;
		let starIndex: number = -1;
		let starValueIndex: number = 0;

		while (valueIndex < valuePoints.length) {
			if (patternIndex < patternPoints.length && patternPoints[patternIndex] === "*") {
				starIndex = patternIndex;
				starValueIndex = valueIndex;
				patternIndex++;
			} else if (patternIndex < patternPoints.length && patternPoints[patternIndex] === valuePoints[valueIndex]) {
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

		while (patternIndex < patternPoints.length && patternPoints[patternIndex] === "*") {
			patternIndex++;
		}

		return patternIndex === patternPoints.length;
	}

	/**
	 * Tells whether a pattern matches at least one resource string a collection resource can render: the literal
	 * segments stay as they are and each unresolved placeholder may take any value. Both sides are globs then, and a
	 * dynamic-programming walk over their code points decides whether they share a string in O(pattern × template) steps.
	 * @param {string} pattern - Glob pattern of a Deny statement.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceSegment>} segments - Collection resource segments; a segment with a placeholder takes any value.
	 * @returns {boolean} Whether some row of the collection can match the pattern.
	 */
	public static isOverlapping(pattern: string, segments: ReadonlyArray<IApiAuthorizationIamResourceSegment>): boolean {
		// A wildcard is undefined on both sides, so a pattern `*` and a placeholder share one marker that no character equals.
		const patternPoints: Array<string | undefined> = ApiAuthorizationIamGlob.readCodePoints(pattern).map((point: string): string | undefined => (point === "*" ? undefined : point));
		const templatePoints: Array<string | undefined> = segments.flatMap((segment: IApiAuthorizationIamResourceSegment): Array<string | undefined> => (segment.placeholder === undefined ? ApiAuthorizationIamGlob.readCodePoints(segment.value) : [undefined]));
		// reachable[t] tells whether the first p pattern points and the first t template points can render one string.
		let reachable: Array<boolean> = Array.from({ length: templatePoints.length + 1 }, (): boolean => false);

		for (let patternIndex: number = 0; patternIndex <= patternPoints.length; patternIndex++) {
			const next: Array<boolean> = Array.from({ length: templatePoints.length + 1 }, (): boolean => false);

			for (let templateIndex: number = 0; templateIndex <= templatePoints.length; templateIndex++) {
				const patternPoint: string | undefined = patternPoints[patternIndex - 1];
				const templatePoint: string | undefined = templatePoints[templateIndex - 1];
				const isPatternStar: boolean = patternIndex > 0 && patternPoint === undefined;
				const isTemplateStar: boolean = templateIndex > 0 && templatePoint === undefined;

				if (patternIndex === 0 && templateIndex === 0) {
					next[templateIndex] = true;
				} else if (isPatternStar || isTemplateStar) {
					// A wildcard on either side may render empty, or absorb the last point of the other side.
					next[templateIndex] = (isPatternStar && (reachable[templateIndex] === true || (templateIndex > 0 && next[templateIndex - 1] === true))) || (isTemplateStar && (next[templateIndex - 1] === true || (patternIndex > 0 && reachable[templateIndex] === true)));
				} else {
					next[templateIndex] = patternIndex > 0 && templateIndex > 0 && patternPoint === templatePoint && reachable[templateIndex - 1] === true;
				}
			}

			reachable = next;
		}

		return reachable[templatePoints.length] === true;
	}

	/**
	 * Splits text into Unicode code points, so a character outside the Basic Multilingual Plane is one character.
	 * @param {string} text - Text to split.
	 * @returns {Array<string>} Code points of the text.
	 */
	private static readCodePoints(text: string): Array<string> {
		const points: Array<string> = [];

		for (const point of text) {
			points.push(point);
		}

		return points;
	}
}
