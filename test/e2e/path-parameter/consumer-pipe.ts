import type { PipeTransform } from "@nestjs/common";
import type { ValidationError } from "class-validator";

import { BadRequestException, ValidationPipe } from "@nestjs/common";

/**
 * Builds a host pipe like the one a consumer service registers: implicit conversion, whitelisting and its own error body.
 * @returns {PipeTransform} Host validation pipe.
 */
export const buildE2ePathParameterConsumerPipe = (): PipeTransform =>
	new ValidationPipe({
		exceptionFactory: (errors: Array<ValidationError>) => new BadRequestException({ code: "VALIDATION_FAILED", errors: errors.flatMap((error: ValidationError) => Object.keys(error.constraints ?? {}).map((rule: string) => ({ path: error.property, rule }))) }),
		forbidNonWhitelisted: true,
		forbidUnknownValues: true,
		transform: true,
		transformOptions: { enableImplicitConversion: true },
		whitelist: true,
	});
