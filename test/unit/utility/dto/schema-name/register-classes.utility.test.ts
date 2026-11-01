import "reflect-metadata";

import { ApiExtraModels, ApiProperty } from "@nestjs/swagger";
import { DtoSchemaNameRegisterClasses } from "@utility/dto/schema-name";
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

describe("DtoSchemaNameRegisterClasses", () => {
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

		DtoSchemaNameRegisterClasses(SchemaNameFirstResponseDTO, "the first route");

		expect(() => DtoSchemaNameRegisterClasses(SchemaNameSecondResponseDTO, "the second route")).toThrow('OpenAPI component name "SchemaNameAddressDTO" belongs to two different classes: property address in SchemaNameFirstResponseDTO, and property addresses in SchemaNameSecondResponseDTO');
	});

	it("fails for a nested extra model that shares a name with another class", () => {
		const FirstAddress: new () => object = createAddressClass("SchemaNameExtraAddressDTO");
		const SecondAddress: new () => object = createAddressClass("SchemaNameExtraAddressDTO");

		@ApiExtraModels(SecondAddress)
		class SchemaNameExtraResponseDTO {}

		DtoSchemaNameRegisterClasses(FirstAddress, "the address route");

		expect(() => DtoSchemaNameRegisterClasses(SchemaNameExtraResponseDTO, "the extra route")).toThrow('OpenAPI component name "SchemaNameExtraAddressDTO" belongs to two different classes: the address route, and a nested model of SchemaNameExtraResponseDTO');
	});

	it("accepts one class used in several places, including a class that refers to itself", () => {
		const Address: new () => object = createAddressClass("SchemaNameSharedAddressDTO");

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

		expect(() => DtoSchemaNameRegisterClasses(SchemaNameTreeDTO, "the tree route")).not.toThrow();
		expect(() => DtoSchemaNameRegisterClasses(SchemaNameForestDTO, "the forest route")).not.toThrow();
	});
});
