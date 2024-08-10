import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";

export function CreateRestApplication(appModule: any): Promise<NestFastifyApplication<RawServerDefault>> {
    return NestFactory.create<NestFastifyApplication>(
        appModule,
        new FastifyAdapter({})
    );
}
