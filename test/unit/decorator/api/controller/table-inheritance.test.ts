import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TestingModule } from "@nestjs/testing";

import { ApiServiceBase } from "@class/api";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { Inject, Injectable } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { ChildEntity, Column, Entity, PrimaryGeneratedColumn, TableInheritance } from "typeorm";
import { describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../../../../src/module/api";

@Entity("startup_check_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class StartupCheckRootEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "type",
		exampleValue: "EARLY",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public type!: string;
}

@ChildEntity("EARLY")
class StartupCheckEarlyEntity extends StartupCheckRootEntity {}

/**
 * Creates a plain Swagger address class, so each child entity gets a different class with one name.
 * @returns {new () => object} The class.
 */
function createAddressClass(): new () => object {
	class StartupCheckAddressDTO {
		@ApiProperty({ type: String })
		public street!: string;
	}

	return StartupCheckAddressDTO;
}

@Entity("address_check_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class AddressCheckRootEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "type",
		exampleValue: "HOME",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public type!: string;
}

@ChildEntity("HOME")
class AddressCheckHomeEntity extends AddressCheckRootEntity {
	@Column({ nullable: true, type: "simple-json" })
	// eslint-disable-next-line @elsikora/typescript/no-explicit-any
	@ApiPropertyDescribe({ dataType: createAddressClass(), description: "address", type: EApiPropertyDescribeType.OBJECT } as any)
	public address?: object;
}

@ChildEntity("WORK")
class AddressCheckWorkEntity extends AddressCheckRootEntity {
	@Column({ nullable: true, type: "simple-json" })
	// eslint-disable-next-line @elsikora/typescript/no-explicit-any
	@ApiPropertyDescribe({ dataType: createAddressClass(), description: "address", type: EApiPropertyDescribeType.OBJECT } as any)
	public address?: object;
}

@Injectable()
class StartupCheckService extends ApiServiceBase<StartupCheckRootEntity & IApiBaseEntity> {}

@ApiController<StartupCheckRootEntity & IApiBaseEntity>({
	entity: StartupCheckRootEntity as never,
	name: "StartupCheckConstructor",
	routes: { [EApiRouteType.GET]: {} },
})
class StartupCheckConstructorController {
	public constructor(public readonly service: StartupCheckService) {}
}

@ApiController<StartupCheckRootEntity & IApiBaseEntity>({
	entity: StartupCheckRootEntity as never,
	name: "StartupCheckProperty",
	routes: { [EApiRouteType.GET]: {} },
})
class StartupCheckPropertyController {
	@Inject(StartupCheckService)
	public readonly service!: StartupCheckService;
}

function compileWith(controller: new (...arguments_: Array<never>) => unknown): Promise<TestingModule> {
	return Test.createTestingModule({
		controllers: [controller],
		imports: [ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
		providers: [{ provide: StartupCheckService, useValue: {} }],
	}).compile();
}

const LATE_CHILD_MESSAGE: RegExp = /was decorated before child entities StartupCheckLateEntity were loaded\. Import the child entity files before the controller/;

describe("ApiController table inheritance startup check", () => {
	it("starts with constructor and property injection while every child was loaded before decoration", async () => {
		expect(StartupCheckEarlyEntity).toBeDefined();

		const constructorModule: TestingModule = await compileWith(StartupCheckConstructorController);
		const propertyModule: TestingModule = await compileWith(StartupCheckPropertyController);

		expect(constructorModule.get(StartupCheckConstructorController)).toBeDefined();
		expect(propertyModule.get(StartupCheckPropertyController)).toBeDefined();

		await constructorModule.close();
		await propertyModule.close();
	});

	it("fails startup for a child loaded after decoration, whatever the injection style or service stub", async () => {
		@ChildEntity("LATE")
		class StartupCheckLateEntity extends StartupCheckRootEntity {}

		expect(StartupCheckLateEntity).toBeDefined();

		await expect(compileWith(StartupCheckConstructorController)).rejects.toThrow(LATE_CHILD_MESSAGE);
		await expect(compileWith(StartupCheckPropertyController)).rejects.toThrow(LATE_CHILD_MESSAGE);
	});
	it("fails startup for two child entities whose responses nest different classes with one name", () => {
		class AddressCheckController {
			public service!: StartupCheckService;
		}

		expect([AddressCheckHomeEntity, AddressCheckWorkEntity]).toHaveLength(2);
		expect(() =>
			ApiController<AddressCheckRootEntity & IApiBaseEntity>({
				entity: AddressCheckRootEntity as never,
				routes: { [EApiRouteType.GET]: {} },
			})(AddressCheckController),
		).toThrow('OpenAPI component name "StartupCheckAddressDTO" belongs to two different classes: property address in AddressCheckGetResponseHomeDTO, and property address in AddressCheckGetResponseWorkDTO');
	});
});
