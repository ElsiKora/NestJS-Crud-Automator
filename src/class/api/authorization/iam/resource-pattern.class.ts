import type { IApiAuthorizationIamResourceClassification, IApiAuthorizationIamResourceConstraint, IApiAuthorizationIamResourceSegment, IApiAuthorizationIamToken } from "@interface/class/api/authorization";

import { ApiAuthorizationIamGlob } from "@class/api/authorization/iam/glob.class";
import { EApiAuthorizationIamResourceClass, EApiAuthorizationIamTokenType } from "@enum/class/authorization";

// How many ways through a pattern one classification walks before it stops and fails closed.
const IAM_RESOURCE_PATTERN_MAX_STEPS: number = 4096;

// How many different mappings to rows the walk looks for: two are enough to know that a pattern is ambiguous.
const IAM_RESOURCE_PATTERN_MAX_MAPPINGS: number = 2;

/**
 * Decomposes a resource pattern over the slots of a resource path, so one glob on the whole string becomes one glob per
 * placeholder that the query planner can compile. The glob semantics stay in `ApiAuthorizationIamGlob`: this class only
 * says for which rows the glob holds.
 *
 * The pattern is walked as an automaton whose states are positions in it. A literal segment moves the states character
 * by character. A placeholder moves a state to any later one, and the part it skips is what the placeholder must match;
 * a `*` at the state it leaves goes with it, since that `*` can absorb the end of the placeholder as well. Each way through
 * that accepts is one mapping to rows, and the glob holds for a row exactly when one mapping does. With one mapping the
 * pattern maps exactly. With more, their union is what holds, which no one pattern per slot says, so the class is
 * `AMBIGUOUS` and the caller fails closed.
 */
export class ApiAuthorizationIamResourcePattern {
	/**
	 * Classifies a pattern over a resource path.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} pattern - Resolved pattern tokens.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceSegment>} segments - Resource segments; a segment with a placeholder is unresolved.
	 * @param {ReadonlyMap<string, RegExp>} [alphabets] - Characters a placeholder can render, per placeholder, where its column enforces them. They only settle a pattern that is ambiguous without them, by dropping the mappings that put another literal in a placeholder; a pattern with one mapping keeps it, so every database reads it through the same comparison.
	 * @returns {IApiAuthorizationIamResourceClassification} The class of the pattern, with the placeholder constraints of a `PARTIAL` one.
	 * @throws {Error} When the pattern holds a variable, which must be resolved first.
	 */
	public static classify(pattern: ReadonlyArray<IApiAuthorizationIamToken>, segments: ReadonlyArray<IApiAuthorizationIamResourceSegment>, alphabets?: ReadonlyMap<string, RegExp>): IApiAuthorizationIamResourceClassification {
		if (ApiAuthorizationIamGlob.isCovering(pattern, segments)) {
			return { constraints: [], kind: EApiAuthorizationIamResourceClass.ALL };
		}

		const cells: Array<IApiAuthorizationIamToken> = ApiAuthorizationIamResourcePattern.readCells(pattern);
		let walk: { isExhausted: boolean; mappings: Map<string, Array<IApiAuthorizationIamResourceConstraint>> } = ApiAuthorizationIamResourcePattern.walk(cells, segments);

		if ((walk.isExhausted || walk.mappings.size > 1) && alphabets && alphabets.size > 0) {
			walk = ApiAuthorizationIamResourcePattern.walk(cells, segments, alphabets);
		}

		if (walk.isExhausted || walk.mappings.size > 1) {
			return { constraints: [], kind: EApiAuthorizationIamResourceClass.AMBIGUOUS };
		}

		const [constraints]: Array<Array<IApiAuthorizationIamResourceConstraint>> = [...walk.mappings.values()];

		if (!constraints) {
			return { constraints: [], kind: EApiAuthorizationIamResourceClass.NONE };
		}

		return constraints.length === 0 ? { constraints: [], kind: EApiAuthorizationIamResourceClass.ALL } : { constraints, kind: EApiAuthorizationIamResourceClass.PARTIAL };
	}

