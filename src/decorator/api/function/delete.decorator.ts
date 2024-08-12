import { BaseEntity, Repository } from "typeorm";
import { HttpException, InternalServerErrorException } from "@nestjs/common";
import { ErrorString } from "../../../utility";
import { EErrorStringAction } from "../../../enum";
import { ApiFunctionGet } from "./get.decorator";
import {TApiFunctionGetProperties} from "../../../type";

async function executor<E extends BaseEntity>(
    repository: Repository<E>,
    entityType: new () => E,
    id: string | number,
    getFunction: (id: string, properties?: TApiFunctionGetProperties<E>) => Promise<E>
): Promise<void> {
    try {
        const entity = await getFunction(id.toString());

        await repository.remove(entity);
    } catch (error) {
        console.log(error);
        if (error instanceof HttpException) {
            throw error;
        }
        throw new InternalServerErrorException(
            ErrorString({
                entity: entityType,
                type: EErrorStringAction.DELETING_ERROR,
            })
        );
    }
}

export function ApiFunctionDelete<E extends BaseEntity>(options: { model: new () => E }) {
    return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
        const getDecorator = ApiFunctionGet({ model: options.model });
        let getFunction: (id: string, properties?: TApiFunctionGetProperties<E>) => Promise<E>;

        descriptor.value = async function (
            this: {
                repository: Repository<E>;
            },
            id: string | number
        ) {
            const repository: Repository<E> = this.repository;
            if (!repository) {
                throw new Error("Repository is not available in this context");
            }

            if (!getFunction) {
                const getDescriptor: TypedPropertyDescriptor<(id: string, properties?: TApiFunctionGetProperties<E>) => Promise<E>> = {
                    value: function() { return Promise.reject(new Error('Not implemented')); }
                };
                getDecorator(this, 'get', getDescriptor);
                if (getDescriptor.value) {
                    getFunction = getDescriptor.value.bind(this);
                } else {
                    throw new Error('Get function is not properly decorated');
                }
            }

            return executor(repository, options.model, id, getFunction);
        };

        return descriptor;
    };
}