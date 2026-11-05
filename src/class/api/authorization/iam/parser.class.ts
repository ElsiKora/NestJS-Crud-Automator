import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationIamCondition, IApiAuthorizationIamConditionValue, IApiAuthorizationIamContextKey, IApiAuthorizationIamFailure, IApiAuthorizationIamOperatorDefinition, IApiAuthorizationIamPattern, IApiAuthorizationIamQueryField, IApiAuthorizationIamStatement, IApiAuthorizationIamStatementTarget, IApiAuthorizationIamToken, IApiAuthorizationResourceDefinition, IApiAuthorizationResourceFieldDefinition } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamLiteral } from "@type/class/api/authorization/iam-literal.type";

import { ApiAuthorizationIamDateValue } from "@class/api/authorization/iam/date-value.class";
import { ApiAuthorizationIamDecimal } from "@class/api/authorization/iam/decimal.class";
import { ApiAuthorizationIamGlob } from "@class/api/authorization/iam/glob.class";
import { ApiAuthorizationIamNetwork } from "@class/api/authorization/iam/network.class";
import { ApiAuthorizationIamPredicateBuilder } from "@class/api/authorization/iam/predicate/builder.class";
import { ApiAuthorizationIamVariable } from "@class/api/authorization/iam/variable.class";
import { AUTHORIZATION_POLICY_CONDITION_OPERATOR_CONSTANT, AUTHORIZATION_POLICY_CONTEXT_KEY_CONSTANT, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT, AUTHORIZATION_POLICY_DOCUMENT_LIMIT_CONSTANT } from "@constant/class/authorization";
import { EApiAuthorizationIamSupport, EApiAuthorizationIamTokenType, EApiPolicyConditionOperator, EApiPolicyConditionOperatorFamily, EApiPolicyConditionQualifier, EApiPolicyEffect } from "@enum/class/authorization";
import { AuthorizationIamReadQueryField } from "@utility/authorization/iam-query-field.utility";
import { EnumIsValue } from "@utility/enum/is-value.utility";
import { ErrorException } from "@utility/error/exception.utility";

// Fields of a policy document; `Id` is the optional AWS document id.
const IAM_PARSER_DOCUMENT_FIELDS: ReadonlySet<string> = new Set<string>(["Id", "Statement", "Version"]);

// Fields of a policy statement.
const IAM_PARSER_STATEMENT_FIELDS: ReadonlySet<string> = new Set<string>(["Action", "Condition", "Effect", "NotAction", "NotResource", "Resource", "Sid"]);

// A context path: a root and dot-separated segments of letters, digits, `_` and `-`.
const IAM_PARSER_PATH_PATTERN: RegExp = /^[A-Z]\w*(?:\.[\w-]+)*$/i;

// A date and time: date, time with optional seconds, optional fraction, optional zone designator.
const IAM_PARSER_DATE_TIME_PATTERN: RegExp = /^(?<date>[\d-]{10})T(?<time>\d{2}:\d{2}(?::\d{2})?)(?:\.(?<fraction>\d+))?(?<zone>Z|[+-]\d{2}:\d{2})?$/;

// A calendar date for a DATE column.
const IAM_PARSER_DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/;

// A zone designator.
const IAM_PARSER_ZONE_PATTERN: RegExp = /^(?:Z|[+-]\d{2}:\d{2})$/;

// Largest hour of a time of day.
const IAM_PARSER_MAX_HOUR: number = 23;

// Largest minute or second of a time of day.
const IAM_PARSER_MAX_MINUTE: number = 59;

// The context key of the time of the request.
const IAM_PARSER_REQUEST_TIME_KEY: string = "request.time";

// Prefix of a condition key that reads a request header; Node reads header names in lower case.
const IAM_PARSER_REQUEST_HEADERS_PREFIX: string = "request.headers.";

// Epoch seconds, which the grammar refuses as a date.
const IAM_PARSER_EPOCH_PATTERN: RegExp = /^-?\d+(?:\.\d+)?$/;

// Significant digits a double compares exactly.
const IAM_PARSER_MAX_SIGNIFICANT_DIGITS: number = 15;

// Fraction digits of a date and time the grammar keeps: milliseconds.
const IAM_PARSER_MAX_FRACTION_DIGITS: number = 3;

// Statements already read, so a document's statements are read once however many requests evaluate them.
const iamParserStatementCache: WeakMap<object, IApiAuthorizationIamStatement> = new WeakMap<object, IApiAuthorizationIamStatement>();

/**
 * Where a failure goes while a document is read, and what the namespace-aware checks compare with.
 */
interface IApiAuthorizationIamParserScope {
	// Failures found so far.
	failures: Array<IApiAuthorizationIamFailure>;
	// Namespace of the document; an `Action` pattern outside it fails.
	namespace?: string;
	// Resource definitions of the namespace; when given, every `resource.*` key must map to a filterable field of one.
	resourceDefinitions?: ReadonlyArray<IApiAuthorizationResourceDefinition<IApiBaseEntity>>;
}

/**
 * The IAM policy grammar. It reads a policy document, or one statement, into the normalized and typed statement model
 * the engine evaluates, and reports every failure with a constraint code from
 * `AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT`. A feature the engine does not enforce yet fails with
 * `iamPolicyNotSupportedYet`, so no document is accepted whose rules the engine cannot enforce.
 */
export class ApiAuthorizationIamParser {
	/**
	 * Finds the context-key registry entry of a path.
	 * @param {string} path - Context path, such as `principal.attributes.tenantId`.
	 * @returns {IApiAuthorizationIamContextKey | undefined} The entry, or undefined when the path is no context path.
	 */
	public static findContextKey(path: string): IApiAuthorizationIamContextKey | undefined {
		if (!IAM_PARSER_PATH_PATTERN.test(path)) {
			return undefined;
		}

		return AUTHORIZATION_POLICY_CONTEXT_KEY_CONSTANT.KEYS.find((entry: IApiAuthorizationIamContextKey): boolean => (entry.isPrefix ? path.startsWith(`${entry.path}.`) : path === entry.path));
	}

