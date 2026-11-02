import type { ExecutionContext } from "@nestjs/common";

import { Body, Inject, Injectable, Param, Query, RequestMethod } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Expose, Type } from "class-transformer";
import { IsInt, Max } from "class-validator";
import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn, Repository } from "typeorm";

import {
	ApiController,
	ApiControllerObservable,
	ApiControllerSecurable,
	ApiPropertyBoolean,
	ApiPropertyCopy,
	ApiPropertyDate,
	ApiPropertyDescribe,
	ApiPropertyEnum,
	ApiPropertyNumber,
	ApiPropertyString,
	ApiPropertyUUID,
	ApiRouteCustom,
	ApiService,
	ApiServiceBase,
	EApiAuthenticationType,
	EApiAuthorizationMode,
	EApiControllerGetListQueryUnlistedFields,
	EApiControllerRequestTarget,
	EApiDtoType,
	EApiPolicyEffect,
	EApiPolicySourceType,
	EApiPropertyDateIdentifier,
	EApiPropertyDateType,
	EApiPropertyDescribeType,
	EApiPropertyNumberType,
	EApiPropertyStringType,
	EApiRouteType,
	EFilterOperation,
} from "../../../src/index";

export const E2E_PATH_PARAMETER_CANONICAL_AT: string = "2024-03-10T12:00:00.000Z";
export const E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const E2E_PATH_PARAMETER_CANONICAL_ALLOWED_UUID: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const E2E_PATH_PARAMETER_CANONICAL_NARROW_MAXIMUM: number = 10;

const LABEL_DESCRIBE = { description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as const;
const INTEGER_DESCRIBE = { description: "id", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 2_147_483_647, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER } as const;
const disabledRoute = { generation: { isEnabled: false } } as const;
const readOnlyRoutes = { [EApiRouteType.CREATE]: disabledRoute, [EApiRouteType.DELETE]: disabledRoute, [EApiRouteType.GET_LIST]: disabledRoute, [EApiRouteType.PARTIAL_UPDATE]: disabledRoute, [EApiRouteType.UPDATE]: disabledRoute } as const;
const noRoutes = { ...readOnlyRoutes, [EApiRouteType.GET]: disabledRoute } as const;

@Entity("e2e_path_parameter_canonical_int_items")
export class E2ePathParameterCanonicalIntItemEntity {
	@Column({ default: true, type: "boolean" })
	@ApiPropertyDescribe({ description: "active", type: EApiPropertyDescribeType.BOOLEAN })
	public active!: boolean;

	@PrimaryColumn({ type: "int" })
	@ApiPropertyDescribe(INTEGER_DESCRIBE)
	public id!: number;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(LABEL_DESCRIBE)
	public label!: string;
}

@Entity("e2e_path_parameter_canonical_moment_items")
export class E2ePathParameterCanonicalMomentItemEntity {
	@Column({ type: Date })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, type: EApiPropertyDescribeType.DATE })
	public at!: Date;

	@PrimaryColumn({ type: "int" })
	@ApiPropertyDescribe(INTEGER_DESCRIBE)
	public id!: number;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(LABEL_DESCRIBE)
	public label!: string;
}

@Entity("e2e_path_parameter_canonical_uuid_items")
export class E2ePathParameterCanonicalUuidItemEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(LABEL_DESCRIBE)
	public label!: string;
}

@Entity("e2e_path_parameter_canonical_text_uuid_items")
export class E2ePathParameterCanonicalTextUuidItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "ownerId", type: EApiPropertyDescribeType.UUID })
	public ownerId!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(LABEL_DESCRIBE)
	public label!: string;
}

@Injectable()
@ApiService({ entity: E2ePathParameterCanonicalIntItemEntity })
export class E2ePathParameterCanonicalIntItemService extends ApiServiceBase<E2ePathParameterCanonicalIntItemEntity> {
	@InjectRepository(E2ePathParameterCanonicalIntItemEntity)
	public readonly repository!: Repository<E2ePathParameterCanonicalIntItemEntity>;
}

@Injectable()
@ApiService({ entity: E2ePathParameterCanonicalMomentItemEntity })
export class E2ePathParameterCanonicalMomentItemService extends ApiServiceBase<E2ePathParameterCanonicalMomentItemEntity> {
	@InjectRepository(E2ePathParameterCanonicalMomentItemEntity)
	public readonly repository!: Repository<E2ePathParameterCanonicalMomentItemEntity>;
}

@Injectable()
@ApiService({ entity: E2ePathParameterCanonicalUuidItemEntity })
export class E2ePathParameterCanonicalUuidItemService extends ApiServiceBase<E2ePathParameterCanonicalUuidItemEntity> {
	@InjectRepository(E2ePathParameterCanonicalUuidItemEntity)
	public readonly repository!: Repository<E2ePathParameterCanonicalUuidItemEntity>;
}

@Injectable()
@ApiService({ entity: E2ePathParameterCanonicalTextUuidItemEntity })
export class E2ePathParameterCanonicalTextUuidItemService extends ApiServiceBase<E2ePathParameterCanonicalTextUuidItemEntity> {
	@InjectRepository(E2ePathParameterCanonicalTextUuidItemEntity)
	public readonly repository!: Repository<E2ePathParameterCanonicalTextUuidItemEntity>;
}

/**
 * Authenticates every request as the principal named after the controller path segment, and records the raw path values a guard ahead of authorization sees.
 */
@Injectable()
export class E2ePathParameterCanonicalGuard {
	public static readonly RAW_PARAMETERS: Array<Record<string, unknown>> = [];

