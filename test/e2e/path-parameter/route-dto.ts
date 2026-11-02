import { Inject, Injectable, Param, RequestMethod } from "@nestjs/common";
import { ApiProperty, IntersectionType, OmitType, PartialType, PickType } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Expose, Transform, Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID } from "class-validator";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";

import { ApiController, ApiControllerSecurable, ApiPropertyCopy, ApiPropertyDate, ApiPropertyDescribe, ApiPropertyNumber, ApiPropertyString, ApiPropertyUUID, ApiRouteCustom, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiDtoType, EApiPolicyEffect, EApiPolicySourceType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

const DENIED_UUID: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_UUID: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const DENIED_AT: string = "2024-03-10T12:00:00.000Z";

@Entity("e2e_path_parameter_route_dto_items")
export class E2ePathParameterRouteDtoItemEntity {
	@PrimaryColumn({ type: "int" })
	@ApiPropertyDescribe({ description: "id", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 2_147_483_647, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public id!: number;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;
}

@ApiService({ entity: E2ePathParameterRouteDtoItemEntity })
@Injectable()
export class E2ePathParameterRouteDtoItemService extends ApiServiceBase<E2ePathParameterRouteDtoItemEntity> {
	@InjectRepository(E2ePathParameterRouteDtoItemEntity)
	public readonly repository!: Repository<E2ePathParameterRouteDtoItemEntity>;
}

/**
 * Names the principal after the route, so each route reads its own policy document.
 */
@Injectable()
export class E2ePathParameterRouteDtoGuard {
	public canActivate(context: { switchToHttp: () => { getRequest: () => { url: string; user?: unknown } } }): boolean {
		const request: { url: string; user?: unknown } = context.switchToHttp().getRequest();
		request.user = { id: /\/route-dto\/([\w-]+)/.exec(request.url)?.[1] ?? "anonymous" };

		return true;
	}
}

class E2ePathParameterRouteDtoResponseDto {
	@ApiProperty()
	public value!: string;
}

const INTEGER_PROPERTY: never = { description: "id", entity: E2ePathParameterRouteDtoItemEntity, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, isRequired: true, maximum: 2_147_483_647, minimum: 0, multipleOf: 1 } as never;
const STRING_PROPERTY: never = { description: "id", entity: E2ePathParameterRouteDtoItemEntity, exampleValue: "abc", format: EApiPropertyStringType.STRING, isRequired: true, maxLength: 8, minLength: 1, pattern: "/^.+$/" } as never;
const UUID_PROPERTY: never = { description: "id", entity: E2ePathParameterRouteDtoItemEntity, isRequired: true } as never;
const COPY_PROPERTY: never = { dtoType: EApiDtoType.PARAMETERS, entity: (): typeof E2ePathParameterRouteDtoItemEntity => E2ePathParameterRouteDtoItemEntity, method: EApiRouteType.GET, propertyName: "id" } as never;

class RenamedUuidDto {
	@Expose({ name: "id" })
	@ApiPropertyUUID(UUID_PROPERTY)
	public internalId!: string;
}

class RenamedNumberDto {
	@Expose({ name: "id" })
	@ApiPropertyNumber(INTEGER_PROPERTY)
	public internalId!: number;
}

class RenamedCopyDto {
	@Expose({ name: "id" })
	@ApiPropertyCopy(COPY_PROPERTY)
	public internalId!: number;
}

class UuidBaseDto {
	@ApiPropertyUUID(UUID_PROPERTY)
	public id!: string;

	@IsOptional()
	@IsString()
	public note?: string;
}

class MomentBaseDto {
	@ApiPropertyDate({ description: "id", entity: E2ePathParameterRouteDtoItemEntity, format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, isRequired: true } as never)
	public id!: Date;
}

class IntersectedExtraDto {
	@IsOptional()
	@IsString()
	public extra?: string;
}

class PickedUuidDto extends PickType(UuidBaseDto, ["id"] as const) {}

class OmittedUuidDto extends OmitType(UuidBaseDto, ["note"] as const) {}

class PartialUuidDto extends PartialType(PickType(UuidBaseDto, ["id"] as const)) {}

class IntersectedUuidDto extends IntersectionType(PickType(UuidBaseDto, ["id"] as const), IntersectedExtraDto) {}

class PickedMomentDto extends PickType(MomentBaseDto, ["id"] as const) {}

class IsIntTypeDto {
	@IsInt()
	@Type(() => Number)
	public id!: number;
}

class IsIntOnlyDto {
	@IsInt()
	public id!: number;
}

class LowerCasedStringDto {
	@ApiPropertyString(STRING_PROPERTY)
	@Transform(({ value }: { value: unknown }): string => String(value).toLowerCase())
	public id!: string;
}

class LowerCasedUuidDto {
	@IsUUID()
	@Transform(({ value }: { value: unknown }): string => String(value).toLowerCase())
	public id!: string;
}

class PrefixedDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => `p-${String(value)}`, { toClassOnly: true })
	public id!: string;
}

class WiderThanPathDto {
	@ApiPropertyNumber(INTEGER_PROPERTY)
	public id!: number;

	@IsString()
	public required!: string;
}

export type TE2ePathParameterRouteDtoPipe = "consumer" | "implicit" | "none" | "transform";

export interface IE2ePathParameterRouteDtoAllowed {
	piped: unknown;
	raw: unknown;
	sent: string;
	transformStatus?: number;
}

export interface IE2ePathParameterRouteDtoCase {
	allowed: IE2ePathParameterRouteDtoAllowed;
	denied: Array<string>;
	dto: new () => unknown;
	invalid: Array<string>;
	name: string;
	value: string;
	widerThanPath?: boolean;
}

const UUID_ALLOWED: IE2ePathParameterRouteDtoAllowed = { piped: { id: OTHER_UUID }, raw: { id: OTHER_UUID }, sent: OTHER_UUID.toUpperCase() };

export const E2E_PATH_PARAMETER_ROUTE_DTO_CASES: Array<IE2ePathParameterRouteDtoCase> = [
	{ allowed: { piped: { internalId: OTHER_UUID }, raw: { id: OTHER_UUID }, sent: OTHER_UUID.toUpperCase() }, denied: [DENIED_UUID, DENIED_UUID.toUpperCase()], dto: RenamedUuidDto, invalid: ["not-a-uuid"], name: "renamed-uuid", value: DENIED_UUID },
	{ allowed: { piped: { internalId: 17 }, raw: { id: "17" }, sent: "17" }, denied: ["16"], dto: RenamedNumberDto, invalid: ["016", "1e1", "abc"], name: "renamed-number", value: "16" },
	{ allowed: { piped: { internalId: 17 }, raw: { id: "17" }, sent: "17" }, denied: ["16"], dto: RenamedCopyDto, invalid: ["016", "1e1", "abc"], name: "renamed-copy", value: "16" },
	{ allowed: UUID_ALLOWED, denied: [DENIED_UUID, DENIED_UUID.toUpperCase()], dto: PickedUuidDto, invalid: ["not-a-uuid"], name: "picked-uuid", value: DENIED_UUID },
	{ allowed: UUID_ALLOWED, denied: [DENIED_UUID, DENIED_UUID.toUpperCase()], dto: OmittedUuidDto, invalid: ["not-a-uuid"], name: "omitted-uuid", value: DENIED_UUID },
	{ allowed: UUID_ALLOWED, denied: [DENIED_UUID, DENIED_UUID.toUpperCase()], dto: PartialUuidDto, invalid: ["not-a-uuid"], name: "partial-uuid", value: DENIED_UUID },
	{ allowed: UUID_ALLOWED, denied: [DENIED_UUID, DENIED_UUID.toUpperCase()], dto: IntersectedUuidDto, invalid: ["not-a-uuid"], name: "intersected-uuid", value: DENIED_UUID },
	{ allowed: { piped: { id: "2024-03-11T12:00:00.000Z" }, raw: { id: "2024-03-11T12:00:00.000Z" }, sent: "2024-03-11T12:00:00Z" }, denied: [DENIED_AT, "2024-03-10T12:00:00Z", "2024-03-10T13:00:00%2B01:00"], dto: PickedMomentDto, invalid: ["garbage"], name: "picked-moment", value: DENIED_AT },
	{ allowed: { piped: { id: 17 }, raw: { id: "17" }, sent: "0x11" }, denied: ["16", "016", "0x10", "1.6e1"], dto: IsIntTypeDto, invalid: ["abc", "1.5"], name: "is-int-type", value: "16" },
	{ allowed: { piped: { id: 17 }, raw: { id: "17" }, sent: "017", transformStatus: 400 }, denied: ["16", "016", "0x10", "1.6e1"], dto: IsIntOnlyDto, invalid: ["abc", "1.5"], name: "is-int-only", value: "16" },
	{ allowed: { piped: { id: "xyz" }, raw: { id: "xyz" }, sent: "XYZ" }, denied: ["abc", "ABC"], dto: LowerCasedStringDto, invalid: ["toolongvalue"], name: "lower-cased-string", value: "abc" },
	{ allowed: UUID_ALLOWED, denied: [DENIED_UUID, DENIED_UUID.toUpperCase()], dto: LowerCasedUuidDto, invalid: ["not-a-uuid"], name: "lower-cased-uuid", value: DENIED_UUID },
	{ allowed: { piped: { id: "p-xyz" }, raw: { id: "xyz" }, sent: "xyz" }, denied: ["abc"], dto: PrefixedDto, invalid: [], name: "prefixed", value: "p-abc" },
	{ allowed: { piped: undefined, raw: { id: "17" }, sent: "17" }, denied: ["16"], dto: WiderThanPathDto, invalid: ["016"], name: "wider-than-path", value: "16", widerThanPath: true },
];

export const E2E_PATH_PARAMETER_ROUTE_DTO_DOCUMENTS: Array<Record<string, unknown>> = E2E_PATH_PARAMETER_ROUTE_DTO_CASES.map((routeCase: IE2ePathParameterRouteDtoCase) => ({
	document: {
		Statement: [
			{ Action: [`${routeCase.name}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] },
			{ Action: [`${routeCase.name}:*`], Condition: { StringEquals: { "request.parameters.id": routeCase.value } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] },
		],
		Version: "2012-10-17",
	},
	id: routeCase.name,
	namespace: routeCase.name,
	sourceType: EApiPolicySourceType.DATABASE,
	version: "1",
}));

const DISABLED_ROUTES: never = Object.fromEntries([EApiRouteType.CREATE, EApiRouteType.DELETE, EApiRouteType.GET, EApiRouteType.GET_LIST, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE].map((routeType: EApiRouteType) => [routeType, { generation: { isEnabled: false } }])) as never;

/**
 * Builds a securable controller with one custom `GET :id` route whose handler echoes the `@Param()` value.
 * @param {IE2ePathParameterRouteDtoCase} routeCase - Route name and PARAMETERS DTO.
 * @returns {new () => unknown} Controller class.
 */
const buildRouteDtoController = (routeCase: IE2ePathParameterRouteDtoCase): new () => unknown => {
	@ApiControllerSecurable()
	@ApiController<E2ePathParameterRouteDtoItemEntity>({
		authorization: { defaultMode: EApiAuthorizationMode.IAM, policyNamespace: routeCase.name, resourceDefinition: { entity: E2ePathParameterRouteDtoItemEntity, fields: [{ isFilterable: true, path: "resource.id", queryPath: "id" }], namespace: routeCase.name, resourcePath: `${routeCase.name}/item`, resourceType: routeCase.name } } as never,
		entity: E2ePathParameterRouteDtoItemEntity,
		name: `E2ePathParameterRouteDto${routeCase.name.replaceAll("-", "")}`,
		path: `route-dto/${routeCase.name}`,
		routes: DISABLED_ROUTES,
	})
	class RouteDtoController {
		@Inject(E2ePathParameterRouteDtoItemService)
		public readonly service!: E2ePathParameterRouteDtoItemService;

		@ApiRouteCustom({
			documentation: { description: "Echoes the path value", summary: "Echoes the path value" },
			dto: { [EApiDtoType.PARAMETERS]: routeCase.dto },
			resource: { action: "read", entity: E2ePathParameterRouteDtoItemEntity },
			response: { errors: {}, serialization: { isEnabled: false }, status: 200, type: E2ePathParameterRouteDtoResponseDto },
			route: { method: RequestMethod.GET, path: ":id" },
			security: { authentication: { guard: E2ePathParameterRouteDtoGuard, type: EApiAuthenticationType.USER }, authorization: { mode: EApiAuthorizationMode.IAM } },
		} as never)
		public read(@Param() parameters: unknown): E2ePathParameterRouteDtoResponseDto {
			return { value: JSON.stringify(parameters) };
		}
	}

	Reflect.defineMetadata("design:paramtypes", [routeCase.dto], RouteDtoController.prototype, "read");

	return RouteDtoController;
};

export const E2E_PATH_PARAMETER_ROUTE_DTO_CONTROLLERS: Array<new () => unknown> = E2E_PATH_PARAMETER_ROUTE_DTO_CASES.map((routeCase: IE2ePathParameterRouteDtoCase) => buildRouteDtoController(routeCase));
