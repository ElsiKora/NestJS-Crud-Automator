import type {HttpException, HttpExceptionOptions} from "@nestjs/common";

export type TApiException = new (objectOrError?: object | string, descriptionOrOptions?: HttpExceptionOptions | string) => HttpException;
