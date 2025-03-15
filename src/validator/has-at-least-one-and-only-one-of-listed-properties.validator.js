var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ValidatorConstraint } from "class-validator";
let HasAtLeastOneAndOnlyOneOfListedProperties = class HasAtLeastOneAndOnlyOneOfListedProperties {
    defaultMessage(properties) {
        return `at least one and only one of the following properties must be provided: ${properties.constraints.join(", ")}`;
    }
    validate(_value, properties) {
        const constraints = properties.constraints;
        if (constraints.length > 0) {
            let isExists = false;
            let count = 0;
            const indexableObject = properties.object;
            for (const constraint of constraints) {
                if (Object.prototype.hasOwnProperty.call(indexableObject, constraint) && indexableObject[constraint] !== undefined) {
                    isExists = true;
                    count++;
                }
            }
            if (count !== 1) {
                return false;
            }
            return isExists;
        }
        return true;
    }
};
HasAtLeastOneAndOnlyOneOfListedProperties = __decorate([
    ValidatorConstraint({ async: false, name: "has-at-least-one-of-listed-properties" })
], HasAtLeastOneAndOnlyOneOfListedProperties);
export { HasAtLeastOneAndOnlyOneOfListedProperties };
//# sourceMappingURL=has-at-least-one-and-only-one-of-listed-properties.validator.js.map