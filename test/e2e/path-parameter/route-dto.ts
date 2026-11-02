import { Inject, Injectable, Param, RequestMethod } from "@nestjs/common";
import { ApiProperty, IntersectionType, OmitType, PartialType, PickType } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Expose, Transform, Type } from "class-transformer";
import { IsBoolean, IsDate, IsDateString, IsDefined, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUUID } from "class-validator";
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

	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({ description: "changed setting", type: EApiPropertyDescribeType.UUID })
	public settingId!: string;
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

class StablePrefixDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): unknown => (String(value).startsWith("p-") ? value : `p-${String(value)}`), { toClassOnly: true })
	public id!: string;
}

class DeclaredTextDto {
	@IsDateString()
	public id!: Date;
}

class UntypedNumberDto {
	@IsDefined()
	public id!: number;
}

// The startup samples do not start with "x", so only the check on each request can see that this Transform changes its own output.
class GrowsOnSomeValuesDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): unknown => (String(value).startsWith("x") ? `x${String(value)}` : value), { toClassOnly: true })
	public id!: string;
}

class ThrowsOnSamplePrefixDto {
	@IsString()
	@Transform(
		({ value }: { value: unknown }): string => {
			if (value === "1" || value === "Aa") {
				throw new Error("Not a value this route takes");
			}

			return `p-${String(value)}`;
		},
		{ toClassOnly: true },
	)
	public id!: string;
}

class PrefixDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => `p-${String(value)}`, { toClassOnly: true })
	public id!: string;
}

class Base64Dto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => Buffer.from(String(value), "base64url").toString(), { toClassOnly: true })
	public id!: string;
}

class PlusOneDto {
	@IsNotEmpty()
	@Transform(({ value }: { value: unknown }): unknown => (value as number) + 1)
	public id!: number;
}

class TypeSensitiveDto {
	@IsNotEmpty()
	@Transform(({ value }: { value: unknown }): unknown => (typeof value === "number" ? value : `p-${String(value)}`))
	public id!: number;
}

class BooleanEqualsDto {
	@IsBoolean()
	@Transform(({ value }: { value: unknown }): boolean => value === "true")
	public id!: boolean;
}

class WiderThanPathDto {
	@ApiPropertyNumber(INTEGER_PROPERTY)
	public id!: number;

	@IsString()
	public required!: string;
}

class RenamedTrimDto {
	@Expose({ name: "id" })
	@IsString()
	@Transform(({ value }: { value: unknown }): string => String(value).trim())
	public inner!: string;
}

class RenamedBesideDefaultDto {
	@Expose({ name: "id" })
	@IsString()
	public inner!: string;

	@Expose()
	@IsOptional()
	@Transform(({ value }: { value: unknown }): unknown => value ?? "fallback")
	public other?: string;
}

class RenamedPlainDateDto {
	@Expose({ name: "id" })
	@IsDate()
	@Transform(({ value }: { value: Date }): string => value.toISOString(), { toPlainOnly: true })
	@Type(() => Date)
	public inner!: Date;
}

class PlainDateDto {
	@IsDate()
	@Transform(({ value }: { value: Date }): string => value.toISOString(), { toPlainOnly: true })
	@Type(() => Date)
	public id!: Date;
}

class ToPlainGroupDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => String(value).toUpperCase(), { groups: ["g"], toPlainOnly: true })
	public id!: string;
}

class OtherPropertyGroupDto {
	@IsString()
	public id!: string;

	@IsOptional()
	@Transform(({ value }: { value: unknown }): string => String(value).toUpperCase(), { groups: ["g"] })
	public other?: string;
}

// The replacement a controller without its own entity class uses: the column of the area's entity that holds the same value.
class CopiedForeignColumnDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: (): typeof E2ePathParameterRouteDtoItemEntity => E2ePathParameterRouteDtoItemEntity, method: EApiRouteType.GET, propertyName: "settingId" } as never)
	public id!: string;
}

class GroupTrimDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => String(value).trim(), { groups: ["g"] })
	public id!: string;
}

class GroupLeadingZerosDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => String(value).replace(/^0+(?=\d)/, ""), { groups: ["g"] })
	public id!: string;
}

class GroupOneValueDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): unknown => (value === "7" ? "8" : value), { groups: ["g"] })
	public id!: string;
}

class GroupDecodeDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => decodeURIComponent(String(value)), { groups: ["g"] })
	public id!: string;
}

class GroupPlusDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => String(value).replace(/^\+/, ""), { groups: ["g"] })
	public id!: string;
}

class GroupRenamedDto {
	@Expose({ name: "id" })
	@IsString()
	@Transform(({ value }: { value: unknown }): string => String(value).trim(), { groups: ["g"] })
	public inner!: string;
}

class GroupClassOnlyDto {
	@IsNumberString()
	@Transform(({ value }: { value: unknown }): string => String(Number(value)), { groups: ["g"], toClassOnly: true })
	public id!: string;
}

class VersionSwapDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): string => String(value).toLowerCase(), { until: 2 })
	@Transform(({ value }: { value: unknown }): string => String(value).toUpperCase(), { since: 2 })
	public id!: string;
}

class VersionExposedDto {
	@Expose({ since: 2 })
	@IsString()
	public id!: string;
}

class GroupValidatorDto {
	@IsInt({ groups: ["admin"] })
	@Type(() => Number)
	public id!: number;
}

class GroupValidatorsDto {
	@IsInt({ groups: ["admin"] })
	@IsString({ groups: ["user"] })
	public id!: string;
}

export type TE2ePathParameterRouteDtoPipe = "consumer" | "groups" | "implicit" | "none" | "oldVersion" | "transform" | "validate" | "version";

export interface IE2ePathParameterRouteDtoAllowed {
	// What a pipe that converts hands the handler.
	piped: unknown;
	// A mode whose pipe sees the same text and answers on its own: its own 400, or its own conversion of that text.
	pipes?: Partial<Record<TE2ePathParameterRouteDtoPipe, { status: number; value?: unknown }>>;
	// What the handler reads with no pipe, or a pipe that only validates and returns its input: the canonical text IAM saw.
	raw: unknown;
	sent: string;
}

export interface IE2ePathParameterRouteDtoCase {
	allowed: IE2ePathParameterRouteDtoAllowed;
	denied: Array<string>;
	dto: new () => unknown;
	invalid: Array<string>;
	name: string;
	// A Deny on this resource path replaces the Deny on the path value.
	resourcePath?: string;
	value: string;
	widerThanPath?: boolean;
}

// Under a pipe with no implicit conversion a bare `@IsInt()` sees text, so that pipe gives its own 400.
const TEXT_REJECTED_PIPES: Partial<Record<TE2ePathParameterRouteDtoPipe, { status: number }>> = { groups: { status: 400 }, oldVersion: { status: 400 }, transform: { status: 400 }, validate: { status: 400 }, version: { status: 400 } };
// Under a pipe with implicit conversion `@IsDateString() id: Date` sees a Date, so that pipe gives its own 400.
const DATE_REJECTED_PIPES: Partial<Record<TE2ePathParameterRouteDtoPipe, { status: number }>> = { consumer: { status: 400 }, implicit: { status: 400 } };

const UUID_ALLOWED: IE2ePathParameterRouteDtoAllowed = { piped: { id: OTHER_UUID }, raw: { id: OTHER_UUID }, sent: OTHER_UUID };

// A UUID path value is refused in upper case, as on a generated route, whether the DTO copies a column or only validates the value as a UUID.
const UUID_INVALID: Array<string> = ["not-a-uuid", DENIED_UUID.toUpperCase(), OTHER_UUID.toUpperCase()];

