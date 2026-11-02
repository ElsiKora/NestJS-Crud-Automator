import type { CanActivate } from "@nestjs/common";

import { Body, Controller, HttpCode, HttpStatus, Inject, Injectable, Post, RequestMethod } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiRouteCustom, EApiAuthenticationType, EApiDtoType, EApiRouteType } from "../../../src/index";

import { E2eKeepFalseResponseDto, E2eKeepOmittedBodyDto, E2eKeepOmittedResponseDto, E2eKeepRootOptionalBodyDto, E2eKeepRootRawRequiredBodyDto, E2eKeepRootRequiredBodyDto, E2eKeepTrueBodyDto, E2eKeepTrueResponseDto } from "./dto";
import { E2eKeepRecordEntity, E2eKeepResponseRecordEntity } from "./entity";
import { E2eKeepRecordService, E2eKeepResponseRecordService } from "./service";

export const E2E_KEEP_RESPONSE_SOURCE: () => { pet: Record<string, unknown>; pets: Array<Record<string, unknown>> } = () => ({
	pet: { kind: "cat", lives: 9 },
	pets: [
		{ kind: "cat", lives: 9 },
		{ kind: "dog", name: "Rex" },
	],
});

@Injectable()
export class E2eKeepAllowGuard implements CanActivate {
	public canActivate(): boolean {
		return true;
	}
}

const authentication = { guard: E2eKeepAllowGuard, type: EApiAuthenticationType.USER };

@Controller("discriminator-keep/echo")
export class E2eKeepEchoController {
	@HttpCode(HttpStatus.OK)
	@Post("omitted")
	public omitted(@Body() body: E2eKeepOmittedBodyDto): unknown {
		return body;
	}

	@HttpCode(HttpStatus.OK)
	@Post("true")
	public kept(@Body() body: E2eKeepTrueBodyDto): unknown {
		return body;
	}
}

@ApiControllerObservable()
@Controller("discriminator-keep/custom")
export class E2eKeepCustomController {
	@Inject(E2eKeepRecordService)
	public readonly service!: E2eKeepRecordService;

	@ApiRouteCustom<E2eKeepRecordEntity>({
		resource: { action: "custom.responseOmitted", entity: E2eKeepRecordEntity },
		response: { serialization: { isEnabled: true }, status: HttpStatus.OK, type: E2eKeepOmittedResponseDto },
		route: { method: RequestMethod.POST, path: "response-omitted" },
		security: { authentication },
	})
	public responseOmitted(): unknown {
		return E2E_KEEP_RESPONSE_SOURCE();
	}

	@ApiRouteCustom<E2eKeepRecordEntity>({
		resource: { action: "custom.responseTrue", entity: E2eKeepRecordEntity },
		response: { serialization: { isEnabled: true }, status: HttpStatus.OK, type: E2eKeepTrueResponseDto },
		route: { method: RequestMethod.POST, path: "response-true" },
		security: { authentication },
	})
	public responseTrue(): unknown {
		return E2E_KEEP_RESPONSE_SOURCE();
	}

	@ApiRouteCustom<E2eKeepRecordEntity>({
		resource: { action: "custom.responseFalse", entity: E2eKeepRecordEntity },
		response: { serialization: { isEnabled: true }, status: HttpStatus.OK, type: E2eKeepFalseResponseDto },
		route: { method: RequestMethod.POST, path: "response-false" },
		security: { authentication },
	})
	public responseFalse(): unknown {
		return E2E_KEEP_RESPONSE_SOURCE();
	}

	@ApiRouteCustom<E2eKeepRecordEntity>({
		dto: { [EApiDtoType.BODY]: { discriminator: { mapping: { token: E2eKeepRootRequiredBodyDto }, propertyName: "channel" }, type: [E2eKeepRootRequiredBodyDto] } },
		resource: { action: "custom.rootOmitted", entity: E2eKeepRecordEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.POST, path: "root-omitted" },
		security: { authentication },
	})
	public rootOmitted(@Body() body: E2eKeepRootRequiredBodyDto): unknown {
		return { ...body };
	}

	@ApiRouteCustom<E2eKeepRecordEntity>({
		dto: { [EApiDtoType.BODY]: { discriminator: { mapping: { token: E2eKeepRootRequiredBodyDto }, propertyName: "channel", shouldKeepDiscriminatorProperty: true }, type: [E2eKeepRootRequiredBodyDto] } },
		resource: { action: "custom.rootTrue", entity: E2eKeepRecordEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.POST, path: "root-true" },
		security: { authentication },
	})
	public rootTrue(@Body() body: E2eKeepRootRequiredBodyDto): unknown {
		return { ...body };
	}

	@ApiRouteCustom<E2eKeepRecordEntity>({
		dto: { [EApiDtoType.BODY]: { discriminator: { mapping: { token: E2eKeepRootRequiredBodyDto }, propertyName: "channel", shouldKeepDiscriminatorProperty: false }, type: [E2eKeepRootRequiredBodyDto], validatorOptions: { skipMissingProperties: true } } },
		resource: { action: "custom.rootFalseSkipMissing", entity: E2eKeepRecordEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.POST, path: "root-false-skip-missing" },
		security: { authentication },
	})
	public rootFalseSkipMissing(@Body() body: E2eKeepRootRequiredBodyDto): unknown {
		return { ...body };
	}

	@ApiRouteCustom<E2eKeepRecordEntity>({
		dto: { [EApiDtoType.BODY]: { discriminator: { mapping: { token: E2eKeepRootRawRequiredBodyDto }, propertyName: "channel", shouldKeepDiscriminatorProperty: false }, type: [E2eKeepRootRawRequiredBodyDto] } },
		resource: { action: "custom.rootFalseRaw", entity: E2eKeepRecordEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.POST, path: "root-false-raw" },
		security: { authentication },
	})
	public rootFalseRaw(@Body() body: E2eKeepRootRawRequiredBodyDto): unknown {
		return { ...body };
	}

	@ApiRouteCustom<E2eKeepRecordEntity>({
		dto: { [EApiDtoType.BODY]: { discriminator: { mapping: { token: E2eKeepRootOptionalBodyDto }, propertyName: "channel", shouldKeepDiscriminatorProperty: false }, type: [E2eKeepRootOptionalBodyDto] } },
		resource: { action: "custom.rootFalseOptional", entity: E2eKeepRecordEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.POST, path: "root-false-optional" },
		security: { authentication },
	})
	public rootFalseOptional(@Body() body: E2eKeepRootOptionalBodyDto): unknown {
		return { ...body };
	}
}

@ApiController<E2eKeepRecordEntity>({
	entity: E2eKeepRecordEntity,
	name: "E2eKeepRecords",
	path: "discriminator-keep/records",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class E2eKeepRecordController {
	@Inject(E2eKeepRecordService)
	public readonly service!: E2eKeepRecordService;
}

@ApiController<E2eKeepResponseRecordEntity>({
	entity: E2eKeepResponseRecordEntity,
	name: "E2eKeepResponseRecords",
	path: "discriminator-keep/response-records",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class E2eKeepResponseRecordController {
	@Inject(E2eKeepResponseRecordService)
	public readonly service!: E2eKeepResponseRecordService;
}
