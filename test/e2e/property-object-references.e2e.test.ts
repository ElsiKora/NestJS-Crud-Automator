import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";

import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";

import { expectEveryComponentToBeReachable } from "./expect-every-component-to-be-reachable";
import { expectEveryReferenceToResolve } from "./expect-every-reference-to-resolve";
import { E2eReferenceController, E2eReferenceGeneratedController } from "./property-object-references";

describe("component references of object properties (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({ controllers: [E2eReferenceController, E2eReferenceGeneratedController], imports: [ApiAuthorizationModule.forRoot(), ApiSubscriberModule] }).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
	});

	afterAll(async () => {
		await app?.close();
	});

	it("resolves every component reference", () => {
		expectEveryReferenceToResolve(document);
	});

	it("reaches every component from a route, except an extra model that a consumer declares", () => {
		expectEveryComponentToBeReachable(document, ["E2eReferenceConsumerDTO"]);
	});

	it("keeps a variant that a generated route references as it is", () => {
		expect(document.components?.schemas).toHaveProperty("E2eReferencePlainDTO");
	});

	it.each([
		["a copied polymorphic property", "E2eReferenceUnionFirstDTO", "E2eReferenceUnionSecondDTO"],
		["a copied polymorphic array", "E2eReferenceUnionListFirstDTO", "E2eReferenceUnionListSecondDTO"],
		["a copied property with a single variant", "E2eReferenceOnlyDTO"],
		["a copied property with variants from the copy metadata", "E2eReferenceOverrideFirstDTO", "E2eReferenceOverrideSecondDTO"],
		["a polymorphic object in a copied dynamic variant", "E2eReferenceDynamicHostDynamicVariantNestedFirstDTO", "E2eReferenceDynamicHostDynamicVariantNestedSecondDTO"],
		["a polymorphic object in a copied array of dynamic variants", "E2eReferenceDynamicListHostDynamicListVariantNestedFirstDTO", "E2eReferenceDynamicListHostDynamicListVariantNestedSecondDTO"],
		["a polymorphic object in a nested hand-written DTO", "E2eReferenceHeldFirstDTO", "E2eReferenceHeldSecondDTO"],
		["a hand-written polymorphic property", "E2eReferenceHandWrittenFirstDTO", "E2eReferenceHandWrittenSecondDTO"],
		["a polymorphic property inherited from a base DTO", "E2eReferenceInheritedFirstDTO", "E2eReferenceInheritedSecondDTO"],
		["a polymorphic property of a mapped type that declares its extra models", "E2eReferencePickedFirstDTO", "E2eReferencePickedSecondDTO"],
		["a polymorphic property of a generated route", "E2eReferenceGeneratedGetResponseUnionFirstDTO", "E2eReferenceGeneratedGetResponseUnionSecondDTO"],
		["a polymorphic object in a dynamic variant of a generated route", "E2eReferenceGeneratedGetResponseDynamicVariantNestedFirstDTO", "E2eReferenceGeneratedGetResponseDynamicVariantNestedSecondDTO"],
		["a copied relation", "E2eReferenceRelationHostRelativeDTO"],
	])("registers the components of %s", (_route: string, ...names: Array<string>) => {
		expect(Object.keys(document.components?.schemas ?? {})).toEqual(expect.arrayContaining(names));
	});
});
