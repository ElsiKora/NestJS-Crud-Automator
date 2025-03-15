import { EApiPropertyDateIdentifier } from "../../enum";
export const DtoHandleDateProperty = (propertyName, identifier) => {
    const baseTypes = {
        [EApiPropertyDateIdentifier.CREATED_AT]: { from: EApiPropertyDateIdentifier.CREATED_AT_FROM, to: EApiPropertyDateIdentifier.CREATED_AT_TO },
        [EApiPropertyDateIdentifier.RECEIVED_AT]: { from: EApiPropertyDateIdentifier.RECEIVED_AT_FROM, to: EApiPropertyDateIdentifier.RECEIVED_AT_TO },
        [EApiPropertyDateIdentifier.UPDATED_AT]: { from: EApiPropertyDateIdentifier.UPDATED_AT_FROM, to: EApiPropertyDateIdentifier.UPDATED_AT_TO },
    };
    return baseTypes[identifier]
        ? [
            { identifier: baseTypes[identifier].from, name: `${propertyName}From` },
            { identifier: baseTypes[identifier].to, name: `${propertyName}To` },
        ]
        : [{ identifier, name: propertyName }];
};
//# sourceMappingURL=handle-date-property.utility.js.map