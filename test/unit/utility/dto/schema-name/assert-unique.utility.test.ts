import "reflect-metadata";

import { ApiExtraModels, ApiProperty } from "@nestjs/swagger";
import { DtoSchemaNameAssertUnique } from "@utility/dto/schema-name";
import { DtoSetGeneratedName } from "@utility/dto/set-generated-name.utility";
import { describe, expect, it } from "vitest";

/**
 * Creates a plain Swagger class, so two calls give two different classes with one name.
 * @param {string} name - Class name.
 * @returns {new () => object} The class.
 */
function createAddressClass(name: string): new () => object {
	class SchemaNameAddressDTO {
		@ApiProperty({ type: String })
		public street!: string;
	}

	Object.defineProperty(SchemaNameAddressDTO, "name", { value: name });

	return SchemaNameAddressDTO;
}

describe("DtoSchemaNameAssertUnique", () => {
	it("fails for two different nested classes with one name, naming both origins", () => {
		const FirstAddress: new () => object = createAddressClass("SchemaNameAddressDTO");
		const SecondAddress: new () => object = createAddressClass("SchemaNameAddressDTO");

		class SchemaNameFirstResponseDTO {
			@ApiProperty({ type: FirstAddress })
			public address!: object;
		}

		class SchemaNameSecondResponseDTO {
			@ApiProperty({ type: () => [SecondAddress] })
			public addresses!: Array<object>;
		}

		expect(() =>
			DtoSchemaNameAssertUnique([
				{ origin: "the first route", type: SchemaNameFirstResponseDTO },
				{ origin: "the second route", type: SchemaNameSecondResponseDTO },
			]),
		).toThrow('OpenAPI component name "SchemaNameAddressDTO" belongs to two different classes: property address in SchemaNameFirstResponseDTO, and property addresses in SchemaNameSecondResponseDTO');
	});

	it("fails for a nested extra model that shares a name with another class", () => {
		const FirstAddress: new () => object = createAddressClass("SchemaNameAddressDTO");
		const SecondAddress: new () => object = createAddressClass("SchemaNameAddressDTO");

		@ApiExtraModels(SecondAddress)
		class SchemaNameExtraResponseDTO {}

		expect(() =>
			DtoSchemaNameAssertUnique([
				{ origin: "the address route", type: FirstAddress },
				{ origin: "the extra route", type: SchemaNameExtraResponseDTO },
			]),
		).toThrow('OpenAPI component name "SchemaNameAddressDTO" belongs to two different classes: the address route, and a nested model of SchemaNameExtraResponseDTO');
	});

	it("names a generated class by the origin it was generated from", () => {
		const Generated: new () => object = createAddressClass("Generated");
		const HandWritten: new () => object = createAddressClass("SchemaNameGeneratedAddressDTO");

		DtoSetGeneratedName(Generated, "SchemaNameGeneratedAddressDTO", 'the get response DTO of controller prefix "SchemaName"');

		expect(() =>
			DtoSchemaNameAssertUnique([
				{ origin: "the generated route", type: Generated },
				{ origin: "the hand-written route", type: HandWritten },
			]),
		).toThrow('OpenAPI component name "SchemaNameGeneratedAddressDTO" belongs to two different classes: the get response DTO of controller prefix "SchemaName", and the hand-written route');
	});

	it("accepts one class used in several places, including a class that refers to itself", () => {
		const Address: new () => object = createAddressClass("SchemaNameAddressDTO");

		class SchemaNameTreeDTO {
			@ApiProperty({ type: Address })
			public address!: object;

			@ApiProperty({ type: () => [SchemaNameTreeDTO] })
			public children!: Array<SchemaNameTreeDTO>;
		}

		class SchemaNameForestDTO {
			@ApiProperty({ type: Address })
			public address!: object;

			@ApiProperty({ type: [SchemaNameTreeDTO] })
			public trees!: Array<SchemaNameTreeDTO>;
		}

		expect(() =>
			DtoSchemaNameAssertUnique([
				{ origin: "the tree route", type: SchemaNameTreeDTO },
				{ origin: "the forest route", type: SchemaNameForestDTO },
			]),
		).not.toThrow();
	});

	describe("lazy types", () => {
		it("resolves a lazy type when it checks, so a class declared after the DTO is walked", () => {
			class SchemaNameEarlyDTO {
				@ApiProperty({ type: () => SchemaNameLateDTO })
				public late!: object;
			}

			const OtherAddress: new () => object = createAddressClass("SchemaNameAddressDTO");

			class SchemaNameLateDTO {
				@ApiProperty({ type: createAddressClass("SchemaNameAddressDTO") })
				public address!: object;
			}

			expect(() =>
				DtoSchemaNameAssertUnique([
					{ origin: "the early route", type: SchemaNameEarlyDTO },
					{ origin: "the address route", type: OtherAddress },
				]),
			).toThrow('OpenAPI component name "SchemaNameAddressDTO" belongs to two different classes: property address in SchemaNameLateDTO, and the address route');
		});

		it("fails with the DTO and property when a lazy type throws, as a class in its temporal dead zone does", () => {
			class SchemaNameLazyThrowDTO {
				@ApiProperty({
					type: (): never => {
						throw new ReferenceError("Cannot access 'SchemaNameMissingDTO' before initialization");
					},
				})
				public missing!: object;
			}

			expect(() => DtoSchemaNameAssertUnique([{ origin: "the lazy route", type: SchemaNameLazyThrowDTO }])).toThrow("Cannot resolve the lazy type of property missing in SchemaNameLazyThrowDTO: Cannot access 'SchemaNameMissingDTO' before initialization");
		});

		it("fails with the DTO and property when a lazy type returns undefined, as an unfinished CommonJS circular import does", () => {
			const unloaded: { SchemaNameMissingDTO?: new () => object } = {};

			class SchemaNameLazyUndefinedDTO {
				@ApiProperty({ type: () => unloaded.SchemaNameMissingDTO as never })
				public missing!: object;
			}

			expect(() => DtoSchemaNameAssertUnique([{ origin: "the lazy route", type: SchemaNameLazyUndefinedDTO }])).toThrow("Cannot resolve the lazy type of property missing in SchemaNameLazyUndefinedDTO: it returns undefined");
		});

		it("fails with the route when a lazy root type throws", () => {
			expect(() =>
				DtoSchemaNameAssertUnique([
					{
						origin: "the 200 response of route get in controller SchemaNameController",
						type: (): never => {
							throw new ReferenceError("SchemaNameMissingDTO is not defined");
						},
					},
				]),
			).toThrow("Cannot resolve the lazy type of the 200 response of route get in controller SchemaNameController: SchemaNameMissingDTO is not defined");
		});
	});
});
