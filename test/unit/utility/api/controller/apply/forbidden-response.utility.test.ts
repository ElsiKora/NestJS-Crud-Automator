import "reflect-metadata";

import { ApiServiceBase } from "@class/api";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiControllerSecurable } from "@decorator/api/controller/securable.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiAuthorizationMode } from "@enum/class/authorization/mode.enum";
import { EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { HttpStatus } from "@nestjs/common";
import { SWAGGER_TEST_METADATA_CONSTANT } from "@test/unit/fixture";
import { Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("forbidden_response_entities")
class ForbiddenResponseEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

const getResponses = (controller: { prototype: object }, routeType: EApiRouteType): Record<string, { description?: string }> => Reflect.getMetadata(SWAGGER_TEST_METADATA_CONSTANT.RESPONSE, Reflect.get(controller.prototype, routeType) as object) as Record<string, { description?: string }>;

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
});