	/**
	 * Writes failures as one line for a log or an error message.
	 * @param {ReadonlyArray<IApiAuthorizationIamFailure>} failures - Failures.
	 * @returns {string} Each failure as `code at property (message)`, separated by `; `.
	 */
	public static formatFailures(failures: ReadonlyArray<IApiAuthorizationIamFailure>): string {
		return failures.map((failure: IApiAuthorizationIamFailure): string => `${failure.code} at ${failure.property} (${failure.message})`).join("; ");
	}

	/**
	 * Reads a policy document and reports every failure. With a namespace, an `Action` pattern that matches no action of
	 * it fails; with resource definitions, a `resource.*` key must map to a filterable field of one of them, and its
	 * operator must fit the column in every definition that maps it.
	 * @param {unknown} input - Policy document, as stored.
	 * @param {object} [options] - Namespace-aware checks.
	 * @param {string} [options.namespace] - Namespace of the document.
	 * @param {ReadonlyArray<IApiAuthorizationResourceDefinition<IApiBaseEntity>>} [options.resourceDefinitions] - Resource definitions of the namespace.
	 * @returns {{ failures: Array<IApiAuthorizationIamFailure>; statements: Array<IApiAuthorizationIamStatement> }} Every failure, and the statements, which are complete only when there is no failure.
	 */
	public static readDocument(input: unknown, options: { namespace?: string; resourceDefinitions?: ReadonlyArray<IApiAuthorizationResourceDefinition<IApiBaseEntity>> } = {}): { failures: Array<IApiAuthorizationIamFailure>; statements: Array<IApiAuthorizationIamStatement> } {
		const scope: IApiAuthorizationIamParserScope = { failures: [], namespace: options.namespace, resourceDefinitions: options.resourceDefinitions };
		const statements: Array<IApiAuthorizationIamStatement> = [];

		if (!ApiAuthorizationIamParser.isRecord(input)) {
			ApiAuthorizationIamParser.fail(scope, "document", AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.DOCUMENT_INVALID, "Policy document must be an object");

			return { failures: scope.failures, statements };
		}

		// A document over the limits is refused before any statement is read, so it costs no more than its size.
		const length: number | undefined = ApiAuthorizationIamParser.readDocumentLength(input);

		if (length === undefined || length > AUTHORIZATION_POLICY_DOCUMENT_LIMIT_CONSTANT.MAX_DOCUMENT_LENGTH) {
			ApiAuthorizationIamParser.fail(scope, "document", AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.DOCUMENT_INVALID, `Policy document must be JSON of at most ${AUTHORIZATION_POLICY_DOCUMENT_LIMIT_CONSTANT.MAX_DOCUMENT_LENGTH} characters`);

			return { failures: scope.failures, statements };
		}

		if (Array.isArray(input.Statement) && input.Statement.length > AUTHORIZATION_POLICY_DOCUMENT_LIMIT_CONSTANT.MAX_STATEMENTS) {
			ApiAuthorizationIamParser.fail(scope, "document.Statement", AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.DOCUMENT_INVALID, `Policy document must hold at most ${AUTHORIZATION_POLICY_DOCUMENT_LIMIT_CONSTANT.MAX_STATEMENTS} statements`);

			return { failures: scope.failures, statements };
		}

		for (const field of Object.keys(input)) {
			if (!IAM_PARSER_DOCUMENT_FIELDS.has(field)) {
				ApiAuthorizationIamParser.fail(scope, `document.${field}`, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.FIELD_UNKNOWN, `Policy document field "${field}" is unknown`);
			}
		}

		if (typeof input.Version !== "string" || input.Version.length === 0) {
			ApiAuthorizationIamParser.fail(scope, "document.Version", AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.VERSION_INVALID, "Policy document Version must be a non-empty string");
		}

		if (input.Id !== undefined && typeof input.Id !== "string") {
			ApiAuthorizationIamParser.fail(scope, "document.Id", AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.DOCUMENT_INVALID, "Policy document Id must be a string");
		}

		if (!Array.isArray(input.Statement)) {
			const isShorthand: boolean = ApiAuthorizationIamParser.isRecord(input.Statement);

			ApiAuthorizationIamParser.fail(scope, "document.Statement", isShorthand ? AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.SHORTHAND_NOT_ALLOWED : AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.DOCUMENT_INVALID, isShorthand ? "Policy document Statement must be a list of statements, not one statement" : "Policy document Statement must be a list of statements");

			return { failures: scope.failures, statements };
		}

		const sids: Set<string> = new Set<string>();

		for (const [index, statementInput] of (input.Statement as ReadonlyArray<unknown>).entries()) {
			const property: string = `document.Statement[${index}]`;
			const statement: IApiAuthorizationIamStatement | undefined = ApiAuthorizationIamParser.readStatementInput(statementInput, property, scope);

			if (!statement) {
				continue;
			}

			if (statement.sid !== undefined) {
				if (sids.has(statement.sid)) {
					ApiAuthorizationIamParser.fail(scope, `${property}.Sid`, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.SID_DUPLICATE, `Statement Sid "${statement.sid}" is used by another statement of the document`);
				}

				sids.add(statement.sid);
			}

			statements.push(statement);
		}

		return { failures: scope.failures, statements };
	}

	/**
	 * Reads one statement into the statement model, once per statement object.
	 * @param {unknown} input - Policy statement.
	 * @returns {IApiAuthorizationIamStatement} The statement model.
	 * @throws {Error} When the statement fails the grammar, so a statement the engine cannot enforce is never evaluated.
	 */
	public static readStatement(input: unknown): IApiAuthorizationIamStatement {
		const cachedStatement: IApiAuthorizationIamStatement | undefined = ApiAuthorizationIamParser.isRecord(input) ? iamParserStatementCache.get(input) : undefined;

		if (cachedStatement) {
			return cachedStatement;
		}

		const scope: IApiAuthorizationIamParserScope = { failures: [] };
		const statement: IApiAuthorizationIamStatement | undefined = ApiAuthorizationIamParser.readStatementInput(input, "statement", scope);

		if (!statement || scope.failures.length > 0) {
			throw ErrorException(`IAM policy statement is invalid: ${ApiAuthorizationIamParser.formatFailures(scope.failures)}`);
		}

		iamParserStatementCache.set(input as object, statement);

		return statement;
	}

