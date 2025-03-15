import { ApiControllerFactory } from "../../factory/api/controller.factory";
export const ApiController = (options) => (target) => {
    const factory = new ApiControllerFactory(target, options);
    factory.init();
    const ValidatedController = class extends target {
        constructor(..._arguments) {
            super(..._arguments);
        }
    };
    Object.defineProperty(ValidatedController, "name", { value: target.name });
    return ValidatedController;
};
//# sourceMappingURL=controller.decorator.js.map