	/**
	 * Tells whether a walk at a state can reach the end of the pattern with no more segments.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} cells - Pattern cells.
	 * @param {number} state - Position in the pattern.
	 * @returns {boolean} Whether only `*` remains.
	 */
	private static isAccepting(cells: ReadonlyArray<IApiAuthorizationIamToken>, state: number): boolean {
		return cells.slice(state).every((cell: IApiAuthorizationIamToken): boolean => cell.type === EApiAuthorizationIamTokenType.STAR);
	}

	/**
	 * Moves a state over one literal segment.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} cells - Pattern cells.
	 * @param {number} state - Position in the pattern.
	 * @param {string} text - Literal text of the segment.
	 * @returns {Array<number>} The states the segment can end in.
	 */
	private static moveOverLiteral(cells: ReadonlyArray<IApiAuthorizationIamToken>, state: number, text: string): Array<number> {
		let states: Set<number> = new Set<number>([state]);

		for (const character of text) {
			const next: Set<number> = new Set<number>();

			for (const current of states) {
				let position: number = current;

				// A `*` absorbs the character and stays, or renders empty, and then the next cell reads the character.
				while (cells[position]?.type === EApiAuthorizationIamTokenType.STAR) {
					next.add(position);
					position++;
				}

				const cell: IApiAuthorizationIamToken | undefined = cells[position];

				if (cell && (cell.type === EApiAuthorizationIamTokenType.QUESTION_MARK || cell.value === character)) {
					next.add(position + 1);
				}
			}

			states = next;
		}

		return [...states];
	}

	/**
	 * Lists the states a placeholder can end in from a state, each with the cells it skips.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} cells - Pattern cells.
	 * @param {number} state - Position in the pattern.
	 * @param {RegExp} [alphabet] - Characters the placeholder can render.
	 * @returns {Array<number>} The states, in order; one right after a `*` is left out, since staying on that `*` covers it.
	 */
	private static moveOverPlaceholder(cells: ReadonlyArray<IApiAuthorizationIamToken>, state: number, alphabet: RegExp | undefined): Array<number> {
		const exits: Array<number> = [state];

		for (let position: number = state; position < cells.length; position++) {
			const cell: IApiAuthorizationIamToken | undefined = cells[position];

			if (cell?.type === EApiAuthorizationIamTokenType.LITERAL && alphabet && !alphabet.test(cell.value ?? "")) {
				break;
			}

			if (cell?.type !== EApiAuthorizationIamTokenType.STAR) {
				exits.push(position + 1);
			}
		}

		return exits;
	}

	/**
	 * Reads pattern tokens into one cell per code point, with adjacent `*` collapsed.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} pattern - Resolved pattern tokens.
	 * @returns {Array<IApiAuthorizationIamToken>} The cells.
	 */
	private static readCells(pattern: ReadonlyArray<IApiAuthorizationIamToken>): Array<IApiAuthorizationIamToken> {
		const cells: Array<IApiAuthorizationIamToken> = [];

		for (const part of pattern) {
			if (part.type === EApiAuthorizationIamTokenType.LITERAL) {
				for (const character of part.value ?? "") {
					cells.push({ type: EApiAuthorizationIamTokenType.LITERAL, value: character });
				}
			} else if (part.type !== EApiAuthorizationIamTokenType.STAR || cells.at(-1)?.type !== EApiAuthorizationIamTokenType.STAR) {
				cells.push(part);
			}
		}

		return cells;
	}

	/**
	 * Reads what a placeholder must match, from the cells it skips.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} cells - Pattern cells.
	 * @param {number} from - State the placeholder starts at.
	 * @param {number} to - State the placeholder ends at.
	 * @returns {Array<IApiAuthorizationIamToken>} Pattern tokens with adjacent literals merged; a `*` at the end state goes with them.
	 */
	private static readSlotPattern(cells: ReadonlyArray<IApiAuthorizationIamToken>, from: number, to: number): Array<IApiAuthorizationIamToken> {
		const parts: Array<IApiAuthorizationIamToken> = [];

		for (const cell of cells.slice(from, cells[to]?.type === EApiAuthorizationIamTokenType.STAR ? to + 1 : to)) {
			const last: IApiAuthorizationIamToken | undefined = parts.at(-1);

			if (cell.type === EApiAuthorizationIamTokenType.LITERAL && last?.type === EApiAuthorizationIamTokenType.LITERAL) {
				parts[parts.length - 1] = { type: EApiAuthorizationIamTokenType.LITERAL, value: `${last.value ?? ""}${cell.value ?? ""}` };
			} else {
				parts.push(cell);
			}
		}

		return parts;
	}

