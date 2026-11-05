import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type {
	IApiAuthorizationIamCollection,
	IApiAuthorizationIamCondition,
	IApiAuthorizationIamDenyExclusion,
	IApiAuthorizationIamDialect,
	IApiAuthorizationIamOperand,
	IApiAuthorizationIamPredicateColumn,
	IApiAuthorizationIamPredicatePair,
	IApiAuthorizationIamQueryField,
	IApiAuthorizationIamResourceConstraint,
	IApiAuthorizationIamResourceRows,
	IApiAuthorizationIamToken,
	IApiAuthorizationPrincipal,
	IApiAuthorizationRequestMetadata,
	IApiAuthorizationResourceDefinition,
	IApiAuthorizationScope,
	IApiPolicyStatement,
} from "@interface/class/api/authorization";
import type { TApiAuthorizationIamPredicate, TApiAuthorizationIamPredicateValue } from "@type/class/api/authorization/iam";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { FindOptionsWhere } from "typeorm";

import { ApiAuthorizationIamCollection } from "@class/api/authorization/iam/collection.class";
import { ApiAuthorizationIamDecimal } from "@class/api/authorization/iam/decimal.class";
import { ApiAuthorizationIamMysqlLowerer, ApiAuthorizationIamPortableLowerer, ApiAuthorizationIamPostgresLowerer, ApiAuthorizationIamSqliteLowerer } from "@class/api/authorization/iam/lowerer";
import { ApiAuthorizationIamOperator } from "@class/api/authorization/iam/operator.class";
import { ApiAuthorizationIamParser } from "@class/api/authorization/iam/parser.class";
import { ApiAuthorizationIamPredicateBuilder } from "@class/api/authorization/iam/predicate";
import { ApiAuthorizationIamVariable } from "@class/api/authorization/iam/variable.class";
import { MetadataStorage } from "@class/metadata-storage.class";
import { AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT, AUTHORIZATION_IAM_SCOPE_CONSTANT, AUTHORIZATION_IAM_SLOT_ALPHABET_CONSTANT, AUTHORIZATION_POLICY_CONDITION_OPERATOR_CONSTANT } from "@constant/class/authorization";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiAuthorizationIamColumnFamily, EApiAuthorizationIamDialect, EApiAuthorizationIamPredicateComparison, EApiAuthorizationIamPredicateKind, EApiAuthorizationIamPredicateOperator, EApiAuthorizationIamTokenType, EApiPolicyConditionOperatorFamily } from "@enum/class/authorization";
import { EApiPropertyDescribeType, EApiPropertyStringType } from "@enum/decorator/api";
import { Injectable } from "@nestjs/common";
import { ApiControllerGetListQueryParseValue } from "@utility/api/controller/get-list/query/parse-value.utility";
import { AuthorizationScopeMergeWhere } from "@utility/authorization";
import { AuthorizationIamReadQueryField } from "@utility/authorization/iam-query-field.utility";
import { AuthorizationSerializeValue } from "@utility/authorization/serialize-value.utility";
import { LoggerUtility } from "@utility/logger.utility";

const iamQueryPlannerLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationIamQueryPlanner");

// Resolved query paths, per resource entity class, so TypeORM metadata is walked once per path.
const iamQueryPlannerFieldCache: WeakMap<object, Map<string, IApiAuthorizationIamQueryField>> = new WeakMap<object, Map<string, IApiAuthorizationIamQueryField>>();

// The dialect of a scope planned without one: the SQL every database evaluates alike, as 5.1.0 emitted it.
const IAM_QUERY_PLANNER_PORTABLE_DIALECT: IApiAuthorizationIamDialect = Object.freeze({ type: EApiAuthorizationIamDialect.PORTABLE });

// A NUL character, which PostgreSQL refuses in text.
const IAM_QUERY_PLANNER_NUL: string = "\u0000";

// Exact decimal and floating-point column types, whose value reads back as driver decimal text or a JavaScript number.
const IAM_QUERY_PLANNER_NUMBER_TYPES: ReadonlySet<string> = new Set<string>(["dec", "decimal", "double", "double precision", "fixed", "float", "float4", "float8", "numeric", "real"]);

// Text a number column reads back as: decimal text, `Number.prototype.toString` of a finite number, or the `NaN` and infinities PostgreSQL `numeric` holds.
const IAM_QUERY_PLANNER_NUMBER_TEXT: RegExp = /^(?:-?\d+(?:\.\d+)?(?:e[+-]\d+)?|NaN|-?Infinity)$/;

// Text a calendar date column reads back as: `YYYY-MM-DD`, MySQL zero parts included, and the longer years, ` BC` and infinities of PostgreSQL.
const IAM_QUERY_PLANNER_DAY_TEXT: RegExp = /^(?:\d{4,}-(?:0\d|1[0-2])-(?:[0-2]\d|3[01])(?: BC)?|-?infinity)$/;

// Text an instant column reads back as: TypeORM hydrates it as a Date, which renders as `Date.prototype.toISOString`.
const IAM_QUERY_PLANNER_INSTANT_TEXT: RegExp = /^(?:[+-]\d{6}|\d{4})-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * Compiles matched IAM statements into TypeORM scopes. Each `resource.*` condition key and each row-scoped
 * resource-pattern constraint becomes a NULL-complete pair of predicates (see `ApiAuthorizationIamPredicateBuilder`):
 * an Allow scope is the OR of its statements' `holds`, and a Deny exclusion keeps the OR of its keys' `fails`. The
 * dialect lowerer then turns the predicate into `where` branches, under the branch cap, and fails the scope closed
 * when the database cannot compare one atom exactly as the in-memory evaluator does.
 */
@Injectable()
export class ApiAuthorizationIamQueryPlanner {
	/**
	 * Counts the `where` branches a scope ORs; merging two scopes builds the product of their counts.
	 * @template E - Entity type.
	 * @param {TApiAuthorizationScopeWhere<E>} where - Scope WHERE.
	 * @returns {number} The number of branches: one for a single object or no WHERE, which restricts nothing.
	 */
	public static countBranches<E extends IApiBaseEntity>(where: TApiAuthorizationScopeWhere<E>): number {
		return Array.isArray(where) ? where.length : 1;
	}

