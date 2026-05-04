import "reflect-metadata";

import type { IApiControllerProperties } from "@interface/decorator/api";

import { ApiServiceBase } from "@class/api";
import { EApiControllerLoadRelationsStrategy, EApiControllerRelationReferenceShape } from "@enum/decorator/api";
import { ApiControllerHandleRequestRelations } from "@utility/api/controller/handle-request-relations.utility";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

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

const createRelationConfig = (overrides: {
	referenceKey?: string;
	referenceShape?: EApiControllerRelationReferenceShape;
	relationStrategy?: EApiControllerLoadRelationsStrategy;
	relations?: Array<"owner">;
	serviceStrategy?: EApiControllerLoadRelationsStrategy;
	services?: Partial<Record<"owner", string>>;
	shouldForceAllServicesToBeSpecified?: boolean;
	shouldLoad?: boolean;
} = {}) => ({
	load: {
		relationStrategy: overrides.relationStrategy ?? EApiControllerLoadRelationsStrategy.AUTO,
		relations: overrides.relations,
		serviceStrategy: overrides.serviceStrategy ?? EApiControllerLoadRelationsStrategy.AUTO,
		services: overrides.services,
		shouldForceAllServicesToBeSpecified: overrides.shouldForceAllServicesToBeSpecified,
		shouldLoad: overrides.shouldLoad ?? true,
	},
	reference: {
		key: overrides.referenceKey,
		shape: overrides.referenceShape ?? EApiControllerRelationReferenceShape.SCALAR,
	},
});

describe("ApiControllerHandleRequestRelations", () => {
	it("loads relations using auto strategy", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ shouldForceAllServicesToBeSpecified: false });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toMatchObject({ id: "owner-1" });
	});

	it("throws when service is missing in forced mode", async () => {
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ shouldForceAllServicesToBeSpecified: true });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations({} as never, properties, relationConfig as never, parameters)).rejects.toThrow("Service ownerService not found in controller");
	});

	it("throws when manual service name is not provided", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ serviceStrategy: EApiControllerLoadRelationsStrategy.MANUAL, services: {}, shouldForceAllServicesToBeSpecified: false });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toThrow("Service name not specified for property owner in manual mode");
	});

	it("throws when service is not an ApiServiceBase", async () => {
		const controller = {
			ownerService: {},
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ shouldForceAllServicesToBeSpecified: false });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toThrow("Service ownerService is not an instance of BaseApiService");
	});

	it("skips relations not listed in manual load strategy", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ relationStrategy: EApiControllerLoadRelationsStrategy.MANUAL, relations: [], shouldForceAllServicesToBeSpecified: false });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toBe("owner-1");
	});

	it("loads relations using manual service mapping", async () => {
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
		const relationConfig = createRelationConfig({ serviceStrategy: EApiControllerLoadRelationsStrategy.MANUAL, services: { owner: "customOwnerService" }, shouldForceAllServicesToBeSpecified: false });
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
		const relationConfig = createRelationConfig({ referenceKey: "name", shouldForceAllServicesToBeSpecified: false });
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
		const relationConfig = createRelationConfig({ referenceShape: EApiControllerRelationReferenceShape.OBJECT, shouldForceAllServicesToBeSpecified: false });
		const parameters: Partial<RelationEntity> = { owner: { id: "owner-1" } as never };

		await ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toMatchObject({ id: "owner-1" });
	});

	it("throws when relation id is invalid", async () => {
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
		const relationConfig = createRelationConfig({ shouldForceAllServicesToBeSpecified: false });
		const parameters: Partial<RelationEntity> = { owner: "missing" as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toThrow("Invalid owner ID");
	});

	it("throws when manual service name is empty", async () => {
		const controller = {
			ownerService: new RelationOwnerService(),
		};
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ serviceStrategy: EApiControllerLoadRelationsStrategy.MANUAL, services: { owner: "" }, shouldForceAllServicesToBeSpecified: false });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await expect(ApiControllerHandleRequestRelations(controller as never, properties, relationConfig as never, parameters)).rejects.toThrow("Service name not specified for property owner");
	});

	it("skips missing services when not forced", async () => {
		const properties: IApiControllerProperties<RelationEntity> = {
			entity: RelationEntity,
			routes: {},
		};
		const relationConfig = createRelationConfig({ shouldForceAllServicesToBeSpecified: false });
		const parameters: Partial<RelationEntity> = { owner: "owner-1" as never };

		await ApiControllerHandleRequestRelations({} as never, properties, relationConfig as never, parameters);

		expect(parameters.owner).toBe("owner-1");
	});
});
