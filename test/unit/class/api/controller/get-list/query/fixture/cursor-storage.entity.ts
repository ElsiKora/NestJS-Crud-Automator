import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { GetDefaultStringFormatProperties } from "@utility/api/get-default-string-format-properties";
import { Column, Entity, PrimaryColumn } from "typeorm";

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
	@ApiPropertyDescribe({ description: "opaque cursor integer", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 10_000_000_000_000_000, minimum: -10_000_000_000_000_000, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public opaqueInteger!: number;

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

	@Column({ precision: 0, type: "time with time zone" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	public unsafeTimezoneTime!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "unsafe varchar boolean", type: EApiPropertyDescribeType.BOOLEAN })
	public unsafeVarcharBoolean!: boolean;
}
