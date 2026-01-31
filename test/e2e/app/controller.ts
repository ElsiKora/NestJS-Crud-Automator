import { BadRequestException, Body, HttpStatus, Inject, Param, RequestMethod } from "@nestjs/common";

import { ApiMethod, EApiAction, EApiAuthenticationType, EApiControllerLoadRelationsStrategy, EApiControllerRequestTransformerType, EApiDtoType, EApiRouteType, EErrorStringAction, TRANSFORMER_VALUE_DTO_CONSTANT } from "../../../dist/esm/index";
import { ApiController, ApiControllerObservable, ApiControllerSecurable } from "../../../dist/esm/index";

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
	entity: E2eEntity,
	name: "E2eEntities",
	path: "items",
	routes: {
		[EApiRouteType.CREATE]: {
			authentication,
			request: {
				relations: {
					relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
					servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
					shouldLoadRelations: true,
				},
				transformers: {
					[EApiDtoType.BODY]: [
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
				},
				validators: [
					{
						errorType: EErrorStringAction.VALIDATION_ERROR,
						exception: BadRequestException,
						validationFunction: (payload) => typeof payload.count === "number" && payload.count > 0,
					},
				],
			},
			response: {
				transformers: {
					[EApiDtoType.RESPONSE]: [
						{
							key: "name",
							type: EApiControllerRequestTransformerType.STATIC,
							value: "response-static",
						},
					],
				},
			},
		},
		[EApiRouteType.DELETE]: { authentication },
		[EApiRouteType.GET]: {
			authentication,
			request: {
				transformers: {
					[EApiDtoType.REQUEST]: [
						{
							key: "id",
							type: EApiControllerRequestTransformerType.DYNAMIC,
							value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_SIGNATURE,
						},
					],
				},
			},
			response: {
				relations: { owner: true },
				transformers: {
					[EApiDtoType.RESPONSE]: [
						{
							key: "responseSignature",
							shouldSetValueEvenIfMissing: true,
							type: EApiControllerRequestTransformerType.DYNAMIC,
							value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_SIGNATURE,
						},
					],
				},
			},
		},
		[EApiRouteType.GET_LIST]: {
			authentication,
			request: {
				transformers: {
					[EApiDtoType.QUERY]: [
						{
							key: "page",
							type: EApiControllerRequestTransformerType.STATIC,
							value: "1",
						},
					],
				},
				validators: [
					{
						errorType: EErrorStringAction.VALIDATION_ERROR,
						exception: BadRequestException,
						validationFunction: (payload) => (payload as { forceError?: string } | undefined)?.forceError !== "true",
					},
				],
			},
			response: {
				relations: { owner: true },
				transformers: {
					[EApiDtoType.RESPONSE]: [
						{
							key: "count",
							type: EApiControllerRequestTransformerType.STATIC,
							value: "999",
						},
					],
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: { authentication },
		[EApiRouteType.UPDATE]: { authentication },
	},
})
export class E2eController {
	@Inject(E2eService)
	public readonly service!: E2eService;

	@Inject(E2eOwnerService)
	public readonly ownerService!: E2eOwnerService;

	@ApiMethod<E2eEntity>({
		action: EApiAction.UPDATE,
		authentication,
		entity: E2eEntity as unknown as E2eEntity,
		httpCode: HttpStatus.OK,
		method: RequestMethod.POST,
		path: "promote/:id",
		responseType: E2eEntity,
	})
	public async promote(@Param("id") id: string): Promise<E2eEntity> {
		return this.service.get({ relations: { owner: true }, where: { id } });
	}

	@ApiMethod<E2eEntity>({
		action: EApiAction.CREATE,
		authentication,
		entity: E2eEntity as unknown as E2eEntity,
		httpCode: HttpStatus.CREATED,
		method: RequestMethod.POST,
		path: "transaction",
		responseType: E2eEntity,
	})
	public async createTransaction(@Body() body: Partial<E2eEntity>): Promise<E2eEntity> {
		return this.service.createWithTransaction(body);
	}
}