	/**
	 * Tells whether a `resource.*` key compiles for a dialect, in both directions. A key that does not fails closed on a
	 * loaded resource too, where memory alone could read it, so a row decides alike whichever way it reached the check.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {object} options - Planning options.
	 * @param {IApiAuthorizationIamDialect} [options.dialect] - SQL dialect of the resource entity; portable when absent.
	 * @param {IApiAuthorizationPrincipal} options.principal - Principal used to resolve `${...}` condition values.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} options.requestMetadata - Request metadata used to resolve `${...}` condition values.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition with the filterable field mappings.
	 * @returns {boolean} Whether both `holds` and `fails` of the key lower exactly.
	 */
	public isConditionCompilable<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(condition: IApiAuthorizationIamCondition, options: { dialect?: IApiAuthorizationIamDialect; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> }): boolean {
		const pair: IApiAuthorizationIamPredicatePair | undefined = this.buildConditionPair(condition, options);

		if (!pair) {
			return false;
		}

		const lowerer: ApiAuthorizationIamPortableLowerer = this.createLowerer(options.dialect ?? IAM_QUERY_PLANNER_PORTABLE_DIALECT);

		return lowerer.lower<E>(pair.holds, AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES).isCompilable && lowerer.lower<E>(pair.fails, AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES).isCompilable;
	}

	/**
	 * Compiles matched Allow statements into the scope of rows they allow: the OR of every statement's branches. A
	 * statement with neither a `resource.*` key nor row patterns allows every row, so the scope is then unrestricted.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {object} options - Planning options.
	 * @param {IApiAuthorizationIamDialect} [options.dialect] - SQL dialect of the resource entity; portable when absent.
	 * @param {IApiAuthorizationPrincipal} options.principal - Principal used to resolve `${...}` condition values.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} options.requestMetadata - Request metadata used to resolve `${...}` condition values.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition with the filterable field mappings.
	 * @param {ReadonlyMap<IApiPolicyStatement, IApiAuthorizationIamResourceRows>} [options.statementRows] - Rows the target of a statement applies to, per statement; every row for one not listed.
	 * @param {ReadonlyArray<IApiPolicyStatement>} options.statements - Matched Allow statements.
	 * @returns {{ isFullyCompilable: boolean; scope?: IApiAuthorizationScope<E> }} The scope, none when every row is allowed, or a non-compilable result that grants nothing.
	 */
	public plan<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(options: {
		dialect?: IApiAuthorizationIamDialect;
		principal: IApiAuthorizationPrincipal;
		requestMetadata: IApiAuthorizationRequestMetadata<E, M>;
		resource?: E;
		resourceDefinition: IApiAuthorizationResourceDefinition<E>;
		statementRows?: ReadonlyMap<IApiPolicyStatement, IApiAuthorizationIamResourceRows>;
		statements: ReadonlyArray<IApiPolicyStatement>;
	}): { isFullyCompilable: boolean; scope?: IApiAuthorizationScope<E> } {
		iamQueryPlannerLogger.verbose(`Planning IAM query scope for resource type "${options.resourceDefinition.resourceType}" using ${options.statements.length} statements.`);

		const lowerer: ApiAuthorizationIamPortableLowerer = this.createLowerer(options.dialect ?? IAM_QUERY_PLANNER_PORTABLE_DIALECT);
		const branches: Array<FindOptionsWhere<E>> = [];
		let hasStatement: boolean = false;

		for (const statement of options.statements) {
			hasStatement = true;

			const holds: TApiAuthorizationIamPredicate | undefined = this.buildStatementHolds(ApiAuthorizationIamParser.readStatement(statement).conditions, options.statementRows?.get(statement), options);
			// The cap is read at call time, so a test or an application that changes it applies at once.
			const lowered: { branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean } = holds ? lowerer.lower<E>(holds, AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES) : { isCompilable: false };

			if (!lowered.isCompilable || !lowered.branches) {
				iamQueryPlannerLogger.verbose(`IAM query scope is not fully compilable for resource type "${options.resourceDefinition.resourceType}".`);

				return { isFullyCompilable: false };
			}

			if (lowered.branches.some((branch: FindOptionsWhere<E>): boolean => Object.keys(branch).length === 0)) {
				iamQueryPlannerLogger.verbose(`IAM query scope for resource type "${options.resourceDefinition.resourceType}" allows every row.`);

				return { isFullyCompilable: true, scope: undefined };
			}

			branches.push(...lowered.branches);
		}

		// Statements whose keys no row can satisfy allow nothing; there is no scope for that, so nothing is granted.
		if (branches.length === 0) {
			return hasStatement ? { isFullyCompilable: false } : { isFullyCompilable: true, scope: undefined };
		}

		// The branches of all statements together are capped as each statement's are, so a query never grows past the cap.
		if (branches.length > AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES) {
			iamQueryPlannerLogger.warn(`IAM query scope for resource type "${options.resourceDefinition.resourceType}" exceeds ${AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES} where branches.`);

			return { isFullyCompilable: false };
		}

		iamQueryPlannerLogger.verbose(`IAM query scope for resource type "${options.resourceDefinition.resourceType}" resolved with ${branches.length} where branches.`);

		return {
			isFullyCompilable: true,
			scope: {
				where: branches.length === 1 ? branches[0] : branches,
			},
		};
	}

