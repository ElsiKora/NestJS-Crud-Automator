import { Body, Inject, Query, RequestMethod } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";

import { ApiController, ApiControllerObservable, ApiPropertyObject, ApiPropertyUUID, ApiRouteCustom, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType, EFilterOperation } from "../../../src/index";
import { E2eUuidCanonicalItemEntity } from "./entity";
import { E2eUuidCanonicalItemService } from "./service";

/**
 * One nested reference of the custom body.
 */
export class E2eUuidCanonicalReferenceDto {
	@ApiPropertyUUID({ description: "reference", entity: E2eUuidCanonicalItemEntity, isRequired: true })
	public id!: string;
}

/**
 * Body of the custom route: a UUID and a list of nested references.
 */
export class E2eUuidCanonicalBodyDto {
	@ApiPropertyObject({ description: "items", entity: E2eUuidCanonicalItemEntity, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 0, shouldValidateNested: true, type: E2eUuidCanonicalReferenceDto })
	public items?: Array<E2eUuidCanonicalReferenceDto>;

	@ApiPropertyUUID({ description: "parent", entity: E2eUuidCanonicalItemEntity, isRequired: true })
	public parentId!: string;
}

/**
 * Query of the custom route: one UUID.
 */
export class E2eUuidCanonicalQueryDto {
	@ApiPropertyUUID({ description: "owner", entity: E2eUuidCanonicalItemEntity, isRequired: true })
	public ownerId!: string;
}

/**
 * Response of the custom routes: what the handler received.
 */
export class E2eUuidCanonicalEchoDto {
	@ApiProperty({ type: String })
	public value!: string;
}

/**
 * Builds a custom route that echoes the request part it reads.
 * @param {RequestMethod} method - HTTP method.
 * @param {string} path - Route path.
 * @param {Partial<Record<EApiDtoType, new () => unknown>>} dto - Request DTOs.
 * @returns {MethodDecorator} The route decorator.
 */
const buildEchoRoute = (method: RequestMethod, path: string, dto: Partial<Record<EApiDtoType, new () => unknown>>): MethodDecorator =>
	ApiRouteCustom({
		documentation: { description: "Echoes the request", summary: "Echoes the request" },
		dto,
		resource: { action: "read", entity: E2eUuidCanonicalItemEntity },
		response: { errors: {}, serialization: { isEnabled: false }, status: 200, type: E2eUuidCanonicalEchoDto },
		route: { method, path },
	} as never);

@ApiControllerObservable()
@ApiController<E2eUuidCanonicalItemEntity>({
	entity: E2eUuidCanonicalItemEntity,
	name: "E2eUuidCanonicalItem",
	path: "uuid-canonical/items",
	routes: {
		[EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: { ownerId: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } } },
	} as never,
})
export class E2eUuidCanonicalItemController {
	public static readonly HANDLED: Array<unknown> = [];

	@Inject(E2eUuidCanonicalItemService)
	public readonly service!: E2eUuidCanonicalItemService;

	@buildEchoRoute(RequestMethod.POST, "custom/echo", { [EApiDtoType.BODY]: E2eUuidCanonicalBodyDto })
	public echoBody(@Body() body: E2eUuidCanonicalBodyDto): E2eUuidCanonicalEchoDto {
		E2eUuidCanonicalItemController.HANDLED.push(body);

		return { value: JSON.stringify(body) };
	}

	@buildEchoRoute(RequestMethod.GET, "custom/echo", { [EApiDtoType.QUERY]: E2eUuidCanonicalQueryDto })
	public echoQuery(@Query() query: E2eUuidCanonicalQueryDto): E2eUuidCanonicalEchoDto {
		E2eUuidCanonicalItemController.HANDLED.push(query);

		return { value: JSON.stringify(query) };
	}
}
