import "reflect-metadata";

import { Column, Entity, PrimaryColumn } from "typeorm";
import { describe, expect, it } from "vitest";

import { ApiController, ApiPropertyDescribe, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../../../src/index";

const TEXT_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING };
const INSTANT_PROPERTY: Parameters<typeof ApiPropertyDescribe>[0] = { format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, type: EApiPropertyDescribeType.DATE };
const DISABLED_ROUTE = { generation: { isEnabled: false } } as const;

@Entity("row_path_contract_composites")
class RowPathContractCompositeEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public tenantId!: string;

	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public name!: string;
}

@Entity("row_path_contract_singles")
class RowPathContractSingleEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;
}

@Entity("row_path_contract_micro_ledgers")
class RowPathContractMicroLedgerEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@PrimaryColumn({ precision: 6, type: "timestamptz" })
	@ApiPropertyDescribe(INSTANT_PROPERTY)
	public createdAt!: Date;
}

@Entity("row_path_contract_default_ledgers")
class RowPathContractDefaultPrecisionLedgerEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@PrimaryColumn({ type: "timestamptz" })
	@ApiPropertyDescribe(INSTANT_PROPERTY)
	public createdAt!: Date;
}

@Entity("row_path_contract_local_ledgers")
class RowPathContractLocalLedgerEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@PrimaryColumn({ precision: 3, type: "timestamp" })
	@ApiPropertyDescribe(INSTANT_PROPERTY)
	public createdAt!: Date;
}

@Entity("row_path_contract_milli_ledgers")
class RowPathContractMilliLedgerEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_PROPERTY)
	public id!: string;

	@PrimaryColumn({ precision: 3, type: "timestamptz" })
	@ApiPropertyDescribe(INSTANT_PROPERTY)
	public createdAt!: Date;
}

class ManualParametersDto {}

let controllerCount: number = 0;

/**
 * Decorates a fresh controller, which is the moment a controller configuration fails startup.
 * @param {object} properties - Controller properties besides the entity defaults.
 * @param {object} [entity] - Entity of the controller.
 */
function compile(properties: object, entity: object = RowPathContractCompositeEntity): void {
	controllerCount += 1;

	const name: string = `RowPathContract${String(controllerCount)}Controller`;
	const controller = { [name]: class {} }[name] as new () => object;

	ApiController({ entity, path: "contract", routes: {}, ...properties } as never)(controller as never);
}

describe("rowPath contract", () => {
	it.each([
		["an empty list", { fields: [] }, "rowPath fields must be a non-empty array"],
		["an unknown column", { fields: ["missing"] }, 'rowPath field "missing" is not a primary key column of the entity'],
		["a column outside the key", { fields: ["name"] }, 'rowPath field "name" is not a primary key column of the entity'],
		["a repeated column", { fields: ["id", "id"] }, 'rowPath field "id" is listed more than once'],
		["an unsafe name", { fields: ["__proto__"] }, "rowPath fields[0] must be a safe entity field name"],
		["a value that is not a field name", { fields: [1] }, "rowPath fields[0] must be a safe entity field name"],
		["an unsupported key", { fields: ["id"], order: [] }, "rowPath must contain exactly fields"],
		["a value that is not an object", "id", "rowPath must be a plain object"],
	])("fails startup on %s", (_label: string, rowPath: unknown, expected: string) => {
		expect(() => {
			compile({ rowPath });
		}).toThrow(expected);
	});

	it("does not invoke an accessor on a hostile list", () => {
		let isRead: boolean = false;
		const fields: Array<string> = ["id"];

		Object.defineProperty(fields, "0", {
			enumerable: true,
			get: (): string => {
				isRead = true;

				return "id";
			},
		});

		expect(() => {
			compile({ rowPath: { fields } });
		}).toThrow("must be an enumerable data property");
		expect(isRead).toBe(false);
	});

	it("takes a reduced and a reordered list of key columns", () => {
		expect(() => {
			compile({ rowPath: { fields: ["id"] } });
			compile({ rowPath: { fields: ["id", "tenantId"] } });
		}).not.toThrow();
	});

	it("refuses a column pathScope already binds", () => {
		expect(() => {
			compile({ path: "contract/:tenantId", pathScope: { parameters: [{ field: "tenantId", parameter: "tenantId" }] }, rowPath: { fields: ["id", "tenantId"] } });
		}).toThrow('rowPath field "tenantId" is already bound by pathScope');
	});

	it("refuses to combine with a manual PARAMETERS DTO on the route", () => {
		expect(() => {
			compile({ rowPath: { fields: ["id"] }, routes: { [EApiRouteType.GET]: { dto: { parameters: ManualParametersDto } } } });
		}).toThrow("pathScope and rowPath cannot be combined with a manual PARAMETERS DTO on the generated get route");
	});

	it("a default composite key keeps a manual PARAMETERS DTO", () => {
		expect(() => {
			compile({ routes: { [EApiRouteType.GET]: { dto: { parameters: ManualParametersDto } } } });
		}).not.toThrow();
	});

	it("starts a single key column on its default path, and with rowPath naming it", () => {
		expect(() => {
			compile({}, RowPathContractSingleEntity);
			compile({ rowPath: { fields: ["id"] } }, RowPathContractSingleEntity);
		}).not.toThrow();
	});

	describe("a date and time key column in the path of a composite key", () => {
		it.each([
			["precision 6", RowPathContractMicroLedgerEntity],
			["the default precision", RowPathContractDefaultPrecisionLedgerEntity],
			["no time zone", RowPathContractLocalLedgerEntity],
		])("fails startup on %s", (_label: string, entity: object) => {
			expect(() => {
				compile({}, entity);
			}).toThrow('path field "createdAt" of a composite key must be a timestamptz column with precision 0 to 3');
		});

		it("starts with precision 3", () => {
			expect(() => {
				compile({}, RowPathContractMilliLedgerEntity);
			}).not.toThrow();
		});

		it("starts once rowPath leaves the column out, as a partitioned ledger needs", () => {
			expect(() => {
				compile({ rowPath: { fields: ["id"] } }, RowPathContractMicroLedgerEntity);
			}).not.toThrow();
		});
	});
});

