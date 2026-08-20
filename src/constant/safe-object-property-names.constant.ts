export const UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT: ReadonlySet<string> = new Set<string>([...Object.getOwnPropertyNames(Object.prototype), "prototype"]);
