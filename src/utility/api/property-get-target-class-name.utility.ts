/**
 * Names the class a property decorator was applied to.
 * @param {object} target - DTO prototype, or the class itself for a static property.
 * @returns {string} The class name, or a placeholder for an anonymous class.
 */
export function ApiPropertyGetTargetClassName(target: object): string {
	const owner: { name: string } = typeof target === "function" ? target : target.constructor;

	return owner.name || "<anonymous class>";
}
