export function DtoIsPropertyExposedForGuard(method, propertyMetadata, dtoType, currentGuard) {
    const properties = propertyMetadata.properties?.[method];
    if (!properties?.[dtoType]?.guard || !currentGuard) {
        return true;
    }
    const { guards, isInverse = false } = properties?.[dtoType]?.guard ?? {};
    const guardArray = Array.isArray(guards) ? guards : [guards];
    const isGuardMatch = guardArray.includes(currentGuard);
    return isInverse ? !isGuardMatch : isGuardMatch;
}
//# sourceMappingURL=is-property-exposed-for-guard.utility.js.map