	public canActivate(context: ExecutionContext): boolean {
		const request: { params?: Record<string, unknown>; url: string; user?: unknown } = context.switchToHttp().getRequest<{ params?: Record<string, unknown>; url: string; user?: unknown }>();
		E2ePathParameterCanonicalGuard.RAW_PARAMETERS.push({ ...request.params });
		const segment: string = /\/path-parameter\/canonical\/([\w-]+)/.exec(request.url)?.[1] ?? "anonymous";
		request.user = { id: segment.startsWith("ppc-") ? segment : `ppc-${segment}` };

		return true;
	}
}

const authentication = { guard: E2ePathParameterCanonicalGuard, type: EApiAuthenticationType.USER } as never;
const security = { authentication } as never;

const buildAuthorization = (namespace: string, entity: new () => unknown, resourcePath: string, fields: Array<string>): never =>
	({
		defaultMode: EApiAuthorizationMode.IAM,
		policyNamespace: namespace,
		resourceDefinition: { entity, fields: fields.map((field: string) => ({ isFilterable: true, path: `resource.${field}`, queryPath: field })), namespace, resourcePath, resourceType: namespace },
	}) as never;

const scopedRead = (field: string): Record<string, unknown> => ({ [EApiRouteType.GET]: { read: { scope: { parameters: [{ field, parameter: field }] } }, security } });

@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalMomentItemEntity>({ authorization: buildAuthorization("ppc-dt-deny", E2ePathParameterCanonicalMomentItemEntity, "ppc-dt-deny/{at}/{id}", ["id", "at"]), entity: E2ePathParameterCanonicalMomentItemEntity, name: "E2ePathParameterCanonicalDtDeny", path: "path-parameter/canonical/dt-deny/:at/items", routes: { ...readOnlyRoutes, ...scopedRead("at") } as never })
export class E2ePathParameterCanonicalDtDenyController {
	@Inject(E2ePathParameterCanonicalMomentItemService)
	public readonly service!: E2ePathParameterCanonicalMomentItemService;
}

@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalMomentItemEntity>({ authorization: buildAuthorization("ppc-dt-recipe", E2ePathParameterCanonicalMomentItemEntity, "ppc-dt-recipe/{at}/{id}", ["id", "at"]), entity: E2ePathParameterCanonicalMomentItemEntity, name: "E2ePathParameterCanonicalDtRecipe", path: "path-parameter/canonical/dt-recipe/:at/items", routes: { ...readOnlyRoutes, ...scopedRead("at") } as never })
export class E2ePathParameterCanonicalDtRecipeController {
	@Inject(E2ePathParameterCanonicalMomentItemService)
	public readonly service!: E2ePathParameterCanonicalMomentItemService;
}

@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalMomentItemEntity>({ authorization: buildAuthorization("ppc-dt-res", E2ePathParameterCanonicalMomentItemEntity, "ppc-dt-res/{at}/{id}", ["id", "at"]), entity: E2ePathParameterCanonicalMomentItemEntity, name: "E2ePathParameterCanonicalDtRes", path: "path-parameter/canonical/dt-res/:at/items", routes: { ...readOnlyRoutes, ...scopedRead("at") } as never })
export class E2ePathParameterCanonicalDtResourceController {
	@Inject(E2ePathParameterCanonicalMomentItemService)
	public readonly service!: E2ePathParameterCanonicalMomentItemService;
}

@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalIntItemEntity>({ authorization: buildAuthorization("ppc-bool-deny", E2ePathParameterCanonicalIntItemEntity, "ppc-bool-deny/{active}/{id}", ["id", "active"]), entity: E2ePathParameterCanonicalIntItemEntity, name: "E2ePathParameterCanonicalBoolDeny", path: "path-parameter/canonical/bool-deny/:active/items", routes: { ...readOnlyRoutes, ...scopedRead("active") } as never })
export class E2ePathParameterCanonicalBoolDenyController {
	@Inject(E2ePathParameterCanonicalIntItemService)
	public readonly service!: E2ePathParameterCanonicalIntItemService;
}

@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalIntItemEntity>({ authorization: buildAuthorization("ppc-bool-cond", E2ePathParameterCanonicalIntItemEntity, "ppc-bool-cond/{active}/{id}", ["id", "active"]), entity: E2ePathParameterCanonicalIntItemEntity, name: "E2ePathParameterCanonicalBoolCond", path: "path-parameter/canonical/bool-cond/:active/items", routes: { ...readOnlyRoutes, ...scopedRead("active") } as never })
export class E2ePathParameterCanonicalBoolConditionController {
	@Inject(E2ePathParameterCanonicalIntItemService)
	public readonly service!: E2ePathParameterCanonicalIntItemService;
}

/**
 * Documents the path value for OpenAPI only, with no validator.
 */
export class E2ePathParameterCanonicalSwaggerOnlyParametersDto {
	@ApiProperty({ type: Number })
	public id!: number;
}

/**
 * Checks an integer without converting the text first.
 */
export class E2ePathParameterCanonicalImplicitIntParametersDto {
	@IsInt()
	public id!: number;
}

/**
 * Checks an integer after its own number conversion.
 */
export class E2ePathParameterCanonicalTypedIntParametersDto {
	@IsInt()
	@Type(() => Number)
	public id!: number;
}

/**
 * Copies the generated PARAMETERS decorators of the entity key, like a hand-written DTO in a consumer service.
 */
export class E2ePathParameterCanonicalCopyIntParametersDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: () => E2ePathParameterCanonicalIntItemEntity, method: EApiRouteType.GET, propertyName: "id" })
	public id!: number;
}

/**
 * Copies the generated PARAMETERS decorators of the UUID key.
 */
export class E2ePathParameterCanonicalCopyUuidParametersDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: () => E2ePathParameterCanonicalUuidItemEntity, method: EApiRouteType.GET, propertyName: "id" })
	public id!: string;
}

