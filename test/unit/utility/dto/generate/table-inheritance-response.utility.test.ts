import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerTableInheritancePlan } from "@interface/class/api/controller/table-inheritance";
import type { IApiControllerProperties, IApiRouteMetadata } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";

import { ApiControllerTableInheritancePlanCompiler } from "@class/api/controller/table-inheritance-plan-compiler.class";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiControllerGetListQueryPaginationMode, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { HttpStatus } from "@nestjs/common";
import { ApiRouteSerializeResponse } from "@utility/api/route/response/serialize.utility";
import { DtoGenerateTableInheritanceResponse } from "@utility/dto/generate/table-inheritance-response.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { ChildEntity, Column, Entity, PrimaryGeneratedColumn, TableInheritance } from "typeorm";
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

class ResponseGuard implements CanActivate {
	public canActivate(): boolean {
		return true;
	}
}

const ROW_ID: string = "00000000-0000-4000-8000-000000000001";
const SECRET_VALUE: string = "SECRET_DISCRIMINATOR_VALUE";
const properties: IApiControllerProperties<ResponseRootEntity> = { entity: ResponseRootEntity, routes: { [EApiRouteType.GET]: {} } } as unknown as IApiControllerProperties<ResponseRootEntity>;
const rootMetadata: IApiEntity<ResponseRootEntity> = GenerateEntityInformation<ResponseRootEntity>(ResponseRootEntity as unknown as IApiBaseEntity);
const plan: IApiControllerTableInheritancePlan = ApiControllerTableInheritancePlanCompiler.compile(properties, rootMetadata) as IApiControllerTableInheritancePlan;
const cursorQueryPlan: IApiControllerGetListQueryPlan = { pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR } } as unknown as IApiControllerGetListQueryPlan;

function generateGet(): TApiRouteDiscriminatedDtoProperties {
	return DtoGenerateTableInheritanceResponse(ResponseRootEntity, rootMetadata, plan, EApiRouteType.GET) as TApiRouteDiscriminatedDtoProperties;
}

function generateList(queryPlan?: IApiControllerGetListQueryPlan): Type<unknown> {
	return DtoGenerateTableInheritanceResponse(ResponseRootEntity, rootMetadata, plan, EApiRouteType.GET_LIST, undefined, undefined, queryPlan) as Type<unknown>;
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
			expect(discriminator.mapping[EResponseKind.CARD_TRANSFER]?.name).toBe("ResponseRootEntityGetResponseCardTransferDTO");
			expect(discriminator.mapping[EResponseKind.QR]?.name).toBe("ResponseRootEntityGetResponseQrDTO");
			expect(discriminator.propertyName).toBe("kind");
			expect(discriminator.shouldKeepDiscriminatorProperty).toBe(true);
			expect(type).toHaveLength(2);
		});

		it("serializes only the fields of the row variant", () => {
			expect(instanceToPlain(serializeGet(cardRow))).toEqual({ cardNumber: "4111", id: ROW_ID, kind: EResponseKind.CARD_TRANSFER });
			expect(instanceToPlain(serializeGet(qrRow))).toEqual({ id: ROW_ID, kind: EResponseKind.QR, qrPayload: "qr" });
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
			expect(generateList().name).toBe("ResponseRootEntityGetListResponseItemsDTO");
			expect(generateList(cursorQueryPlan).name).toBe("ResponseRootEntityGetListCursorResponseItemsDTO");
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

			expect(items.map((item: object): string => item.constructor.name)).toEqual(["ResponseRootEntityGetListResponseCardTransferDTO", "ResponseRootEntityGetListResponseQrDTO"]);
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

	describe("cache", () => {
		it("returns the same response for the same inputs", () => {
			expect(generateGet()).toBe(generateGet());
			expect(generateList()).toBe(generateList());
			expect(generateList(cursorQueryPlan)).toBe(generateList(cursorQueryPlan));
		});

		it("keeps guarded responses apart", () => {
			const guarded: TApiRouteDiscriminatedDtoProperties = DtoGenerateTableInheritanceResponse(ResponseRootEntity, rootMetadata, plan, EApiRouteType.GET, undefined, ResponseGuard) as TApiRouteDiscriminatedDtoProperties;

			expect(guarded).not.toBe(generateGet());
			expect(guarded.discriminator.mapping[EResponseKind.QR]).not.toBe(generateGet().discriminator.mapping[EResponseKind.QR]);
		});
	});

	it("uses entity classes as the plan variants", () => {
		expect(plan.variants.map(({ entity }: { entity: unknown }): unknown => entity)).toEqual([ResponseCardTransferEntity, ResponseQrEntity]);
	});
});
