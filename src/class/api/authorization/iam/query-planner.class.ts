import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationIamDenyExclusion, IApiAuthorizationIamResourceConstraint, IApiAuthorizationPrincipal, IApiAuthorizationRequestMetadata, IApiAuthorizationResourceDefinition, IApiAuthorizationScope, IApiPolicyStatement } from "@interface/class/api/authorization";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { FindOperator, FindOptionsWhere } from "typeorm";

import { Buffer } from "node:buffer";

import { MetadataStorage } from "@class/metadata-storage.class";
import { AUTHORIZATION_IAM_SCOPE_CONSTANT } from "@constant/class/authorization";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiPolicyConditionOperator } from "@enum/class/authorization";
import { EApiPropertyDescribeType, EApiPropertyStringType } from "@enum/decorator/api";
import { Injectable } from "@nestjs/common";
import { AuthorizationScopeMergeWhere } from "@utility/authorization";
import { EnumIsValue } from "@utility/enum/is-value.utility";
import { LoggerUtility } from "@utility/logger.utility";
import { Equal, IsNull, Not, Raw } from "typeorm";

const iamQueryPlannerLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationIamQueryPlanner");

@Injectable()
export class ApiAuthorizationIamQueryPlanner {
	public plan<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(options: { principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E>; statements: ReadonlyArray<IApiPolicyStatement> }): { isFullyCompilable: boolean; scope?: IApiAuthorizationScope<E> } {
		iamQueryPlannerLogger.verbose(`Planning IAM query scope for resource type "${options.resourceDefinition.resourceType}" using ${options.statements.length} statements.`);

		const branches: Array<FindOptionsWhere<E>> = [];

		for (const statement of options.statements) {
			const compiledStatement: { isCompilable: boolean; where?: FindOptionsWhere<E> } = this.compileStatementWhere({
				condition: statement.Condition,
				principal: options.principal,
				requestMetadata: options.requestMetadata,
				resource: options.resource,
				resourceDefinition: options.resourceDefinition,
			});

			if (!compiledStatement.isCompilable) {
				iamQueryPlannerLogger.verbose(`IAM query scope is not fully compilable for resource type "${options.resourceDefinition.resourceType}".`);

				return { isFullyCompilable: false };
			}

			if (!compiledStatement.where) {
				continue;
			}

			if (Object.keys(compiledStatement.where).length === 0) {
				return { isFullyCompilable: true, scope: undefined };
			}

			branches.push(compiledStatement.where);
		}

		if (branches.length === 0) {
			iamQueryPlannerLogger.verbose(`IAM query scope for resource type "${options.resourceDefinition.resourceType}" resolved without additional where branches.`);

			return { isFullyCompilable: true, scope: undefined };
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
	 * Compiles matched Deny statements into the scope of rows they leave visible. Each statement becomes an OR of its
	 * negated resource keys and resource-pattern constraints; statements are ANDed through `AuthorizationScopeMergeWhere`.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {object} options - Planning options.
	 * @param {ReadonlyArray<IApiAuthorizationIamDenyExclusion>} options.exclusions - Matched Deny statements with their resource-pattern constraints.
	 * @param {IApiAuthorizationPrincipal} options.principal - Principal used to resolve `${...}` condition values.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} options.requestMetadata - Request metadata used to resolve `${...}` condition values.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition with the filterable field mappings.
	 * @returns {{ isFullyCompilable: boolean; scope?: IApiAuthorizationScope<E> }} Exclusion scope, or a non-compilable result that must deny the request.
	 */
	public planExclusion<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(options: { exclusions: ReadonlyArray<IApiAuthorizationIamDenyExclusion>; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> }): { isFullyCompilable: boolean; scope?: IApiAuthorizationScope<E> } {
		iamQueryPlannerLogger.verbose(`Planning IAM exclusion scope for resource type "${options.resourceDefinition.resourceType}" using ${options.exclusions.length} deny exclusions.`);

		let where: TApiAuthorizationScopeWhere<E>;

		for (const exclusion of options.exclusions) {
			const compiledExclusion: { branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean } = this.compileStatementExclusion({
				condition: exclusion.statement.Condition,
				principal: options.principal,
				requestMetadata: options.requestMetadata,
				resource: options.resource,
				resourceConstraints: exclusion.resourceConstraints,
				resourceDefinition: options.resourceDefinition,
			});

			if (!compiledExclusion.isCompilable || !compiledExclusion.branches) {
				iamQueryPlannerLogger.verbose(`IAM exclusion scope is not fully compilable for resource type "${options.resourceDefinition.resourceType}".`);

				return { isFullyCompilable: false };
			}

			where = AuthorizationScopeMergeWhere(where, compiledExclusion.branches.length === 1 ? compiledExclusion.branches[0] : compiledExclusion.branches);

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

	private assignWhereValue<E extends IApiBaseEntity>(where: FindOptionsWhere<E>, queryPath: string, value: unknown): void {
		const pathSegments: Array<string> = queryPath.split(".").filter(Boolean);

		if (pathSegments.length === 0) {
			return;
		}

		let currentValue: Record<string, unknown> = where;

		for (const segment of pathSegments.slice(0, -1)) {
			if (!this.isRecord(currentValue[segment])) {
				currentValue[segment] = {};
			}

			currentValue = currentValue[segment] as Record<string, unknown>;
		}

		const lastSegment: string | undefined = pathSegments.at(-1);

		if (!lastSegment) {
			return;
		}

		currentValue[lastSegment] = value;
	}

	/**
	 * Compiles one matched Deny statement into the OR branches of rows it leaves visible. Keys of one statement are
	 * ANDed, so by De Morgan every negated key or resource-pattern constraint is its own top-level branch.
	 * @template E - Entity type.
	 * @template M - List pagination mode.
	 * @param {object} options - Compilation options.
	 * @param {Record<string, Record<string, unknown>>} [options.condition] - Statement condition.
	 * @param {IApiAuthorizationPrincipal} options.principal - Principal used to resolve `${...}` condition values.
	 * @param {IApiAuthorizationRequestMetadata<E, M>} options.requestMetadata - Request metadata used to resolve `${...}` condition values.
	 * @param {E} [options.resource] - Loaded resource, when available.
	 * @param {ReadonlyArray<IApiAuthorizationIamResourceConstraint>} options.resourceConstraints - Placeholder constraints of a row-scoped Resource pattern.
	 * @param {IApiAuthorizationResourceDefinition<E>} options.resourceDefinition - IAM resource definition with the filterable field mappings.
	 * @returns {{ branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean }} Exclusion branches, or a non-compilable result.
	 */
	private compileStatementExclusion<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(options: {
		condition?: Record<string, Record<string, unknown>>;
		principal: IApiAuthorizationPrincipal;
		requestMetadata: IApiAuthorizationRequestMetadata<E, M>;
		resource?: E;
		resourceConstraints: ReadonlyArray<IApiAuthorizationIamResourceConstraint>;
		resourceDefinition: IApiAuthorizationResourceDefinition<E>;
	}): { branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean } {
		const branches: Array<FindOptionsWhere<E>> = [];

		for (const constraint of options.resourceConstraints) {
			const fieldDefinition: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = this.resolveFilterableField(options.resourceDefinition, `resource.${constraint.placeholder}`);

			if (!fieldDefinition || (constraint.isPrefix && !this.isStringField(options.resourceDefinition, fieldDefinition.queryPath))) {
				return { isCompilable: false };
			}

			// A row whose placeholder is NULL renders `*` in its resource string, which no row-scoped pattern matches.
			branches.push(this.createWhere(fieldDefinition.queryPath, constraint.isPrefix ? this.createPrefixExclusion(constraint.value) : Not(Equal(constraint.value))), this.createWhere(fieldDefinition.queryPath, IsNull()));
		}

		for (const [operator, operands] of Object.entries(options.condition ?? {})) {
			for (const [path, rawValue] of Object.entries(operands)) {
				if (!path.startsWith("resource.")) {
					continue;
				}

				const fieldDefinition: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = this.resolveFilterableField(options.resourceDefinition, path);

				const resolvedValue: unknown = this.resolveConditionValue(rawValue, {
					principal: options.principal,
					request: options.requestMetadata,
					resource: options.resource,
				});

				const negatedOperators: Array<FindOperator<unknown>> | undefined = this.isCompilableValue(resolvedValue) ? this.negateConditionOperator(operator, resolvedValue) : undefined;

				if (!fieldDefinition || !negatedOperators) {
					return { isCompilable: false };
				}

				for (const negatedOperator of negatedOperators) {
					branches.push(this.createWhere(fieldDefinition.queryPath, negatedOperator));
				}
			}
		}

		return branches.length === 0 ? { isCompilable: false } : { branches, isCompilable: true };
	}

	private compileStatementWhere<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode>(options: { condition?: Record<string, Record<string, unknown>>; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E, M>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> }): { isCompilable: boolean; where?: FindOptionsWhere<E> } {
		if (!options.condition) {
			return {
				isCompilable: true,
			};
		}

		const where: FindOptionsWhere<E> = {};
		let hasResourceCondition: boolean = false;

		for (const [operator, operands] of Object.entries(options.condition)) {
			for (const [path, rawValue] of Object.entries(operands)) {
				if (!path.startsWith("resource.")) {
					continue;
				}

				hasResourceCondition = true;

				if (operator !== (EApiPolicyConditionOperator.STRING_EQUALS as string) && operator !== (EApiPolicyConditionOperator.STRING_EQUALS_IF_EXISTS as string)) {
					return { isCompilable: false };
				}

				const fieldDefinition: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = this.resolveFilterableField(options.resourceDefinition, path);

				if (!fieldDefinition) {
					return { isCompilable: false };
				}

				const resolvedValue: unknown = this.resolveConditionValue(rawValue, {
					principal: options.principal,
					request: options.requestMetadata,
					resource: options.resource,
				});

				if (!this.isCompilableValue(resolvedValue)) {
					return { isCompilable: false };
				}

				this.assignWhereValue(where, fieldDefinition.queryPath, resolvedValue);
			}
		}

		return {
			isCompilable: true,
			where: hasResourceCondition ? where : undefined,
		};
	}

	/**
	 * Builds a prefix exclusion with an explicit ESCAPE clause, because databases disagree on the default LIKE escape character.
	 * @param {string} prefix - Literal resource-pattern prefix.
	 * @returns {FindOperator<unknown>} Operator keeping values that do not start with the prefix.
	 */
	private createPrefixExclusion(prefix: string): FindOperator<unknown> {
		const parameterName: string = `iamResourcePrefix${Buffer.from(prefix).toString("hex")}`;
		const pattern: string = `${prefix.replaceAll(/[!%_]/g, "!$&")}%`;

		return Raw((columnAlias: string): string => `${columnAlias} NOT LIKE :${parameterName} ESCAPE '!'`, { [parameterName]: pattern });
	}

	/**
	 * Builds a single-field WHERE branch, following the nested `queryPath` rules of `assignWhereValue`.
	 * @template E - Entity type.
	 * @param {string} queryPath - Entity query path such as `status` or `operator.id`.
	 * @param {unknown} value - Field condition.
	 * @returns {FindOptionsWhere<E>} WHERE branch.
	 */
	private createWhere<E extends IApiBaseEntity>(queryPath: string, value: unknown): FindOptionsWhere<E> {
		const where: FindOptionsWhere<E> = {};
		this.assignWhereValue(where, queryPath, value);

		return where;
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

	private isRecord(value: unknown): value is Record<string, unknown> {
		return Boolean(value) && typeof value === "object" && !Array.isArray(value);
	}

	/**
	 * Checks the package's own rule for LIKE-based criteria: only properties described as `EApiPropertyDescribeType.STRING`.
	 * String formats backed by `bigint` or `uuid` columns are excluded, because databases such as PostgreSQL reject LIKE on them.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition.
	 * @param {string} queryPath - Direct entity property; nested paths are never treated as string columns.
	 * @returns {boolean} True when the property is a described text column.
	 */
	private isStringField<E extends IApiBaseEntity>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, queryPath: string): boolean {
		const propertyMetadata: Partial<TApiPropertyDescribeProperties> | undefined = MetadataStorage.getInstance().getMetadata(resourceDefinition.entity.name, queryPath, PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY);

		if (propertyMetadata?.type !== EApiPropertyDescribeType.STRING) {
			return false;
		}

		return propertyMetadata.format !== EApiPropertyStringType.BIGINT_STRING && propertyMetadata.format !== EApiPropertyStringType.UUID;
	}

	/**
	 * Negates one resource condition key with the in-memory evaluator's semantics for stored rows: a NULL column is a
	 * present value that normalizes to an empty string, so the IfExists operators compile like their plain forms.
	 * @param {string} operator - Condition operator.
	 * @param {unknown} value - Resolved scalar condition value.
	 * @returns {Array<FindOperator<unknown>> | undefined} OR alternatives keeping rows that fail the key, or undefined for unsupported operators.
	 */
	private negateConditionOperator(operator: string, value: unknown): Array<FindOperator<unknown>> | undefined {
		if (!EnumIsValue(EApiPolicyConditionOperator, operator)) {
			return undefined;
		}

		switch (operator) {
			case EApiPolicyConditionOperator.STRING_EQUALS: {
				return [Not(Equal(value)), IsNull()];
			}

			case EApiPolicyConditionOperator.STRING_EQUALS_IF_EXISTS: {
				return [Not(Equal(value)), IsNull()];
			}

			case EApiPolicyConditionOperator.STRING_NOT_EQUALS: {
				return [Equal(value)];
			}

			case EApiPolicyConditionOperator.STRING_NOT_EQUALS_IF_EXISTS: {
				return [Equal(value)];
			}
		}
	}

	private resolveConditionValue(
		value: unknown,
		context: {
			principal: IApiAuthorizationPrincipal;
			request: {
				body?: unknown;
				headers?: Record<string, string>;
				ip?: string;
				parameters?: unknown;
				query?: unknown;
			};
			resource?: IApiBaseEntity;
		},
	): unknown {
		if (typeof value !== "string") {
			return value;
		}

		const matcher: null | RegExpMatchArray = /^\$\{(.+)\}$/.exec(value);

		if (!matcher) {
			return value;
		}

		const matchedPath: string | undefined = matcher[1];

		if (!matchedPath) {
			return undefined;
		}

		return this.resolvePathValue(
			{
				principal: context.principal,
				request: {
					body: context.request.body,
					headers: context.request.headers,
					ip: context.request.ip,
					parameters: context.request.parameters,
					query: context.request.query,
				},
				resource: context.resource,
			},
			matchedPath,
		);
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

	private resolvePathValue(source: unknown, path: string): unknown {
		let currentValue: unknown = source;

		for (const segment of path.split(".").filter(Boolean)) {
			if (!this.isRecord(currentValue)) {
				return undefined;
			}

			currentValue = currentValue[segment];
		}

		return currentValue;
	}
}
