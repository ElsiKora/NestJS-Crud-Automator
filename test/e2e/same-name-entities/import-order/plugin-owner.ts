import "reflect-metadata";

import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../src/index";

// Imported before the controller, as a plugin might declare it.
@Entity("e2e_same_name_import_order_plugin_owners")
export class SameNameImportOrderOwnerEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "owner id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "owner field", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public pluginOnly!: string;
}
