import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerTableInheritancePlan, IApiControllerTableInheritanceVariant } from "@interface/class/api/controller/table-inheritance";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { ColumnType } from "typeorm";

import { ApiControllerTableInheritancePlanCompiler } from "@class/api/controller/table-inheritance-plan-compiler.class";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { ChildEntity, Column, Entity, PrimaryGeneratedColumn, TableInheritance } from "typeorm";
import { describe, expect, it } from "vitest";

enum EPlanEnumKind {
	BANK_TRANSFER = "BANK_TRANSFER",
	CARD_TRANSFER = "CARD_TRANSFER",
	QR = "QR",
}

enum EPlanOutsideKind {
	KNOWN = "KNOWN",
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

const EnumKindDescribe: PropertyDecorator = ApiPropertyDescribe({ description: "kind", enum: EPlanEnumKind, enumName: "EPlanEnumKind", type: EApiPropertyDescribeType.ENUM });

@Entity("plan_enum_roots")
@TableInheritance({ column: { enum: EPlanEnumKind, name: "kind", type: "enum" } })
class PlanEnumRootEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ enum: EPlanEnumKind, type: "enum" })
	@EnumKindDescribe
	public kind!: EPlanEnumKind;
}

@ChildEntity()
abstract class PlanEnumTransferEntity extends PlanEnumRootEntity {
	@Column({ type: "varchar" })
	@StringDescribe("bank name")
	public bankName!: string;
}

@ChildEntity(EPlanEnumKind.BANK_TRANSFER)
class PlanEnumBankTransferEntity extends PlanEnumTransferEntity {}

@ChildEntity(EPlanEnumKind.CARD_TRANSFER)
class PlanEnumCardTransferEntity extends PlanEnumTransferEntity {
	@Column({ type: "varchar" })
	@StringDescribe("card number")
	public cardNumber!: string;
}

@ChildEntity(EPlanEnumKind.QR)
class PlanEnumQrEntity extends PlanEnumRootEntity {
	@Column({ type: "varchar" })
	@StringDescribe("qr payload")
	public qrPayload!: string;
}

@Entity("plan_varchar_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class PlanVarcharRootEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity()
class PlanVarcharDefaultValueEntity extends PlanVarcharRootEntity {}

abstract class PlanVarcharPlainBase extends PlanVarcharRootEntity {
	public get marker(): string {
		return "plain";
	}
}

@ChildEntity("EXPLICIT")
class PlanVarcharExplicitValueEntity extends PlanVarcharPlainBase {
	@Column({ type: "varchar" })
	@StringDescribe("explicit field")
	public explicitField!: string;
}

@Entity("plan_childless_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class PlanChildlessRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Entity("plan_outside_roots")
@TableInheritance({ column: { enum: EPlanOutsideKind, name: "kind", type: "enum" } })
class PlanOutsideRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ enum: EPlanOutsideKind, type: "enum" })
	@ApiPropertyDescribe({ description: "kind", enum: EPlanOutsideKind, enumName: "EPlanOutsideKind", type: EApiPropertyDescribeType.ENUM })
	public kind!: EPlanOutsideKind;
}

@ChildEntity("OUTSIDE")
class PlanOutsideChildEntity extends PlanOutsideRootEntity {}

@Entity("plan_collision_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class PlanCollisionRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity("CARD_TRANSFER")
class PlanCollisionFirstEntity extends PlanCollisionRootEntity {}

@ChildEntity("card-transfer")
class PlanCollisionSecondEntity extends PlanCollisionRootEntity {}

@Entity("plan_empty_suffix_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class PlanEmptySuffixRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity("---")
class PlanEmptySuffixChildEntity extends PlanEmptySuffixRootEntity {}

@Entity("plan_numeric_roots")
@TableInheritance({ column: { name: "type", type: "int" } })
class PlanNumericRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "type", enum: { ONE: "1" }, enumName: "EPlanNumeric", type: EApiPropertyDescribeType.ENUM })
	public type!: number;
}

@ChildEntity(1)
class PlanNumericChildEntity extends PlanNumericRootEntity {}

@Entity("plan_reflected_number_roots")
@TableInheritance({ column: { name: "type" } })
class PlanReflectedNumberRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column()
	@StringDescribe("type")
	public type!: number;
}