/**
 * Narrows the path value below the column range: a configured DTO may reject what the column accepts.
 */
export class E2ePathParameterCanonicalNarrowParametersDto {
	@IsInt()
	@Max(E2E_PATH_PARAMETER_CANONICAL_NARROW_MAXIMUM)
	public id!: number;
}

const configuredRoutes = (dto: new () => unknown, isGuarded: boolean): never => ({ ...readOnlyRoutes, [EApiRouteType.GET]: { dto: { [EApiDtoType.PARAMETERS]: dto }, ...(isGuarded ? { security } : {}) } }) as never;
const allowAllAuthorization = (namespace: string): never => buildAuthorization(namespace, E2ePathParameterCanonicalIntItemEntity, `${namespace}/{id}`, ["id"]);

export const E2E_PATH_PARAMETER_CANONICAL_DTO_KINDS: Array<{ dto: new () => unknown; kind: string }> = [
	{ dto: E2ePathParameterCanonicalSwaggerOnlyParametersDto, kind: "swagger" },
	{ dto: E2ePathParameterCanonicalImplicitIntParametersDto, kind: "implicit" },
	{ dto: E2ePathParameterCanonicalTypedIntParametersDto, kind: "typed" },
	{ dto: E2ePathParameterCanonicalCopyIntParametersDto, kind: "copy" },
];

/**
 * Builds one generated GET controller with a configured PARAMETERS DTO.
 * @param {new () => unknown} dto - Configured PARAMETERS DTO.
 * @param {string} kind - DTO kind, used in the path and the policy namespace.
 * @param {boolean} isGuarded - Whether the route runs `ApiAuthorizationGuard`.
 * @returns {new () => unknown} Controller class.
 */
const buildConfiguredDtoController = (dto: new () => unknown, kind: string, isGuarded: boolean): new () => unknown => {
	const namespace: string = `ppc-dto-${kind}-${isGuarded ? "guard" : "open"}`;

	class ConfiguredDtoController {
		@Inject(E2ePathParameterCanonicalIntItemService)
		public readonly service!: E2ePathParameterCanonicalIntItemService;
	}

	Object.defineProperty(ConfiguredDtoController, "name", { value: `E2ePathParameterCanonical${kind}${isGuarded ? "Guard" : "Open"}Controller` });
	ApiController<E2ePathParameterCanonicalIntItemEntity>({ authorization: isGuarded ? allowAllAuthorization(namespace) : undefined, entity: E2ePathParameterCanonicalIntItemEntity, name: `E2ePathParameterCanonical${kind}${isGuarded ? "Guard" : "Open"}`, path: `path-parameter/canonical/${namespace}`, routes: configuredRoutes(dto, isGuarded) } as never)(ConfiguredDtoController);

	if (isGuarded) {
		ApiControllerSecurable()(ConfiguredDtoController);
	} else {
		ApiControllerObservable()(ConfiguredDtoController);
	}

	return ConfiguredDtoController;
};

export const E2E_PATH_PARAMETER_CANONICAL_DTO_CONTROLLERS: Array<new () => unknown> = E2E_PATH_PARAMETER_CANONICAL_DTO_KINDS.flatMap(({ dto, kind }: { dto: new () => unknown; kind: string }) => [buildConfiguredDtoController(dto, kind, false), buildConfiguredDtoController(dto, kind, true)]);

@ApiControllerObservable()
@ApiController<E2ePathParameterCanonicalIntItemEntity>({ entity: E2ePathParameterCanonicalIntItemEntity, name: "E2ePathParameterCanonicalNarrow", path: "path-parameter/canonical/narrow", routes: configuredRoutes(E2ePathParameterCanonicalNarrowParametersDto, false) })
export class E2ePathParameterCanonicalNarrowController {
	@Inject(E2ePathParameterCanonicalIntItemService)
	public readonly service!: E2ePathParameterCanonicalIntItemService;
}

@ApiController<E2ePathParameterCanonicalTextUuidItemEntity>({
	entity: E2ePathParameterCanonicalTextUuidItemEntity,
	name: "E2ePathParameterCanonicalTextUuid",
	path: "path-parameter/canonical/text-uuid",
	routes: { [EApiRouteType.DELETE]: disabledRoute, [EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: { ownerId: { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } } }, [EApiRouteType.UPDATE]: disabledRoute } as never,
})
export class E2ePathParameterCanonicalTextUuidController {
	@Inject(E2ePathParameterCanonicalTextUuidItemService)
	public readonly service!: E2ePathParameterCanonicalTextUuidItemService;
}

/**
 * Response of the custom routes: the type and text of the path value the handler received.
 */
export class E2ePathParameterCanonicalCustomResponseDto {
	@ApiProperty({ type: String })
	public value!: string;
}

const buildCustomRoute = (entity: new () => unknown, dto: new () => unknown): MethodDecorator =>
	ApiRouteCustom({
		documentation: { description: "Reads one path value", summary: "Reads one path value" },
		dto: { [EApiDtoType.PARAMETERS]: dto },
		resource: { action: "read", entity },
		response: { errors: {}, serialization: { isEnabled: false }, status: 200, type: E2ePathParameterCanonicalCustomResponseDto },
		route: { method: RequestMethod.GET, path: ":id" },
		security: { authentication, authorization: { mode: EApiAuthorizationMode.IAM } },
	} as never);

@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalIntItemEntity>({ authorization: buildAuthorization("ppc-custom-int", E2ePathParameterCanonicalIntItemEntity, "ppc-custom-int/{id}", ["id"]), entity: E2ePathParameterCanonicalIntItemEntity, name: "E2ePathParameterCanonicalCustomInt", path: "path-parameter/canonical/ppc-custom-int", routes: noRoutes })
export class E2ePathParameterCanonicalCustomIntController {
	@Inject(E2ePathParameterCanonicalIntItemService)
	public readonly service!: E2ePathParameterCanonicalIntItemService;

