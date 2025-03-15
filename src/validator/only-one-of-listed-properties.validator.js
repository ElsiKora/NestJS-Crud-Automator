var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ValidatorConstraint } from "class-validator";
let OnlyOneOfListedProperties = class OnlyOneOfListedProperties {
    defaultMessage(properties) {
        return `only one of the following properties must be provided: ${properties.constraints.join(", ")}`;
    }
    validate(_value, properties) {
        const constraints = properties.constraints;
        if (constraints.length > 0) {
            let count = 0;
            const indexableObject = properties.object;
            for (const constraint of constraints) {
                if (Object.prototype.hasOwnProperty.call(indexableObject, constraint) && indexableObject[constraint] !== undefined) {
                    count++;
                }
            }
            return count === 1;
        }
        return true;
    }
};
OnlyOneOfListedProperties = __decorate([
    ValidatorConstraint({ async: false, name: "only-one-of-listed-properties" })
], OnlyOneOfListedProperties);
export { OnlyOneOfListedProperties };
//# sourceMappingURL=only-one-of-listed-properties.validator.js.map