import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { getMetadataArgsStorage } from "typeorm";

/**
 * Returns the table name declared on an entity class by `@Entity`. A table inheritance child reads the table of its root.
 * @param {unknown} target - Entity class.
 * @returns {string} The declared table name, or a stand-in when the class declares none.
 */
export function GetEntityTableName(target: unknown): string {
	for (const current of GetClassHierarchy(target)) {
		const name: string | undefined = getMetadataArgsStorage().tables.find((table: { name?: string; target: unknown }): boolean => table.target === current && Boolean(table.name))?.name;

		if (name) {
			return name;
		}
	}

	return "unnamed";
}