	/**
	 * Walks every way through a pattern that accepts, up to the second distinct mapping.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} cells - Pattern cells.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceSegment>} segments - Resource segments.
	 * @param {ReadonlyMap<string, RegExp>} [alphabets] - Characters a placeholder can render, per placeholder.
	 * @returns {{ isExhausted: boolean; mappings: Map<string, Array<IApiAuthorizationIamResourceConstraint>> }} The distinct mappings found, and whether the walk ran out of steps.
	 */
	private static walk(cells: ReadonlyArray<IApiAuthorizationIamToken>, segments: ReadonlyArray<IApiAuthorizationIamResourceSegment>, alphabets?: ReadonlyMap<string, RegExp>): { isExhausted: boolean; mappings: Map<string, Array<IApiAuthorizationIamResourceConstraint>> } {
		const mappings: Map<string, Array<IApiAuthorizationIamResourceConstraint>> = new Map<string, Array<IApiAuthorizationIamResourceConstraint>>();
		// Whether a state at a segment can accept, so the walk never enters a way that cannot.
		const viability: Map<string, boolean> = new Map<string, boolean>();
		let steps: number = 0;

		const readExits = (segmentIndex: number, state: number): Array<number> => {
			const segment: IApiAuthorizationIamResourceSegment | undefined = segments[segmentIndex];

			if (!segment) {
				return [];
			}

			return segment.placeholder === undefined ? ApiAuthorizationIamResourcePattern.moveOverLiteral(cells, state, segment.value) : ApiAuthorizationIamResourcePattern.moveOverPlaceholder(cells, state, alphabets?.get(segment.placeholder));
		};

		const isViable = (segmentIndex: number, state: number): boolean => {
			if (segmentIndex === segments.length) {
				return ApiAuthorizationIamResourcePattern.isAccepting(cells, state);
			}

			const key: string = `${segmentIndex}:${state}`;
			let isReachable: boolean | undefined = viability.get(key);

			if (isReachable === undefined) {
				isReachable = readExits(segmentIndex, state).some((exit: number): boolean => isViable(segmentIndex + 1, exit));
				viability.set(key, isReachable);
			}

			return isReachable;
		};

		const visit = (segmentIndex: number, state: number, constraints: ReadonlyArray<IApiAuthorizationIamResourceConstraint>): void => {
			if (mappings.size >= IAM_RESOURCE_PATTERN_MAX_MAPPINGS || steps > IAM_RESOURCE_PATTERN_MAX_STEPS) {
				return;
			}

			steps++;

			if (segmentIndex === segments.length) {
				mappings.set(JSON.stringify(constraints), [...constraints]);

				return;
			}

			const placeholder: string | undefined = segments[segmentIndex]?.placeholder;
			const storedRow: IApiAuthorizationIamResourceSegment["storedRow"] = segments[segmentIndex]?.storedRow;

			for (const exit of readExits(segmentIndex, state)) {
				if (!isViable(segmentIndex + 1, exit)) {
					continue;
				}

				if (placeholder === undefined) {
					visit(segmentIndex + 1, exit, constraints);

					continue;
				}

				const slotPattern: Array<IApiAuthorizationIamToken> = ApiAuthorizationIamResourcePattern.readSlotPattern(cells, state, exit);
				// A slot that may hold anything constrains no row.
				const isConstraining: boolean = slotPattern.length !== 1 || slotPattern[0]?.type !== EApiAuthorizationIamTokenType.STAR;

				visit(segmentIndex + 1, exit, isConstraining ? [...constraints, { pattern: slotPattern, placeholder, ...(storedRow ? { storedRow } : {}) }] : constraints);
			}
		};

		if (isViable(0, 0)) {
			visit(0, 0, []);
		}

		return { isExhausted: steps > IAM_RESOURCE_PATTERN_MAX_STEPS, mappings };
	}
}
