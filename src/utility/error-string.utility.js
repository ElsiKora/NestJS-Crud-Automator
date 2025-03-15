export function ErrorString(options) {
    return options.type.replace("{entity}", options.entity.name ? options.entity.name.toUpperCase() : "UNKNOWN_RESOURCE");
}
//# sourceMappingURL=error-string.utility.js.map