	@buildCustomRoute(E2ePathParameterCanonicalIntItemEntity, E2ePathParameterCanonicalCopyIntParametersDto)
	public read(@Param("id") id: unknown): E2ePathParameterCanonicalCustomResponseDto {
		return { value: `${typeof id}:${String(id)}` };
	}
}

@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalUuidItemEntity>({ authorization: buildAuthorization("ppc-custom-uuid", E2ePathParameterCanonicalUuidItemEntity, "ppc-custom-uuid/{id}", ["id"]), entity: E2ePathParameterCanonicalUuidItemEntity, name: "E2ePathParameterCanonicalCustomUuid", path: "path-parameter/canonical/ppc-custom-uuid", routes: noRoutes })
export class E2ePathParameterCanonicalCustomUuidController {
	@Inject(E2ePathParameterCanonicalUuidItemService)
	public readonly service!: E2ePathParameterCanonicalUuidItemService;

	@buildCustomRoute(E2ePathParameterCanonicalUuidItemEntity, E2ePathParameterCanonicalCopyUuidParametersDto)
	public read(@Param("id") id: unknown): E2ePathParameterCanonicalCustomResponseDto {
		return { value: `${typeof id}:${String(id)}` };
	}
}

/**
 * Builds a securable controller whose custom route names `{id}` in its resource path with a PARAMETERS DTO that does not describe `id`.
 * @returns {new () => unknown} Controller class that must fail at startup.
 */
export const buildE2ePathParameterCanonicalUndescribedCustomController = (): new () => unknown => {
	@ApiControllerSecurable()
	@ApiController<E2ePathParameterCanonicalIntItemEntity>({ authorization: buildAuthorization("ppc-custom-bad", E2ePathParameterCanonicalIntItemEntity, "ppc-custom-bad/{id}", ["id"]), entity: E2ePathParameterCanonicalIntItemEntity, name: "E2ePathParameterCanonicalCustomBad", path: "path-parameter/canonical/ppc-custom-bad", routes: noRoutes })
	class E2ePathParameterCanonicalCustomBadController {
		@Inject(E2ePathParameterCanonicalIntItemService)
		public readonly service!: E2ePathParameterCanonicalIntItemService;

		@buildCustomRoute(E2ePathParameterCanonicalIntItemEntity, E2ePathParameterCanonicalTypedIntParametersDto)
		public read(@Param("id") id: unknown): E2ePathParameterCanonicalCustomResponseDto {
			return { value: `${typeof id}:${String(id)}` };
		}
	}

	return E2ePathParameterCanonicalCustomBadController;
};

/**
 * Copies the generated PARAMETERS decorators of the key and the boolean column, for a custom route shared through inheritance.
 */
export class E2ePathParameterCanonicalCopyActiveIdParametersDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: () => E2ePathParameterCanonicalIntItemEntity, method: EApiRouteType.GET, propertyName: "active" })
	public active!: boolean;

	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: () => E2ePathParameterCanonicalIntItemEntity, method: EApiRouteType.GET, propertyName: "id" })
	public id!: number;
}

/**
 * Base controller whose custom route `:active/:id` two securable subclasses share, each with its own resource path.
 */
export class E2ePathParameterCanonicalInheritedActiveBaseController {
	@Inject(E2ePathParameterCanonicalIntItemService)
	public readonly service!: E2ePathParameterCanonicalIntItemService;

	@ApiRouteCustom({
		documentation: { description: "Reads two path values", summary: "Reads two path values" },
		dto: { [EApiDtoType.PARAMETERS]: E2ePathParameterCanonicalCopyActiveIdParametersDto },
		resource: { action: "read", entity: E2ePathParameterCanonicalIntItemEntity },
		response: { errors: {}, serialization: { isEnabled: false }, status: 200, type: E2ePathParameterCanonicalCustomResponseDto },
		route: { method: RequestMethod.GET, path: ":active/:id" },
		security: { authentication, authorization: { mode: EApiAuthorizationMode.IAM } },
	} as never)
	public read(@Param() parameters: E2ePathParameterCanonicalCopyActiveIdParametersDto): E2ePathParameterCanonicalCustomResponseDto {
		return { value: `${typeof parameters.active}:${String(parameters.active)}` };
	}
}

@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalIntItemEntity>({ authorization: buildAuthorization("ppc-inh-va", E2ePathParameterCanonicalIntItemEntity, "ppc-inh-va/{id}", ["id"]), entity: E2ePathParameterCanonicalIntItemEntity, name: "E2ePathParameterCanonicalInheritedVa", path: "path-parameter/canonical/ppc-inh-va", routes: noRoutes })
export class E2ePathParameterCanonicalInheritedVaController extends E2ePathParameterCanonicalInheritedActiveBaseController {}

@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalIntItemEntity>({ authorization: buildAuthorization("ppc-inh-vb", E2ePathParameterCanonicalIntItemEntity, "ppc-inh-vb/{active}/{id}", ["id", "active"]), entity: E2ePathParameterCanonicalIntItemEntity, name: "E2ePathParameterCanonicalInheritedVb", path: "path-parameter/canonical/ppc-inh-vb", routes: noRoutes })
export class E2ePathParameterCanonicalInheritedVbController extends E2ePathParameterCanonicalInheritedActiveBaseController {}

/**
 * Base controller whose custom route `:id` is described for `{id}` only.
 */
export class E2ePathParameterCanonicalInheritedIdBaseController {
	@Inject(E2ePathParameterCanonicalIntItemService)
	public readonly service!: E2ePathParameterCanonicalIntItemService;

