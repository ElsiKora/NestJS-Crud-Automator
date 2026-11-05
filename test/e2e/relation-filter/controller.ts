import type { ExecutionContext, Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { Repository } from "typeorm";

import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import type { IApiControllerPropertiesRouteGetListQueryFilter } from "../../../src/index";

import { ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiService, ApiServiceBase, CamelCaseString, EApiAuthenticationType, EApiAuthorizationMode, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOrderDirection } from "../../../src/index";

const DISABLED = { generation: { isEnabled: false } } as const;

export const RELATION_FILTER_SCOPE_REGION: string = "eu";

@Injectable()
export class RelationFilterAuthGuard implements IAuthGuard {
	public canActivate(context: ExecutionContext): boolean {
		this.getRequest<{ user?: unknown }>(context).user = { id: "user-1" };

		return true;
	}

	public getAuthenticateOptions(_context: ExecutionContext): undefined {
		return undefined;
	}

	public getRequest<TRequest = any>(context: ExecutionContext): TRequest {
		return context.switchToHttp().getRequest();
	}

	public handleRequest<TUser = any>(_error: any, user: any, _info: any, _context: ExecutionContext, _status?: any): TUser {
		return user;
	}

	public async logIn<TRequest extends { logIn: Function } = any>(_request: TRequest): Promise<void> {
		return Promise.resolve();
	}
}

/**
 * Creates the service of a route entity.
 * @param {Type<E>} entity - Route entity class.
 * @returns {Type<ApiServiceBase<E>>} The service class.
 * @template E - Route entity type.
 */
export function createRelationFilterService<E extends object>(entity: Type<E>): Type<ApiServiceBase<E>> {
	@Injectable()
	@ApiService({ entity } as never)
	class RelationFilterService extends ApiServiceBase<E> {
		@InjectRepository(entity)
		public readonly repository!: Repository<E>;
	}

	Object.defineProperty(RelationFilterService, "name", { value: `${entity.name}Service` });

	return RelationFilterService as unknown as Type<ApiServiceBase<E>>;
}

/**
 * Creates the policy that narrows a scoped route to one region.
 * @param {Type<E>} entity - Route entity class.
 * @returns {Type<unknown>} The policy class.
 * @template E - Route entity type.
 */
export function createRelationFilterPolicy<E extends object>(entity: Type<E>): Type<unknown> {
	@Injectable()
	@ApiAuthorizationPolicy({ entity } as never)
	class RelationFilterPolicy extends ApiAuthorizationPolicyBase<E & { id: string }> {
		public onBeforeGetList() {
			return this.allow({ scope: () => ({ where: { region: RELATION_FILTER_SCOPE_REGION } as never }) });
		}
	}

	Object.defineProperty(RelationFilterPolicy, "name", { value: `${entity.name}Policy` });

	return RelationFilterPolicy as unknown as Type<unknown>;
}

/**
 * Creates a list controller over a model's typed filter.
 * @param {string} path - Path of the route; also names its generated DTOs.
 * @param {Type<E>} entity - Route entity class.
 * @param {Type<ApiServiceBase<E>>} service - Service of the route.
 * @param {IApiControllerPropertiesRouteGetListQueryFilter<E>} filter - The typed filter.
 * @param {object} options - How the route pages and whether a policy narrows it.
 * @param {object} [options.authorization] - Authorization of a scoped route; HOOKS when omitted.
 * @param {boolean} options.isCursor - Whether the route pages by cursor.
 * @param {boolean} options.isScoped - Whether a policy narrows the route.
 * @returns {Type<unknown>} The controller class.
 * @template E - Route entity type.
 */
export function createRelationFilterController<E extends object>(path: string, entity: Type<E>, service: Type<ApiServiceBase<E>>, filter: IApiControllerPropertiesRouteGetListQueryFilter<E>, options: { authorization?: object; isCursor: boolean; isScoped: boolean }): Type<unknown> {
	class RelationFilterController {
		@Inject(service)
		public readonly service!: ApiServiceBase<E>;
	}

	Object.defineProperty(RelationFilterController, "name", { value: `${CamelCaseString(path)}Controller` });

	const controller = ApiController<E>({
		...(options.isScoped ? { authorization: options.authorization ?? { defaultMode: EApiAuthorizationMode.HOOKS } } : {}),
		entity,
		name: path,
		path,
		routes: {
			[EApiRouteType.CREATE]: DISABLED,
			[EApiRouteType.DELETE]: DISABLED,
			[EApiRouteType.GET]: DISABLED,
			[EApiRouteType.GET_LIST]: {
				request: {
					[EApiControllerRequestTarget.QUERY]: {
						filter,
						order: { fields: {}, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
						...(options.isCursor ? { pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR } } : {}),
					},
				},
				...(options.isScoped ? { security: { authentication: { guard: RelationFilterAuthGuard, type: EApiAuthenticationType.USER } } } : {}),
			},
			[EApiRouteType.PARTIAL_UPDATE]: DISABLED,
			[EApiRouteType.UPDATE]: DISABLED,
		},
	} as never)(RelationFilterController);

	if (options.isScoped) {
		ApiControllerSecurable()(controller as never);
	}

	return controller as Type<unknown>;
}
