import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

import { EApiAuthenticationType, EApiControllerRequestTarget, EApiRouteType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { BadRequestException, ForbiddenException, HttpStatus, UnprocessableEntityException } from "@nestjs/common";
import { ApiControllerGetCustomErrorStatuses, ApiControllerGetErrorStatuses } from "@utility/api/controller/get/error-statuses.utility";
import { describe, expect, it } from "vitest";

class ErrorStatusesEntity {
	public id?: string;
}

class ErrorStatusesGuard {
	public canActivate(): boolean {
		return true;
	}
}

const authentication = { guard: ErrorStatusesGuard, type: EApiAuthenticationType.USER };

describe("ApiControllerGetErrorStatuses", () => {
	it.each([
		[EApiRouteType.CREATE, [HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT, HttpStatus.INTERNAL_SERVER_ERROR]],
		[EApiRouteType.DELETE, [HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.INTERNAL_SERVER_ERROR]],
		[EApiRouteType.GET, [HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.INTERNAL_SERVER_ERROR]],
		[EApiRouteType.GET_LIST, [HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR]],
		[EApiRouteType.PARTIAL_UPDATE, [HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT, HttpStatus.INTERNAL_SERVER_ERROR]],
		[EApiRouteType.UPDATE, [HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT, HttpStatus.INTERNAL_SERVER_ERROR]],
	])("resolves the statuses of an unguarded %s route", (routeType: EApiRouteType, expected: Array<HttpStatus>) => {
		expect(ApiControllerGetErrorStatuses<ErrorStatusesEntity>(routeType, {}, false)).toEqual(expected);
	});

	// ApiMethod is the one source of the guard statuses, for generated and custom routes alike
	it("leaves 401 and 403 of guards to ApiMethod", () => {
		const routeConfig: TApiControllerPropertiesRoute<ErrorStatusesEntity, EApiRouteType> = { execution: { guards: [ErrorStatusesGuard] }, security: { authentication } };

		expect(ApiControllerGetErrorStatuses(EApiRouteType.GET, routeConfig, false)).toEqual([HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.INTERNAL_SERVER_ERROR]);
	});

	it("adds 404 to CREATE only for an enabled request relation load", () => {
		const loading: TApiControllerPropertiesRoute<ErrorStatusesEntity, EApiRouteType> = { relations: { request: { load: { include: { owner: true } } } } } as never;
		const disabled: TApiControllerPropertiesRoute<ErrorStatusesEntity, EApiRouteType> = { relations: { request: { load: { include: { owner: false } } } } } as never;

		expect(ApiControllerGetErrorStatuses(EApiRouteType.CREATE, loading, false)).toContain(HttpStatus.NOT_FOUND);
		expect(ApiControllerGetErrorStatuses(EApiRouteType.CREATE, disabled, false)).not.toContain(HttpStatus.NOT_FOUND);
	});

	it("adds the status of each validator the route runs", () => {
		const validator = (exception: typeof BadRequestException) => ({ errorType: EErrorStringAction.VALIDATION_ERROR, exception, validationFunction: (): boolean => true });
		const routeConfig: TApiControllerPropertiesRoute<ErrorStatusesEntity, EApiRouteType> = {
			request: {
				[EApiControllerRequestTarget.BODY]: { validators: [validator(UnprocessableEntityException)] },
				[EApiControllerRequestTarget.PARAMETERS]: { validators: [validator(ForbiddenException)] },
			},
		} as never;

		expect(ApiControllerGetErrorStatuses(EApiRouteType.CREATE, routeConfig, false)).toEqual([HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT, HttpStatus.UNPROCESSABLE_ENTITY, HttpStatus.INTERNAL_SERVER_ERROR]);
		expect(ApiControllerGetErrorStatuses(EApiRouteType.UPDATE, routeConfig, false)).toEqual([HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT, HttpStatus.UNPROCESSABLE_ENTITY, HttpStatus.INTERNAL_SERVER_ERROR]);
	});

	it("adds GET_LIST path validators only with a read plan", () => {
		const routeConfig: TApiControllerPropertiesRoute<ErrorStatusesEntity, EApiRouteType> = {
			request: { [EApiControllerRequestTarget.PARAMETERS]: { validators: [{ errorType: EErrorStringAction.VALIDATION_ERROR, exception: ForbiddenException, validationFunction: (): boolean => true }] } },
		} as never;

		expect(ApiControllerGetErrorStatuses(EApiRouteType.GET_LIST, routeConfig, false)).not.toContain(HttpStatus.FORBIDDEN);
		expect(ApiControllerGetErrorStatuses(EApiRouteType.GET_LIST, routeConfig, true)).toContain(HttpStatus.FORBIDDEN);
	});
});

describe("ApiControllerGetCustomErrorStatuses", () => {
	const validator = (exception: typeof BadRequestException) => ({ errorType: EErrorStringAction.VALIDATION_ERROR, exception, validationFunction: (): boolean => true });

	it("resolves nothing for a route without validators and relation loads", () => {
		expect(ApiControllerGetCustomErrorStatuses<ErrorStatusesEntity & { id: string }>({})).toEqual([]);
	});

	it("adds the status of each validator on every request target the runtime runs", () => {
		const request = {
			[EApiControllerRequestTarget.BODY]: { validators: [validator(UnprocessableEntityException)] },
			[EApiControllerRequestTarget.PARAMETERS]: { validators: [validator(ForbiddenException)] },
			[EApiControllerRequestTarget.QUERY]: { validators: [validator(BadRequestException)] },
		};

		expect(ApiControllerGetCustomErrorStatuses({ request } as never)).toEqual([HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN, HttpStatus.UNPROCESSABLE_ENTITY]);
	});

	it.each([
		["request", { request: { load: { include: { owner: true } } } }, [HttpStatus.NOT_FOUND]],
		["response", { response: { load: { include: { owner: true } } } }, [HttpStatus.NOT_FOUND]],
		["disabled request", { request: { load: { include: { owner: false } } } }, []],
		["disabled response, which the runtime reloads all the same", { response: { load: { include: { owner: false } } } }, [HttpStatus.NOT_FOUND]],
		["empty response", { response: { load: { include: {} } } }, []],
	])("resolves the %s relation load", (_name: string, relations: object, expected: Array<HttpStatus>) => {
		expect(ApiControllerGetCustomErrorStatuses({ relations } as never)).toEqual(expected);
	});
});