describe("pathScope contract on a composite key", () => {
	it("refuses a row route when pathScope binds every key column", () => {
		expect(() => {
			compile({
				path: "contract/:tenantId/:id",
				pathScope: {
					parameters: [
						{ field: "tenantId", parameter: "tenantId" },
						{ field: "id", parameter: "id" },
					],
				},
			});
		}).toThrow("binds every primary key column in pathScope, so the generated");
	});

	it("takes every key column bound on a controller with only CREATE and GET_LIST", () => {
		expect(() => {
			compile({
				path: "contract/:tenantId/:id",
				pathScope: {
					parameters: [
						{ field: "tenantId", parameter: "tenantId" },
						{ field: "id", parameter: "id" },
					],
				},
				routes: { [EApiRouteType.DELETE]: DISABLED_ROUTE, [EApiRouteType.GET]: DISABLED_ROUTE, [EApiRouteType.PARTIAL_UPDATE]: DISABLED_ROUTE, [EApiRouteType.UPDATE]: DISABLED_ROUTE },
			});
		}).not.toThrow();
	});

	it("refuses a GET identity alias over two row columns", () => {
		expect(() => {
			compile({ routes: { [EApiRouteType.GET]: { identity: { parameter: "orderId" } } } });
		}).toThrow("Generated identity aliases one path field");
	});

	it("takes a GET identity alias over the one row column left", () => {
		expect(() => {
			compile({ path: "contract/:tenantId", pathScope: { parameters: [{ field: "tenantId", parameter: "tenantId" }] }, routes: { [EApiRouteType.GET]: { identity: { parameter: "orderId" } } } });
		}).not.toThrow();
	});
});

describe("controllers without an enabled generated route", () => {
	const ALL_DISABLED = { [EApiRouteType.CREATE]: DISABLED_ROUTE, [EApiRouteType.DELETE]: DISABLED_ROUTE, [EApiRouteType.GET]: DISABLED_ROUTE, [EApiRouteType.GET_LIST]: DISABLED_ROUTE, [EApiRouteType.PARTIAL_UPDATE]: DISABLED_ROUTE, [EApiRouteType.UPDATE]: DISABLED_ROUTE };

	it.each([["a/:a/b/:b/c/:c/d/:d"], ["files/*splat"], ["items{/:section}"]])("start on %s", (path: string) => {
		expect(() => {
			compile({ path, routes: ALL_DISABLED });
		}).not.toThrow();
	});

	it("still validate a declared pathScope and rowPath", () => {
		expect(() => {
			compile({ path: "a/:a", pathScope: { parameters: [] }, routes: ALL_DISABLED });
		}).toThrow("pathScope parameters must be a non-empty array");
		expect(() => {
			compile({ path: "a/:a", routes: ALL_DISABLED, rowPath: { fields: [] } });
		}).toThrow("rowPath fields must be a non-empty array");
	});

	it.each([
		["an unbound parameter", "a/:a", 'path parameter "a" is not bound to an entity field'],
		["a wildcard", "files/*splat", 'path parameter "splat" is a wildcard'],
		["an optional parameter", "items{/:section}", 'path parameter "section" is optional'],
	])("fail once a generated route is enabled, on %s", (_label: string, path: string, expected: string) => {
		expect(() => {
			compile({ path, routes: { ...ALL_DISABLED, [EApiRouteType.GET]: {} } });
		}).toThrow(expected);
	});
});
