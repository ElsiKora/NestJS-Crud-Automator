import { EApiFunctionType } from "../../enum";
import { ApiFunction } from "./function";
export function ApiService(properties) {
    const { entity } = properties;
    return function (target) {
        const originalConstructor = target;
        const ExtendedClass = class extends originalConstructor {
            constructor(..._arguments) {
                super(..._arguments);
                if (!Object.prototype.hasOwnProperty.call(this, EApiFunctionType.GET_LIST)) {
                    Object.defineProperty(this, EApiFunctionType.GET_LIST, {
                        configurable: true,
                        enumerable: true,
                        value: async function (properties, relations) {
                            const apiFunctionDecorator = ApiFunction({
                                entity,
                                relations,
                                type: EApiFunctionType.GET_LIST,
                            });
                            const descriptor = {
                                configurable: true,
                                enumerable: true,
                                value: () => void 0,
                                writable: true,
                            };
                            const decoratedDescriptor = apiFunctionDecorator(this, EApiFunctionType.GET_LIST, descriptor);
                            return decoratedDescriptor.value.call(this, properties);
                        },
                        writable: true,
                    });
                }
                if (!Object.prototype.hasOwnProperty.call(this, EApiFunctionType.GET)) {
                    Object.defineProperty(this, EApiFunctionType.GET, {
                        configurable: true,
                        enumerable: true,
                        value: async function (properties) {
                            const apiFunctionDecorator = ApiFunction({
                                entity,
                                type: EApiFunctionType.GET,
                            });
                            const descriptor = {
                                configurable: true,
                                enumerable: true,
                                value: () => void 0,
                                writable: true,
                            };
                            const decoratedDescriptor = apiFunctionDecorator(this, EApiFunctionType.GET, descriptor);
                            return decoratedDescriptor.value.call(this, properties);
                        },
                        writable: true,
                    });
                }
                if (!Object.prototype.hasOwnProperty.call(this, EApiFunctionType.GET_MANY)) {
                    Object.defineProperty(this, EApiFunctionType.GET_MANY, {
                        configurable: true,
                        enumerable: true,
                        value: async function (properties) {
                            const apiFunctionDecorator = ApiFunction({
                                entity,
                                type: EApiFunctionType.GET_MANY,
                            });
                            const descriptor = {
                                configurable: true,
                                enumerable: true,
                                value: () => void 0,
                                writable: true,
                            };
                            const decoratedDescriptor = apiFunctionDecorator(this, EApiFunctionType.GET_MANY, descriptor);
                            return decoratedDescriptor.value.call(this, properties);
                        },
                        writable: true,
                    });
                }
                if (!Object.prototype.hasOwnProperty.call(this, EApiFunctionType.CREATE)) {
                    Object.defineProperty(this, EApiFunctionType.CREATE, {
                        configurable: true,
                        enumerable: true,
                        value: async function (properties) {
                            const apiFunctionDecorator = ApiFunction({
                                entity,
                                type: EApiFunctionType.CREATE,
                            });
                            const descriptor = {
                                configurable: true,
                                enumerable: true,
                                value: () => void 0,
                                writable: true,
                            };
                            const decoratedDescriptor = apiFunctionDecorator(this, EApiFunctionType.CREATE, descriptor);
                            return decoratedDescriptor.value.call(this, properties);
                        },
                        writable: true,
                    });
                }
                if (!Object.prototype.hasOwnProperty.call(this, EApiFunctionType.UPDATE)) {
                    Object.defineProperty(this, EApiFunctionType.UPDATE, {
                        configurable: true,
                        enumerable: true,
                        value: async function (criteria, properties) {
                            const apiFunctionDecorator = ApiFunction({
                                entity,
                                type: EApiFunctionType.UPDATE,
                            });
                            const descriptor = {
                                configurable: true,
                                enumerable: true,
                                value: () => void 0,
                                writable: true,
                            };
                            const decoratedDescriptor = apiFunctionDecorator(this, EApiFunctionType.UPDATE, descriptor);
                            return decoratedDescriptor.value.call(this, criteria, properties);
                        },
                        writable: true,
                    });
                }
                if (!Object.prototype.hasOwnProperty.call(this, EApiFunctionType.DELETE)) {
                    Object.defineProperty(this, EApiFunctionType.DELETE, {
                        configurable: true,
                        enumerable: true,
                        value: async function (criteria) {
                            const apiFunctionDecorator = ApiFunction({
                                entity,
                                type: EApiFunctionType.DELETE,
                            });
                            const descriptor = {
                                configurable: true,
                                enumerable: true,
                                value: () => void 0,
                                writable: true,
                            };
                            const decoratedDescriptor = apiFunctionDecorator(this, EApiFunctionType.DELETE, descriptor);
                            return decoratedDescriptor.value.call(this, criteria);
                        },
                        writable: true,
                    });
                }
            }
        };
        Object.setPrototypeOf(ExtendedClass, originalConstructor);
        return ExtendedClass;
    };
}
//# sourceMappingURL=service.decorator.js.map