import { BadRequestException, Body, Controller, HttpStatus, Inject, Param, Query, RequestMethod } from "@nestjs/common";

import { ApiControllerObservable, ApiRouteCustom, EApiAuthenticationType, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiControllerResponseTarget, EErrorStringAction, TRANSFORMER_VALUE_DTO_CONSTANT } from "../../../../src/index";

import { TestAuthGuard } from "../auth-guard";
import { E2eEntity } from "../entity";
import { E2eOwnerService } from "../owner";
import { E2eService } from "../service";
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
					shouldLoad: true,
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
}