@ChildEntity("A")
class PlanReflectedNumberChildEntity extends PlanReflectedNumberRootEntity {}

@Entity("plan_upper_case_type_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class PlanUpperCaseTypeRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "INT" as ColumnType })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity("A")
class PlanUpperCaseTypeChildEntity extends PlanUpperCaseTypeRootEntity {}

@Entity("plan_undescribed_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class PlanUndescribedRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	public type!: string;
}

@ChildEntity("A")
class PlanUndescribedChildEntity extends PlanUndescribedRootEntity {}

@Entity("plan_undeclared_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class PlanUndeclaredRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@ChildEntity("A")
class PlanUndeclaredChildEntity extends PlanUndeclaredRootEntity {}

@Entity("plan_late_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class PlanLateRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity("EARLY")
class PlanLateEarlyEntity extends PlanLateRootEntity {}

enum EPlanNumericKind {
	ONE = 1,
}

@Entity("plan_default_column_roots")
@TableInheritance()
class PlanDefaultColumnRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity("A")
class PlanDefaultColumnChildEntity extends PlanDefaultColumnRootEntity {}

@Entity("plan_inheritance_enum_roots")
@TableInheritance({ column: { enum: EPlanOutsideKind, name: "kind", type: "enum" } })
class PlanInheritanceEnumRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	@StringDescribe("kind")
	public kind!: string;
}

@ChildEntity("OUTSIDE")
class PlanInheritanceEnumChildEntity extends PlanInheritanceEnumRootEntity {}

@Entity("plan_column_enum_roots")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
class PlanColumnEnumRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ enum: EPlanOutsideKind, type: "enum" })
	@StringDescribe("kind")
	public kind!: string;
}

@ChildEntity("OUTSIDE")
class PlanColumnEnumChildEntity extends PlanColumnEnumRootEntity {}

abstract class PlanAncestorColumnBase {
	@Column({ enum: EPlanOutsideKind, type: "enum" })
	@StringDescribe("kind")
	public kind!: string;
}

@Entity("plan_ancestor_column_roots")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
class PlanAncestorColumnRootEntity extends PlanAncestorColumnBase {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@ChildEntity("OUTSIDE")
class PlanAncestorColumnChildEntity extends PlanAncestorColumnRootEntity {}

@Entity("plan_numeric_enum_roots")
@TableInheritance({ column: { enum: EPlanNumericKind, name: "kind", type: "enum" } })
class PlanNumericEnumRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ enum: EPlanNumericKind, type: "enum" })
	@StringDescribe("kind")
	public kind!: EPlanNumericKind;
}

@ChildEntity("ONE")
class PlanNumericEnumChildEntity extends PlanNumericEnumRootEntity {}

@Entity("plan_array_enum_roots")
@TableInheritance({ column: { enum: ["A", "B"], name: "kind", type: "enum" } })
class PlanArrayEnumRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ enum: ["A", "B"], type: "enum" })
	@StringDescribe("kind")
	public kind!: string;
}

@ChildEntity("A")
class PlanArrayEnumChildEntity extends PlanArrayEnumRootEntity {}

@Entity("plan_unselected_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class PlanUnselectedRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ select: false, type: "varchar" })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity("A")
class PlanUnselectedChildEntity extends PlanUnselectedRootEntity {}

@Entity("plan_integer_roots")
@TableInheritance({ column: { name: "type", type: "int" } })
class PlanIntegerRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "int" })
	@StringDescribe("type")
	public type!: number;
}

@ChildEntity("7")
class PlanIntegerChildEntity extends PlanIntegerRootEntity {}

