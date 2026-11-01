import "reflect-metadata";

import { ApiServiceBase } from "@class/api";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiControllerSecurable } from "@decorator/api/controller/securable.decorator";
import { ApiMethod } from "@decorator/api/method.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiAuthorizationMode } from "@enum/class/authorization/mode.enum";
import { EApiAuthenticationType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { HttpStatus, RequestMethod } from "@nestjs/common";
import { PATH_METADATA } from "@nestjs/common/internal";
import { SWAGGER_TEST_METADATA_CONSTANT } from "@test/unit/fixture";
import { Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("forbidden_response_entities")
class ForbiddenResponseEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

const getResponses = (controller: { prototype: object }, methodName: string): Record<string, { description?: string }> => (Reflect.getMetadata(SWAGGER_TEST_METADATA_CONSTANT.RESPONSE, Reflect.get(controller.prototype, methodName) as object) ?? {}) as Record<string, { description?: string }>;

class ForbiddenResponseAuthenticationGuard {
	public canActivate(): boolean {
		return true;
	}
}

const customRoute = (path: string, isAuthenticated: boolean = false): MethodDecorator =>
	ApiMethod<ForbiddenResponseEntity>({
		metadata: {
			resource: { action: "export", entity: ForbiddenResponseEntity },
			response: { status: HttpStatus.OK, type: undefined },
			route: { method: RequestMethod.GET, path },
			security: isAuthenticated ? { authentication: { guard: ForbiddenResponseAuthenticationGuard, type: EApiAuthenticationType.USER } } : undefined,
		},
	});

describe("ApiControllerApplyForbiddenResponse", () => {
	it("declares 403 once on every generated route when securable is applied after the controller", () => {
		@ApiControllerSecurable()
		@ApiController<ForbiddenResponseEntity>({
			authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
			entity: ForbiddenResponseEntity,
			routes: { [EApiRouteType.DELETE]: { generation: { isEnabled: false } } },
		})
		class SecurableAfterController {
			public service!: ApiServiceBase<ForbiddenResponseEntity>;
		}

		for (const routeType of [EApiRouteType.CREATE, EApiRouteType.GET, EApiRouteType.GET_LIST, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE]) {
			expect(getResponses(SecurableAfterController, routeType)[HttpStatus.FORBIDDEN], routeType).toMatchObject({ description: "Forbidden" });
		}

		expect(Reflect.get(SecurableAfterController.prototype, EApiRouteType.DELETE)).toBeUndefined();
	});

	it("declares 403 when securable is applied before the controller", () => {
		@ApiController<ForbiddenResponseEntity>({
			authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
			entity: ForbiddenResponseEntity,
			routes: {},
		})
		@ApiControllerSecurable()
		class SecurableBeforeController {
			public service!: ApiServiceBase<ForbiddenResponseEntity>;
		}

		expect(getResponses(SecurableBeforeController, EApiRouteType.GET)[HttpStatus.FORBIDDEN]).toMatchObject({ description: "Forbidden" });
	});

	it("does not declare 403 without securable or without an authorization block", () => {
		@ApiController<ForbiddenResponseEntity>({
			authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
			entity: ForbiddenResponseEntity,
			routes: {},
		})
		class NotSecurableController {
			public service!: ApiServiceBase<ForbiddenResponseEntity>;
		}

		@ApiControllerSecurable()
		@ApiController<ForbiddenResponseEntity>({ entity: ForbiddenResponseEntity, routes: {} })
		class NoAuthorizationController {
			public service!: ApiServiceBase<ForbiddenResponseEntity>;
		}

		expect(getResponses(NotSecurableController, EApiRouteType.GET)[HttpStatus.FORBIDDEN]).toBeUndefined();
		expect(getResponses(NoAuthorizationController, EApiRouteType.GET)[HttpStatus.FORBIDDEN]).toBeUndefined();
	});

	it("declares 403 once on custom routes of a securable controller in either decorator order", () => {
		@ApiControllerSecurable()
		@ApiController<ForbiddenResponseEntity>({
			authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
			entity: ForbiddenResponseEntity,
			routes: {},
		})
		class SecurableAfterCustomController {
			public service!: ApiServiceBase<ForbiddenResponseEntity>;

			@customRoute("authenticated", true)
			public authenticated(): void {}

			@customRoute("export")
			public export(): void {}

			public helper(): void {}
		}

		@ApiController<ForbiddenResponseEntity>({
			authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
			entity: ForbiddenResponseEntity,
			routes: {},
		})
		@ApiControllerSecurable()
		class SecurableBeforeCustomController {
			public service!: ApiServiceBase<ForbiddenResponseEntity>;

			@customRoute("export")
			public export(): void {}
		}

		expect(getResponses(SecurableAfterCustomController, "export")[HttpStatus.FORBIDDEN]).toEqual(expect.objectContaining({ description: "Forbidden" }));
		expect(getResponses(SecurableAfterCustomController, "authenticated")[HttpStatus.FORBIDDEN]).toEqual(expect.objectContaining({ description: "Forbidden" }));
		expect(getResponses(SecurableAfterCustomController, "authenticated")[HttpStatus.UNAUTHORIZED]).toEqual(expect.objectContaining({ description: "Unauthorized" }));
		expect(getResponses(SecurableAfterCustomController, "helper")).toEqual({});
		expect(getResponses(SecurableBeforeCustomController, "export")[HttpStatus.FORBIDDEN]).toEqual(expect.objectContaining({ description: "Forbidden" }));
	});

	it("declares 403 on an inherited custom route only for the securable subclass", () => {
		class SharedRoutesController {
			public service!: ApiServiceBase<ForbiddenResponseEntity>;

			@customRoute("stats")
			public stats(): { isShared: boolean } {
				return { isShared: true };
			}
		}

		const sharedHandler: unknown = Reflect.get(SharedRoutesController.prototype, "stats");

		@ApiControllerSecurable()
		@ApiController<ForbiddenResponseEntity>({ authorization: { defaultMode: EApiAuthorizationMode.HOOKS }, entity: ForbiddenResponseEntity, path: "securable-shared", routes: {} })
		class SecurableSharedController extends SharedRoutesController {}

		@ApiController<ForbiddenResponseEntity>({ entity: ForbiddenResponseEntity, path: "plain-shared", routes: {} })
		class PlainSharedController extends SharedRoutesController {}

		const securableHandler: unknown = Reflect.get(SecurableSharedController.prototype, "stats");

		expect(getResponses(SecurableSharedController, "stats")[HttpStatus.FORBIDDEN]).toMatchObject({ description: "Forbidden" });
		expect(getResponses(PlainSharedController, "stats")[HttpStatus.FORBIDDEN]).toBeUndefined();
		expect(getResponses(SharedRoutesController, "stats")[HttpStatus.FORBIDDEN]).toBeUndefined();
		expect(Reflect.get(PlainSharedController.prototype, "stats")).toBe(sharedHandler);
		expect(securableHandler).not.toBe(sharedHandler);
		expect(Reflect.getMetadata(PATH_METADATA, securableHandler as object)).toBe("stats");
		expect((securableHandler as () => unknown).call(new SecurableSharedController())).toEqual({ isShared: true });
	});

	it("does not declare 403 on custom routes that cannot be refused", () => {
		@ApiController<ForbiddenResponseEntity>({
			authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
			entity: ForbiddenResponseEntity,
			routes: {},
		})
		class NotSecurableCustomController {
			public service!: ApiServiceBase<ForbiddenResponseEntity>;

			@customRoute("export")
			public export(): void {}
		}

		expect(getResponses(NotSecurableCustomController, "export")[HttpStatus.FORBIDDEN]).toBeUndefined();
		expect(getResponses(NotSecurableCustomController, "export")[HttpStatus.UNAUTHORIZED]).toBeUndefined();
	});
});
