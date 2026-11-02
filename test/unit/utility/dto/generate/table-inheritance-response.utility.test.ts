import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerTableInheritancePlan } from "@interface/class/api/controller/table-inheritance";
import type { IApiControllerProperties, IApiRouteMetadata } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { IDtoSchemaNameRoot } from "@interface/utility/schema-name";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";

import { ApiControllerTableInheritancePlanCompiler } from "@class/api/controller/table-inheritance-plan-compiler.class";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiControllerGetListQueryPaginationMode, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { HttpStatus } from "@nestjs/common";
import { ApiRouteSerializeResponse } from "@utility/api/route/response/serialize.utility";
import { DtoGenerateTableInheritanceResponse } from "@utility/dto/generate/table-inheritance-response.utility";
import { DtoSchemaNameAssertUnique } from "@utility/dto/schema-name";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { ChildEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn, TableInheritance } from "typeorm";
import { describe, expect, it } from "vitest";

enum EResponseKind {
	CARD_TRANSFER = "CARD_TRANSFER",
	QR = "QR",
}

const StringDescribe = (description: string): PropertyDecorator =>
	ApiPropertyDescribe({
		description,
		exampleValue: "value",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	});

@Entity("response_roots")
@TableInheritance({ column: { enum: EResponseKind, name: "kind", type: "enum" } })
class ResponseRootEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ enum: EResponseKind, type: "enum" })
	@ApiPropertyDescribe({ description: "kind", enum: EResponseKind, enumName: "EResponseKind", type: EApiPropertyDescribeType.ENUM })
	public kind!: EResponseKind;
}

@ChildEntity(EResponseKind.CARD_TRANSFER)
class ResponseCardTransferEntity extends ResponseRootEntity {
	@Column({ type: "varchar" })
	@StringDescribe("card number")
	public cardNumber!: string;
}

@ChildEntity(EResponseKind.QR)
class ResponseQrEntity extends ResponseRootEntity {
	@Column({ type: "varchar" })
	@StringDescribe("qr payload")
	public qrPayload!: string;
}

@Entity("response_hidden_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class ResponseHiddenRootEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "type",
		exampleValue: "A",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		properties: { [EApiRouteType.GET]: { [EApiDtoType.RESPONSE]: { isEnabled: false } } },
		type: EApiPropertyDescribeType.STRING,
	})
	public type!: string;
}

@ChildEntity("A")
class ResponseHiddenChildEntity extends ResponseHiddenRootEntity {}

