import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationIamCondition, IApiAuthorizationIamConditionValue, IApiAuthorizationIamDenyExclusion, IApiAuthorizationIamDialect, IApiAuthorizationIamPredicateColumn, IApiAuthorizationIamPredicatePair, IApiAuthorizationIamQueryField, IApiAuthorizationIamResourceConstraint, IApiAuthorizationPrincipal, IApiAuthorizationRequestMetadata, IApiAuthorizationResourceDefinition, IApiAuthorizationScope, IApiPolicyStatement } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamPredicate, TApiAuthorizationIamPredicateValue } from "@type/class/api/authorization/iam";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { FindOptionsWhere } from "typeorm";

import { ApiAuthorizationIamMysqlLowerer, ApiAuthorizationIamPortableLowerer, ApiAuthorizationIamPostgresLowerer, ApiAuthorizationIamSqliteLowerer } from "@class/api/authorization/iam/lowerer";
import { ApiAuthorizationIamParser } from "@class/api/authorization/iam/parser.class";
import { ApiAuthorizationIamPredicateBuilder } from "@class/api/authorization/iam/predicate";
import { ApiAuthorizationIamVariable } from "@class/api/authorization/iam/variable.class";
import { MetadataStorage } from "@class/metadata-storage.class";
import { AUTHORIZATION_IAM_SCOPE_CONSTANT } from "@constant/class/authorization";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiAuthorizationIamDialect, EApiAuthorizationIamPredicateComparison, EApiAuthorizationIamPredicateKind } from "@enum/class/authorization";
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
	 * Compiles matched Allow statements into the scope of rows they allow: the OR of every statement's branches. A
	 * statement without a `resource.*` key allows every row, so the scope is then unrestricted.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {object} options - Planning options.
	 * @param {IApiAuthorizationIamDialect} [options.dialect] - SQL dialect of the resource entity; portable when absent.
	 * @param {IApiAuthorizationPrincipal} options.principal - Principal used to resolve `${...}` condition values.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} options.requestMetadata - Request metadata used to resolve `${...}` condition values.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition with the filterable field mappings.
	 * @param {ReadonlyArray<IApiPolicyStatement>} options.statements - Matched Allow statements.
	 * @returns {{ isFullyCompilable: boolean; scope?: IApiAuthorizationScope<E> }} The scope, none when every row is allowed, or a non-compilable result that grants nothing.
	 */
	public plan<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(options: { dialect?: IApiAuthorizationIamDialect; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E>; statements: ReadonlyArray<IApiPolicyStatement> }): { isFullyCompilable: boolean; scope?: IApiAuthorizationScope<E> } {
		iamQueryPlannerLogger.verbose(`Planning IAM query scope for resource type "${options.resourceDefinition.resourceType}" using ${options.statements.length} statements.`);

		const lowerer: ApiAuthorizationIamPortableLowerer = this.createLowerer(options.dialect ?? IAM_QUERY_PLANNER_PORTABLE_DIALECT);
		const branches: Array<FindOptionsWhere<E>> = [];
		let hasStatement: boolean = false;

		for (const statement of options.statements) {
			hasStatement = true;

			const holds: TApiAuthorizationIamPredicate | undefined = this.buildStatementHolds(ApiAuthorizationIamParser.readStatement(statement).conditions, options);
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
	 * one of its resource keys or resource-pattern constraints fails; statements are ANDed through `AuthorizationScopeMergeWhere`.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {object} options - Planning options.
	 * @param {IApiAuthorizationIamDialect} [options.dialect] - SQL dialect of the resource entity; portable when absent.
	 * @param {ReadonlyArray<IApiAuthorizationIamDenyExclusion>} options.exclusions - Matched Deny statements with their resource-pattern constraints.
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
			const kept: TApiAuthorizationIamPredicate | undefined = this.buildExclusionKept(ApiAuthorizationIamParser.readStatement(exclusion.statement).conditions, exclusion.resourceConstraints, options);
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

			where = AuthorizationScopeMergeWhere(where, lowered.branches.length === 1 ? lowered.branches[0] : lowered.branches);

			if (Array.isArray(where) && where.length > AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES) {
				iamQueryPlannerLogger.warn(`IAM exclusion scope for resource type "${options.resourceDefinition.resourceType}" exceeds ${AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES} where branches.`);

				return { isFullyCompilable: false };
			}
		}

		return {
			isFullyCompilable: true,
			scope: where ? { where } : undefined,
		};
	}

	/**
	 * Builds the pair of one `resource.*` condition key. The key needs a filterable field mapping on a column TypeORM
	 * maps and a String operator can compare (see `ApiAuthorizationIamPredicateBuilder.isStringComparable`), and a
	 * non-empty scalar value: a boolean column takes `true` or `false`, any other column the canonical text of the value.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {object} context - Planning context.
	 * @param {IApiAuthorizationPrincipal} context.principal - Principal.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} context.requestMetadata - Request metadata.
	 * @param {E} [context.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} context.resourceDefinition - IAM resource definition.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when the key cannot compile.
	 */
	private buildConditionPair<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(condition: IApiAuthorizationIamCondition, context: { principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> }): IApiAuthorizationIamPredicatePair | undefined {
		const fieldDefinition: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = this.resolveFilterableField(context.resourceDefinition, condition.key);

		if (!fieldDefinition) {
			return undefined;
		}

		const field: IApiAuthorizationIamQueryField = this.resolveField(context.resourceDefinition.entity, fieldDefinition.queryPath);

		if (!field.isResolvable || !ApiAuthorizationIamPredicateBuilder.isStringComparable(field)) {
			return undefined;
		}

		const resolvedValue: unknown = this.resolveConditionValue(condition, context);
		const value: TApiAuthorizationIamPredicateValue | undefined = this.isCompilableValue(resolvedValue) ? this.resolveColumnValue(field, fieldDefinition.queryPath, resolvedValue) : undefined;

		if (value === undefined) {
			return undefined;
		}

		return ApiAuthorizationIamPredicateBuilder.buildCondition({
			column: { field, queryPath: fieldDefinition.queryPath },
			comparison: field.isBoolean ? EApiAuthorizationIamPredicateComparison.BOOLEAN : EApiAuthorizationIamPredicateComparison.TEXT,
			condition,
			presence: field.presencePath === undefined ? undefined : { field: this.resolveField(context.resourceDefinition.entity, field.presencePath), queryPath: field.presencePath },
			values: [value],
		});
	}

	/**
	 * Builds the pair of one row-scoped resource-pattern constraint: the placeholder's column renders the constrained
	 * text. A prefix needs a described text column; an exact value compares as text on a text column, as a boolean on
	 * a boolean column, and natively on a numeric or date column, which only a Deny ever negates.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationIamResourceConstraint} constraint - Placeholder constraint.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when the constraint cannot compile.
	 */
	private buildConstraintPair<E extends IApiBaseEntity>(constraint: IApiAuthorizationIamResourceConstraint, resourceDefinition: IApiAuthorizationResourceDefinition<E>): IApiAuthorizationIamPredicatePair | undefined {
		const fieldDefinition: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = this.resolveFilterableField(resourceDefinition, `resource.${constraint.placeholder}`);

		if (!fieldDefinition) {
			return undefined;
		}

		const field: IApiAuthorizationIamQueryField = this.resolveField(resourceDefinition.entity, fieldDefinition.queryPath);
		const column: IApiAuthorizationIamPredicateColumn = { field, queryPath: fieldDefinition.queryPath };

		if (!field.isResolvable) {
			return undefined;
		}

		if (constraint.isPrefix) {
			return this.isStringField(resourceDefinition, fieldDefinition.queryPath) && ApiAuthorizationIamPredicateBuilder.isTextColumn(field) ? ApiAuthorizationIamPredicateBuilder.buildPrefixConstraint({ column, prefix: constraint.value }) : undefined;
		}

		if (ApiAuthorizationIamPredicateBuilder.isTextColumn(field)) {
			return ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column, comparison: EApiAuthorizationIamPredicateComparison.TEXT, value: constraint.value });
		}

		if (constraint.value === "" || !field.isBoolean) {
			return ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column, comparison: EApiAuthorizationIamPredicateComparison.NATIVE, value: constraint.value });
		}

		const value: TApiAuthorizationIamPredicateValue | undefined = this.resolveColumnValue(field, fieldDefinition.queryPath, constraint.value);

		return value === undefined ? undefined : ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column, comparison: EApiAuthorizationIamPredicateComparison.BOOLEAN, value });
	}

	/**
	 * Builds the rows one matched Deny statement keeps: by De Morgan, the OR of the `fails` of its resource-pattern
	 * constraints and of its `resource.*` keys.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {ReadonlyArray<IApiAuthorizationIamCondition>} conditions - Condition keys of the statement, read by the grammar.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceConstraint>} constraints - Placeholder constraints of a row-scoped Resource pattern.
	 * @param {object} context - Planning context.
	 * @param {IApiAuthorizationPrincipal} context.principal - Principal.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} context.requestMetadata - Request metadata.
	 * @param {E} [context.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} context.resourceDefinition - IAM resource definition.
	 * @returns {TApiAuthorizationIamPredicate | undefined} The kept rows, or undefined when a key or a constraint cannot compile.
	 */
	private buildExclusionKept<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(conditions: ReadonlyArray<IApiAuthorizationIamCondition>, constraints: ReadonlyArray<IApiAuthorizationIamResourceConstraint>, context: { principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> }): TApiAuthorizationIamPredicate | undefined {
		const fails: Array<TApiAuthorizationIamPredicate> = [];

		for (const constraint of constraints) {
			const pair: IApiAuthorizationIamPredicatePair | undefined = this.buildConstraintPair(constraint, context.resourceDefinition);

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

		// A Deny with neither keys nor constraints denies the whole request before it reaches the planner; keep that closed here too.
		return fails.length === 0 ? { kind: EApiAuthorizationIamPredicateKind.FALSE } : ApiAuthorizationIamPredicateBuilder.or(fails);
	}

	/**
	 * Builds the rows one matched Allow statement allows: the AND of the `holds` of its `resource.*` keys, `TRUE` when
	 * it has none. A negated key does not compile in an Allow scope, as in 5.1.0.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {ReadonlyArray<IApiAuthorizationIamCondition>} conditions - Condition keys of the statement, read by the grammar.
	 * @param {object} context - Planning context.
	 * @param {IApiAuthorizationPrincipal} context.principal - Principal.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} context.requestMetadata - Request metadata.
	 * @param {E} [context.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} context.resourceDefinition - IAM resource definition.
	 * @returns {TApiAuthorizationIamPredicate | undefined} The allowed rows, or undefined when a key cannot compile.
	 */
	private buildStatementHolds<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(conditions: ReadonlyArray<IApiAuthorizationIamCondition>, context: { principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> }): TApiAuthorizationIamPredicate | undefined {
		const holds: Array<TApiAuthorizationIamPredicate> = [];

		for (const condition of conditions) {
			if (!condition.key.startsWith("resource.")) {
				continue;
			}

			const pair: IApiAuthorizationIamPredicatePair | undefined = condition.isNegated ? undefined : this.buildConditionPair(condition, context);

			if (!pair) {
				return undefined;
			}

			holds.push(pair.holds);
		}

		return ApiAuthorizationIamPredicateBuilder.and(holds);
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
	 * Accepts only condition values whose SQL comparison matches the in-memory evaluator, which normalizes
	 * `null`, `undefined`, and `""` to the same empty string and cannot compare objects.
	 * @param {unknown} value - Resolved condition value.
	 * @returns {boolean} True for non-empty scalar values.
	 */
	private isCompilableValue(value: unknown): boolean {
		return value !== undefined && value !== null && value !== "" && typeof value !== "object";
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
	 * Reads a query path through the TypeORM metadata of the resource entity, as `AuthorizationIamReadQueryField` describes.
	 * @param {object} entity - Resource entity class.
	 * @param {string} queryPath - Entity query path.
	 * @returns {IApiAuthorizationIamQueryField} The resolved query path.
	 */
	private readField(entity: object, queryPath: string): IApiAuthorizationIamQueryField {
		return AuthorizationIamReadQueryField(entity, queryPath);
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
	 * Resolves the value of a condition key against the request: a literal as written, a variable to the context value at its path.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {object} context - Evaluation context.
	 * @param {IApiAuthorizationPrincipal} context.principal - Principal.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} context.requestMetadata - Request metadata.
	 * @param {E} [context.resource] - Loaded resource, when available.
	 * @returns {unknown} The resolved value, or undefined when the key has no value.
	 */
	private resolveConditionValue<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(condition: IApiAuthorizationIamCondition, context: { principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E }): unknown {
		// The grammar gives a key one value until several values reach the planner.
		const conditionValue: IApiAuthorizationIamConditionValue | undefined = condition.values[0];

		if (!conditionValue) {
			return undefined;
		}

		return ApiAuthorizationIamVariable.resolveValue(conditionValue, {
			principal: context.principal,
			request: {
				body: context.requestMetadata.body,
				headers: context.requestMetadata.headers,
				ip: context.requestMetadata.ip,
				parameters: context.requestMetadata.parameters,
				query: context.requestMetadata.query,
			},
			resource: context.resource,
		});
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