export const E2E_PATH_PARAMETER_ROUTE_DTO_CASES: Array<IE2ePathParameterRouteDtoCase> = [
	{ allowed: { piped: { internalId: OTHER_UUID }, raw: { id: OTHER_UUID }, sent: OTHER_UUID }, denied: [DENIED_UUID], dto: RenamedUuidDto, invalid: UUID_INVALID, name: "renamed-uuid", value: DENIED_UUID },
	{ allowed: { piped: { internalId: 17 }, raw: { id: "17" }, sent: "17" }, denied: ["16"], dto: RenamedNumberDto, invalid: ["016", "1e1", "abc"], name: "renamed-number", value: "16" },
	{ allowed: { piped: { internalId: 17 }, raw: { id: "17" }, sent: "17" }, denied: ["16"], dto: RenamedCopyDto, invalid: ["016", "1e1", "abc"], name: "renamed-copy", value: "16" },
	{ allowed: UUID_ALLOWED, denied: [DENIED_UUID], dto: PickedUuidDto, invalid: UUID_INVALID, name: "picked-uuid", value: DENIED_UUID },
	{ allowed: UUID_ALLOWED, denied: [DENIED_UUID], dto: OmittedUuidDto, invalid: UUID_INVALID, name: "omitted-uuid", value: DENIED_UUID },
	{ allowed: UUID_ALLOWED, denied: [DENIED_UUID], dto: PartialUuidDto, invalid: UUID_INVALID, name: "partial-uuid", value: DENIED_UUID },
	{ allowed: UUID_ALLOWED, denied: [DENIED_UUID], dto: IntersectedUuidDto, invalid: UUID_INVALID, name: "intersected-uuid", value: DENIED_UUID },
	{ allowed: { piped: { id: "2024-03-11T12:00:00.000Z" }, raw: { id: "2024-03-11T12:00:00.000Z" }, sent: "2024-03-11T12:00:00.000Z" }, denied: [DENIED_AT], dto: PickedMomentDto, invalid: ["garbage", "2024-03-10T12:00:00Z", "2024-03-10T13:00:00%2B01:00"], name: "picked-moment", value: DENIED_AT },
	{ allowed: { piped: { id: 17 }, raw: { id: "17" }, sent: "0x11" }, denied: ["16", "016", "0x10", "1.6e1"], dto: IsIntTypeDto, invalid: ["abc", "1.5"], name: "is-int-type", value: "16" },
	{ allowed: { piped: { id: 17 }, pipes: TEXT_REJECTED_PIPES, raw: { id: "17" }, sent: "017" }, denied: ["16", "016", "0x10", "1.6e1"], dto: IsIntOnlyDto, invalid: ["abc", "1.5"], name: "is-int-only", value: "16" },
	{ allowed: { piped: { id: "xyz" }, raw: { id: "xyz" }, sent: "XYZ" }, denied: ["abc", "ABC"], dto: LowerCasedStringDto, invalid: ["toolongvalue"], name: "lower-cased-string", value: "abc" },
	{ allowed: UUID_ALLOWED, denied: [DENIED_UUID], dto: LowerCasedUuidDto, invalid: UUID_INVALID, name: "lower-cased-uuid", value: DENIED_UUID },
	{ allowed: { piped: { id: "p-xyz" }, raw: { id: "p-xyz" }, sent: "xyz" }, denied: ["abc", "p-abc"], dto: StablePrefixDto, invalid: [], name: "stable-prefix", value: "p-abc" },
	{ allowed: { piped: { id: "2024-03-11" }, pipes: DATE_REJECTED_PIPES, raw: { id: "2024-03-11" }, sent: "2024-03-11" }, denied: ["2024-03-10"], dto: DeclaredTextDto, invalid: ["garbage"], name: "declared-text", value: "2024-03-10" },
	{ allowed: { piped: { id: "17" }, pipes: { consumer: { status: 200, value: { id: 17 } }, implicit: { status: 200, value: { id: 17 } } }, raw: { id: "17" }, sent: "17" }, denied: ["16"], dto: UntypedNumberDto, invalid: ["016", "0x10", "abc"], name: "untyped-number", value: "16" },
	{ allowed: { piped: { id: "abc" }, raw: { id: "abc" }, sent: "abc" }, denied: ["denied"], dto: GrowsOnSomeValuesDto, invalid: ["xyz"], name: "grows-on-some-values", value: "denied" },
	{ allowed: { piped: undefined, pipes: { consumer: { status: 400 }, groups: { status: 400 }, implicit: { status: 400 }, none: { status: 400 }, oldVersion: { status: 400 }, transform: { status: 400 }, validate: { status: 400 }, version: { status: 400 } }, raw: undefined, sent: "abc" }, denied: [], dto: ThrowsOnSamplePrefixDto, invalid: ["abc", "p-abc"], name: "throws-on-sample-prefix", value: "abc" },
	{ allowed: { piped: { inner: "xyz" }, raw: { id: "xyz" }, sent: "xyz" }, denied: ["abc", "%20abc", "abc%20"], dto: RenamedTrimDto, invalid: [], name: "renamed-trim", value: "abc" },
	{ allowed: { piped: { inner: "xyz", other: "fallback" }, raw: { id: "xyz" }, sent: "xyz" }, denied: ["abc"], dto: RenamedBesideDefaultDto, invalid: [], name: "renamed-beside-default", value: "abc" },
	{ allowed: { piped: { inner: "2024-03-11T12:00:00.000Z" }, raw: { id: "2024-03-11T12:00:00.000Z" }, sent: "2024-03-11T12:00:00Z" }, denied: [DENIED_AT, "2024-03-10T12:00:00Z", "2024-03-10T13:00:00%2B01:00"], dto: RenamedPlainDateDto, invalid: ["garbage"], name: "renamed-plain-date", value: DENIED_AT },
	{ allowed: { piped: { id: "2024-03-11T12:00:00.000Z" }, raw: { id: "2024-03-11T12:00:00.000Z" }, sent: "2024-03-11T12:00:00Z" }, denied: [DENIED_AT, "2024-03-10T12:00:00Z", "2024-03-10T13:00:00%2B01:00"], dto: PlainDateDto, invalid: ["garbage"], name: "plain-date", value: DENIED_AT },
	{ allowed: { piped: { id: "xyz" }, raw: { id: "xyz" }, sent: "xyz" }, denied: ["abc"], dto: ToPlainGroupDto, invalid: [], name: "to-plain-group", value: "abc" },
	{ allowed: { piped: { id: "xyz" }, raw: { id: "xyz" }, sent: "xyz" }, denied: ["abc"], dto: OtherPropertyGroupDto, invalid: [], name: "other-property-group", value: "abc" },
	// A copied UUID column refuses an upper-case value rather than lower-casing it, because a database reads both cases as one key.
	{ allowed: { piped: { id: OTHER_UUID }, raw: { id: OTHER_UUID }, sent: OTHER_UUID }, denied: [DENIED_UUID], dto: CopiedForeignColumnDto, invalid: ["not-a-uuid", DENIED_UUID.toUpperCase(), OTHER_UUID.toUpperCase()], name: "copied-foreign-column", resourcePath: "copied-foreign-column/{id}", value: DENIED_UUID },
	{ allowed: { piped: undefined, raw: { id: "17" }, sent: "17" }, denied: ["16"], dto: WiderThanPathDto, invalid: ["016"], name: "wider-than-path", value: "16", widerThanPath: true },
];