	@buildCustomRoute(E2ePathParameterCanonicalIntItemEntity, E2ePathParameterCanonicalCopyIntParametersDto)
	public read(@Param("id") id: unknown): E2ePathParameterCanonicalCustomResponseDto {
		return { value: `${typeof id}:${String(id)}` };
	}
}

@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalIntItemEntity>({ authorization: buildAuthorization("ppc-inh-a", E2ePathParameterCanonicalIntItemEntity, "ppc-inh-a/{id}", ["id"]), entity: E2ePathParameterCanonicalIntItemEntity, name: "E2ePathParameterCanonicalInheritedA", path: "path-parameter/canonical/ppc-inh-a", routes: noRoutes })
export class E2ePathParameterCanonicalInheritedAController extends E2ePathParameterCanonicalInheritedIdBaseController {}

/**
 * Names the controller path parameter `{tenant}` in its resource path, which the inherited PARAMETERS DTO does not describe, so it must fail at startup.
 */
@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalIntItemEntity>({ authorization: buildAuthorization("ppc-inh-b", E2ePathParameterCanonicalIntItemEntity, "ppc-inh-b/{tenant}/{id}", ["id"]), entity: E2ePathParameterCanonicalIntItemEntity, name: "E2ePathParameterCanonicalInheritedB", path: "path-parameter/canonical/ppc-inh-b/:tenant", routes: noRoutes })
export class E2ePathParameterCanonicalInheritedBController extends E2ePathParameterCanonicalInheritedIdBaseController {}

/**
 * Copies the generated CREATE body decorators of the boolean column, like a hand-written body DTO in a consumer service.
 */
export class E2ePathParameterCanonicalCopyActiveBodyDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.BODY, entity: () => E2ePathParameterCanonicalIntItemEntity, method: EApiRouteType.CREATE, propertyName: "active" })
	public active!: boolean;
}

/**
 * Declares the boolean with `ApiPropertyBoolean` directly.
 */
export class E2ePathParameterCanonicalBooleanBodyDto {
	@ApiPropertyBoolean({ description: "active", entity: E2ePathParameterCanonicalIntItemEntity, isRequired: true } as never)
	public active!: boolean;
}

const buildBooleanEchoRoute = (method: RequestMethod, path: string, dto: Partial<Record<EApiDtoType, new () => unknown>>): MethodDecorator =>
	ApiRouteCustom({
		documentation: { description: "Echoes one boolean", summary: "Echoes one boolean" },
		dto,
		resource: { action: "read", entity: E2ePathParameterCanonicalIntItemEntity },
		response: { errors: {}, serialization: { isEnabled: false }, status: 200, type: E2ePathParameterCanonicalCustomResponseDto },
		route: { method, path },
	} as never);

/**
 * Echoes the boolean a host pipe gives the handler from a body or a query.
 */
@ApiControllerObservable()
@ApiController<E2ePathParameterCanonicalIntItemEntity>({ entity: E2ePathParameterCanonicalIntItemEntity, name: "E2ePathParameterCanonicalBooleanEcho", path: "path-parameter/canonical/boolean-echo", routes: noRoutes })
export class E2ePathParameterCanonicalBooleanEchoController {
	@Inject(E2ePathParameterCanonicalIntItemService)
	public readonly service!: E2ePathParameterCanonicalIntItemService;

	@buildBooleanEchoRoute(RequestMethod.POST, "copy", { [EApiDtoType.BODY]: E2ePathParameterCanonicalCopyActiveBodyDto })
	public copyBody(@Body() body: E2ePathParameterCanonicalCopyActiveBodyDto): E2ePathParameterCanonicalCustomResponseDto {
		return { value: `${typeof body.active}:${String(body.active)}` };
	}

	@buildBooleanEchoRoute(RequestMethod.GET, "copy", { [EApiDtoType.QUERY]: E2ePathParameterCanonicalCopyActiveBodyDto })
	public copyQuery(@Query() query: E2ePathParameterCanonicalCopyActiveBodyDto): E2ePathParameterCanonicalCustomResponseDto {
		return { value: `${typeof query.active}:${String(query.active)}` };
	}

	@buildBooleanEchoRoute(RequestMethod.POST, "boolean", { [EApiDtoType.BODY]: E2ePathParameterCanonicalBooleanBodyDto })
	public booleanBody(@Body() body: E2ePathParameterCanonicalBooleanBodyDto): E2ePathParameterCanonicalCustomResponseDto {
		return { value: `${typeof body.active}:${String(body.active)}` };
	}

	@buildBooleanEchoRoute(RequestMethod.GET, "boolean", { [EApiDtoType.QUERY]: E2ePathParameterCanonicalBooleanBodyDto })
	public booleanQuery(@Query() query: E2ePathParameterCanonicalBooleanBodyDto): E2ePathParameterCanonicalCustomResponseDto {
		return { value: `${typeof query.active}:${String(query.active)}` };
	}
}

/**
 * Uses the described path value `id` only in an IAM condition, not in its resource path.
 */
@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalIntItemEntity>({ authorization: buildAuthorization("ppc-cond-only", E2ePathParameterCanonicalIntItemEntity, "ppc-cond-only/item", ["id"]), entity: E2ePathParameterCanonicalIntItemEntity, name: "E2ePathParameterCanonicalConditionOnly", path: "path-parameter/canonical/ppc-cond-only", routes: noRoutes })
export class E2ePathParameterCanonicalConditionOnlyController extends E2ePathParameterCanonicalInheritedIdBaseController {}

/**
 * Base controller with an accessor that only works on an instance, as a service-backed getter does.
 */
export class E2ePathParameterCanonicalGetterBaseController extends E2ePathParameterCanonicalInheritedIdBaseController {
	protected get tableName(): string {
		return this.service.repository.metadata.tableName;
	}
}

