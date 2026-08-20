import { BadRequestException, Body, HttpStatus, Inject, Param, RequestMethod } from "@nestjs/common";

import { ApiMethod, EApiAuthenticationType, EApiAuthorizationMode, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiControllerResponseTarget, EApiRouteType, EErrorStringAction, TRANSFORMER_VALUE_DTO_CONSTANT } from "../../../src/index";
import { ApiController, ApiControllerObservable, ApiControllerSecurable } from "../../../src/index";

import { TestAuthGuard } from "./auth-guard";
import { E2E_OWNER_ID } from "./constants";
import { E2eEntity } from "./entity";
import { E2eOwnerService } from "./owner";
import { E2eService } from "./service";

const authentication = {
	guard: TestAuthGuard,
	type: EApiAuthenticationType.USER,
};

@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<E2eEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.HOOKS,
	},
	entity: E2eEntity,
	name: "E2eEntities",
	path: "items",
	routes: {
		[EApiRouteType.CREATE]: {
			security: { authentication },
			relations: {
				request: {
					load: {
						include: { owner: true },
					},
					reference: {
						shape: EApiControllerRelationReferenceShape.SCALAR,
					},
				},
			},
			request: {
				[EApiControllerRequestTarget.BODY]: {
					transformers: [
						{
							key: "ownerId",
							shouldSetValueEvenIfMissing: true,
							type: EApiControllerRequestTransformerType.STATIC,
							value: E2E_OWNER_ID,
						},
						{
							key: "signature",
							shouldSetValueEvenIfMissing: true,
							type: EApiControllerRequestTransformerType.DYNAMIC,
							value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_SIGNATURE,
						},
						{
							key: "timestamp",
							shouldSetValueEvenIfMissing: true,
							type: EApiControllerRequestTransformerType.DYNAMIC,
							value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_TIMESTAMP,
						},
						{
							key: "userAgent",
							shouldSetValueEvenIfMissing: true,
							type: EApiControllerRequestTransformerType.DYNAMIC,
							value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_USER_AGENT,
						},
						{
							key: "requestIp",
							shouldSetValueEvenIfMissing: true,
							type: EApiControllerRequestTransformerType.DYNAMIC,
							value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_IP,
						},
						{
							key: "authorizedEntity",
							shouldSetValueEvenIfMissing: true,
							type: EApiControllerRequestTransformerType.DYNAMIC,
							value: TRANSFORMER_VALUE_DTO_CONSTANT.AUTHORIZED_ENTITY,
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
			},
			response: {
				[EApiControllerResponseTarget.RESPONSE]: {
					transformers: [
						{
							key: "name",
							type: EApiControllerRequestTransformerType.STATIC,
							value: "response-static",
						},
					],
				},
			},
		},
		[EApiRouteType.DELETE]: { security: { authentication } },
		[EApiRouteType.GET]: {
			security: { authentication },
			relations: {
				response: {
					load: {
						include: { owner: true },
					},
					reference: {
						key: "id",
						shape: EApiControllerRelationReferenceShape.OBJECT,
					},
				},
			},
			request: {
				[EApiControllerRequestTarget.PARAMETERS]: {
					transformers: [
						{
							key: "id",
							type: EApiControllerRequestTransformerType.DYNAMIC,
							value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_SIGNATURE,
						},
					],
				},
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
			},
		},
		[EApiRouteType.GET_LIST]: {
			security: { authentication },
			relations: {
				response: {
					load: {
						include: { owner: true },
					},
					reference: {
						key: "id",
						shape: EApiControllerRelationReferenceShape.OBJECT,
					},
				},
			},
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					transformers: [
						{
							key: "page",
							type: EApiControllerRequestTransformerType.STATIC,
							value: "1",
						},
					],
					validators: [
						{
							errorType: EErrorStringAction.VALIDATION_ERROR,
							exception: BadRequestException,
							validationFunction: (payload: unknown) => (payload as { forceError?: string }).forceError !== "true",
						},
					],
				},
			},
			response: {
				[EApiControllerResponseTarget.RESPONSE]: {
					transformers: [
						{
							key: "count",
							type: EApiControllerRequestTransformerType.STATIC,
							value: "999",
						},
					],
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: { security: { authentication } },
		[EApiRouteType.UPDATE]: {
			security: { authentication },
			relations: {
				request: {
					load: {
						include: { owner: true },
					},
					reference: {
						key: "id",
						shape: EApiControllerRelationReferenceShape.OBJECT,
					},
				},
				response: {
					load: {
						include: { owner: true },
					},
					reference: {
						key: "id",
						shape: EApiControllerRelationReferenceShape.OBJECT,
					},
				},
			},
		},
	},
})
export class E2eController {
	@Inject(E2eService)
	public readonly service!: E2eService;

	@Inject(E2eOwnerService)
	public readonly ownerService!: E2eOwnerService;

	@ApiMethod<E2eEntity>({
		metadata: {
			resource: {
				action: "update.promote",
				entity: E2eEntity,
			},
			response: {
				serialization: {
					isEnabled: true,
				},
				status: HttpStatus.OK,
				type: E2eEntity,
			},
			route: {
				method: RequestMethod.POST,
				path: "promote/:id",
			},
			security: {
				authentication,
				authorization: {
					mode: EApiAuthorizationMode.HOOKS,
				},
			},
		},
	})
	public async promote(@Param("id") id: string): Promise<E2eEntity> {
		return this.service.get({ relations: { owner: true }, where: { id } });
	}

	@ApiMethod<E2eEntity>({
		metadata: {
			resource: {
				action: "create.transaction",
				entity: E2eEntity,
			},
			response: {
				serialization: {
					isEnabled: true,
				},
				status: HttpStatus.CREATED,
				type: E2eEntity,
			},
			route: {
				method: RequestMethod.POST,
				path: "transaction",
			},
			security: {
				authentication,
				authorization: {
					mode: EApiAuthorizationMode.HOOKS,
				},
			},
		},
	})
	public async createTransaction(@Body() body: Partial<E2eEntity>): Promise<E2eEntity> {
		return this.service.createWithTransaction(body);
	}
}
