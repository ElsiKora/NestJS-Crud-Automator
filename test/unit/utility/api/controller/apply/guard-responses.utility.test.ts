import "reflect-metadata";

import { ApiServiceBase } from "@class/api";
import { CONTROLLER_STARTUP_CHECK_METADATA_KEY } from "@constant/decorator/api/controller-startup-check.constant";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiControllerSecurable } from "@decorator/api/controller/securable.decorator";
import { ApiMethod } from "@decorator/api/method.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiAuthorizationMode } from "@enum/class/authorization/mode.enum";
import { EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { HttpStatus, RequestMethod, UseGuards } from "@nestjs/common";
import { SWAGGER_TEST_METADATA_CONSTANT } from "@test/unit/fixture";
import { Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("guard_response_entities")
class GuardResponseEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

class GuardResponseGuard {
	public canActivate(): boolean {
		return true;
	}
}

const getResponses = (controller: { prototype: object }, methodName: string): Record<string, { description?: string }> => (Reflect.getMetadata(SWAGGER_TEST_METADATA_CONSTANT.RESPONSE, Reflect.get(controller.prototype, methodName) as object) ?? {}) as Record<string, { description?: string }>;

const route = (path: string, statuses?: Array<{ description: string; status: HttpStatus }>): MethodDecorator =>
	ApiMethod<GuardResponseEntity>({
		metadata: {
			documentation: statuses ? { response: { statuses } } : undefined,
			resource: { action: "export", entity: GuardResponseEntity },
			response: { status: HttpStatus.OK, type: undefined },
			route: { method: RequestMethod.GET, path },
		},
	});

const NO_GENERATED_ROUTES = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};

describe("ApiControllerApplyGuardResponses", () => {
	it("declares 401 and 403 once for a class guard below the controller, at decoration", () => {
		@ApiController<GuardResponseEntity>({ entity: GuardResponseEntity, routes: NO_GENERATED_ROUTES })
		@UseGuards(GuardResponseGuard)
		class BelowController {
			public service!: ApiServiceBase<GuardResponseEntity>;

			@route("export")
			public export(): void {}
		}

		expect(getResponses(BelowController, "export")[HttpStatus.UNAUTHORIZED]?.description).toBe("Unauthorized");
		expect(getResponses(BelowController, "export")[HttpStatus.FORBIDDEN]?.description).toBe("Forbidden");
	});

	it("declares 401 and 403 once for a class guard above the controller, on instantiation, however often that happens", () => {
		@UseGuards(GuardResponseGuard)
		@ApiController<GuardResponseEntity>({ entity: GuardResponseEntity, routes: NO_GENERATED_ROUTES })
		class AboveController {
			public service!: ApiServiceBase<GuardResponseEntity>;

			@route("export")
			public export(): void {}
		}

		new AboveController();
		new AboveController();

		expect(getResponses(AboveController, "export")[HttpStatus.UNAUTHORIZED]?.description).toBe("Unauthorized");
		expect(getResponses(AboveController, "export")[HttpStatus.FORBIDDEN]?.description).toBe("Forbidden");
	});

	it("declares a class guard above the controller from the startup check, since a REQUEST-scoped controller is only constructed on a request", () => {
		@UseGuards(GuardResponseGuard)
		@ApiController<GuardResponseEntity>({ entity: GuardResponseEntity, routes: NO_GENERATED_ROUTES })
		class RequestScopedController {
			public service!: ApiServiceBase<GuardResponseEntity>;

			@route("export")
			public export(): void {}
		}

		(Reflect.getMetadata(CONTROLLER_STARTUP_CHECK_METADATA_KEY, RequestScopedController) as (isConstructedPerRequest: boolean) => void)(true);

		expect(getResponses(RequestScopedController, "export")[HttpStatus.UNAUTHORIZED]?.description).toBe("Unauthorized");
		expect(getResponses(RequestScopedController, "export")[HttpStatus.FORBIDDEN]?.description).toBe("Forbidden");
	});

	it("declares a guard above the route decorator", () => {
		@ApiController<GuardResponseEntity>({ entity: GuardResponseEntity, routes: NO_GENERATED_ROUTES })
		class HandlerController {
			public service!: ApiServiceBase<GuardResponseEntity>;

			@UseGuards(GuardResponseGuard)
			@route("export")
			public export(): void {}
		}

		expect(getResponses(HandlerController, "export")[HttpStatus.UNAUTHORIZED]).toBeDefined();
		expect(getResponses(HandlerController, "export")[HttpStatus.FORBIDDEN]).toBeDefined();
	});

	it("leaves a status the route documents itself as it is", () => {
		@ApiController<GuardResponseEntity>({ entity: GuardResponseEntity, routes: NO_GENERATED_ROUTES })
		@UseGuards(GuardResponseGuard)
		class DocumentedController {
			public service!: ApiServiceBase<GuardResponseEntity>;

			@route("export", [{ description: "Sign in first", status: HttpStatus.UNAUTHORIZED }])
			public export(): void {}
		}

		expect(getResponses(DocumentedController, "export")[HttpStatus.UNAUTHORIZED]?.description).toBe("Sign in first");
		expect(getResponses(DocumentedController, "export")[HttpStatus.FORBIDDEN]?.description).toBe("Forbidden");
	});

	it("leaves the handler a sibling shares untouched", () => {
		@ApiController<GuardResponseEntity>({ entity: GuardResponseEntity, routes: NO_GENERATED_ROUTES })
		class BaseController {
			public service!: ApiServiceBase<GuardResponseEntity>;

			@route("export")
			public export(): void {}
		}

		@ApiController<GuardResponseEntity>({ entity: GuardResponseEntity, routes: NO_GENERATED_ROUTES })
		@UseGuards(GuardResponseGuard)
		class GuardedController extends BaseController {}

		@ApiController<GuardResponseEntity>({ entity: GuardResponseEntity, routes: NO_GENERATED_ROUTES })
		class OpenController extends BaseController {}

		expect(getResponses(GuardedController, "export")[HttpStatus.UNAUTHORIZED]).toBeDefined();
		expect(getResponses(OpenController, "export")[HttpStatus.UNAUTHORIZED]).toBeUndefined();
		expect(getResponses(BaseController, "export")[HttpStatus.UNAUTHORIZED]).toBeUndefined();
	});

	it("does not count the guard a securable controller attaches, in either decorator order", () => {
		@ApiControllerSecurable()
		@ApiController<GuardResponseEntity>({ authorization: { defaultMode: EApiAuthorizationMode.HOOKS }, entity: GuardResponseEntity, routes: {} })
		class SecurableAboveController {
			public service!: ApiServiceBase<GuardResponseEntity>;

			@route("export")
			public export(): void {}
		}

		@ApiController<GuardResponseEntity>({ authorization: { defaultMode: EApiAuthorizationMode.HOOKS }, entity: GuardResponseEntity, routes: {} })
		@ApiControllerSecurable()
		class SecurableBelowController {
			public service!: ApiServiceBase<GuardResponseEntity>;

			@route("export")
			public export(): void {}
		}

		for (const controller of [SecurableAboveController, SecurableBelowController]) {
			new controller();
			(Reflect.getMetadata(CONTROLLER_STARTUP_CHECK_METADATA_KEY, controller) as (isConstructedPerRequest: boolean) => void)(false);

			for (const methodName of ["export", EApiRouteType.GET, EApiRouteType.CREATE]) {
				expect(getResponses(controller, methodName)[HttpStatus.UNAUTHORIZED], `${controller.name} ${methodName}`).toBeUndefined();
				expect(getResponses(controller, methodName)[HttpStatus.FORBIDDEN]?.description, `${controller.name} ${methodName}`).toBe("Forbidden");
			}
		}
	});

	it("declares neither without a guard", () => {
		@ApiController<GuardResponseEntity>({ entity: GuardResponseEntity, routes: NO_GENERATED_ROUTES })
		class OpenController {
			public service!: ApiServiceBase<GuardResponseEntity>;

			@route("export")
			public export(): void {}
		}

		new OpenController();

		expect(getResponses(OpenController, "export")[HttpStatus.UNAUTHORIZED]).toBeUndefined();
		expect(getResponses(OpenController, "export")[HttpStatus.FORBIDDEN]).toBeUndefined();
	});
});