@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalIntItemEntity>({ authorization: buildAuthorization("ppc-getter", E2ePathParameterCanonicalIntItemEntity, "ppc-getter/{id}", ["id"]), entity: E2ePathParameterCanonicalIntItemEntity, name: "E2ePathParameterCanonicalGetter", path: "path-parameter/canonical/ppc-getter", routes: noRoutes })
export class E2ePathParameterCanonicalGetterController extends E2ePathParameterCanonicalGetterBaseController {}

/**
 * Describes the custom route `:id` with a plain `ApiPropertyNumber`, not copied from a column.
 */
export class E2ePathParameterCanonicalDescribedIntParametersDto {
	@ApiPropertyNumber({ description: "id", entity: E2ePathParameterCanonicalIntItemEntity, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, isRequired: true, maximum: 2_147_483_647, minimum: 0, multipleOf: 1 } as never)
	public id!: number;
}

/**
 * Describes the custom route `:id` with a plain `ApiPropertyUUID`, not copied from a column.
 */
export class E2ePathParameterCanonicalDescribedUuidParametersDto {
	@ApiPropertyUUID({ description: "id", entity: E2ePathParameterCanonicalUuidItemEntity, isRequired: true } as never)
	public id!: string;
}

/**
 * A securable custom route whose resource path names no placeholder and whose `:id` is described but not copied, so only a `request.parameters` condition reads it.
 */
@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalIntItemEntity>({ authorization: buildAuthorization("ppc-described-int", E2ePathParameterCanonicalIntItemEntity, "ppc-described-int/item", ["id"]), entity: E2ePathParameterCanonicalIntItemEntity, name: "E2ePathParameterCanonicalDescribedInt", path: "path-parameter/canonical/ppc-described-int", routes: noRoutes })
export class E2ePathParameterCanonicalDescribedIntController {
	@Inject(E2ePathParameterCanonicalIntItemService)
	public readonly service!: E2ePathParameterCanonicalIntItemService;

	@buildCustomRoute(E2ePathParameterCanonicalIntItemEntity, E2ePathParameterCanonicalDescribedIntParametersDto)
	public read(@Param("id") id: unknown): E2ePathParameterCanonicalCustomResponseDto {
		return { value: `${typeof id}:${String(id)}` };
	}
}

@ApiControllerSecurable()
@ApiController<E2ePathParameterCanonicalUuidItemEntity>({ authorization: buildAuthorization("ppc-described-uuid", E2ePathParameterCanonicalUuidItemEntity, "ppc-described-uuid/item", ["id"]), entity: E2ePathParameterCanonicalUuidItemEntity, name: "E2ePathParameterCanonicalDescribedUuid", path: "path-parameter/canonical/ppc-described-uuid", routes: noRoutes })
export class E2ePathParameterCanonicalDescribedUuidController {
	@Inject(E2ePathParameterCanonicalUuidItemService)
	public readonly service!: E2ePathParameterCanonicalUuidItemService;

	@buildCustomRoute(E2ePathParameterCanonicalUuidItemEntity, E2ePathParameterCanonicalDescribedUuidParametersDto)
	public read(@Param("id") id: unknown): E2ePathParameterCanonicalCustomResponseDto {
		return { value: `${typeof id}:${String(id)}` };
	}
}

/**
 * List properties of every scalar type and a single DOUBLE, for one value and comma lists in a query.
 */
const E2E_PATH_PARAMETER_CANONICAL_SENT_STATUS = { ACTIVE: "active", INACTIVE: "inactive" } as const;

export class E2ePathParameterCanonicalSentListDto {
	@ApiPropertyNumber({ description: "amount", entity: E2ePathParameterCanonicalIntItemEntity, exampleValue: 1.5, format: EApiPropertyNumberType.DOUBLE, isRequired: false, maximum: 1_000_000, minimum: -1_000_000 } as never)
	public amount?: number;

	@ApiPropertyNumber({ description: "amounts", entity: E2ePathParameterCanonicalIntItemEntity, exampleValue: [1.5], format: EApiPropertyNumberType.DOUBLE, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, maximum: 1_000_000, minimum: -1_000_000, minItems: 1 } as never)
	public amounts?: Array<number>;

	@ApiPropertyNumber({ description: "counts", entity: E2ePathParameterCanonicalIntItemEntity, exampleValue: [1], format: EApiPropertyNumberType.INTEGER, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, maximum: 100, minimum: 0, minItems: 1, multipleOf: 1 } as never)
	public counts?: Array<number>;

	@ApiPropertyBoolean({ description: "flags", entity: E2ePathParameterCanonicalIntItemEntity, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1 } as never)
	public flags?: Array<boolean>;

	@ApiPropertyUUID({ description: "ids", entity: E2ePathParameterCanonicalIntItemEntity, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1 } as never)
	public ids?: Array<string>;

	@ApiPropertyString({ description: "names", entity: E2ePathParameterCanonicalIntItemEntity, exampleValue: ["abc"], format: EApiPropertyStringType.STRING, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, maxLength: 16, minItems: 1, minLength: 1, pattern: "/^[a-z]+$/" } as never)
	public names?: Array<string>;

	@ApiPropertyDate({ description: "days", entity: E2ePathParameterCanonicalIntItemEntity, format: EApiPropertyDateType.DATE, identifier: EApiPropertyDateIdentifier.DATE, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1 } as never)
	public days?: Array<string>;

	@ApiPropertyString({ description: "labels", entity: E2ePathParameterCanonicalIntItemEntity, exampleValue: ["abc"], format: EApiPropertyStringType.STRING, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, maxLength: 16, minItems: 1, minLength: 0, pattern: "/^[a-z]*$/" } as never)
	public labels?: Array<string>;

