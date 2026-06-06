import { BadRequestException, Body, Controller, HttpStatus, Inject, Param, Query, RequestMethod } from "@nestjs/common";

import { ApiControllerObservable, ApiRouteCustom, EApiAuthenticationType, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiControllerResponseTarget, EApiDtoType, EErrorStringAction, TRANSFORMER_VALUE_DTO_CONSTANT } from "../../../../src/index";

import { TestAuthGuard } from "../auth-guard";
import { E2eEntity } from "../entity";
import { E2eOwnerService } from "../owner";
import { E2eService } from "../service";
import { E2eCustomRouteDiscriminatedEmailBodyDto, E2eCustomRouteDiscriminatedSessionResponseDto, E2eCustomRouteDiscriminatedStrippedBodyDto, E2eCustomRouteDiscriminatedUsernameBodyDto, E2eCustomRouteDiscriminatedVerificationResponseDto } from "./discriminated";
import { E2eCustomRouteResponseDto } from "./response.dto";

const authentication = {
	guard: TestAuthGuard,
	type: EApiAuthenticationType.USER,
};

@ApiControllerObservable()
@Controller("custom-route")
export class E2eCustomRouteController {
	@Inject(E2eService)
	public readonly service!: E2eService;

	@Inject(E2eOwnerService)
	public readonly ownerService!: E2eOwnerService;

	@ApiRouteCustom<E2eEntity>({
		resource: {
			action: "custom.echo",
			entity: E2eEntity,
		},
		response: {
			[EApiControllerResponseTarget.RESPONSE]: {
				transformers: [
					{
						key: "responseSignature",
						shouldSetValueEvenIfMissing: true,
						type: EApiControllerRequestTransformerType.DYNAMIC,
						value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_SIGNATURE,
					},
				],
			},
			serialization: {
				isEnabled: true,
			},
			status: HttpStatus.OK,
			type: E2eCustomRouteResponseDto,
		},
		route: {
			method: RequestMethod.POST,
			path: "echo/:id",
		},
		security: {
			authentication,
		},
		request: {
			[EApiControllerRequestTarget.BODY]: {
				transformers: [
					{
						key: "name",
						type: EApiControllerRequestTransformerType.STATIC,
						value: "body-transformed",
					},
				],
				validators: [
					{
						errorType: EErrorStringAction.VALIDATION_ERROR,
						exception: BadRequestException,
						validationFunction: (payload) => "count" in payload && typeof payload.count === "number" && payload.count > 0,
					},
				],
			},
			[EApiControllerRequestTarget.PARAMETERS]: {
				transformers: [
					{
						key: "id",
						type: EApiControllerRequestTransformerType.STATIC,
						value: "param-transformed",
					},
				],
			},
			[EApiControllerRequestTarget.QUERY]: {
				transformers: [
					{
						key: "code",
						type: EApiControllerRequestTransformerType.STATIC,
						value: "query-transformed",
					},
				],
			},
		},
	})
	public echo(@Param("id") id: string, @Body() body: Partial<E2eEntity>, @Query() query: Partial<E2eEntity>): Record<string, unknown> {
		if (body.id === "throw-custom") {
			throw new Error("Forced custom route error");
		}

		return {
			code: query.code,
			count: body.count,
			hidden: "should-not-serialize",
			id,
			name: body.name,
		};
	}

	@ApiRouteCustom<E2eEntity>({
		relations: {
			response: {
				load: {
					include: { owner: true },
				},
				reference: {
					key: "id",
					shape: EApiControllerRelationReferenceShape.SCALAR,
				},
			},
		},
		resource: {
			action: "custom.relation",
			entity: E2eEntity,
		},
		response: {
			status: HttpStatus.OK,
			type: undefined,
		},
		route: {
			method: RequestMethod.GET,
			path: "relation/:id",
		},
		security: {
			authentication,
		},
	})
	public async relation(@Param("id") id: string): Promise<E2eEntity> {
		return await this.service.get({ where: { id } });
	}

