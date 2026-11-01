import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { GetDefaultStringFormatProperties } from "@utility/api/get-default-string-format-properties";
import { Column, CreateDateColumn, Entity, PrimaryColumn, VersionColumn } from "typeorm";

import { ECursorStorageState } from "./cursor-storage-state.enum";

@Entity("cursor_storage_entities")
export class CursorStorageQueryEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "boolean" })
	@ApiPropertyDescribe({ description: "safe boolean", type: EApiPropertyDescribeType.BOOLEAN })
	public safeBoolean!: boolean;

	@Column({ type: "smallint" })
	@ApiPropertyDescribe({ description: "safe enum", enum: ECursorStorageState, enumName: "ECursorStorageState", type: EApiPropertyDescribeType.ENUM })
	public safeEnum!: ECursorStorageState;

	@Column({ type: "bigint" })
	@ApiPropertyDescribe({ ...GetDefaultStringFormatProperties(EApiPropertyStringType.BIGINT_STRING), description: "safe bigint string", type: EApiPropertyDescribeType.STRING })
	public safeBigint!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "safe integer", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: Number.MAX_SAFE_INTEGER, minimum: Number.MIN_SAFE_INTEGER, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public safeInteger!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "opaque cursor integer", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 9_000_000_000_000_000, minimum: -9_000_000_000_000_000, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public opaqueInteger!: number;

	@CreateDateColumn({ precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public safeCreateDateTimestamptz!: Date;

	@Column({ precision: 2, type: "timestamp with time zone" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public safeLongAliasTimestamptz!: Date;

	@Column({ precision: 0, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public safeSecondTimestamptz!: Date;

	@Column({ precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public safeTimestamptz!: Date;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({ description: "safe UUID", type: EApiPropertyDescribeType.UUID })
	public safeUuid!: string;

	@Column({ type: "enum", enum: ECursorStorageState, array: true })
	@ApiPropertyDescribe({ description: "unsafe enum array", enum: ECursorStorageState, enumName: "ECursorStorageArrayState", type: EApiPropertyDescribeType.ENUM })
	public unsafeArrayEnum!: ECursorStorageState;

	@Column({ type: "bigint" })
	@ApiPropertyDescribe({ description: "unsafe bigint number", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: Number.MAX_SAFE_INTEGER, minimum: Number.MIN_SAFE_INTEGER, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public unsafeBigintNumber!: number;

	@Column({ type: "blob" })
	@ApiPropertyDescribe({ description: "unsafe blob UUID", type: EApiPropertyDescribeType.UUID })
	public unsafeBlobUuid!: string;

	@Column({ type: "simple-json" })
	@ApiPropertyDescribe({ description: "unsafe JSON string", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public unsafeJsonString!: string;

	@Column({ type: "date" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public unsafeDateColumn!: Date;

	@Column({ precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public unsafeDateFormatTimestamptz!: Date;

	@CreateDateColumn({ precision: 3 })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public unsafeCreateDateWithoutType!: Date;

	@Column({ precision: 3, type: Date })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public unsafeDateConstructor!: Date;

	@Column({ precision: 4, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public unsafeFourDigitTimestamptz!: Date;

	@Column({ precision: 2.5, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public unsafeFractionalPrecisionTimestamptz!: Date;

	@Column({ precision: 3, type: "timestamp without time zone" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public unsafeLongAliasTimestamp!: Date;

	@Column({ precision: Number.NaN, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public unsafeNanPrecisionTimestamptz!: Date;

	@Column({ precision: -1, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public unsafeNegativePrecisionTimestamptz!: Date;

	@Column({ precision: 3, type: "timestamp" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public unsafeTimestamp!: Date;

	@Column({ precision: 6, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public unsafeSixDigitTimestamptz!: Date;

	@Column({ precision: 0, type: "time with time zone" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public unsafeTimezoneTime!: string;

	@Column({ type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public unsafeUnsetPrecisionTimestamptz!: Date;

	@VersionColumn()
	@ApiPropertyDescribe({ description: "unsafe untyped version", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 100, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public unsafeUntypedVersion!: number;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "unsafe varchar boolean", type: EApiPropertyDescribeType.BOOLEAN })
	public unsafeVarcharBoolean!: boolean;
}
