import type { CallHandler, CanActivate, NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";

import { HttpStatus, Inject, Injectable, Param, RequestMethod } from "@nestjs/common";

import { ApiController, ApiRouteCustom, EApiAuthenticationType, EApiDtoType, EApiRouteType } from "../../../../src/index";
import { E2eDtoNameItemEntity } from "../entity";
import { E2eDtoNameItemService } from "../service";

const NO_GENERATED_ROUTES = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
} as const;

/**
 * Refuses every request.
 */
@Injectable()
export class E2eDtoNameDenyGuard implements CanActivate {
	public canActivate(): boolean {
		return false;
	}
}

/**
 * Counts the requests it intercepts.
 */
@Injectable()
export class E2eDtoNameCountingInterceptor implements NestInterceptor {
	public static count: number = 0;

	public intercept(_context: unknown, next: CallHandler): Observable<unknown> {
		E2eDtoNameCountingInterceptor.count += 1;

		return next.handle();
	}
}

export class E2eDtoNameGuardedBase {
	public static handlerCalls: number = 0;

	@Inject(E2eDtoNameItemService)
	public readonly service!: E2eDtoNameItemService;

	@ApiRouteCustom<E2eDtoNameItemEntity>({
		execution: { interceptors: [E2eDtoNameCountingInterceptor] },
		resource: { action: "custom.counted", entity: E2eDtoNameItemEntity },
		response: { status: HttpStatus.NO_CONTENT, type: undefined },
		route: { method: RequestMethod.GET, path: "counted/:id", type: EApiRouteType.GET },
	})
	public counted(@Param() _parameters: Record<string, string>): void {
		E2eDtoNameGuardedBase.handlerCalls += 1;
	}

	@ApiRouteCustom<E2eDtoNameItemEntity>({
		autoDto: { [EApiDtoType.PARAMETERS]: {} },
		resource: { action: "custom.denied-authentication", entity: E2eDtoNameItemEntity },
		response: { status: HttpStatus.NO_CONTENT, type: undefined },
		route: { method: RequestMethod.GET, path: "denied-authentication/:id", type: EApiRouteType.GET },
		security: { authentication: { guard: E2eDtoNameDenyGuard, type: EApiAuthenticationType.USER } },
	})
	public deniedAuthentication(@Param() _parameters: Record<string, string>): void {
		E2eDtoNameGuardedBase.handlerCalls += 1;
	}

	@ApiRouteCustom<E2eDtoNameItemEntity>({
		autoDto: { [EApiDtoType.PARAMETERS]: {} },
		execution: { guards: [E2eDtoNameDenyGuard] },
		resource: { action: "custom.denied-execution", entity: E2eDtoNameItemEntity },
		response: { status: HttpStatus.NO_CONTENT, type: undefined },
		route: { method: RequestMethod.GET, path: "denied-execution/:id", type: EApiRouteType.GET },
	})
	public deniedExecution(@Param() _parameters: Record<string, string>): void {
		E2eDtoNameGuardedBase.handlerCalls += 1;
	}
}

@ApiController<E2eDtoNameItemEntity>({ entity: E2eDtoNameItemEntity, path: "guarded-a/dto-name-items", routes: NO_GENERATED_ROUTES })
export class E2eDtoNameGuardedAController extends E2eDtoNameGuardedBase {}

@ApiController<E2eDtoNameItemEntity>({ entity: E2eDtoNameItemEntity, path: "guarded-b/dto-name-items", routes: NO_GENERATED_ROUTES })
export class E2eDtoNameGuardedBController extends E2eDtoNameGuardedBase {}