	@ApiPropertyEnum({ description: "statuses", entity: E2ePathParameterCanonicalIntItemEntity, enum: E2E_PATH_PARAMETER_CANONICAL_SENT_STATUS, enumName: "E2ePathParameterCanonicalSentStatus", isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1 } as never)
	public statuses?: Array<string>;
}

const SENT_BOOLEAN = { description: "flag", entity: E2ePathParameterCanonicalIntItemEntity, isRequired: false } as never;
const SENT_BOOLEANS = { description: "flags", entity: E2ePathParameterCanonicalIntItemEntity, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1 } as never;
const SENT_INTEGER = { description: "count", entity: E2ePathParameterCanonicalIntItemEntity, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, isRequired: false, maximum: 100, minimum: 0, multipleOf: 1 } as never;
const SENT_INTEGERS = { description: "counts", entity: E2ePathParameterCanonicalIntItemEntity, exampleValue: [1], format: EApiPropertyNumberType.INTEGER, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, maximum: 100, minimum: 0, minItems: 1, multipleOf: 1 } as never;

/**
 * A boolean and a boolean list, under their own names.
 */
export class E2ePathParameterCanonicalSentBooleanDto {
	@ApiPropertyBoolean(SENT_BOOLEAN)
	public value?: boolean;

	@ApiPropertyBoolean(SENT_BOOLEANS)
	public values?: Array<boolean>;
}

/**
 * A boolean and a boolean list, renamed in the request with `@Expose({ name })`.
 */
export class E2ePathParameterCanonicalSentRenamedBooleanDto {
	@Expose({ name: "sent_value" })
	@ApiPropertyBoolean(SENT_BOOLEAN)
	public value?: boolean;

	@Expose({ name: "sent_values" })
	@ApiPropertyBoolean(SENT_BOOLEANS)
	public values?: Array<boolean>;
}

/**
 * An integer and an integer list, under their own names.
 */
export class E2ePathParameterCanonicalSentIntegerDto {
	@ApiPropertyNumber(SENT_INTEGER)
	public value?: number;

	@ApiPropertyNumber(SENT_INTEGERS)
	public values?: Array<number>;
}

/**
 * An integer and an integer list, renamed in the request with `@Expose({ name })`.
 */
export class E2ePathParameterCanonicalSentRenamedIntegerDto {
	@Expose({ name: "sent_value" })
	@ApiPropertyNumber(SENT_INTEGER)
	public value?: number;

	@Expose({ name: "sent_values" })
	@ApiPropertyNumber(SENT_INTEGERS)
	public values?: Array<number>;
}

/**
 * Echoes the body or query a host pipe gives the handler, for each sent-value DTO.
 */
@ApiControllerObservable()
@ApiController<E2ePathParameterCanonicalIntItemEntity>({ entity: E2ePathParameterCanonicalIntItemEntity, name: "E2ePathParameterCanonicalSentValue", path: "path-parameter/canonical/sent-value", routes: noRoutes })
export class E2ePathParameterCanonicalSentValueController {
	@Inject(E2ePathParameterCanonicalIntItemService)
	public readonly service!: E2ePathParameterCanonicalIntItemService;

	@buildBooleanEchoRoute(RequestMethod.POST, "boolean-plain", { [EApiDtoType.BODY]: E2ePathParameterCanonicalSentBooleanDto })
	public booleanPlainBody(@Body() body: E2ePathParameterCanonicalSentBooleanDto): E2ePathParameterCanonicalCustomResponseDto {
		return { value: JSON.stringify(body) };
	}

	@buildBooleanEchoRoute(RequestMethod.GET, "boolean-plain", { [EApiDtoType.QUERY]: E2ePathParameterCanonicalSentBooleanDto })
	public booleanPlainQuery(@Query() query: E2ePathParameterCanonicalSentBooleanDto): E2ePathParameterCanonicalCustomResponseDto {
		return { value: JSON.stringify(query) };
	}

	@buildBooleanEchoRoute(RequestMethod.POST, "boolean-renamed", { [EApiDtoType.BODY]: E2ePathParameterCanonicalSentRenamedBooleanDto })
	public booleanRenamedBody(@Body() body: E2ePathParameterCanonicalSentRenamedBooleanDto): E2ePathParameterCanonicalCustomResponseDto {
		return { value: JSON.stringify(body) };
	}

	@buildBooleanEchoRoute(RequestMethod.GET, "boolean-renamed", { [EApiDtoType.QUERY]: E2ePathParameterCanonicalSentRenamedBooleanDto })
	public booleanRenamedQuery(@Query() query: E2ePathParameterCanonicalSentRenamedBooleanDto): E2ePathParameterCanonicalCustomResponseDto {
		return { value: JSON.stringify(query) };
	}

	@buildBooleanEchoRoute(RequestMethod.GET, "list", { [EApiDtoType.QUERY]: E2ePathParameterCanonicalSentListDto })
	public listQuery(@Query() query: E2ePathParameterCanonicalSentListDto): E2ePathParameterCanonicalCustomResponseDto {
		return { value: JSON.stringify(query) };
	}

	@buildBooleanEchoRoute(RequestMethod.POST, "integer-plain", { [EApiDtoType.BODY]: E2ePathParameterCanonicalSentIntegerDto })
	public integerPlainBody(@Body() body: E2ePathParameterCanonicalSentIntegerDto): E2ePathParameterCanonicalCustomResponseDto {
		return { value: JSON.stringify(body) };
	}

