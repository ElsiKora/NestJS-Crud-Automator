/**
 * Returns canonical enum values while removing TypeScript numeric reverse mappings.
 * @param {Readonly<Record<string, number | string>>} enumObject - Runtime enum object.
 * @returns {ReadonlyArray<number | string>} Stable unique member values of the enum.
 */
export function EnumValues(enumObject: Readonly<Record<string, number | string>>): ReadonlyArray<number | string> {
	const values: Array<number | string> = Object.entries(enumObject)
		.filter(([key, value]: [string, number | string]): boolean => {
			const numericKey: number = Number(key);

			return !(key.trim() !== "" && Number.isFinite(numericKey) && typeof value === "string" && enumObject[value] === numericKey);
		})
		.map(([, value]: [string, number | string]): number | string => value);

	return Object.freeze([...new Set(values)]);
}
