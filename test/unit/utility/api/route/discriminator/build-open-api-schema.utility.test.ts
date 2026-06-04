import "reflect-metadata";

import { ApiRouteBuildDiscriminatedDtoOpenApiSchema } from "@utility/api/route/discriminator/build-open-api-schema.utility";
import { describe, expect, it } from "vitest";

import { RouteDiscriminatorEmailDto, RouteDiscriminatorPhoneDto, RouteDiscriminatorUnusedDto } from "./fixture";

describe("ApiRouteBuildDiscriminatedDtoOpenApiSchema", () => {
	it("builds oneOf and discriminator mapping for route DTO variants", () => {
		const schema = ApiRouteBuildDiscriminatedDtoOpenApiSchema(
			{
				discriminator: {
					mapping: {
						email: RouteDiscriminatorEmailDto,
						phone: RouteDiscriminatorPhoneDto,
					},
					propertyName: "channel",
				},
				type: [RouteDiscriminatorEmailDto, RouteDiscriminatorPhoneDto],
			},
			"test",
		);

		expect(schema.oneOf).toHaveLength(2);
		expect(schema.discriminator?.propertyName).toBe("channel");
		expect(schema.discriminator?.mapping).toEqual({
			email: "#/components/schemas/RouteDiscriminatorEmailDto",
			phone: "#/components/schemas/RouteDiscriminatorPhoneDto",
		});
		expect(schema.properties).toBeUndefined();
		expect(schema.required).toBeUndefined();
	});

	it("throws when mapping and variant types do not match", () => {
		const buildSchema = () =>
			ApiRouteBuildDiscriminatedDtoOpenApiSchema(
				{
					discriminator: {
						mapping: {
							email: RouteDiscriminatorEmailDto,
						},
						propertyName: "channel",
					},
					type: [RouteDiscriminatorEmailDto, RouteDiscriminatorUnusedDto],
				},
				"test",
			);

		expect(buildSchema).toThrow("type contains DTO RouteDiscriminatorUnusedDto");
	});

	it("throws when a variant DTO does not declare the discriminator property", () => {
		class RouteDiscriminatorMissingPropertyDto {}

		const buildSchema = () =>
			ApiRouteBuildDiscriminatedDtoOpenApiSchema(
				{
					discriminator: {
						mapping: {
							email: RouteDiscriminatorEmailDto,
							missing: RouteDiscriminatorMissingPropertyDto,
						},
						propertyName: "channel",
					},
					type: [RouteDiscriminatorEmailDto, RouteDiscriminatorMissingPropertyDto],
				},
				"test",
			);

		expect(buildSchema).toThrow("must declare discriminator property 'channel'");
	});
});