	@ApiRouteCustom<E2eEntity>({
		relations: {
			request: {
				load: {
					include: { owner: true },
				},
				reference: {
					key: "id",
					shape: EApiControllerRelationReferenceShape.SCALAR,
				},
			},
		},
		resource: {
			action: "custom.requestRelation",
			entity: E2eEntity,
		},
		response: {
			status: HttpStatus.OK,
			type: undefined,
		},
		route: {
			method: RequestMethod.POST,
			path: "request-relation",
		},
		security: {
			authentication,
		},
	})
	public requestRelation(@Body() body: Partial<E2eEntity>): Record<string, unknown> {
		return {
			owner: body.owner?.id,
		};
	}

	@ApiRouteCustom<E2eEntity>({
		relations: {
			response: {
				load: {
					include: { owner: true },
				},
				reference: {
					key: "id",
					shape: EApiControllerRelationReferenceShape.SCALAR,
				},
			},
		},
		resource: {
			action: "custom.relationList",
			entity: E2eEntity,
		},
		response: {
			status: HttpStatus.OK,
			type: undefined,
		},
		route: {
			method: RequestMethod.GET,
			path: "relations",
		},
		security: {
			authentication,
		},
	})
	public async relations(): Promise<Array<E2eEntity>> {
		return await this.service.repository.find();
	}

	@ApiRouteCustom<E2eEntity>({
		dto: {
			[EApiDtoType.BODY]: {
				discriminator: {
					mapping: {
						email: E2eCustomRouteDiscriminatedEmailBodyDto,
						username: E2eCustomRouteDiscriminatedUsernameBodyDto,
					},
					propertyName: "channel",
					shouldKeepDiscriminatorProperty: true,
				},
				type: [E2eCustomRouteDiscriminatedEmailBodyDto, E2eCustomRouteDiscriminatedUsernameBodyDto],
			},
		},
		resource: {
			action: "custom.discriminatedRegistration",
			entity: E2eEntity,
		},
		response: {
			discriminator: {
				mapping: {
					session: E2eCustomRouteDiscriminatedSessionResponseDto,
					verification: E2eCustomRouteDiscriminatedVerificationResponseDto,
				},
				propertyName: "mode",
				shouldKeepDiscriminatorProperty: true,
			},
			serialization: {
				isEnabled: true,
			},
			status: HttpStatus.CREATED,
			type: [E2eCustomRouteDiscriminatedVerificationResponseDto, E2eCustomRouteDiscriminatedSessionResponseDto],
		},
		route: {
			method: RequestMethod.POST,
			path: "discriminated-registration",
		},
		security: {
			authentication,
		},
	})
	public discriminatedRegistration(@Body() body: E2eCustomRouteDiscriminatedEmailBodyDto | E2eCustomRouteDiscriminatedUsernameBodyDto): Record<string, unknown> {
		if (body instanceof E2eCustomRouteDiscriminatedEmailBodyDto) {
			return {
				bodyClass: body.constructor.name,
				hidden: "should-not-serialize",
				mode: "verification",
				verificationToken: body.email,
			};
		}

		return {
			bodyClass: body.constructor.name,
			hidden: "should-not-serialize",
			mode: "session",
			sessionToken: body.username,
		};
	}

	@ApiRouteCustom<E2eEntity>({
		dto: {
			[EApiDtoType.BODY]: {
				discriminator: {
					mapping: {
						token: E2eCustomRouteDiscriminatedStrippedBodyDto,
					},
					propertyName: "channel",
					shouldKeepDiscriminatorProperty: false,
				},
				type: [E2eCustomRouteDiscriminatedStrippedBodyDto],
			},
		},
		resource: {
			action: "custom.discriminatedStripped",
			entity: E2eEntity,
		},
		response: {
			status: HttpStatus.OK,
			type: undefined,
		},
		route: {
			method: RequestMethod.POST,
			path: "discriminated-strip",
		},
		security: {
			authentication,
		},
	})
	public discriminatedStrip(@Body() body: E2eCustomRouteDiscriminatedStrippedBodyDto & { channel?: string }): Record<string, unknown> {
		return {
			bodyClass: body.constructor.name,
			channel: body.channel,
			token: body.token,
		};
	}
}