	/**
	 * Compiles matched Deny statements into the scope of rows they leave visible. Each statement keeps the rows where
	 * one of its resource keys fails or that its `Resource` or `NotResource` target does not apply to; statements are
	 * ANDed through `AuthorizationScopeMergeWhere`.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {object} options - Planning options.
	 * @param {IApiAuthorizationIamDialect} [options.dialect] - SQL dialect of the resource entity; portable when absent.
	 * @param {ReadonlyArray<IApiAuthorizationIamDenyExclusion>} options.exclusions - Matched Deny statements with the rows their targets apply to.
	 * @param {IApiAuthorizationPrincipal} options.principal - Principal used to resolve `${...}` condition values.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} options.requestMetadata - Request metadata used to resolve `${...}` condition values.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition with the filterable field mappings.
	 * @returns {{ isFullyCompilable: boolean; scope?: IApiAuthorizationScope<E> }} Exclusion scope, or a non-compilable result that must deny the request.
	 */
	public planExclusion<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(options: {
		dialect?: IApiAuthorizationIamDialect;
		exclusions: ReadonlyArray<IApiAuthorizationIamDenyExclusion>;
		principal: IApiAuthorizationPrincipal;
		requestMetadata: IApiAuthorizationRequestMetadata<E, M>;
		resource?: E;
		resourceDefinition: IApiAuthorizationResourceDefinition<E>;
	}): { isFullyCompilable: boolean; scope?: IApiAuthorizationScope<E> } {
		iamQueryPlannerLogger.verbose(`Planning IAM exclusion scope for resource type "${options.resourceDefinition.resourceType}" using ${options.exclusions.length} deny exclusions.`);

		const lowerer: ApiAuthorizationIamPortableLowerer = this.createLowerer(options.dialect ?? IAM_QUERY_PLANNER_PORTABLE_DIALECT);
		let where: TApiAuthorizationScopeWhere<E>;

		for (const exclusion of options.exclusions) {
			const kept: TApiAuthorizationIamPredicate | undefined = this.buildExclusionKept(ApiAuthorizationIamParser.readStatement(exclusion.statement).conditions, exclusion.resourceRows, options);
			const lowered: { branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean } = kept ? lowerer.lower<E>(kept, AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES) : { isCompilable: false };

			// A Deny that keeps no row denies the whole request.
			if (!lowered.isCompilable || !lowered.branches || lowered.branches.length === 0) {
				iamQueryPlannerLogger.verbose(`IAM exclusion scope is not fully compilable for resource type "${options.resourceDefinition.resourceType}".`);

				return { isFullyCompilable: false };
			}

			// A Deny that keeps every row excludes nothing.
			if (lowered.branches.some((branch: FindOptionsWhere<E>): boolean => Object.keys(branch).length === 0)) {
				continue;
			}

			// The merge builds every pair of branches, so its size is checked before it is built.
			if (ApiAuthorizationIamQueryPlanner.countBranches(where) * lowered.branches.length > AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES) {
				iamQueryPlannerLogger.warn(`IAM exclusion scope for resource type "${options.resourceDefinition.resourceType}" exceeds ${AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES} where branches.`);

				return { isFullyCompilable: false };
			}

			where = AuthorizationScopeMergeWhere(where, lowered.branches.length === 1 ? lowered.branches[0] : lowered.branches);
		}

		return {
			isFullyCompilable: true,
			scope: where ? { where } : undefined,
		};
	}

