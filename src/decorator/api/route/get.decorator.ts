import { HttpStatus, RequestMethod, Get } from "@nestjs/common";
import { BaseEntity } from "typeorm";
import { plainToClass } from "class-transformer";
import { EApiAction } from "../../../enum";
import { ApiMethod } from "../method.decorator";
import { Type } from "@nestjs/common";

type Decorator = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor | void;

export function ApiRouteGet<
    E extends BaseEntity,
    ReqDTO extends object,
    ResDTO
>(options: {
    model: new () => E;
    dto: {
        request: Type<ReqDTO>;
        response: Type<ResDTO>;
    };
}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const entityName = options.model.name.toLowerCase();

        // Создаем метод с декоратором @Param
        const getMethod = function (this: { service: any }, id: string): Promise<ResDTO> {
            console.log(`GET method called for ${entityName} with id:`, id);

            if (typeof id !== 'string') {
                throw new Error(`Invalid ${entityName} parameter: expected string`);
            }

            return this.service.get(id)
                .then((entity: E) => {
                    return plainToClass(options.dto.response, entity, {
                        excludeExtraneousValues: true,
                    });
                })
                .catch((error: Error) => {
                    console.log(`Error in get method for ${options.model.name}:`, error);
                    throw error;
                });
        };

        // Применяем все необходимые декораторы к методу
        const decorators: Decorator[] = [
            Get(`:${entityName}`),
            ApiMethod({
                action: EApiAction.FETCH,
                entity: options.model,
                httpCode: HttpStatus.OK,
                method: RequestMethod.GET,
                path: `:${entityName}`,
                responses: { internalServerError: true, notFound: true, unauthorized: true },
                responseType: options.dto.response
            }) as Decorator,
        ];

        // Применяем декораторы в обратном порядке
        let currentDescriptor = descriptor;
        decorators.reverse().forEach(decorator => {
            const result = decorator(target, propertyKey, currentDescriptor);
            if (result !== undefined) {
                currentDescriptor = { ...currentDescriptor, ...result };
            }
        });

        // Заменяем оригинальный метод нашим новым методом
        currentDescriptor.value = getMethod;

        // Добавляем метаданные о параметрах для NestJS
        Reflect.defineMetadata('__paramTypes', [String], target, propertyKey);
        Reflect.defineMetadata('__routeArgs', [{ index: 0, type: () => String, name: entityName, data: undefined }], target, propertyKey);

        return currentDescriptor;
    };
}