export const E2E_PATH_PARAMETER_ROUTE_DTO_DOCUMENTS: Array<Record<string, unknown>> = E2E_PATH_PARAMETER_ROUTE_DTO_CASES.map((routeCase: IE2ePathParameterRouteDtoCase) => ({
	document: {
		Statement: [{ Action: [`${routeCase.name}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] }, routeCase.resourcePath ? { Action: [`${routeCase.name}:*`], Effect: EApiPolicyEffect.DENY, Resource: [routeCase.resourcePath.replace("{id}", routeCase.value)] } : { Action: [`${routeCase.name}:*`], Condition: { StringEquals: { "request.parameters.id": routeCase.value } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] }],
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
 * @param {Pick<IE2ePathParameterRouteDtoCase, "dto" | "name" | "resourcePath">} routeCase - Route name, PARAMETERS DTO and IAM resource path.
 * @returns {new () => unknown} Controller class.
 */
export const buildE2ePathParameterRouteDtoController = (routeCase: Pick<IE2ePathParameterRouteDtoCase, "dto" | "name" | "resourcePath">): new () => unknown => {
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

	// The prefix of generated names comes from the class name, so each route's controller needs its own.
	Object.defineProperty(RouteDtoController, "name", { value: `E2ePathParameterRouteDto${routeCase.name.replaceAll("-", "")}Controller` });
	ApiController<E2ePathParameterRouteDtoItemEntity>({
		authorization: { defaultMode: EApiAuthorizationMode.IAM, policyNamespace: routeCase.name, resourceDefinition: { entity: E2ePathParameterRouteDtoItemEntity, fields: [{ isFilterable: true, path: "resource.id", queryPath: "id" }], namespace: routeCase.name, resourcePath: routeCase.resourcePath ?? `${routeCase.name}/item`, resourceType: routeCase.name } } as never,
		entity: E2ePathParameterRouteDtoItemEntity,
		name: `E2ePathParameterRouteDto${routeCase.name.replaceAll("-", "")}`,
		path: `route-dto/${routeCase.name}`,
		routes: DISABLED_ROUTES,
	})(RouteDtoController);
	ApiControllerSecurable()(RouteDtoController);
	Reflect.defineMetadata("design:paramtypes", [routeCase.dto], RouteDtoController.prototype, "read");

	return RouteDtoController;
};

export const E2E_PATH_PARAMETER_ROUTE_DTO_CONTROLLERS: Array<new () => unknown> = E2E_PATH_PARAMETER_ROUTE_DTO_CASES.map((routeCase: IE2ePathParameterRouteDtoCase) => buildE2ePathParameterRouteDtoController(routeCase));

// A DTO whose Transform changes its own output, or depends on the type it receives, cannot give a handler the value IAM saw in every pipe mode, so the route never starts.
export const E2E_PATH_PARAMETER_ROUTE_DTO_REFUSED: Array<Pick<IE2ePathParameterRouteDtoCase, "dto" | "name">> = [
	{ dto: PrefixDto, name: "refused-prefix" },
	{ dto: Base64Dto, name: "refused-base64" },
	{ dto: PlusOneDto, name: "refused-plus-one" },
	{ dto: TypeSensitiveDto, name: "refused-type-sensitive" },
	{ dto: BooleanEqualsDto, name: "refused-boolean-equals" },
	{ dto: GroupTrimDto, name: "refused-group-trim" },
	{ dto: GroupLeadingZerosDto, name: "refused-group-leading-zeros" },
	{ dto: GroupOneValueDto, name: "refused-group-one-value" },
	{ dto: GroupDecodeDto, name: "refused-group-decode" },
	{ dto: GroupPlusDto, name: "refused-group-plus" },
	{ dto: GroupRenamedDto, name: "refused-group-renamed" },
	{ dto: GroupClassOnlyDto, name: "refused-group-class-only" },
	{ dto: VersionSwapDto, name: "refused-version-swap" },
	{ dto: VersionExposedDto, name: "refused-version-exposed" },
	{ dto: GroupValidatorDto, name: "refused-group-validator" },
	{ dto: GroupValidatorsDto, name: "refused-group-validators" },
];