	/**
	 * Checks a literal date: ISO 8601 with a zone designator and at most milliseconds, or a calendar date
	 * `YYYY-MM-DD`. Epoch seconds are refused.
	 * @param {TApiAuthorizationIamLiteral} value - Literal value.
	 * @param {string} property - Path of the value.
	 * @param {IApiAuthorizationIamParserScope} scope - Failure scope.
	 * @returns {boolean} Whether the value is a date.
	 */
	private static checkDateValue(value: TApiAuthorizationIamLiteral, property: string, scope: IApiAuthorizationIamParserScope): boolean {
		if (typeof value === "number" || (typeof value === "string" && IAM_PARSER_EPOCH_PATTERN.test(value))) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_EPOCH_NOT_ALLOWED, "Date operators take ISO 8601 text, not epoch seconds");

			return false;
		}

		const text: string = typeof value === "string" ? value : "";
		const dateTimeGroups: Record<string, string | undefined> | undefined = IAM_PARSER_DATE_TIME_PATTERN.exec(text)?.groups;
		const date: string = IAM_PARSER_DATE_PATTERN.test(text) ? text : (dateTimeGroups?.date ?? "");
		const isDateValid: boolean = ApiAuthorizationIamParser.isValidCalendarDate(date);
		const isTimeValid: boolean = dateTimeGroups === undefined ? date === text : ApiAuthorizationIamParser.isValidClockTime(dateTimeGroups.time ?? "");
		const zone: string = dateTimeGroups?.zone ?? "";

		if (!isDateValid || !isTimeValid || (zone.length > 0 && !IAM_PARSER_ZONE_PATTERN.test(zone))) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_INVALID, "Date operators take ISO 8601 text with a zone designator, or a YYYY-MM-DD date");

			return false;
		}

		if (dateTimeGroups !== undefined && zone.length === 0) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_NO_TIME_ZONE, "Date and time must carry a zone designator, such as Z or +02:00");

			return false;
		}

		if ((dateTimeGroups?.fraction?.length ?? 0) > IAM_PARSER_MAX_FRACTION_DIGITS) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_TOO_PRECISE, "Date and time must be at most millisecond precise");

			return false;
		}

		// What the shape cannot tell: a year outside 0001 to 9999, or a zone offset out of range.
		if (!ApiAuthorizationIamDateValue.parse(text)) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_INVALID, "Date operators take a year from 0001 to 9999 and a zone offset up to 23:59");

			return false;
		}

		return true;
	}

	/**
	 * Checks a literal condition value against its operator family.
	 * @param {TApiAuthorizationIamLiteral} value - Literal value; a string with its escapes read.
	 * @param {EApiPolicyConditionOperatorFamily} family - Operator family.
	 * @param {string} property - Path of the value.
	 * @param {IApiAuthorizationIamParserScope} scope - Failure scope.
	 * @returns {boolean} Whether the value fits.
	 */
	private static checkLiteralValue(value: TApiAuthorizationIamLiteral, family: EApiPolicyConditionOperatorFamily, property: string, scope: IApiAuthorizationIamParserScope): boolean {
		if (family === EApiPolicyConditionOperatorFamily.DATE) {
			return ApiAuthorizationIamParser.checkDateValue(value, property, scope);
		}

		if (family === EApiPolicyConditionOperatorFamily.NUMERIC) {
			return ApiAuthorizationIamParser.checkNumericValue(value, property, scope);
		}

		let message: string | undefined;

		if (family === EApiPolicyConditionOperatorFamily.ARN && (typeof value !== "string" || value.length === 0)) {
			message = "Arn operators take a non-empty colon-delimited name";
		} else if ((family === EApiPolicyConditionOperatorFamily.BOOL || family === EApiPolicyConditionOperatorFamily.NULL) && !ApiAuthorizationIamParser.isBooleanText(value)) {
			message = "Bool and Null take true or false";
		} else if (family === EApiPolicyConditionOperatorFamily.IP_ADDRESS && (typeof value !== "string" || !ApiAuthorizationIamNetwork.parse(value))) {
			message = "IpAddress operators take an IPv4 or IPv6 address or CIDR range";
		}

		if (message !== undefined) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_INVALID, message);
		}

		return message === undefined;
	}

	/**
	 * Checks a literal number: decimal text, or a JSON number that is a safe integer or has at most 15 significant digits.
	 * @param {TApiAuthorizationIamLiteral} value - Literal value.
	 * @param {string} property - Path of the value.
	 * @param {IApiAuthorizationIamParserScope} scope - Failure scope.
	 * @returns {boolean} Whether the value is a number.
	 */
	private static checkNumericValue(value: TApiAuthorizationIamLiteral, property: string, scope: IApiAuthorizationIamParserScope): boolean {
		if (typeof value === "string" ? !ApiAuthorizationIamDecimal.parse(value) : typeof value !== "number") {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_INVALID, "Numeric operators take a number or decimal text such as -12.5");

			return false;
		}

		if (typeof value !== "number" || Number.isSafeInteger(value)) {
			return true;
		}

		const significantDigits: number = (value.toExponential().split("e")[0] ?? "").replaceAll(/\D/g, "").length;

		if (significantDigits > IAM_PARSER_MAX_SIGNIFICANT_DIGITS) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_TOO_PRECISE, "A JSON number must be a safe integer or have at most 15 significant digits; write it as decimal text");

			return false;
		}

		return true;
	}

	/**
	 * Checks a `resource.*` key against the resource definitions of the namespace: some definition must map it as a
	 * filterable field, and the operator must fit the column in every definition that maps it, as
	 * `ApiAuthorizationIamPredicateBuilder.isOperatorFitting` says. A key through a to-many relation needs a set
	 * qualifier and fits the column of a related row, and a set qualifier fits nothing else.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read so far.
	 * @param {string} property - Path of the key.
	 * @param {IApiAuthorizationIamParserScope} scope - Failure scope with the resource definitions.
	 */
	private static checkResourceKey(condition: IApiAuthorizationIamCondition, property: string, scope: IApiAuthorizationIamParserScope): void {
		const definitions: ReadonlyArray<IApiAuthorizationResourceDefinition<IApiBaseEntity>> = scope.resourceDefinitions ?? [];

		const mappings: Array<{ definition: IApiAuthorizationResourceDefinition<IApiBaseEntity>; field: IApiAuthorizationResourceFieldDefinition }> = definitions.flatMap((definition: IApiAuthorizationResourceDefinition<IApiBaseEntity>): Array<{ definition: IApiAuthorizationResourceDefinition<IApiBaseEntity>; field: IApiAuthorizationResourceFieldDefinition }> =>
			definition.fields.filter((field: IApiAuthorizationResourceFieldDefinition): boolean => field.path === condition.key).map((field: IApiAuthorizationResourceFieldDefinition): { definition: IApiAuthorizationResourceDefinition<IApiBaseEntity>; field: IApiAuthorizationResourceFieldDefinition } => ({ definition, field })),
		);

		if (mappings.length === 0) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_KEY_UNKNOWN, `Condition key "${condition.key}" is mapped by no resource definition of the namespace`);

			return;
		}

		if (!mappings.some(({ field }: { field: IApiAuthorizationResourceFieldDefinition }): boolean => field.isFilterable)) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_KEY_NOT_FILTERABLE, `Condition key "${condition.key}" is mapped by no resource definition of the namespace as filterable`);

			return;
		}

		for (const { definition, field } of mappings) {
			const queryField: IApiAuthorizationIamQueryField = AuthorizationIamReadQueryField(definition.entity, field.queryPath);

			if (queryField.collectionPath !== undefined && condition.qualifier === undefined) {
				ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_QUALIFIER_REQUIRED, `Condition key "${condition.key}" maps through the to-many relation "${queryField.collectionPath}" in resource type "${definition.resourceType}", so it needs ForAnyValue or ForAllValues`);

				return;
			}

			if (queryField.collectionPath === undefined && condition.qualifier !== undefined) {
				ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_QUALIFIER_UNSUPPORTED, `Condition qualifier "${condition.qualifier}" does not apply to "${condition.key}", which holds one value in resource type "${definition.resourceType}"`);

				return;
			}

			// A subquery bypasses a value transformer, so a related column with one fits no operator.
			const isFitting: boolean = queryField.collectionPath === undefined ? ApiAuthorizationIamParser.isResourceKeyFitting(condition, queryField) : queryField.element?.field.column?.hasTransformer === false && ApiAuthorizationIamParser.isResourceKeyFitting(condition, queryField.element.field);

			if (!isFitting) {
				ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_KEY_TYPE_MISMATCH, `Condition operator "${condition.source}" does not fit the column "${field.queryPath}" that "${condition.key}" maps to in resource type "${definition.resourceType}"`);

				return;
			}
		}
	}

	/**
	 * Checks the variables of a condition value or a `Resource` pattern against the context-key registry.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} tokens - Tokens of the value or pattern.
	 * @param {"resource" | "value"} use - Where the variables are written.
	 * @param {string} property - Path of the value or pattern.
	 * @param {IApiAuthorizationIamParserScope} scope - Failure scope.
	 * @returns {boolean} Whether every variable is accepted.
	 */
	private static checkVariables(tokens: ReadonlyArray<IApiAuthorizationIamToken>, use: "resource" | "value", property: string, scope: IApiAuthorizationIamParserScope): boolean {
		let isAccepted: boolean = true;

		for (const part of tokens) {
			if (part.type !== EApiAuthorizationIamTokenType.VARIABLE || !part.variable) {
				continue;
			}

			const path: string = part.variable.path;
			const entry: IApiAuthorizationIamContextKey | undefined = ApiAuthorizationIamParser.findContextKey(path);
			const support: EApiAuthorizationIamSupport | undefined = entry?.[use];

			switch (support) {
				case EApiAuthorizationIamSupport.ACCEPTED: {
					break;
				}

				case EApiAuthorizationIamSupport.NOT_ALLOWED: {
					ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.VARIABLE_NOT_ALLOWED, use === "resource" ? `Variable "\${${path}}" is not allowed in a Resource pattern` : `Variable "\${${path}}" is not allowed as a condition value`);
					isAccepted = false;

					break;
				}

				case EApiAuthorizationIamSupport.NOT_SUPPORTED_YET: {
					ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.NOT_SUPPORTED_YET, use === "resource" ? `Variable "\${${path}}" in a Resource pattern is not supported yet` : `Variable "\${${path}}" as a condition value is not supported yet`);
					isAccepted = false;

					break;
				}

				case undefined: {
					ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.VARIABLE_UNKNOWN, `Variable "\${${path}}" names no context path`);
					isAccepted = false;

					break;
				}
			}
		}

		return isAccepted;
	}

	/**
	 * Records one failure.
	 * @param {IApiAuthorizationIamParserScope} scope - Failure scope.
	 * @param {string} property - Path of the failing part.
	 * @param {string} code - Constraint code.
	 * @param {string} message - Message for logs.
	 */
	private static fail(scope: IApiAuthorizationIamParserScope, property: string, code: string, message: string): void {
		scope.failures.push({ code, message, property });
	}

	/**
	 * Writes the path of a condition operator entry.
	 * @param {string} property - Path of the statement.
	 * @param {string} operator - Operator as written.
	 * @returns {string} `…Condition.StringEquals`, or `…Condition["ForAnyValue:StringEquals"]` for a name that is no identifier.
	 */
	private static formatOperatorProperty(property: string, operator: string): string {
		return /^\w+$/.test(operator) ? `${property}.Condition.${operator}` : `${property}.Condition[${JSON.stringify(operator)}]`;
	}

	/**
	 * Tells whether a pattern holds a variable whose default is empty: the pattern would read as the text around the
	 * variable alone, and a list and a read would not agree on the rows it names.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} parts - Pattern tokens.
	 * @returns {boolean} Whether a variable of the pattern has the default `''`.
	 */
	private static hasEmptyDefault(parts: ReadonlyArray<IApiAuthorizationIamToken>): boolean {
		return parts.some((part: IApiAuthorizationIamToken): boolean => part.variable?.defaultValue === "");
	}

	/**
	 * Tells whether a value is `true`, `false`, or that exact text.
	 * @param {unknown} value - Value to check.
	 * @returns {boolean} Whether the value is a boolean literal.
	 */
	private static isBooleanText(value: unknown): boolean {
		return typeof value === "boolean" || value === "true" || value === "false";
	}

	/**
	 * Tells whether a date literal is of the kind a column or a context key holds. A variable may resolve to either, so it passes.
	 * @param {IApiAuthorizationIamConditionValue} value - Condition value.
	 * @param {boolean} isCalendar - Whether the column or the key holds a calendar date, and not an instant.
	 * @returns {boolean} Whether the value fits.
	 */
	private static isDateKindFitting(value: IApiAuthorizationIamConditionValue, isCalendar: boolean): boolean {
		return ApiAuthorizationIamParser.isVariableValue(value) || ApiAuthorizationIamDateValue.parse(value.source)?.isCalendar === isCalendar;
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
	 * Tells whether a key's operator fits the column it maps to. A path TypeORM does not map has no column type to check,
	 * so only String and Null read it. A boolean column takes a String operator only with `true`, `false` or a variable, and
	 * a `date` column a calendar date as every other date column takes an instant.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read so far.
	 * @param {IApiAuthorizationIamQueryField} field - Resolved query path of the key.
	 * @returns {boolean} Whether the operator fits.
	 */
	private static isResourceKeyFitting(condition: IApiAuthorizationIamCondition, field: IApiAuthorizationIamQueryField): boolean {
		if (!field.isResolvable) {
			return condition.family === EApiPolicyConditionOperatorFamily.STRING || condition.family === EApiPolicyConditionOperatorFamily.NULL;
		}

		if (!ApiAuthorizationIamPredicateBuilder.isOperatorFitting(condition.family, field)) {
			return false;
		}

		if (condition.family === EApiPolicyConditionOperatorFamily.STRING && field.isBoolean) {
			return condition.values.every((value: IApiAuthorizationIamConditionValue): boolean => ApiAuthorizationIamParser.isVariableValue(value) || ApiAuthorizationIamParser.isBooleanText(value.source));
		}

		if (condition.family === EApiPolicyConditionOperatorFamily.DATE) {
			return condition.values.every((value: IApiAuthorizationIamConditionValue): boolean => ApiAuthorizationIamParser.isDateKindFitting(value, field.column?.type === "date"));
		}

		return true;
	}

	/**
	 * Tells whether text is a calendar date that exists, such as `2024-02-29`.
	 * @param {string} date - `YYYY-MM-DD` text.
	 * @returns {boolean} Whether the date exists.
	 */
	private static isValidCalendarDate(date: string): boolean {
		if (!IAM_PARSER_DATE_PATTERN.test(date)) {
			return false;
		}

		const [year, month, day]: Array<number> = date.split("-").map(Number);
		const calendarDate: Date = new Date(0);
		calendarDate.setUTCFullYear(year ?? 0, (month ?? 0) - 1, day ?? 0);

		return calendarDate.getUTCFullYear() === year && calendarDate.getUTCMonth() === (month ?? 0) - 1 && calendarDate.getUTCDate() === day;
	}

	/**
	 * Tells whether text is a time of day, `HH:MM` or `HH:MM:SS`.
	 * @param {string} time - Time text.
	 * @returns {boolean} Whether each part is in range.
	 */
	private static isValidClockTime(time: string): boolean {
		const [hours, minutes, seconds]: Array<number> = time.split(":").map(Number);

		return (hours ?? Number.NaN) <= IAM_PARSER_MAX_HOUR && (minutes ?? Number.NaN) <= IAM_PARSER_MAX_MINUTE && (seconds ?? 0) <= IAM_PARSER_MAX_MINUTE;
	}

	/**
	 * Tells whether a condition value holds a variable.
	 * @param {IApiAuthorizationIamConditionValue} value - Condition value.
	 * @returns {boolean} Whether a part of the value is a variable.
	 */
	private static isVariableValue(value: IApiAuthorizationIamConditionValue): boolean {
		return value.parts.some((part: IApiAuthorizationIamToken): boolean => part.type === EApiAuthorizationIamTokenType.VARIABLE);
	}

	/**
	 * Reads one condition operator entry and its keys.
	 * @param {string} operatorSource - Operator as written, such as `ForAnyValue:StringEqualsIfExists`.
	 * @param {unknown} operands - Key map of the operator.
	 * @param {string} property - Path of the statement.
	 * @param {IApiAuthorizationIamParserScope} scope - Failure scope.
	 * @returns {Array<IApiAuthorizationIamCondition>} The keys that read without failure.
	 */
	private static readCondition(operatorSource: string, operands: unknown, property: string, scope: IApiAuthorizationIamParserScope): Array<IApiAuthorizationIamCondition> {
		const operatorProperty: string = ApiAuthorizationIamParser.formatOperatorProperty(property, operatorSource);
		const operator: { definition: IApiAuthorizationIamOperatorDefinition; isIfExists: boolean; operator: EApiPolicyConditionOperator; qualifier?: EApiPolicyConditionQualifier } | undefined = ApiAuthorizationIamParser.readOperator(operatorSource, operatorProperty, scope);
		const conditions: Array<IApiAuthorizationIamCondition> = [];

		if (!ApiAuthorizationIamParser.isRecord(operands) || Object.keys(operands).length === 0) {
			ApiAuthorizationIamParser.fail(scope, operatorProperty, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_INVALID, `Condition operator "${operatorSource}" must map at least one key to its values`);

			return conditions;
		}

		for (const [source, rawValues] of Object.entries(operands)) {
			const keyProperty: string = `${operatorProperty}[${JSON.stringify(source)}]`;
			// A header name is case-insensitive, and Node reads it in lower case, so the key is read in lower case too.
			const key: string = source.startsWith(IAM_PARSER_REQUEST_HEADERS_PREFIX) ? `${IAM_PARSER_REQUEST_HEADERS_PREFIX}${source.slice(IAM_PARSER_REQUEST_HEADERS_PREFIX.length).toLowerCase()}` : source;
			const failureCount: number = scope.failures.length;
			const entry: IApiAuthorizationIamContextKey | undefined = ApiAuthorizationIamParser.findContextKey(key);

			if (!entry) {
				ApiAuthorizationIamParser.fail(scope, keyProperty, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_KEY_UNKNOWN, `Condition key "${key}" names no context path`);
			} else if (entry.key === EApiAuthorizationIamSupport.NOT_ALLOWED) {
				ApiAuthorizationIamParser.fail(scope, keyProperty, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_KEY_NOT_ALLOWED, `Condition key "${key}" is not allowed`);
			} else if (entry.key === EApiAuthorizationIamSupport.NOT_SUPPORTED_YET) {
				ApiAuthorizationIamParser.fail(scope, keyProperty, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.NOT_SUPPORTED_YET, `Condition key "${key}" is not supported yet`);
			}

			if (operator?.qualifier !== undefined && entry && !entry.isMultiValued) {
				ApiAuthorizationIamParser.fail(scope, keyProperty, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_QUALIFIER_UNSUPPORTED, `Condition qualifier "${operator.qualifier}" does not apply to "${key}", which holds one value`);
			}

			if (!operator) {
				continue;
			}

			const values: Array<IApiAuthorizationIamConditionValue> = ApiAuthorizationIamParser.readValues(rawValues, operator.definition.family, keyProperty, scope);

			const condition: IApiAuthorizationIamCondition = {
				family: operator.definition.family,
				isIfExists: operator.isIfExists,
				isNegated: operator.definition.isNegated,
				key,
				operator: operator.operator,
				...(operator.qualifier === undefined ? {} : { qualifier: operator.qualifier }),
				source: operatorSource,
				values,
			};

			if (entry?.path === "resource" && scope.resourceDefinitions !== undefined && scope.failures.length === failureCount) {
				ApiAuthorizationIamParser.checkResourceKey(condition, keyProperty, scope);
			}

			// The time of a request is an instant: no other family reads it, and a calendar date compares with no instant.
			if (key === IAM_PARSER_REQUEST_TIME_KEY && scope.failures.length === failureCount && condition.family !== EApiPolicyConditionOperatorFamily.NULL && (condition.family !== EApiPolicyConditionOperatorFamily.DATE || !condition.values.every((value: IApiAuthorizationIamConditionValue): boolean => ApiAuthorizationIamParser.isDateKindFitting(value, false)))) {
				ApiAuthorizationIamParser.fail(scope, keyProperty, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_KEY_TYPE_MISMATCH, `Condition operator "${condition.source}" does not fit "${key}", which holds the instant of the request`);
			}

			if (scope.failures.length === failureCount) {
				conditions.push(condition);
			}
		}

		return conditions;
	}

	/**
	 * Reads the size of a document as its JSON text.
	 * @param {Record<string, unknown>} input - Policy document.
	 * @returns {number | undefined} The length in UTF-16 code units, or undefined when the document has no JSON text, such as a cyclic one.
	 */
	private static readDocumentLength(input: Record<string, unknown>): number | undefined {
		try {
			return JSON.stringify(input).length;
		} catch {
			return undefined;
		}
	}

	/**
	 * Reads a condition operator name: an optional qualifier, the base operator, and an optional `IfExists` suffix.
	 * @param {string} source - Operator as written.
	 * @param {string} property - Path of the operator entry.
	 * @param {IApiAuthorizationIamParserScope} scope - Failure scope.
	 * @returns {undefined | { definition: IApiAuthorizationIamOperatorDefinition; isIfExists: boolean; operator: EApiPolicyConditionOperator; qualifier?: EApiPolicyConditionQualifier }} The operator, or undefined when its name fails.
	 */
	private static readOperator(source: string, property: string, scope: IApiAuthorizationIamParserScope): { definition: IApiAuthorizationIamOperatorDefinition; isIfExists: boolean; operator: EApiPolicyConditionOperator; qualifier?: EApiPolicyConditionQualifier } | undefined {
		const separatorIndex: number = source.indexOf(":");
		const qualifierSource: string | undefined = separatorIndex === -1 ? undefined : source.slice(0, separatorIndex);
		const name: string = separatorIndex === -1 ? source : source.slice(separatorIndex + 1);

		if (qualifierSource !== undefined && !EnumIsValue(EApiPolicyConditionQualifier, qualifierSource)) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_QUALIFIER_UNKNOWN, `Condition qualifier "${qualifierSource}" is unknown; use ForAnyValue or ForAllValues`);

			return undefined;
		}

		const suffix: string = AUTHORIZATION_POLICY_CONDITION_OPERATOR_CONSTANT.IF_EXISTS_SUFFIX;
		const isIfExists: boolean = name.length > suffix.length && name.endsWith(suffix);
		const baseName: string = isIfExists ? name.slice(0, -suffix.length) : name;

		if (AUTHORIZATION_POLICY_CONDITION_OPERATOR_CONSTANT.REFUSED_OPERATORS.has(baseName)) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_OPERATOR_NOT_ALLOWED, `Condition operator "${name}" is not allowed`);

			return undefined;
		}

		const definition: IApiAuthorizationIamOperatorDefinition | undefined = AUTHORIZATION_POLICY_CONDITION_OPERATOR_CONSTANT.OPERATORS.get(baseName);

		if (!definition || !EnumIsValue(EApiPolicyConditionOperator, baseName) || (isIfExists && !definition.isIfExistsAllowed)) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_OPERATOR_UNKNOWN, `Condition operator "${name}" is unknown`);

			return undefined;
		}

		const qualifier: EApiPolicyConditionQualifier | undefined = qualifierSource;

		if (qualifier !== undefined && definition.family === EApiPolicyConditionOperatorFamily.NULL) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_QUALIFIER_UNSUPPORTED, `Condition qualifier "${qualifier}" does not apply to the Null operator`);

			return undefined;
		}

		return { definition, isIfExists, operator: baseName, ...(qualifier === undefined ? {} : { qualifier }) };
	}

	/**
	 * Reads one `Action`, `NotAction`, `Resource` or `NotResource` pattern.
	 * @param {unknown} input - Pattern as written.
	 * @param {"action" | "resource"} kind - Whether the pattern names actions or resources.
	 * @param {string} property - Path of the pattern.
	 * @param {IApiAuthorizationIamParserScope} scope - Failure scope.
	 * @returns {IApiAuthorizationIamPattern | undefined} The pattern, or undefined when it fails.
	 */
	private static readPattern(input: unknown, kind: "action" | "resource", property: string, scope: IApiAuthorizationIamParserScope): IApiAuthorizationIamPattern | undefined {
		if (typeof input !== "string" || input.length === 0) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.PATTERN_INVALID, "Pattern must be a non-empty string");

			return undefined;
		}

		const parts: Array<IApiAuthorizationIamToken> | undefined = ApiAuthorizationIamVariable.tokenize(input, true);

		if (!parts) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.PATTERN_INVALID, `Pattern "${input}" holds a malformed \${...}`);

			return undefined;
		}

		if (kind === "action") {
			if (parts.some((part: IApiAuthorizationIamToken): boolean => part.type === EApiAuthorizationIamTokenType.VARIABLE)) {
				ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.VARIABLE_NOT_ALLOWED, `Action pattern "${input}" must not hold a variable`);

				return undefined;
			}

			if (scope.namespace !== undefined && !ApiAuthorizationIamGlob.isOverlapping(parts, [{ value: `${scope.namespace}:` }, { placeholder: "action", value: "*" }])) {
				ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.PATTERN_OUTSIDE_NAMESPACE, `Action pattern "${input}" matches no action of namespace "${scope.namespace}"`);

				return undefined;
			}
		} else if (!ApiAuthorizationIamParser.checkVariables(parts, "resource", property, scope)) {
			return undefined;
		} else if (ApiAuthorizationIamParser.hasEmptyDefault(parts)) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.PATTERN_INVALID, `Pattern "${input}" holds a variable with an empty default`);

			return undefined;
		}

		return { source: input, tokens: parts };
	}

	/**
	 * Reads one statement, reporting every failure of it.
	 * @param {unknown} input - Statement as written.
	 * @param {string} property - Path of the statement.
	 * @param {IApiAuthorizationIamParserScope} scope - Failure scope.
	 * @returns {IApiAuthorizationIamStatement | undefined} The statement model, complete only when no failure was added, or undefined when the statement is not an object.
	 */
	private static readStatementInput(input: unknown, property: string, scope: IApiAuthorizationIamParserScope): IApiAuthorizationIamStatement | undefined {
		if (!ApiAuthorizationIamParser.isRecord(input)) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.DOCUMENT_INVALID, "Policy statement must be an object");

			return undefined;
		}

		for (const field of Object.keys(input)) {
			if (!IAM_PARSER_STATEMENT_FIELDS.has(field)) {
				ApiAuthorizationIamParser.fail(scope, `${property}.${field}`, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.FIELD_UNKNOWN, `Policy statement field "${field}" is unknown`);
			}
		}

		let sid: string | undefined;

		if (input.Sid !== undefined) {
			if (typeof input.Sid === "string" && input.Sid.length > 0) {
				sid = input.Sid;
			} else {
				ApiAuthorizationIamParser.fail(scope, `${property}.Sid`, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.SID_INVALID, "Statement Sid must be a non-empty string");
			}
		}

		if (input.Effect !== EApiPolicyEffect.ALLOW && input.Effect !== EApiPolicyEffect.DENY) {
			ApiAuthorizationIamParser.fail(scope, `${property}.Effect`, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.EFFECT_INVALID, `Statement Effect must be "Allow" or "Deny"`);
		}

		const action: IApiAuthorizationIamStatementTarget = ApiAuthorizationIamParser.readTarget(input, "action", property, scope);
		const resource: IApiAuthorizationIamStatementTarget = ApiAuthorizationIamParser.readTarget(input, "resource", property, scope);
		const conditions: Array<IApiAuthorizationIamCondition> = [];

		if (input.Condition !== undefined) {
			if (ApiAuthorizationIamParser.isRecord(input.Condition)) {
				for (const [operator, operands] of Object.entries(input.Condition)) {
					conditions.push(...ApiAuthorizationIamParser.readCondition(operator, operands, property, scope));
				}
			} else {
				ApiAuthorizationIamParser.fail(scope, `${property}.Condition`, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_INVALID, "Statement Condition must be an object");
			}
		}

		return { action, conditions, effect: input.Effect as EApiPolicyEffect, resource, ...(sid === undefined ? {} : { sid }) };
	}

	/**
	 * Reads the `Action`/`NotAction` or `Resource`/`NotResource` pair of a statement: exactly one of the two, as a non-empty list of patterns.
	 * @param {Record<string, unknown>} input - Statement as written.
	 * @param {"action" | "resource"} kind - Which pair to read.
	 * @param {string} property - Path of the statement.
	 * @param {IApiAuthorizationIamParserScope} scope - Failure scope.
	 * @returns {IApiAuthorizationIamStatementTarget} The patterns that read without failure.
	 */
	private static readTarget(input: Record<string, unknown>, kind: "action" | "resource", property: string, scope: IApiAuthorizationIamParserScope): IApiAuthorizationIamStatementTarget {
		const field: string = kind === "action" ? "Action" : "Resource";
		const negatedField: string = `Not${field}`;
		const isPositive: boolean = input[field] !== undefined;
		const isNegated: boolean = input[negatedField] !== undefined;
		const patterns: Array<IApiAuthorizationIamPattern> = [];

		if (isPositive && isNegated) {
			ApiAuthorizationIamParser.fail(scope, property, kind === "action" ? AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.ACTION_CONFLICT : AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.RESOURCE_CONFLICT, `Statement must not write both ${field} and ${negatedField}`);

			return { isNegated, patterns };
		}

		const writtenField: string = isNegated ? negatedField : field;
		const value: unknown = input[writtenField];

		if (Array.isArray(value) && value.length > 0) {
			for (const [index, entry] of (value as ReadonlyArray<unknown>).entries()) {
				const pattern: IApiAuthorizationIamPattern | undefined = ApiAuthorizationIamParser.readPattern(entry, kind, `${property}.${writtenField}[${index}]`, scope);

				if (pattern) {
					patterns.push(pattern);
				}
			}
		} else if (typeof value === "string") {
			ApiAuthorizationIamParser.fail(scope, `${property}.${writtenField}`, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.SHORTHAND_NOT_ALLOWED, `Statement ${writtenField} must be a list of patterns, not one pattern`);
		} else if (value === undefined || Array.isArray(value)) {
			ApiAuthorizationIamParser.fail(scope, isPositive || isNegated ? `${property}.${writtenField}` : property, kind === "action" ? AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.ACTION_MISSING : AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.RESOURCE_MISSING, `Statement must write ${field} or ${negatedField} with at least one pattern`);
		} else {
			ApiAuthorizationIamParser.fail(scope, `${property}.${writtenField}`, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.PATTERN_INVALID, `Statement ${writtenField} must be a list of patterns`);
		}

		return { isNegated, patterns };
	}

	/**
	 * Reads one condition value and checks it against the operator family. A number and a boolean are kept as written;
	 * a string is read into literal and variable tokens. String and Arn families take an embedded variable; every other
	 * family takes a variable only as the whole value, whose default must read as a literal of the family.
	 * @param {unknown} input - Value as written.
	 * @param {EApiPolicyConditionOperatorFamily} family - Operator family.
	 * @param {string} property - Path of the value.
	 * @param {IApiAuthorizationIamParserScope} scope - Failure scope.
	 * @returns {IApiAuthorizationIamConditionValue | undefined} The value, or undefined when it fails.
	 */
	private static readValue(input: unknown, family: EApiPolicyConditionOperatorFamily, property: string, scope: IApiAuthorizationIamParserScope): IApiAuthorizationIamConditionValue | undefined {
		if (typeof input === "boolean" || (typeof input === "number" && Number.isFinite(input))) {
			return ApiAuthorizationIamParser.checkLiteralValue(input, family, property, scope) ? { parts: [], source: input } : undefined;
		}

		if (typeof input !== "string") {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_INVALID, "Condition value must be a string, a finite number or a boolean");

			return undefined;
		}

		const isPattern: boolean = family === EApiPolicyConditionOperatorFamily.STRING_LIKE || family === EApiPolicyConditionOperatorFamily.ARN;
		const parts: Array<IApiAuthorizationIamToken> | undefined = ApiAuthorizationIamVariable.tokenize(input, isPattern);

		if (!parts) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_INVALID, `Condition value "${input}" holds a malformed \${...}`);

			return undefined;
		}

		const variableCount: number = parts.filter((part: IApiAuthorizationIamToken): boolean => part.type === EApiAuthorizationIamTokenType.VARIABLE).length;

		if (variableCount === 0) {
			const text: string = parts.map((part: IApiAuthorizationIamToken): string => part.value ?? (part.type === EApiAuthorizationIamTokenType.STAR ? "*" : "?")).join("");

			return ApiAuthorizationIamParser.checkLiteralValue(text, family, property, scope) ? { parts, source: input } : undefined;
		}

		if (!ApiAuthorizationIamParser.checkVariables(parts, "value", property, scope)) {
			return undefined;
		}

		const isStringFamily: boolean = family === EApiPolicyConditionOperatorFamily.STRING || family === EApiPolicyConditionOperatorFamily.STRING_IGNORE_CASE || family === EApiPolicyConditionOperatorFamily.STRING_LIKE || family === EApiPolicyConditionOperatorFamily.ARN;

		if (isPattern && ApiAuthorizationIamParser.hasEmptyDefault(parts)) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_INVALID, `Condition value "${input}" is a pattern with a variable whose default is empty`);

			return undefined;
		}

		if (isStringFamily) {
			return { parts, source: input };
		}

		if (parts.length > 1) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_INVALID, `Condition value "${input}" must be a variable alone or a literal`);

			return undefined;
		}

		if (family === EApiPolicyConditionOperatorFamily.NULL) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_INVALID, "Null takes true or false, not a variable");

			return undefined;
		}

		const defaultValue: string | undefined = parts[0]?.variable?.defaultValue;

		return defaultValue === undefined || ApiAuthorizationIamParser.checkLiteralValue(defaultValue, family, property, scope) ? { parts, source: input } : undefined;
	}

	/**
	 * Reads the values of one condition key: one scalar, or a list of 1 to 64 scalars.
	 * @param {unknown} input - Values as written.
	 * @param {EApiPolicyConditionOperatorFamily} family - Operator family.
	 * @param {string} property - Path of the key.
	 * @param {IApiAuthorizationIamParserScope} scope - Failure scope.
	 * @returns {Array<IApiAuthorizationIamConditionValue>} The values that read without failure.
	 */
	private static readValues(input: unknown, family: EApiPolicyConditionOperatorFamily, property: string, scope: IApiAuthorizationIamParserScope): Array<IApiAuthorizationIamConditionValue> {
		if (!Array.isArray(input)) {
			const value: IApiAuthorizationIamConditionValue | undefined = ApiAuthorizationIamParser.readValue(input, family, property, scope);

			return value ? [value] : [];
		}

		if (input.length === 0) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_EMPTY, "Condition key must have at least one value");

			return [];
		}

		if (input.length > AUTHORIZATION_POLICY_CONDITION_OPERATOR_CONSTANT.MAX_VALUES) {
			ApiAuthorizationIamParser.fail(scope, property, AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT.CONDITION_VALUE_TOO_MANY, `Condition key must have at most ${AUTHORIZATION_POLICY_CONDITION_OPERATOR_CONSTANT.MAX_VALUES} values`);

			return [];
		}

		const values: Array<IApiAuthorizationIamConditionValue> = [];

		for (const [index, entry] of (input as ReadonlyArray<unknown>).entries()) {
			const value: IApiAuthorizationIamConditionValue | undefined = ApiAuthorizationIamParser.readValue(entry, family, `${property}[${index}]`, scope);

			if (value) {
				values.push(value);
			}
		}

		return values;
	}
}