	/**
	 * Reads the characters each placeholder of a resource path can render, where the database enforces them on its column,
	 * so the decomposition of a resource pattern can tell which placeholder a literal lies in. A column that can hold any
	 * text has no alphabet: an integer or a date column on SQLite, a uuid column on any database but PostgreSQL, and every
	 * column with a value transformer or whose database type the planner does not know.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @param {IApiAuthorizationIamDialect} [dialect] - SQL dialect of the resource entity; portable when absent.
	 * @returns {ReadonlyMap<string, RegExp>} The alphabet of each placeholder that has one.
	 */
	public readSlotAlphabets<E extends IApiBaseEntity>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, dialect?: IApiAuthorizationIamDialect): ReadonlyMap<string, RegExp> {
		const alphabets: Map<string, RegExp> = new Map<string, RegExp>();

		for (const match of resourceDefinition.resourcePath.matchAll(/\{([\w.-]+)\}/g)) {
			const placeholder: string = match[1] ?? "";
			const fieldDefinition: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = this.resolveFilterableField(resourceDefinition, `resource.${placeholder}`);
			const alphabet: RegExp | undefined = fieldDefinition ? this.readSlotAlphabet(this.resolveField(resourceDefinition.entity, fieldDefinition.queryPath), dialect?.type ?? EApiAuthorizationIamDialect.PORTABLE) : undefined;

			if (alphabet) {
				alphabets.set(placeholder, alphabet);
			}
		}

		return alphabets;
	}

	/**
	 * Builds the pair of one `resource.*` key through a to-many relation: a set qualifier over the pair of the operator on
	 * one related row, which reads no relation and no `IfExists` of its own.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {IApiAuthorizationIamQueryField} field - Resolved query path of the key.
	 * @param {object} context - Planning context.
	 * @param {IApiAuthorizationIamDialect} [context.dialect] - SQL dialect of the resource entity.
	 * @param {IApiAuthorizationPrincipal} context.principal - Principal.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} context.requestMetadata - Request metadata.
	 * @param {E} [context.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} context.resourceDefinition - IAM resource definition.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when the key cannot compile.
	 */
	private buildCollectionPair<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(condition: IApiAuthorizationIamCondition, field: IApiAuthorizationIamQueryField, context: { dialect?: IApiAuthorizationIamDialect; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> }): IApiAuthorizationIamPredicatePair | undefined {
		const element: IApiAuthorizationIamQueryField["element"] = field.element;

		if (condition.qualifier === undefined || !element || !ApiAuthorizationIamPredicateBuilder.isOperatorFitting(condition.family, element.field)) {
			return undefined;
		}

		const collection: IApiAuthorizationIamCollection | undefined = ApiAuthorizationIamCollection.read(context.dialect?.dataSource, context.resourceDefinition.entity, element);
		const operands: Array<IApiAuthorizationIamOperand> | undefined = ApiAuthorizationIamOperator.readOperands(condition, ApiAuthorizationIamVariable.createContext(context.principal, context.requestMetadata, context.resource));

		if (!collection || !operands) {
			return undefined;
		}

		const pair: IApiAuthorizationIamPredicatePair | undefined = this.buildOperandPair({ ...condition, isIfExists: false }, operands, { field: element.field, queryPath: element.queryPath });

		return pair ? ApiAuthorizationIamPredicateBuilder.buildQualified({ collection, column: { field: this.resolveField(context.resourceDefinition.entity, collection.correlationPath), queryPath: collection.correlationPath }, condition, element: pair }) : undefined;
	}

	/**
	 * Builds the pair of one `resource.*` condition key. The key needs a filterable field mapping on a column TypeORM
	 * maps and its operator family fits (see `ApiAuthorizationIamPredicateBuilder.isOperatorFitting`), and a value the
	 * family can read: `""` and a NUL character compare in no database as they do in memory, so they do not compile.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {object} context - Planning context.
	 * @param {IApiAuthorizationIamDialect} [context.dialect] - SQL dialect of the resource entity.
	 * @param {IApiAuthorizationPrincipal} context.principal - Principal.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} context.requestMetadata - Request metadata.
	 * @param {E} [context.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} context.resourceDefinition - IAM resource definition.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when the key cannot compile.
	 */
	private buildConditionPair<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(condition: IApiAuthorizationIamCondition, context: { dialect?: IApiAuthorizationIamDialect; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> }): IApiAuthorizationIamPredicatePair | undefined {
		const fieldDefinition: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = this.resolveFilterableField(context.resourceDefinition, condition.key);

		if (!fieldDefinition) {
			return undefined;
		}

		const field: IApiAuthorizationIamQueryField = this.resolveField(context.resourceDefinition.entity, fieldDefinition.queryPath);

		if (field.collectionPath !== undefined) {
			return this.buildCollectionPair(condition, field, context);
		}

		if (condition.qualifier !== undefined || !field.isResolvable || !ApiAuthorizationIamPredicateBuilder.isOperatorFitting(condition.family, field)) {
			return undefined;
		}

		const operands: Array<IApiAuthorizationIamOperand> | undefined = ApiAuthorizationIamOperator.readOperands(condition, ApiAuthorizationIamVariable.createContext(context.principal, context.requestMetadata, context.resource));

		if (!operands) {
			return undefined;
		}

		const column: IApiAuthorizationIamPredicateColumn = { field, queryPath: fieldDefinition.queryPath };
		const presence: IApiAuthorizationIamPredicateColumn | undefined = field.presencePath === undefined ? undefined : { field: this.resolveField(context.resourceDefinition.entity, field.presencePath), queryPath: field.presencePath };

		return this.buildOperandPair(condition, operands, column, presence);
	}

	/**
	 * Builds the pair of one row-scoped resource-pattern constraint: the placeholder's column renders the constrained
	 * text. A glob needs a described text column. An exact value compares as text on a text column, as a boolean on a
	 * boolean column, as an integer on an integer column, and natively on another numeric or date column. A Deny and an
	 * Allow `NotResource` negate it, and the lowerer compares it only where the column holds the rendered text alike.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationIamResourceConstraint} constraint - Placeholder constraint.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when the constraint cannot compile.
	 */
	private buildConstraintPair<E extends IApiBaseEntity>(constraint: IApiAuthorizationIamResourceConstraint, resourceDefinition: IApiAuthorizationResourceDefinition<E>): IApiAuthorizationIamPredicatePair | undefined {
		if (constraint.storedRow) {
			return this.buildStoredRowConstraintPair(constraint, resourceDefinition, constraint.storedRow.queryPath);
		}

		const fieldDefinition: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = this.resolveFilterableField(resourceDefinition, `resource.${constraint.placeholder}`);

		if (!fieldDefinition) {
			return undefined;
		}

		const field: IApiAuthorizationIamQueryField = this.resolveField(resourceDefinition.entity, fieldDefinition.queryPath);
		const column: IApiAuthorizationIamPredicateColumn = { field, queryPath: fieldDefinition.queryPath };

		if (!field.isResolvable || !this.isPatternBindable(constraint.pattern)) {
			return undefined;
		}

		if (constraint.pattern.some((token: IApiAuthorizationIamToken): boolean => token.type !== EApiAuthorizationIamTokenType.LITERAL)) {
			return this.isStringField(resourceDefinition, fieldDefinition.queryPath) && ApiAuthorizationIamPredicateBuilder.isTextColumn(field) ? ApiAuthorizationIamPredicateBuilder.buildPatternConstraint({ column, pattern: constraint.pattern }) : undefined;
		}

		const text: string = constraint.pattern.map((token: IApiAuthorizationIamToken): string => token.value ?? "").join("");

		if (ApiAuthorizationIamPredicateBuilder.isTextColumn(field)) {
			return ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column, comparison: EApiAuthorizationIamPredicateComparison.TEXT, value: text });
		}

		if (text !== "" && this.isUnrenderedText(field, text)) {
			return ApiAuthorizationIamPredicateBuilder.buildNoRowConstraint();
		}

		if (text !== "" && this.isIntegerField(field)) {
			return ApiAuthorizationIamPredicateBuilder.buildIntegerConstraint({ column, value: text });
		}

		if (text === "" || !field.isBoolean) {
			return ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column, comparison: EApiAuthorizationIamPredicateComparison.NATIVE, value: text });
		}

		const value: TApiAuthorizationIamPredicateValue | undefined = this.resolveColumnValue(field, fieldDefinition.queryPath, text);

		return value === undefined ? undefined : ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column, comparison: EApiAuthorizationIamPredicateComparison.BOOLEAN, value });
	}

	/**
	 * Builds the rows one matched Deny statement keeps: by De Morgan, the rows its target does not apply to and the `fails`
	 * of its `resource.*` keys.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {ReadonlyArray<IApiAuthorizationIamCondition>} conditions - Condition keys of the statement, read by the grammar.
	 * @param {IApiAuthorizationIamResourceRows | undefined} rows - Rows the target of the statement applies to; every row when absent.
	 * @param {object} context - Planning context.
	 * @param {IApiAuthorizationIamDialect} [context.dialect] - SQL dialect of the resource entity.
	 * @param {IApiAuthorizationPrincipal} context.principal - Principal.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} context.requestMetadata - Request metadata.
	 * @param {E} [context.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} context.resourceDefinition - IAM resource definition.
	 * @returns {TApiAuthorizationIamPredicate | undefined} The kept rows, or undefined when a key or a constraint cannot compile.
	 */
	private buildExclusionKept<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(
		conditions: ReadonlyArray<IApiAuthorizationIamCondition>,
		rows: IApiAuthorizationIamResourceRows | undefined,
		context: { dialect?: IApiAuthorizationIamDialect; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> },
	): TApiAuthorizationIamPredicate | undefined {
		const fails: Array<TApiAuthorizationIamPredicate> = [];

		if (rows) {
			const pair: IApiAuthorizationIamPredicatePair | undefined = this.buildResourceRowsPair(rows, context.resourceDefinition);

			if (!pair) {
				return undefined;
			}

			fails.push(pair.fails);
		}

		for (const condition of conditions) {
			if (!condition.key.startsWith("resource.")) {
				continue;
			}

			const pair: IApiAuthorizationIamPredicatePair | undefined = this.buildConditionPair(condition, context);

			if (!pair) {
				return undefined;
			}

			fails.push(pair.fails);
		}

		// A Deny with neither keys nor rows denies the whole request before it reaches the planner; keep that closed here too.
		return fails.length === 0 ? { kind: EApiAuthorizationIamPredicateKind.FALSE } : ApiAuthorizationIamPredicateBuilder.or(fails);
	}

	/**
	 * Builds the pair of one key from its resolved operands, by the operator family. One operand that does not compile
	 * fails the whole key, and a value a list repeats binds once.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {ReadonlyArray<IApiAuthorizationIamOperand>} operands - Operands of the key.
	 * @param {IApiAuthorizationIamPredicateColumn} column - Column the key reads.
	 * @param {IApiAuthorizationIamPredicateColumn} [presence] - Presence column of an optional path.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when the key cannot compile.
	 */
	private buildOperandPair(condition: IApiAuthorizationIamCondition, operands: ReadonlyArray<IApiAuthorizationIamOperand>, column: IApiAuthorizationIamPredicateColumn, presence?: IApiAuthorizationIamPredicateColumn): IApiAuthorizationIamPredicatePair | undefined {
		const comparison: EApiAuthorizationIamPredicateOperator | undefined = AUTHORIZATION_POLICY_CONDITION_OPERATOR_CONSTANT.OPERATORS.get(condition.operator)?.comparison;

		switch (condition.family) {
			case EApiPolicyConditionOperatorFamily.ARN: {
				const patterns: Array<ReadonlyArray<IApiAuthorizationIamToken>> | undefined = this.readPatterns(operands);

				return patterns ? ApiAuthorizationIamPredicateBuilder.buildArn({ column, condition, patterns, presence }) : undefined;
			}

			case EApiPolicyConditionOperatorFamily.BOOL: {
				const values: Array<boolean> | undefined = this.readEach(operands, (operand: IApiAuthorizationIamOperand): boolean | undefined => operand.isTrue);

				return values ? ApiAuthorizationIamPredicateBuilder.buildCondition({ column, comparison: EApiAuthorizationIamPredicateComparison.BOOLEAN, condition, presence, values }) : undefined;
			}

			case EApiPolicyConditionOperatorFamily.DATE: {
				// A calendar date compares only with a `date` column, and an instant with every other: neither reads as the other.
				const values: Array<string> | undefined = this.readEach(operands, (operand: IApiAuthorizationIamOperand): string | undefined => (operand.date?.isCalendar === (column.field.column?.type === "date") ? operand.date?.text : undefined));

				return values && comparison !== undefined ? ApiAuthorizationIamPredicateBuilder.buildCompare({ column, comparison: EApiAuthorizationIamPredicateComparison.DATE, condition, operator: comparison, presence, values }) : undefined;
			}

			case EApiPolicyConditionOperatorFamily.IP_ADDRESS: {
				const ranges: Array<string> | undefined = this.readEach(operands, (operand: IApiAuthorizationIamOperand): string | undefined => operand.network?.text);

				return ranges ? ApiAuthorizationIamPredicateBuilder.buildIpContained({ column, condition, presence, ranges }) : undefined;
			}

			case EApiPolicyConditionOperatorFamily.NULL: {
				const answers: Array<boolean> | undefined = this.readEach(operands, (operand: IApiAuthorizationIamOperand): boolean | undefined => operand.isTrue);

				return answers ? ApiAuthorizationIamPredicateBuilder.buildNull({ answers, column }) : undefined;
			}

			case EApiPolicyConditionOperatorFamily.NUMERIC: {
				const values: Array<string> | undefined = this.readEach(operands, (operand: IApiAuthorizationIamOperand): string | undefined => (operand.decimal ? ApiAuthorizationIamDecimal.toText(operand.decimal) : undefined));

				return values && comparison !== undefined ? ApiAuthorizationIamPredicateBuilder.buildCompare({ column, comparison: EApiAuthorizationIamPredicateComparison.NUMERIC, condition, operator: comparison, presence, values }) : undefined;
			}

			case EApiPolicyConditionOperatorFamily.STRING: {
				const values: Array<TApiAuthorizationIamPredicateValue> | undefined = this.readEach(operands, (operand: IApiAuthorizationIamOperand): TApiAuthorizationIamPredicateValue | undefined => (this.isBindableText(operand.text) ? this.resolveColumnValue(column.field, column.queryPath, operand.text) : undefined));

				return values ? ApiAuthorizationIamPredicateBuilder.buildCondition({ column, comparison: column.field.isBoolean ? EApiAuthorizationIamPredicateComparison.BOOLEAN : EApiAuthorizationIamPredicateComparison.TEXT, condition, presence, values }) : undefined;
			}

			case EApiPolicyConditionOperatorFamily.STRING_IGNORE_CASE: {
				const values: Array<string> | undefined = this.readEach(operands, (operand: IApiAuthorizationIamOperand): string | undefined => (this.isBindableText(operand.text) ? operand.text : undefined));

				return values ? ApiAuthorizationIamPredicateBuilder.buildCondition({ column, comparison: EApiAuthorizationIamPredicateComparison.TEXT_IGNORE_CASE, condition, presence, values }) : undefined;
			}

			case EApiPolicyConditionOperatorFamily.STRING_LIKE: {
				const patterns: Array<ReadonlyArray<IApiAuthorizationIamToken>> | undefined = this.readPatterns(operands);

				return patterns ? ApiAuthorizationIamPredicateBuilder.buildLike({ column, condition, patterns, presence }) : undefined;
			}
		}
	}

	/**
	 * Builds the pair of the rows a `Resource` or `NotResource` target applies to: a row matches a pattern when it meets
	 * every constraint of its set, and the target when it matches a pattern, or none for `NotResource`. Each constraint is
	 * NULL-complete, so the `fails` of a target is exactly the complement of its `holds`.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationIamResourceRows} rows - Rows of the target.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when a constraint cannot compile.
	 */
	private buildResourceRowsPair<E extends IApiBaseEntity>(rows: IApiAuthorizationIamResourceRows, resourceDefinition: IApiAuthorizationResourceDefinition<E>): IApiAuthorizationIamPredicatePair | undefined {
		const holds: Array<TApiAuthorizationIamPredicate> = [];
		const fails: Array<TApiAuthorizationIamPredicate> = [];

		for (const constraints of rows.constraintSets) {
			const pairs: Array<IApiAuthorizationIamPredicatePair> = [];

			for (const constraint of constraints) {
				const pair: IApiAuthorizationIamPredicatePair | undefined = this.buildConstraintPair(constraint, resourceDefinition);

				if (!pair) {
					return undefined;
				}

				pairs.push(pair);
			}

			holds.push(ApiAuthorizationIamPredicateBuilder.and(pairs.map((pair: IApiAuthorizationIamPredicatePair): TApiAuthorizationIamPredicate => pair.holds)));
			fails.push(ApiAuthorizationIamPredicateBuilder.or(pairs.map((pair: IApiAuthorizationIamPredicatePair): TApiAuthorizationIamPredicate => pair.fails)));
		}

		const target: IApiAuthorizationIamPredicatePair = { fails: ApiAuthorizationIamPredicateBuilder.and(fails), holds: ApiAuthorizationIamPredicateBuilder.or(holds) };

		return rows.isNegated ? { fails: target.holds, holds: target.fails } : target;
	}

	/**
	 * Builds the rows one matched Allow statement allows: the rows its target applies to, ANDed with the `holds` of its
	 * `resource.*` keys, `TRUE` when it has neither.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {ReadonlyArray<IApiAuthorizationIamCondition>} conditions - Condition keys of the statement, read by the grammar.
	 * @param {IApiAuthorizationIamResourceRows | undefined} rows - Rows the target of the statement applies to; every row when absent.
	 * @param {object} context - Planning context.
	 * @param {IApiAuthorizationIamDialect} [context.dialect] - SQL dialect of the resource entity.
	 * @param {IApiAuthorizationPrincipal} context.principal - Principal.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} context.requestMetadata - Request metadata.
	 * @param {E} [context.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} context.resourceDefinition - IAM resource definition.
	 * @returns {TApiAuthorizationIamPredicate | undefined} The allowed rows, or undefined when a key or a constraint cannot compile.
	 */
	private buildStatementHolds<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(
		conditions: ReadonlyArray<IApiAuthorizationIamCondition>,
		rows: IApiAuthorizationIamResourceRows | undefined,
		context: { dialect?: IApiAuthorizationIamDialect; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> },
	): TApiAuthorizationIamPredicate | undefined {
		const holds: Array<TApiAuthorizationIamPredicate> = [];

		if (rows) {
			const pair: IApiAuthorizationIamPredicatePair | undefined = this.buildResourceRowsPair(rows, context.resourceDefinition);

			if (!pair) {
				return undefined;
			}

			holds.push(pair.holds);
		}

		for (const condition of conditions) {
			if (!condition.key.startsWith("resource.")) {
				continue;
			}

			const pair: IApiAuthorizationIamPredicatePair | undefined = this.buildConditionPair(condition, context);

			if (!pair) {
				return undefined;
			}

			holds.push(pair.holds);
		}

		return ApiAuthorizationIamPredicateBuilder.and(holds);
	}

	/**
	 * Builds the pair of a constraint on the stored row of a path value: the text column the engine resolved for the
	 * placeholder, from its field mapping filterable or not, or from the entity property of its name. A client filter's
	 * rules do not apply, as the server compares the row it loads. A placeholder that resolves to no column compiles to
	 * nothing, so the statement fails closed.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationIamResourceConstraint} constraint - Placeholder constraint.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @param {string} [queryPath] - Query path of the text column, when the placeholder resolves to one.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when the constraint cannot compile.
	 */
	private buildStoredRowConstraintPair<E extends IApiBaseEntity>(constraint: IApiAuthorizationIamResourceConstraint, resourceDefinition: IApiAuthorizationResourceDefinition<E>, queryPath?: string): IApiAuthorizationIamPredicatePair | undefined {
		if (queryPath === undefined || !this.isPatternBindable(constraint.pattern)) {
			return undefined;
		}

		const field: IApiAuthorizationIamQueryField = this.resolveField(resourceDefinition.entity, queryPath);

		if (!field.isResolvable || !ApiAuthorizationIamPredicateBuilder.isTextColumn(field)) {
			return undefined;
		}

		const column: IApiAuthorizationIamPredicateColumn = { field, queryPath };

		if (constraint.pattern.some((token: IApiAuthorizationIamToken): boolean => token.type !== EApiAuthorizationIamTokenType.LITERAL)) {
			return ApiAuthorizationIamPredicateBuilder.buildPatternConstraint({ column, pattern: constraint.pattern });
		}

		return ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column, comparison: EApiAuthorizationIamPredicateComparison.TEXT, value: constraint.pattern.map((token: IApiAuthorizationIamToken): string => token.value ?? "").join("") });
	}

	/**
	 * Picks the lowerer of a dialect.
	 * @param {IApiAuthorizationIamDialect} dialect - SQL dialect of the resource entity.
	 * @returns {ApiAuthorizationIamPortableLowerer} The lowerer; an unresolved dialect lowers no atom.
	 */
	private createLowerer(dialect: IApiAuthorizationIamDialect): ApiAuthorizationIamPortableLowerer {
		switch (dialect.type) {
			case EApiAuthorizationIamDialect.MARIADB:
			// falls through

			case EApiAuthorizationIamDialect.MYSQL: {
				return new ApiAuthorizationIamMysqlLowerer(dialect);
			}

			case EApiAuthorizationIamDialect.PORTABLE:
			// falls through

			case EApiAuthorizationIamDialect.UNRESOLVED: {
				return new ApiAuthorizationIamPortableLowerer(dialect);
			}

			case EApiAuthorizationIamDialect.POSTGRES: {
				return new ApiAuthorizationIamPostgresLowerer(dialect);
			}

			case EApiAuthorizationIamDialect.SQLITE: {
				return new ApiAuthorizationIamSqliteLowerer(dialect);
			}
		}
	}

	/**
	 * Accepts only text whose SQL comparison matches the in-memory evaluator: `""` reads as a missing value there, and
	 * PostgreSQL refuses a NUL character instead of comparing it.
	 * @param {string | undefined} text - Resolved text.
	 * @returns {boolean} True for non-empty text without a NUL character.
	 */
	private isBindableText(text: string | undefined): text is string {
		return text !== undefined && text !== "" && !text.includes(IAM_QUERY_PLANNER_NUL);
	}

	/**
	 * Tells whether a column holds integers the database compares exactly with their decimal text.
	 * @param {IApiAuthorizationIamQueryField} field - Resolved query path.
	 * @returns {boolean} True for an integer type, or a numeric property that names no type, without a value transformer.
	 */
	private isIntegerField(field: IApiAuthorizationIamQueryField): boolean {
		const column: IApiAuthorizationIamQueryField["column"] = field.column;

		return column?.family === EApiAuthorizationIamColumnFamily.NUMERIC && !column.hasTransformer && (column.type === undefined || AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.INTEGER_BITS.has(column.type));
	}

	/**
	 * Accepts only a pattern whose literals every database can bind.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} pattern - Resolved pattern tokens.
	 * @returns {boolean} True when no literal holds a NUL character.
	 */
	private isPatternBindable(pattern: ReadonlyArray<IApiAuthorizationIamToken>): boolean {
		return pattern.every((token: IApiAuthorizationIamToken): boolean => !(token.value ?? "").includes(IAM_QUERY_PLANNER_NUL));
	}

	/**
	 * Checks the package's own rule for LIKE-based criteria: only properties described as `EApiPropertyDescribeType.STRING`.
	 * String formats backed by `bigint` or `uuid` columns are excluded, because databases such as PostgreSQL reject LIKE on them.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @param {string} queryPath - Direct property of the entity or one of its ancestor classes; nested paths are never treated as string columns.
	 * @returns {boolean} True when the property is a described text column.
	 */
	private isStringField<E extends IApiBaseEntity>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, queryPath: string): boolean {
		const propertyMetadata: Partial<TApiPropertyDescribeProperties> | undefined = MetadataStorage.getInstance().getMetadata(resourceDefinition.entity, queryPath, PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY);

		if (propertyMetadata?.type !== EApiPropertyDescribeType.STRING) {
			return false;
		}

		return propertyMetadata.format !== EApiPropertyStringType.BIGINT_STRING && propertyMetadata.format !== EApiPropertyStringType.UUID;
	}

	/**
	 * Tells whether no row of a typed column renders a placeholder text, by what the column reads back as: a boolean
	 * renders `true` or `false`, a number decimal text, a calendar date `YYYY-MM-DD`, and an instant ISO 8601 UTC with
	 * milliseconds. Such a text names no row, so it never reaches the database, which would refuse it or coerce it into a
	 * value it holds. A column with a value transformer, or of another type, renders what it declares, so nothing is told.
	 * @param {IApiAuthorizationIamQueryField} field - Resolved placeholder field.
	 * @param {string} text - Non-empty placeholder text.
	 * @returns {boolean} True when the column renders no row as the text.
	 */
	private isUnrenderedText(field: IApiAuthorizationIamQueryField, text: string): boolean {
		const column: IApiAuthorizationIamQueryField["column"] = field.column;

		if (!column || column.hasTransformer || column.isArray || column.isJson || column.type === undefined) {
			return false;
		}

		// TypeORM hydrates a `bool` or `boolean` column as a boolean; another type described as one reads back as it is stored.
		if (AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.BOOLEAN_TYPES.has(column.type)) {
			return text !== "true" && text !== "false";
		}

		if (column.family === EApiAuthorizationIamColumnFamily.NUMERIC && IAM_QUERY_PLANNER_NUMBER_TYPES.has(column.type)) {
			return !IAM_QUERY_PLANNER_NUMBER_TEXT.test(text);
		}

		if (column.family !== EApiAuthorizationIamColumnFamily.DATE || !AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.DATE_TYPES.has(column.type)) {
			return false;
		}

		return !(column.type === "date" ? IAM_QUERY_PLANNER_DAY_TEXT : IAM_QUERY_PLANNER_INSTANT_TEXT).test(text);
	}

	/**
	 * Reads one comparable value of each operand, each distinct value once.
	 * @template T - Comparable value.
	 * @param {ReadonlyArray<IApiAuthorizationIamOperand>} operands - Operands of a key.
	 * @param {(operand: IApiAuthorizationIamOperand) => T | undefined} read - Reads the value of one operand, undefined when it does not compile.
	 * @returns {Array<T> | undefined} The values, or undefined when one operand does not compile.
	 */
	private readEach<T>(operands: ReadonlyArray<IApiAuthorizationIamOperand>, read: (operand: IApiAuthorizationIamOperand) => T | undefined): Array<T> | undefined {
		const values: Set<T> = new Set<T>();

		for (const operand of operands) {
			const value: T | undefined = read(operand);

			if (value === undefined) {
				return undefined;
			}

			values.add(value);
		}

		return [...values];
	}

	/**
	 * Reads a query path through the TypeORM metadata of the resource entity, as `AuthorizationIamReadQueryField` describes.
	 * @param {object} entity - Resource entity class.
	 * @param {string} queryPath - Entity query path.
	 * @returns {IApiAuthorizationIamQueryField} The resolved query path.
	 */
	private readField(entity: object, queryPath: string): IApiAuthorizationIamQueryField {
		return AuthorizationIamReadQueryField(entity, queryPath);
	}

	/**
	 * Reads the pattern of each operand, each distinct pattern once.
	 * @param {ReadonlyArray<IApiAuthorizationIamOperand>} operands - Operands of a key.
	 * @returns {Array<ReadonlyArray<IApiAuthorizationIamToken>> | undefined} The patterns, or undefined when one has no pattern or a literal no database can bind.
	 */
	private readPatterns(operands: ReadonlyArray<IApiAuthorizationIamOperand>): Array<ReadonlyArray<IApiAuthorizationIamToken>> | undefined {
		const patterns: Map<string, ReadonlyArray<IApiAuthorizationIamToken>> = new Map<string, ReadonlyArray<IApiAuthorizationIamToken>>();

		for (const operand of operands) {
			if (!operand.pattern || !this.isPatternBindable(operand.pattern)) {
				return undefined;
			}

			patterns.set(JSON.stringify(operand.pattern), operand.pattern);
		}

		return [...patterns.values()];
	}

	/**
	 * Reads the characters one column can render, where its database enforces them.
	 * @param {IApiAuthorizationIamQueryField} field - Resolved query path of the placeholder.
	 * @param {EApiAuthorizationIamDialect} dialect - SQL dialect of the resource entity.
	 * @returns {RegExp | undefined} The alphabet, or undefined when the column can hold any text.
	 */
	private readSlotAlphabet(field: IApiAuthorizationIamQueryField, dialect: EApiAuthorizationIamDialect): RegExp | undefined {
		const column: IApiAuthorizationIamQueryField["column"] = field.column;

		if (!field.isResolvable || !column || column.hasTransformer) {
			return undefined;
		}

		if (field.isBoolean) {
			return column.type === undefined || AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.BOOLEAN_TYPES.has(column.type) ? AUTHORIZATION_IAM_SLOT_ALPHABET_CONSTANT.BOOLEAN : undefined;
		}

		const isStrictlyTyped: boolean = dialect === EApiAuthorizationIamDialect.POSTGRES || dialect === EApiAuthorizationIamDialect.MYSQL || dialect === EApiAuthorizationIamDialect.MARIADB;

		if (!isStrictlyTyped) {
			return undefined;
		}

		if (this.isIntegerField(field)) {
			return AUTHORIZATION_IAM_SLOT_ALPHABET_CONSTANT.INTEGER;
		}

		if (column.family === EApiAuthorizationIamColumnFamily.DATE && (column.type === undefined || AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.DATE_TYPES.has(column.type))) {
			return AUTHORIZATION_IAM_SLOT_ALPHABET_CONSTANT.DATE;
		}

		return column.family === EApiAuthorizationIamColumnFamily.UUID && dialect === EApiAuthorizationIamDialect.POSTGRES ? AUTHORIZATION_IAM_SLOT_ALPHABET_CONSTANT.UUID : undefined;
	}

	/**
	 * Converts a resolved scalar value to the value its column compares against, following the in-memory evaluator,
	 * which compares the text of both sides. A boolean column holds only `true` and `false`, so `true`, `false` or that
	 * exact text binds as a boolean, which each driver compares in its own stored form (`1`/`0` on SQLite and MySQL).
	 * Any other value, such as `"1"`, `"yes"` or the number `1`, equals no row in memory and is not comparable, so the
	 * scope fails closed. Any other column compares the canonical text of the value.
	 * @param {IApiAuthorizationIamQueryField} field - Resolved query path.
	 * @param {string} queryPath - Entity query path such as `isActive` or `owner.company.isVerified`.
	 * @param {unknown} value - Resolved non-empty scalar value.
	 * @returns {TApiAuthorizationIamPredicateValue | undefined} The value to compare, or undefined when it is not comparable.
	 */
	private resolveColumnValue(field: IApiAuthorizationIamQueryField, queryPath: string, value: unknown): TApiAuthorizationIamPredicateValue | undefined {
		if (!field.isBoolean) {
			return AuthorizationSerializeValue(value);
		}

		try {
			// The one boolean rule of every filter value: true, false, or that exact text.
			const parsed: unknown = ApiControllerGetListQueryParseValue(value, { description: queryPath, type: EApiPropertyDescribeType.BOOLEAN });

			return typeof parsed === "boolean" ? parsed : undefined;
		} catch {
			return undefined;
		}
	}

	/**
	 * Returns the resolved column of a query path, read once per resource entity and path.
	 * @param {object} entity - Resource entity class.
	 * @param {string} queryPath - Entity query path.
	 * @returns {IApiAuthorizationIamQueryField} The resolved query path.
	 */
	private resolveField(entity: object, queryPath: string): IApiAuthorizationIamQueryField {
		let entityCache: Map<string, IApiAuthorizationIamQueryField> | undefined = iamQueryPlannerFieldCache.get(entity);

		if (!entityCache) {
			entityCache = new Map<string, IApiAuthorizationIamQueryField>();
			iamQueryPlannerFieldCache.set(entity, entityCache);
		}

		let field: IApiAuthorizationIamQueryField | undefined = entityCache.get(queryPath);

		if (!field) {
			field = this.readField(entity, queryPath);
			entityCache.set(queryPath, field);
		}

		return field;
	}

	/**
	 * Resolves the resource field mapping of a `resource.*` path when it may be used in a database scope.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @param {string} path - `resource.*` condition path.
	 * @returns {IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined} Filterable field mapping, if any.
	 */
	private resolveFilterableField<E extends IApiBaseEntity>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, path: string): IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined {
		return resourceDefinition.fields.find((field: IApiAuthorizationResourceDefinition<E>["fields"][number]): boolean => field.path === path && field.isFilterable);
	}
}