@Entity("plan_non_string_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class PlanNonStringRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity(1)
class PlanNonStringChildEntity extends PlanNonStringRootEntity {}

@Entity("plan_items_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class PlanItemsRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity("ITEMS")
class PlanItemsChildEntity extends PlanItemsRootEntity {}

@Entity("plan_invalid_name_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class PlanInvalidNameRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity("myType foo")
class PlanInvalidNameChildEntity extends PlanInvalidNameRootEntity {}

@Entity("plan_spaced_name_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class PlanSpacedNameRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity("my type")
class PlanSpacedNameChildEntity extends PlanSpacedNameRootEntity {}

@Entity("plan_dotted_name_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class PlanDottedNameRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	@StringDescribe("type")
	public type!: string;
}

@ChildEntity("card.transfer")
class PlanDottedNameChildEntity extends PlanDottedNameRootEntity {}

@Entity("plan_plain_entities")
class PlanPlainEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

class PlanManualResponseDto {}

function compile(entity: object, routes: Record<string, unknown> = { [EApiRouteType.GET]: {} }): IApiControllerTableInheritancePlan | undefined {
	const properties: IApiControllerProperties<IApiBaseEntity> = { entity, routes } as unknown as IApiControllerProperties<IApiBaseEntity>;

	return ApiControllerTableInheritancePlanCompiler.compile(properties, GenerateEntityInformation<IApiBaseEntity>(entity as unknown as IApiBaseEntity));
}

function variantValues(plan: IApiControllerTableInheritancePlan | undefined): Array<string> {
	return (plan?.variants ?? []).map(({ discriminatorValue }: IApiControllerTableInheritanceVariant): string => discriminatorValue);
}

describe("ApiControllerTableInheritancePlanCompiler", () => {
	describe("variant discovery", () => {
		it("keeps every leaf and skips a root and intermediate class the enum cannot store", () => {
			const plan: IApiControllerTableInheritancePlan | undefined = compile(PlanEnumRootEntity);

			expect(variantValues(plan)).toEqual([EPlanEnumKind.BANK_TRANSFER, EPlanEnumKind.CARD_TRANSFER, EPlanEnumKind.QR]);
			expect(plan?.variants.map(({ entity }: IApiControllerTableInheritanceVariant): unknown => entity)).toEqual([PlanEnumBankTransferEntity, PlanEnumCardTransferEntity, PlanEnumQrEntity]);
			expect(plan?.childEntities).toContain(PlanEnumTransferEntity);
			expect(plan?.discriminatorPropertyName).toBe("kind");
			expect(plan?.rootEntity).toBe(PlanEnumRootEntity);
		});

		it("gives a leaf the columns of its root, intermediate class and own declaration", () => {
			const plan: IApiControllerTableInheritancePlan | undefined = compile(PlanEnumRootEntity);
			const cardVariant: IApiControllerTableInheritanceVariant | undefined = plan?.variants.find(({ discriminatorValue }: IApiControllerTableInheritanceVariant): boolean => discriminatorValue === (EPlanEnumKind.CARD_TRANSFER as string));
			const columnNames: Array<string> | undefined = cardVariant?.entityMetadata.columns.map(({ name }: IApiEntityColumn<unknown>): string => String(name));

			expect(columnNames).toEqual(expect.arrayContaining(["id", "kind", "bankName", "cardNumber"]));
			expect(columnNames).not.toContain("qrPayload");
		});

		it("keeps the root value on a varchar column, where root rows are storable", () => {
			expect(variantValues(compile(PlanVarcharRootEntity))).toEqual(["EXPLICIT", "PlanVarcharDefaultValueEntity", "PlanVarcharRootEntity"]);
		});

		it("uses the class name for a child entity without an explicit value", () => {
			const plan: IApiControllerTableInheritancePlan | undefined = compile(PlanVarcharRootEntity);

			expect(plan?.variants.find(({ entity }: IApiControllerTableInheritanceVariant): boolean => entity === (PlanVarcharDefaultValueEntity as unknown))?.discriminatorValue).toBe("PlanVarcharDefaultValueEntity");
		});

		it("walks describe metadata through a plain class without columns", () => {
			const plan: IApiControllerTableInheritancePlan | undefined = compile(PlanVarcharRootEntity);
			const explicitVariant: IApiControllerTableInheritanceVariant | undefined = plan?.variants.find(({ entity }: IApiControllerTableInheritanceVariant): boolean => entity === (PlanVarcharExplicitValueEntity as unknown));

			expect(explicitVariant?.entityMetadata.columns.map(({ name }: IApiEntityColumn<unknown>): string => String(name))).toEqual(expect.arrayContaining(["id", "type", "explicitField"]));
		});

		it("uses the TypeORM default discriminator name", () => {
			expect(PlanDefaultColumnChildEntity).toBeDefined();
			expect(compile(PlanDefaultColumnRootEntity)?.discriminatorPropertyName).toBe("type");
		});

		it("reads an array enum", () => {
			expect(variantValues(compile(PlanArrayEnumRootEntity))).toEqual(["A"]);
			expect(compile(PlanArrayEnumRootEntity)?.variants[0]?.entity).toBe(PlanArrayEnumChildEntity);
		});

		it("takes the discriminator options from the root column, as TypeORM does, instead of the inheritance options", () => {
			expect(PlanInheritanceEnumChildEntity).toBeDefined();
			expect(variantValues(compile(PlanInheritanceEnumRootEntity))).toEqual(["OUTSIDE", PlanInheritanceEnumRootEntity.name]);
		});
	});

	describe("no polymorphic response", () => {
		it("returns undefined for an entity outside table inheritance", () => {
			expect(compile(PlanPlainEntity)).toBeUndefined();
		});

		it("returns undefined for a child entity controller", () => {
			expect(compile(PlanEnumQrEntity)).toBeUndefined();
		});

		it("returns undefined when read routes are not generated", () => {
			expect(compile(PlanEnumRootEntity, { [EApiRouteType.GET]: { generation: { isEnabled: false } }, [EApiRouteType.GET_LIST]: { generation: { isEnabled: false } } })).toBeUndefined();
		});

		it("returns undefined when every generated read route has a manual response DTO", () => {
			const manualResponse: Record<string, unknown> = { dto: { [EApiDtoType.RESPONSE]: PlanManualResponseDto } };

			expect(compile(PlanEnumRootEntity, { [EApiRouteType.GET]: manualResponse, [EApiRouteType.GET_LIST]: manualResponse })).toBeUndefined();
		});

		it("compiles when one read route still generates its response", () => {
			expect(compile(PlanEnumRootEntity, { [EApiRouteType.GET]: { dto: { [EApiDtoType.RESPONSE]: PlanManualResponseDto } } })).toBeDefined();
		});
	});

	describe("startup errors", () => {
		it("rejects a leaf value outside the discriminator enum", () => {
			expect(() => compile(PlanOutsideRootEntity)).toThrow(`Child entity ${PlanOutsideChildEntity.name} discriminator value is not in the "kind" column enum of ${PlanOutsideRootEntity.name}`);
		});

		it("rejects values that collapse to one DTO name suffix", () => {
			expect(PlanCollisionFirstEntity).toBeDefined();
			expect(PlanCollisionSecondEntity).toBeDefined();
			expect(() => compile(PlanCollisionRootEntity)).toThrow(/must produce unique non-empty DTO name suffixes, "card-transfer" conflicts with "CARD_TRANSFER"/);
		});

		it("rejects a value without a DTO name suffix", () => {
			expect(PlanEmptySuffixChildEntity).toBeDefined();
			expect(() => compile(PlanEmptySuffixRootEntity)).toThrow(/must produce unique non-empty DTO name suffixes, "---"/);
		});

		it("rejects a non-string discriminator value", () => {
			expect(() => compile(PlanNonStringRootEntity)).toThrow(`Generated polymorphic responses require a non-empty string discriminator value on ${PlanNonStringChildEntity.name}`);
		});

		it("rejects a numeric discriminator column, whatever the child values", () => {
			expect(PlanNumericChildEntity).toBeDefined();
			expect(PlanIntegerChildEntity).toBeDefined();
			expect(() => compile(PlanNumericRootEntity)).toThrow(`Table inheritance root ${PlanNumericRootEntity.name} must store its discriminator column "type" as a string`);
			expect(() => compile(PlanIntegerRootEntity)).toThrow(`Table inheritance root ${PlanIntegerRootEntity.name} must store its discriminator column "type" as a string`);
		});

		it.each([
			["a number property without a column type", PlanReflectedNumberRootEntity, PlanReflectedNumberChildEntity],
			["an upper-case numeric column type", PlanUpperCaseTypeRootEntity, PlanUpperCaseTypeChildEntity],
		])("rejects %s as a numeric discriminator column", (_case: string, root: { name: string }, child: object) => {
			expect(child).toBeDefined();
			expect(() => compile(root)).toThrow(`Table inheritance root ${root.name} must store its discriminator column "type" as a string`);
		});

		it("rejects a root without a loaded child entity", () => {
			expect(() => compile(PlanChildlessRootEntity)).toThrow(`Table inheritance root ${PlanChildlessRootEntity.name} has no child entity loaded when the controller is decorated. Import the child entity files before the controller.`);
		});

		it("rejects an unselected discriminator column", () => {
			expect(PlanUnselectedChildEntity).toBeDefined();
			expect(() => compile(PlanUnselectedRootEntity)).toThrow(`Table inheritance root ${PlanUnselectedRootEntity.name} must select its discriminator column "type", remove select: false`);
		});

		it("rejects a value that turns a list variant into the list wrapper name", () => {
			expect(PlanItemsChildEntity).toBeDefined();
			expect(() => compile(PlanItemsRootEntity)).toThrow(`Discriminator value "ITEMS" of ${PlanItemsRootEntity.name} produces a GET_LIST DTO name ending in ${PlanItemsRootEntity.name}GetListResponseItemsDTO, which is the generated GET_LIST wrapper name`);
		});

		it.each([
			["myType foo", PlanInvalidNameRootEntity, PlanInvalidNameChildEntity],
			["my type", PlanSpacedNameRootEntity, PlanSpacedNameChildEntity],
			["card.transfer", PlanDottedNameRootEntity, PlanDottedNameChildEntity],
		])("rejects the value %s with a character outside letters, digits, _ and -", (value: string, root: { name: string }, child: object) => {
			expect(child).toBeDefined();
			expect(() => compile(root)).toThrow(`Discriminator value "${value}" of ${root.name} must use only letters, digits, "_" and "-", because it becomes part of generated DTO names`);
		});

		it.each([
			["the root column", PlanColumnEnumRootEntity, PlanColumnEnumChildEntity],
			["an ancestor column", PlanAncestorColumnRootEntity, PlanAncestorColumnChildEntity],
		])("reads the discriminator enum from %s", (_source: string, root: object, child: { name: string }) => {
			expect(() => compile(root)).toThrow(`Child entity ${child.name} discriminator value is not in the "kind" column enum`);
		});

		it("ignores the reverse keys of a numeric enum", () => {
			expect(() => compile(PlanNumericEnumRootEntity)).toThrow(`Child entity ${PlanNumericEnumChildEntity.name} discriminator value is not in the "kind" column enum`);
		});

		it("rejects a discriminator column without description", () => {
			expect(PlanUndescribedChildEntity).toBeDefined();
			expect(() => compile(PlanUndescribedRootEntity)).toThrow(`Table inheritance root ${PlanUndescribedRootEntity.name} must declare and describe its discriminator column "type"`);
		});

		it("rejects a discriminator column missing from the root class", () => {
			expect(PlanUndeclaredChildEntity).toBeDefined();
			expect(() => compile(PlanUndeclaredRootEntity)).toThrow(`Table inheritance root ${PlanUndeclaredRootEntity.name} must declare and describe its discriminator column "type"`);
		});
	});

	describe("assertChildEntitiesLoaded", () => {
		it("does nothing without a plan", () => {
			expect(() => ApiControllerTableInheritancePlanCompiler.assertChildEntitiesLoaded("PlainController", undefined)).not.toThrow();
		});

		it("names every child loaded after the plan was compiled and the import that fixes it", () => {
			const plan: IApiControllerTableInheritancePlan | undefined = compile(PlanLateRootEntity);

			expect(PlanLateEarlyEntity).toBeDefined();
			expect(() => ApiControllerTableInheritancePlanCompiler.assertChildEntitiesLoaded("LateController", plan)).not.toThrow();

			@ChildEntity("LATE_B")
			class PlanLateSecondEntity extends PlanLateRootEntity {}

			@ChildEntity("LATE_A")
			class PlanLateFirstEntity extends PlanLateRootEntity {}

			expect(() => ApiControllerTableInheritancePlanCompiler.assertChildEntitiesLoaded("LateController", plan)).toThrow(`Controller LateController was decorated before child entities ${PlanLateFirstEntity.name}, ${PlanLateSecondEntity.name} were loaded. Import the child entity files before the controller`);
		});
	});

	it("leaves entity metadata of a plain entity without a plan", () => {
		const metadata: IApiEntity<PlanPlainEntity> = GenerateEntityInformation<PlanPlainEntity>(PlanPlainEntity as unknown as IApiBaseEntity);

		expect(metadata.tableInheritance).toBeUndefined();
	});
});
