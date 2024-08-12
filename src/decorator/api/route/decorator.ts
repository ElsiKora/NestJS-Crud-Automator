import { BaseEntity, FindOptionsRelations } from "typeorm";
import { Type, HttpStatus, RequestMethod } from "@nestjs/common";
import {EApiRouteType} from "../../../enum/decorator/api/controller/type.enum";
import {ApiMethod} from "../method.decorator";
import {EApiAction} from "../../../enum";
import {IApiBaseEntity} from "../../../interface";

type DTOMethod = {
    request: Type<any>;
    response: Type<any>;
};

type DTOStructure = {
    get: DTOMethod;
    getList: DTOMethod;
};

export function ApiRoute<
    E extends BaseEntity
>(options: {
    model: BaseEntity;
    type: EApiRouteType;
    relations?: FindOptionsRelations<E>;
    dto: DTOStructure;
}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const entityName = "bank"; // You might want to derive this dynamically

        let methodDecorator: MethodDecorator | null = null;

        switch (options.type) {
            case EApiRouteType.GET: {
                methodDecorator = ApiMethod({
                    action: EApiAction.FETCH,
                    entity: options.model as never as IApiBaseEntity,
                    httpCode: HttpStatus.OK,
                    method: RequestMethod.GET,
                    path: `:${entityName}`,
                    responses: { internalServerError: true, notFound: true, unauthorized: true },
                    responseType: options.dto.get.response
                });
                break;
            }
            // Add other cases for different route types
        }

        // Apply the ApiMethod decorator
        if (methodDecorator) {
            console.log("METHOD DECORATOR", methodDecorator.toString());
            console.log("TARGET", target);
            console.log("PROPERTY KEY", propertyKey);
            console.log("DESCRIPTOR", descriptor);
            const methodDescriptor = Reflect.getOwnPropertyDescriptor(target, propertyKey) || descriptor;
            methodDecorator(target, propertyKey, methodDescriptor);

        }

        // You can add more decorators here if needed
        const customDecorators: Array<MethodDecorator | PropertyDecorator> = [];
        // Add any custom decorators to the array

        if (customDecorators.length > 0) {
            for (const decorator of customDecorators) {
                const methodDescriptor = Reflect.getOwnPropertyDescriptor(target, propertyKey) || descriptor;
                (decorator as MethodDecorator | PropertyDecorator)(
                    target,
                    propertyKey,
                    methodDescriptor ?? { value: target[propertyKey] },
                );
            }
        }

        return descriptor;
    };
}
