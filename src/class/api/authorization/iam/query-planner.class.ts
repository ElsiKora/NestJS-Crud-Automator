import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPrincipal, IApiAuthorizationRequestMetadata, IApiAuthorizationResourceDefinition, IApiAuthorizationScope, IApiPolicyStatement } from "@interface/class/api/authorization";
import type { FindOptionsWhere } from "typeorm";

import { Injectable } from "@nestjs/common";
import { LoggerUtility } from "@utility/logger.utility";

const iamQueryPlannerLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationIamQueryPlanner");

@Injectable()
export class ApiAuthorizationIamQueryPlanner {
	public plan<E extends IApiBaseEntity>(options: { principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E>; statements: ReadonlyArray<IApiPolicyStatement> }): { isFullyCompilable: boolean; scope?: IApiAuthorizationScope<E> } {
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

	private assignWhereValue<E extends IApiBaseEntity>(where: FindOptionsWhere<E>, queryPath: string, value: unknown): void {
		const pathSegments: Array<string> = queryPath.split(".").filter(Boolean);

		if (pathSegments.length === 0) {
			return;
		}

		let currentValue: Record<string, unknown> = where as unknown as Record<string, unknown>;

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

	private compileStatementWhere<E extends IApiBaseEntity>(options: { condition?: Record<string, Record<string, unknown>>; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E>; resource?: E; resourceDefinition: IApiAuthorizationResourceDefinition<E> }): { isCompilable: boolean; where?: FindOptionsWhere<E> } {
		if (!options.condition) {
			return {
				isCompilable: true,
			};
		}

		const where: FindOptionsWhere<E> = {} as FindOptionsWhere<E>;
		let hasResourceCondition: boolean = false;

		for (const [operator, operands] of Object.entries(options.condition)) {
			for (const [path, rawValue] of Object.entries(operands)) {
				if (!path.startsWith("resource.")) {
					continue;
				}

				hasResourceCondition = true;

				if (operator !== "StringEquals" && operator !== "StringEqualsIfExists") {
					return { isCompilable: false };
				}

				const fieldDefinition: IApiAuthorizationResourceDefinition<E>["fields"][number] | undefined = options.resourceDefinition.fields.find((field: IApiAuthorizationResourceDefinition<E>["fields"][number]): boolean => field.path === path);

				if (!fieldDefinition?.isFilterable) {
					return { isCompilable: false };
				}

				const resolvedValue: unknown = this.resolveConditionValue(rawValue, {
					principal: options.principal,
					request: options.requestMetadata,
					resource: options.resource,
				});

				if (resolvedValue === undefined || this.isComplexValue(resolvedValue)) {
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

	private isComplexValue(value: unknown): boolean {
		return typeof value === "object" && value !== null;
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
