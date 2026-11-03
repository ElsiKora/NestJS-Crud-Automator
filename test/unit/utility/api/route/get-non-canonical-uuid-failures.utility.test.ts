import "reflect-metadata";

import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiPropertyStringType } from "@enum/decorator/api";
import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { ApiRouteGetNonCanonicalUuidFailures } from "@utility/api/route/get-non-canonical-uuid-failures.utility";
import { Expose, Type } from "class-transformer";
import { IsUUID, ValidateNested } from "class-validator";
import { describe, expect, it } from "vitest";

const LOWER_UUID: string = "6f1b0c7e-5c3b-4c0a-8a1a-0d6f3e2b1a11";
const UPPER_UUID: string = LOWER_UUID.toUpperCase();
const MIXED_UUID: string = "6F1b0c7e-5c3b-4c0a-8a1a-0d6f3e2b1a11";

class CanonicalUuidEntity {}

class CanonicalUuidItemDto {
	@ApiPropertyUUID({ description: "item", entity: CanonicalUuidEntity, isRequired: true })
	public id!: string;
}

class CanonicalUuidKindADto {
	@ApiPropertyUUID({ description: "a", entity: CanonicalUuidEntity, isRequired: true })
	public aId!: string;

	public kind!: "a";
}

class CanonicalUuidKindBDto {
	public bId!: string;

	public kind!: "b";
}

class CanonicalUuidBodyDto {
	@ApiPropertyUUID({ description: "owners", entity: CanonicalUuidEntity, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 0 })
	public ownerIds?: Array<string>;

	@ApiPropertyUUID({ description: "parent", entity: CanonicalUuidEntity, isRequired: false })
	public parentId?: string;

	@ApiPropertyObject({ description: "items", entity: CanonicalUuidEntity, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 0, shouldValidateNested: true, type: CanonicalUuidItemDto })
	public items?: Array<CanonicalUuidItemDto>;

	@Expose({ name: "external_id" })
	@IsUUID()
	public externalId?: string;

	@ApiPropertyString({ description: "reference", entity: CanonicalUuidEntity, exampleValue: LOWER_UUID, format: EApiPropertyStringType.UUID, isRequired: false, maxLength: 36, minLength: 36, pattern: "/^.+$/" })
	public reference?: string;

	@ValidateNested()
	@Type(() => Object, {
		discriminator: {
			property: "kind",
			subTypes: [
				{ name: "a", value: CanonicalUuidKindADto },
				{ name: "b", value: CanonicalUuidKindBDto },
			],
		},
	})
	public variant?: CanonicalUuidKindADto | CanonicalUuidKindBDto;
}

/**
 * Reads the property and constraint of each failure.
 * @param {unknown} value - Request value.
 * @param {string} [path] - Path of the value.
 * @returns {Array<{ constraints: unknown; property: string }>} The failures.
 */
const read = (value: unknown, path: string = ""): Array<{ constraints: unknown; property: string }> => ApiRouteGetNonCanonicalUuidFailures(CanonicalUuidBodyDto, value, path).map(({ constraints, property }: { constraints?: unknown; property: string }) => ({ constraints, property }));

describe("ApiRouteGetNonCanonicalUuidFailures", () => {
	it("accepts lower-case UUIDs everywhere the DTO validates a UUID", () => {
		expect(read({ external_id: LOWER_UUID, items: [{ id: LOWER_UUID }], ownerIds: [LOWER_UUID], parentId: LOWER_UUID, reference: LOWER_UUID, variant: { aId: LOWER_UUID, kind: "a" } })).toEqual([]);
	});

	it.each([UPPER_UUID, MIXED_UUID])("refuses %s on a single property, under its name", (sent: string) => {
		expect(read({ parentId: sent })).toEqual([{ constraints: { uuidNotCanonical: "parentId must be a lower-case UUID" }, property: "parentId" }]);
	});

	it("refuses each list item that is not lower-case, under its index", () => {
		expect(read({ ownerIds: [LOWER_UUID, UPPER_UUID] })).toEqual([{ constraints: { uuidNotCanonical: "ownerIds.1 must be a lower-case UUID" }, property: "ownerIds.1" }]);
	});

	it("walks nested DTOs and discriminator subtypes by their path", () => {
		expect(read({ items: [{ id: LOWER_UUID }, { id: UPPER_UUID }], variant: { aId: UPPER_UUID, kind: "a" } }).map(({ property }: { property: string }) => property)).toEqual(["items.1.id", "variant.aId"]);
		expect(read({ variant: { bId: UPPER_UUID, kind: "b" } })).toEqual([]);
	});

	it("reads a renamed property under its wire name, and any IsUUID rule", () => {
		expect(read({ external_id: UPPER_UUID, externalId: UPPER_UUID, reference: UPPER_UUID }).map(({ property }: { property: string }) => property)).toEqual(["external_id", "reference"]);
	});

	it("prefixes the path of the part of the request it reads", () => {
		expect(read({ parentId: UPPER_UUID }, "payload").map(({ property }: { property: string }) => property)).toEqual(["payload.parentId"]);
	});

	it("leaves a value that is not a UUID at all to IsUUID, and an undeclared key alone", () => {
		expect(read({ other: UPPER_UUID, ownerIds: ["NOT-A-UUID", 1], parentId: "NOT-A-UUID" })).toEqual([]);
	});

	it("gives failures that render as the ValidationPipe message list", () => {
		expect(new ApiRequestValidationException(ApiRouteGetNonCanonicalUuidFailures(CanonicalUuidBodyDto, { items: [{ id: UPPER_UUID }] }, "")).getResponse()).toMatchObject({ message: ["items.0.id must be a lower-case UUID"], statusCode: 400 });
	});
});
