/**
 * Removes one trailing `DTO`, in any case, because every generated DTO name adds its own `DTO`.
 * So it is the exact inverse of adding the suffix: `FooDtoDto` gives `FooDto`, and a generated `<Name>DTO` always gives `<Name>`.
 * A name with nothing else in it stays as it is, because `dto` is a legal class, property or discriminator name and the library must not ask for a rename.
 * @param {string} name - Class name, property name or name segment.
 * @returns {string} The name without the suffix, or the name itself when nothing else is left.
 */
export function DtoSchemaNameStripSuffix(name: string): string {
	const stripped: string = name.replace(/dto$/i, "");

	return stripped === "" ? name : stripped;
}
