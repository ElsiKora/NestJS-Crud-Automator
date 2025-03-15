var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ValidatorConstraint } from "class-validator";
let AllOrNoneOfListedProperties = class AllOrNoneOfListedProperties {
    defaultMessage(properties) {
        return `either all or none of the following properties must be provided: ${properties.constraints.join(", ")}`;
    }
    validate(_value, properties) {
        const constraints = properties.constraints;
        if (constraints.length > 0) {
            const indexableObject = properties.object;
            const definedFields = constraints.filter((field) => Object.prototype.hasOwnProperty.call(indexableObject, field) && indexableObject[field] !== undefined);
            return definedFields.length === 0 || definedFields.length === constraints.length;
        }
        return true;
    }
};
AllOrNoneOfListedProperties = __decorate([
    ValidatorConstraint({ async: false, name: "all-or-none-of-listed-properties" })
], AllOrNoneOfListedProperties);
export { AllOrNoneOfListedProperties };
//# sourceMappingURL=all-or-none-of-listed-properties.validator.js.map