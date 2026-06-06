import "reflect-metadata";

import type { IApiControllerProperties } from "@interface/decorator/api";
import type { FindOptionsRelations } from "typeorm";

import { ApiServiceBase } from "@class/api";
import { EApiControllerRelationReferenceShape } from "@enum/decorator/api";
import { ApiControllerHandleRequestRelations } from "@utility/api/controller/handle-request-relations.utility";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it, vi } from "vitest";

@Entity("relation_owners")
class RelationOwner {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;
}

@Entity("relation_entities")
class RelationEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ManyToOne(() => RelationOwner)
	public owner!: RelationOwner;
}

class RelationOwnerService extends ApiServiceBase<RelationOwner> {
	public override async get(): Promise<RelationOwner> {
		return { id: "owner-1", name: "Owner" };
	}
}

const createRelationConfig = (
	overrides: {
		include?: FindOptionsRelations<RelationEntity>;
		referenceKey?: string;
		referenceShape?: EApiControllerRelationReferenceShape;
		relationLoadStrategy?: "join" | "query";
		services?: Partial<Record<"owner", string>>;
	} = {},
) => ({
	load: {
		include: "include" in overrides ? overrides.include : { owner: true },
		relationLoadStrategy: overrides.relationLoadStrategy,
		services: overrides.services,
	},
	reference: {
		key: overrides.referenceKey,
		shape: overrides.referenceShape ?? EApiControllerRelationReferenceShape.SCALAR,
	},
});