	@buildBooleanEchoRoute(RequestMethod.GET, "integer-plain", { [EApiDtoType.QUERY]: E2ePathParameterCanonicalSentIntegerDto })
	public integerPlainQuery(@Query() query: E2ePathParameterCanonicalSentIntegerDto): E2ePathParameterCanonicalCustomResponseDto {
		return { value: JSON.stringify(query) };
	}

	@buildBooleanEchoRoute(RequestMethod.POST, "integer-renamed", { [EApiDtoType.BODY]: E2ePathParameterCanonicalSentRenamedIntegerDto })
	public integerRenamedBody(@Body() body: E2ePathParameterCanonicalSentRenamedIntegerDto): E2ePathParameterCanonicalCustomResponseDto {
		return { value: JSON.stringify(body) };
	}

	@buildBooleanEchoRoute(RequestMethod.GET, "integer-renamed", { [EApiDtoType.QUERY]: E2ePathParameterCanonicalSentRenamedIntegerDto })
	public integerRenamedQuery(@Query() query: E2ePathParameterCanonicalSentRenamedIntegerDto): E2ePathParameterCanonicalCustomResponseDto {
		return { value: JSON.stringify(query) };
	}
}

const buildDocument = (id: string, statements: Array<Record<string, unknown>>): Record<string, unknown> => ({ document: { Statement: statements, Version: "2012-10-17" }, id, namespace: id, sourceType: EApiPolicySourceType.DATABASE, version: "1" });
const allow = (namespace: string, condition?: Record<string, unknown>): Record<string, unknown> => ({ Action: [`${namespace}:*`], ...(condition ? { Condition: condition } : {}), Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] });
const deny = (namespace: string, resource: Array<string>, condition?: Record<string, unknown>): Record<string, unknown> => ({ Action: [`${namespace}:*`], ...(condition ? { Condition: condition } : {}), Effect: EApiPolicyEffect.DENY, Resource: resource });

export const E2E_PATH_PARAMETER_CANONICAL_DOCUMENTS: Array<Record<string, unknown>> = [
	buildDocument("ppc-dt-deny", [allow("ppc-dt-deny"), deny("ppc-dt-deny", ["*"], { StringEquals: { "request.parameters.at": E2E_PATH_PARAMETER_CANONICAL_AT } })]),
	buildDocument("ppc-dt-recipe", [allow("ppc-dt-recipe", { StringEquals: { "resource.at": "${request.parameters.at}" } })]),
	buildDocument("ppc-dt-res", [allow("ppc-dt-res"), deny("ppc-dt-res", [`ppc-dt-res/${E2E_PATH_PARAMETER_CANONICAL_AT}/*`])]),
	buildDocument("ppc-bool-deny", [allow("ppc-bool-deny"), deny("ppc-bool-deny", ["ppc-bool-deny/true/*"])]),
	buildDocument("ppc-bool-cond", [allow("ppc-bool-cond"), deny("ppc-bool-cond", ["*"], { StringEquals: { "request.parameters.active": "true" } })]),
	...E2E_PATH_PARAMETER_CANONICAL_DTO_KINDS.map(({ kind }: { kind: string }) => buildDocument(`ppc-dto-${kind}-guard`, [allow(`ppc-dto-${kind}-guard`)])),
	buildDocument("ppc-custom-int", [allow("ppc-custom-int"), deny("ppc-custom-int", ["ppc-custom-int/16"])]),
	buildDocument("ppc-custom-uuid", [allow("ppc-custom-uuid"), deny("ppc-custom-uuid", [`ppc-custom-uuid/${E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID}`])]),
	buildDocument("ppc-custom-bad", [allow("ppc-custom-bad")]),
	buildDocument("ppc-inh-va", [allow("ppc-inh-va")]),
	buildDocument("ppc-inh-vb", [allow("ppc-inh-vb"), deny("ppc-inh-vb", ["ppc-inh-vb/true/*"])]),
	buildDocument("ppc-inh-a", [allow("ppc-inh-a")]),
	buildDocument("ppc-inh-b", [allow("ppc-inh-b")]),
	buildDocument("ppc-cond-only", [allow("ppc-cond-only"), deny("ppc-cond-only", ["*"], { StringEquals: { "request.parameters.id": "16" } })]),
	buildDocument("ppc-getter", [allow("ppc-getter")]),
	buildDocument("ppc-described-int", [allow("ppc-described-int"), deny("ppc-described-int", ["*"], { StringEquals: { "request.parameters.id": "16" } })]),
	buildDocument("ppc-described-uuid", [allow("ppc-described-uuid"), deny("ppc-described-uuid", ["*"], { StringEquals: { "request.parameters.id": E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID } })]),
];

export const E2E_PATH_PARAMETER_CANONICAL_CONTROLLERS: Array<new () => unknown> = [
	E2ePathParameterCanonicalDtDenyController,
	E2ePathParameterCanonicalDtRecipeController,
	E2ePathParameterCanonicalDtResourceController,
	E2ePathParameterCanonicalBoolDenyController,
	E2ePathParameterCanonicalBoolConditionController,
	...E2E_PATH_PARAMETER_CANONICAL_DTO_CONTROLLERS,
	E2ePathParameterCanonicalNarrowController,
	E2ePathParameterCanonicalTextUuidController,
	E2ePathParameterCanonicalCustomIntController,
	E2ePathParameterCanonicalCustomUuidController,
	// The subclass whose resource path names fewer placeholders comes first, so a rule shared through the inherited handler would reach the second one.
	E2ePathParameterCanonicalInheritedVaController,
	E2ePathParameterCanonicalInheritedVbController,
	E2ePathParameterCanonicalBooleanEchoController,
	E2ePathParameterCanonicalSentValueController,
	E2ePathParameterCanonicalConditionOnlyController,
	E2ePathParameterCanonicalDescribedIntController,
	E2ePathParameterCanonicalDescribedUuidController,
];