@Entity("response_collision_issuers")
class ResponseCollisionIssuerEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Entity("response_collision_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class ResponseCollisionRootEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@ApiPropertyDescribe({ description: "issuer", type: EApiPropertyDescribeType.RELATION })
	@ManyToOne(() => ResponseCollisionIssuerEntity)
	public issuer!: ResponseCollisionIssuerEntity;

	@Column({ type: "varchar" })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity("CARD_TRANSFER")
class ResponseCollisionCardTransferEntity extends ResponseCollisionRootEntity {}

@ChildEntity("CARD_TRANSFER_ISSUER")
class ResponseCollisionCardTransferIssuerEntity extends ResponseCollisionRootEntity {}

@Entity("response_proto_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class ResponseProtoRootEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity("__proto__")
class ResponseProtoChildEntity extends ResponseProtoRootEntity {}

@Entity("response_suffix_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class ResponseSuffixRootEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity("fooDto")
class ResponseSuffixFooEntity extends ResponseSuffixRootEntity {}

class ResponseValidatorConstraint {
	public validate(): boolean {
		return true;
	}
}

function generateFor(entity: object, method: EApiRouteType = EApiRouteType.GET): TApiRouteDiscriminatedDtoProperties | Type<unknown> {
	const metadata: IApiEntity<IApiBaseEntity> = GenerateEntityInformation<IApiBaseEntity>(entity as IApiBaseEntity);
	const entityProperties: IApiControllerProperties<IApiBaseEntity> = { entity, routes: { [EApiRouteType.GET]: {} } } as unknown as IApiControllerProperties<IApiBaseEntity>;

	return DtoGenerateTableInheritanceResponse(entity, metadata, ApiControllerTableInheritancePlanCompiler.compile(entityProperties, metadata) as IApiControllerTableInheritancePlan, method, (entity as { name: string }).name);
}

class ResponseGuard implements CanActivate {
	public canActivate(): boolean {
		return true;
	}
}

const CONTROLLER_NAME: string = "TestController";
const ROW_ID: string = "00000000-0000-4000-8000-000000000001";
const SECRET_VALUE: string = "SECRET_DISCRIMINATOR_VALUE";
const properties: IApiControllerProperties<ResponseRootEntity> = { entity: ResponseRootEntity, routes: { [EApiRouteType.GET]: {} } } as unknown as IApiControllerProperties<ResponseRootEntity>;
const rootMetadata: IApiEntity<ResponseRootEntity> = GenerateEntityInformation<ResponseRootEntity>(ResponseRootEntity as unknown as IApiBaseEntity);
const plan: IApiControllerTableInheritancePlan = ApiControllerTableInheritancePlanCompiler.compile(properties, rootMetadata) as IApiControllerTableInheritancePlan;
const cursorQueryPlan: IApiControllerGetListQueryPlan = { pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR } } as unknown as IApiControllerGetListQueryPlan;

function generateGet(): TApiRouteDiscriminatedDtoProperties {
	return DtoGenerateTableInheritanceResponse(ResponseRootEntity, rootMetadata, plan, EApiRouteType.GET, CONTROLLER_NAME) as TApiRouteDiscriminatedDtoProperties;
}

function generateList(queryPlan?: IApiControllerGetListQueryPlan): Type<unknown> {
	return DtoGenerateTableInheritanceResponse(ResponseRootEntity, rootMetadata, plan, EApiRouteType.GET_LIST, CONTROLLER_NAME, undefined, undefined, queryPlan) as Type<unknown>;
}

function serializeGet(row: Record<string, unknown>): unknown {
	const { discriminator, type }: TApiRouteDiscriminatedDtoProperties = generateGet();
	const metadata: Pick<IApiRouteMetadata<ResponseRootEntity>, "response"> = { response: { discriminator, serialization: { isEnabled: true }, status: HttpStatus.OK, type } } as unknown as Pick<IApiRouteMetadata<ResponseRootEntity>, "response">;

	return ApiRouteSerializeResponse(metadata, row);
}

function serializeList(items: Array<Record<string, unknown>>): Record<string, unknown> {
	return plainToInstance(generateList(), { count: items.length, currentPage: 1, items, totalCount: items.length, totalPages: 1 }, { excludeExtraneousValues: true, strategy: "excludeAll" }) as Record<string, unknown>;
}

function captureError(action: () => unknown): Error {
	try {
		action();
	} catch (error) {
		return error as Error;
	}

	throw new Error("Expected the action to throw");
}

describe("DtoGenerateTableInheritanceResponse", () => {
	const cardRow: Record<string, unknown> = { cardNumber: "4111", id: ROW_ID, kind: EResponseKind.CARD_TRANSFER, qrPayload: "foreign" };
	const qrRow: Record<string, unknown> = { cardNumber: "foreign", id: ROW_ID, kind: EResponseKind.QR, qrPayload: "qr" };

	describe("GET", () => {
		it("names one variant DTO per discriminator value and keeps the discriminator", () => {
			const { discriminator, type }: TApiRouteDiscriminatedDtoProperties = generateGet();

			expect(Object.keys(discriminator.mapping)).toEqual([EResponseKind.CARD_TRANSFER, EResponseKind.QR]);
			expect(discriminator.mapping[EResponseKind.CARD_TRANSFER]?.name).toBe("TestControllerGetResponseCardTransferDTO");
			expect(discriminator.mapping[EResponseKind.QR]?.name).toBe("TestControllerGetResponseQrDTO");
			expect(discriminator.propertyName).toBe("kind");
			expect(discriminator.shouldKeepDiscriminatorProperty).toBe(true);
			expect(type).toHaveLength(2);
		});

		it("generates a separate response for each of two guard classes that share one name", () => {
			const createGuard = (): Type<CanActivate> => {
				class ResponseSameNameGuard implements CanActivate {
					public canActivate(): boolean {
						return true;
					}
				}

				return ResponseSameNameGuard;
			};
			const FirstGuard = createGuard();
			const SecondGuard = createGuard();
			const generate = (guard: Type<CanActivate>): TApiRouteDiscriminatedDtoProperties => DtoGenerateTableInheritanceResponse(ResponseRootEntity, rootMetadata, plan, EApiRouteType.GET, "ResponseSameNameGuard", undefined, guard) as TApiRouteDiscriminatedDtoProperties;

			expect(FirstGuard.name).toBe(SecondGuard.name);
			expect(generate(FirstGuard)).not.toBe(generate(SecondGuard));
			expect(generate(FirstGuard)).toBe(generate(FirstGuard));
			expect(generate(FirstGuard).discriminator.mapping[EResponseKind.QR]).not.toBe(generate(SecondGuard).discriminator.mapping[EResponseKind.QR]);
		});

		it("generates a separate response for two hand-built plans whose variant classes share a name", () => {
			const createVariant = (): new () => ResponseRootEntity => class ResponseSameNameVariantEntity extends ResponseRootEntity {};
			const createPlan = (entity: new () => ResponseRootEntity): IApiControllerTableInheritancePlan => ({ ...plan, childEntities: [entity], variants: [{ discriminatorValue: "same", entity, entityMetadata: rootMetadata as never }] }) as IApiControllerTableInheritancePlan;
			const generate = (entity: new () => ResponseRootEntity): unknown => DtoGenerateTableInheritanceResponse(ResponseRootEntity, rootMetadata, createPlan(entity), EApiRouteType.GET, "ResponseSameNameVariant");
			const First = createVariant();
			const Second = createVariant();

			expect(First.name).toBe(Second.name);
			expect(generate(First)).not.toBe(generate(Second));
			expect(generate(First)).toBe(generate(First));
		});

		it("serializes only the fields of the row variant", () => {
			expect(instanceToPlain(serializeGet(cardRow))).toEqual({ cardNumber: "4111", id: ROW_ID, kind: EResponseKind.CARD_TRANSFER });
			expect(instanceToPlain(serializeGet(qrRow))).toEqual({ id: ROW_ID, kind: EResponseKind.QR, qrPayload: "qr" });
		});

		it("does not repeat the DTO suffix of a discriminator value", () => {
			const { discriminator }: TApiRouteDiscriminatedDtoProperties = generateFor(ResponseSuffixRootEntity) as TApiRouteDiscriminatedDtoProperties;

			expect(ResponseSuffixFooEntity).toBeDefined();
			expect(discriminator.mapping.fooDto?.name).toBe("ResponseSuffixRootEntityGetResponseFooDTO");
		});

		it("fails closed on an unmapped discriminator value without echoing it", () => {
			const error: Error = captureError(() => serializeGet({ id: ROW_ID, kind: SECRET_VALUE }));

			expect(error.message).toContain("invalid discriminator value for field 'kind'");
			expect(error.message).not.toContain(SECRET_VALUE);
		});

		it("fails closed on a missing discriminator", () => {
			expect(() => serializeGet({ id: ROW_ID })).toThrow("missing required discriminator field 'kind'");
		});

		it("fails closed on a discriminator of another prototype", () => {
			expect(() => serializeGet({ id: ROW_ID, kind: "constructor" })).toThrow("invalid discriminator value for field 'kind'");
		});
	});

	describe("GET_LIST", () => {
		it("keeps the list wrapper name for page and cursor envelopes", () => {
			expect(generateList().name).toBe("TestControllerGetListPageDTO");
			expect(generateList(cursorQueryPlan).name).toBe("TestControllerGetListCursorPageDTO");
		});

		it("serializes mixed rows into their variant shape and keeps the discriminator", () => {
			const response: Record<string, unknown> = instanceToPlain(serializeList([cardRow, qrRow]));

			expect(response.items).toEqual([
				{ cardNumber: "4111", id: ROW_ID, kind: EResponseKind.CARD_TRANSFER },
				{ id: ROW_ID, kind: EResponseKind.QR, qrPayload: "qr" },
			]);
			expect(response.totalCount).toBe(2);
		});

		it("uses list variant DTOs apart from the GET ones", () => {
			const items: Array<object> = serializeList([cardRow, qrRow]).items as Array<object>;

			expect(items.map((item: object): string => item.constructor.name)).toEqual(["TestControllerGetListResponseCardTransferDTO", "TestControllerGetListResponseQrDTO"]);
		});

		it("fails closed when one row has an unmapped discriminator value without echoing it", () => {
			const error: Error = captureError(() => serializeList([cardRow, { id: ROW_ID, kind: SECRET_VALUE }]));

			expect(error.message).toContain("invalid discriminator value for field 'kind'");
			expect(error.message).not.toContain(SECRET_VALUE);
		});

		it("fails closed when one row has no discriminator", () => {
			expect(() => serializeList([{ id: ROW_ID }])).toThrow("missing required discriminator field 'kind'");
		});
	});

	describe("startup checks", () => {
		it("rejects a discriminator hidden from the generated response", () => {
			expect(ResponseHiddenChildEntity).toBeDefined();
			expect(() => generateFor(ResponseHiddenRootEntity)).toThrow(`Table inheritance root ${ResponseHiddenRootEntity.name} must expose its discriminator column "type" in GET and GET_LIST responses`);
		});

		it("gives a variant DTO the name of a relation DTO of another variant, which the bootstrap check rejects", () => {
			expect(ResponseCollisionCardTransferEntity).toBeDefined();
			expect(ResponseCollisionCardTransferIssuerEntity).toBeDefined();

			const { type: getVariants }: TApiRouteDiscriminatedDtoProperties = generateFor(ResponseCollisionRootEntity) as TApiRouteDiscriminatedDtoProperties;
			const listResponse: Type<unknown> = generateFor(ResponseCollisionRootEntity, EApiRouteType.GET_LIST) as Type<unknown>;

			expect(() => DtoSchemaNameAssertUnique(getVariants.map((variant: Type<unknown>): IDtoSchemaNameRoot => ({ origin: "the get response", type: variant })))).toThrow(`OpenAPI component name "${ResponseCollisionRootEntity.name}GetResponseCardTransferIssuerDTO" belongs to two different classes`);
			expect(() => DtoSchemaNameAssertUnique([{ origin: "the getList response", type: listResponse }])).toThrow(`OpenAPI component name "${ResponseCollisionRootEntity.name}GetListResponseCardTransferIssuerDTO" belongs to two different classes`);
		});

		it("keeps a __proto__ discriminator value as a mapping key", () => {
			const { discriminator }: TApiRouteDiscriminatedDtoProperties = generateFor(ResponseProtoRootEntity) as TApiRouteDiscriminatedDtoProperties;
			const metadata: Pick<IApiRouteMetadata<ResponseProtoRootEntity>, "response"> = { response: { discriminator, serialization: { isEnabled: true }, status: HttpStatus.OK, type: Object.values(discriminator.mapping) } } as unknown as Pick<IApiRouteMetadata<ResponseProtoRootEntity>, "response">;

			expect(ResponseProtoChildEntity).toBeDefined();
			expect(Object.getPrototypeOf(discriminator.mapping)).toBe(Object.prototype);
			expect(Object.keys(discriminator.mapping)).toEqual([ResponseProtoRootEntity.name, "__proto__"]);
			expect(instanceToPlain(ApiRouteSerializeResponse(metadata, { id: ROW_ID, type: "__proto__" }))).toEqual({ id: ROW_ID, type: "__proto__" });
		});
	});

	describe("cache", () => {
		it("returns the same response for the same inputs", () => {
			expect(generateGet()).toBe(generateGet());
			expect(generateList()).toBe(generateList());
			expect(generateList(cursorQueryPlan)).toBe(generateList(cursorQueryPlan));
		});

		it("keeps responses with validators apart", () => {
			const validated: TApiRouteDiscriminatedDtoProperties = DtoGenerateTableInheritanceResponse(ResponseRootEntity, rootMetadata, plan, EApiRouteType.GET, `${CONTROLLER_NAME}Validated`, { validators: [{ constraintClass: ResponseValidatorConstraint }] }) as TApiRouteDiscriminatedDtoProperties;

			expect(validated.discriminator.mapping[EResponseKind.QR]).not.toBe(generateGet().discriminator.mapping[EResponseKind.QR]);
		});

		it("keeps guarded responses apart", () => {
			const guarded: TApiRouteDiscriminatedDtoProperties = DtoGenerateTableInheritanceResponse(ResponseRootEntity, rootMetadata, plan, EApiRouteType.GET, `${CONTROLLER_NAME}Guarded`, undefined, ResponseGuard) as TApiRouteDiscriminatedDtoProperties;

			expect(guarded).not.toBe(generateGet());
			expect(guarded.discriminator.mapping[EResponseKind.QR]).not.toBe(generateGet().discriminator.mapping[EResponseKind.QR]);
		});

		it("keeps responses of two controllers apart under each controller's name", () => {
			const other: TApiRouteDiscriminatedDtoProperties = DtoGenerateTableInheritanceResponse(ResponseRootEntity, rootMetadata, plan, EApiRouteType.GET, "OtherController") as TApiRouteDiscriminatedDtoProperties;
			const otherList: Type<unknown> = DtoGenerateTableInheritanceResponse(ResponseRootEntity, rootMetadata, plan, EApiRouteType.GET_LIST, "OtherController") as Type<unknown>;

			expect(other).not.toBe(generateGet());
			expect(other.discriminator.mapping[EResponseKind.QR]?.name).toBe("OtherControllerGetResponseQrDTO");
			expect(otherList.name).toBe("OtherControllerGetListPageDTO");
		});
	});

	it("uses entity classes as the plan variants", () => {
		expect(plan.variants.map(({ entity }: { entity: unknown }): unknown => entity)).toEqual([ResponseCardTransferEntity, ResponseQrEntity]);
	});
});