describe("ApiControllerHandleRequestRelations", () => {
	it("loads included relations using inferred service names", async () => {
		const ownerService = new RelationOwnerService();
		const getSpy = vi.spyOn(ownerService, "get");
		const controller = {
			ownerService,
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig();
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(getSpy).toHaveBeenCalledWith({ where: { id: "owner-1" } });
		expect(parameters.owner).toMatchObject({ id: "owner-1" });
	});

	it("does nothing when load is missing", async () => {
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = {
			reference: {
				shape: EApiControllerRelationReferenceShape.SCALAR,
			},
		};
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await ApiControllerHandleRequestRelations({} as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toBe("owner-1");
	});

	it("does nothing when include is empty", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ include: {} });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toBe("owner-1");
	});

	it("throws when include is missing from a configured load block", async () => {
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = {
			load: {},
			reference: {
				shape: EApiControllerRelationReferenceShape.SCALAR,
			},
		};
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations({} as never, properties, relationConfig as never, parameters)).rejects.toThrow("Request relation load include must be an object");
	});

	it("throws when include is null", async () => {
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ include: null as never });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations({} as never, properties, relationConfig as never, parameters)).rejects.toThrow("Request relation load include must be an object");
	});

	it("throws when include is an array", async () => {
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ include: [] as never });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations({} as never, properties, relationConfig as never, parameters)).rejects.toThrow("Request relation load include must be an object");
	});

	it("throws when reference shape is missing", async () => {
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = {
			load: {
				include: { owner: true },
			},
			reference: {},
		};
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations({} as never, properties, relationConfig as never, parameters)).rejects.toThrow("Request relation reference shape must be OBJECT or SCALAR");
	});

	it("throws when reference key is empty", async () => {
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ referenceKey: "" });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations({} as never, properties, relationConfig as never, parameters)).rejects.toThrow("Request relation reference key must not be empty");
	});

	it("throws when service is missing for an included relation", async () => {
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig();
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations({} as never, properties, relationConfig as never, parameters)).rejects.toThrow("Service ownerService not found in controller");
	});

	it("throws when service is not an ApiServiceBase", async () => {
		const controller = {
			ownerService: {},
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig();
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toThrow("Service ownerService is not an instance of ApiServiceBase");
	});

	it("skips relation fields not listed in include", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ include: {} });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toBe("owner-1");
	});

	it("loads relations using service override mapping", async () => {
		class CustomOwnerService extends ApiServiceBase<RelationOwner> {
			public override async get(): Promise<RelationOwner> {
				return { id: "owner-2", name: "Custom" };
			}
		}

		const controller = {
			customOwnerService: new CustomOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ services: { owner: "customOwnerService" } });
		const parameters: Partial<RelationEntity> = { owner: "owner-2" as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toMatchObject({ id: "owner-2" });
	});

	it("loads relations by a non-id reference key", async () => {
		class CodeOwnerService extends ApiServiceBase<RelationOwner> {
			public override async get(properties: unknown): Promise<RelationOwner> {
				expect(properties).toEqual({ where: { name: "owner-code" } });

				return { id: "owner-by-code", name: "owner-code" };
			}
		}

		const controller = {
			ownerService: new CodeOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ referenceKey: "name" });
		const parameters: Partial<RelationEntity> = { owner: "owner-code" as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toMatchObject({ id: "owner-by-code", name: "owner-code" });
	});

	it("loads relations from object references when object shape is configured", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ referenceShape: EApiControllerRelationReferenceShape.OBJECT });
		const parameters: Partial<RelationEntity> = { owner: { id: "owner-1" } as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toMatchObject({ id: "owner-1" });
	});

	it("loads object references by a custom reference key", async () => {
		class CodeOwnerService extends ApiServiceBase<RelationOwner> {
			public override async get(properties: unknown): Promise<RelationOwner> {
				expect(properties).toEqual({ where: { name: "owner-code" } });

				return { id: "owner-by-code", name: "owner-code" };
			}
		}

		const controller = {
			ownerService: new CodeOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ referenceKey: "name", referenceShape: EApiControllerRelationReferenceShape.OBJECT });
		const parameters: Partial<RelationEntity> = { owner: { name: "owner-code" } as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toMatchObject({ id: "owner-by-code", name: "owner-code" });
	});

	it("throws when scalar reference shape receives an object", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig();
		const parameters: Partial<RelationEntity> = { owner: { id: "owner-1" } as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toMatchObject({
			response: {
				details: {
					expectedShape: EApiControllerRelationReferenceShape.SCALAR,
					propertyName: "owner",
					referenceKey: "id",
				},
				message: "RELATIONENTITY_INVALID_REFERENCE",
				statusCode: 400,
			},
		});
	});

	it("throws when object reference shape receives a scalar", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ referenceShape: EApiControllerRelationReferenceShape.OBJECT });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toMatchObject({
			response: {
				details: {
					expectedShape: EApiControllerRelationReferenceShape.OBJECT,
					propertyName: "owner",
					referenceKey: "id",
				},
				message: "RELATIONENTITY_INVALID_REFERENCE",
				statusCode: 400,
			},
		});
	});

	it("throws when object reference shape misses the configured key", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ referenceKey: "name", referenceShape: EApiControllerRelationReferenceShape.OBJECT });
		const parameters: Partial<RelationEntity> = { owner: { id: "owner-1" } as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toMatchObject({
			response: {
				details: {
					expectedShape: EApiControllerRelationReferenceShape.OBJECT,
					propertyName: "owner",
					referenceKey: "name",
				},
				message: "RELATIONENTITY_INVALID_REFERENCE",
				statusCode: 400,
			},
		});
	});

	it("throws when object reference key value is null", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ referenceShape: EApiControllerRelationReferenceShape.OBJECT });
		const parameters: Partial<RelationEntity> = { owner: { id: null } as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toMatchObject({
			response: {
				details: {
					expectedShape: EApiControllerRelationReferenceShape.OBJECT,
					propertyName: "owner",
					referenceKey: "id",
				},
				message: "RELATIONENTITY_INVALID_REFERENCE",
				statusCode: 400,
			},
		});
	});

	it("throws when object reference key value is undefined", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ referenceShape: EApiControllerRelationReferenceShape.OBJECT });
		const parameters: Partial<RelationEntity> = { owner: { id: undefined } as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toMatchObject({
			response: {
				details: {
					expectedShape: EApiControllerRelationReferenceShape.OBJECT,
					propertyName: "owner",
					referenceKey: "id",
				},
				message: "RELATIONENTITY_INVALID_REFERENCE",
				statusCode: 400,
			},
		});
	});

	it("throws configuration error when relation service returns no entity", async () => {
		class MissingOwnerService extends ApiServiceBase<RelationOwner> {
			public override async get(): Promise<RelationOwner> {
				return undefined as never;
			}
		}

		const controller = {
			ownerService: new MissingOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig();
		const parameters: Partial<RelationEntity> = { owner: "missing" as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toThrow("Service ownerService returned an empty relation entity");
	});

	it("throws when service override name is empty", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ services: { owner: "" } });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toThrow("Service name not specified for property owner");
	});

	it("throws when service override points to a missing controller service", async () => {
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ services: { owner: "missingOwnerService" } });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations({} as never, properties, relationConfig as never, parameters)).rejects.toThrow("Service missingOwnerService not found in controller");
	});

	it("throws when include contains an unknown relation key", async () => {
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ include: { missing: true } as never });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations({} as never, properties, relationConfig as never, parameters)).rejects.toThrow("Relation missing is not a direct relation on the entity");
	});

	it("skips included relations that are absent from the payload", async () => {
		const ownerService = new RelationOwnerService();
		const getSpy = vi.spyOn(ownerService, "get");
		const controller = {
			ownerService,
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig();
		const parameters: Partial<RelationEntity> = {};

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(getSpy).not.toHaveBeenCalled();
		expect(parameters.owner).toBeUndefined();
	});

	it("skips included relations with undefined payload values", async () => {
		const ownerService = new RelationOwnerService();
		const getSpy = vi.spyOn(ownerService, "get");
		const controller = {
			ownerService,
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig();
		const parameters: Partial<RelationEntity> = { owner: undefined };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(getSpy).not.toHaveBeenCalled();
		expect(parameters.owner).toBeUndefined();
	});

	it("leaves null relation values unchanged", async () => {
		const ownerService = new RelationOwnerService();
		const getSpy = vi.spyOn(ownerService, "get");
		const controller = {
			ownerService,
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig();
		const parameters: Partial<RelationEntity> = { owner: null as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(getSpy).not.toHaveBeenCalled();
		expect(parameters.owner).toBeNull();
	});

	it("skips include values set to false", async () => {
		const ownerService = new RelationOwnerService();
		const getSpy = vi.spyOn(ownerService, "get");
		const controller = {
			ownerService,
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ include: { owner: false } as never });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(getSpy).not.toHaveBeenCalled();
		expect(parameters.owner).toBe("owner-1");
	});

	it("throws when include value is malformed", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ include: { owner: "profile" } as never });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toThrow("Invalid include value for relation owner");
	});

	it("throws when include object value is null", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ include: { owner: null } as never });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toThrow("Invalid include value for relation owner");
	});

	it("passes nested include and relation load strategy to relation service", async () => {
		class NestedOwnerService extends ApiServiceBase<RelationOwner> {
			public override async get(properties: unknown): Promise<RelationOwner> {
				expect(properties).toEqual({
					relationLoadStrategy: "query",
					relations: {
						profile: true,
					},
					where: { id: "owner-1" },
				});

				return { id: "owner-1", name: "Owner" };
			}
		}

		const controller = {
			ownerService: new NestedOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({
			include: {
				owner: {
					profile: true,
				} as never,
			},
			relationLoadStrategy: "query",
		});
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toMatchObject({ id: "owner-1" });
	});
});
