import "reflect-metadata";

import type { Repository } from "typeorm";

import { ApiControllerAssertRepositoryEntity } from "@utility/api/controller/assert-repository-entity.utility";
import { ChildEntity, DataSource, Entity, EntitySchema, PrimaryGeneratedColumn, TableInheritance } from "typeorm";
import { beforeAll, describe, expect, it } from "vitest";

@Entity("assert_repository_owners")
class AssertRepositoryOwnerEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Entity("assert_repository_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class AssertRepositoryRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@ChildEntity("FIRST")
class AssertRepositoryFirstChildEntity extends AssertRepositoryRootEntity {}

@ChildEntity("SECOND")
class AssertRepositorySecondChildEntity extends AssertRepositoryRootEntity {}

const createSameNamedEntity = (table: string): new () => object => {
	@Entity(table)
	class AssertRepositorySameNameEntity {
		@PrimaryGeneratedColumn("uuid")
		public id!: string;
	}

	return AssertRepositorySameNameEntity;
};

const FirstSameNamedEntity: new () => object = createSameNamedEntity("assert_repository_same_first");
const SecondSameNamedEntity: new () => object = createSameNamedEntity("assert_repository_same_second");
const SchemaEntity: EntitySchema = new EntitySchema({ columns: { id: { generated: "uuid", primary: true, type: "uuid" } }, name: "assert_repository_schema" });

describe("ApiControllerAssertRepositoryEntity", () => {
	const dataSource: DataSource = new DataSource({ entities: [AssertRepositoryOwnerEntity, AssertRepositoryRootEntity, AssertRepositoryFirstChildEntity, AssertRepositorySecondChildEntity, FirstSameNamedEntity, SecondSameNamedEntity, SchemaEntity], type: "postgres" });

	beforeAll(async () => {
		// Metadata is enough for the check; the test never connects.
		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();
	});

	it("allows the repository of the entity and of its table inheritance lineage", () => {
		const check = (entity: Function, repositoryEntity: Function): void => ApiControllerAssertRepositoryEntity(entity as never, dataSource.getRepository(repositoryEntity), "AllowedController");

		expect(() => check(AssertRepositoryOwnerEntity, AssertRepositoryOwnerEntity)).not.toThrowError();
		expect(() => check(AssertRepositoryFirstChildEntity, AssertRepositoryRootEntity)).not.toThrowError();
		expect(() => check(AssertRepositoryRootEntity, AssertRepositoryFirstChildEntity)).not.toThrowError();
	});

	it("allows a custom repository of the entity", () => {
		const custom = dataSource.getRepository(AssertRepositoryOwnerEntity).extend({});

		expect(() => ApiControllerAssertRepositoryEntity(AssertRepositoryOwnerEntity as never, custom, "CustomController")).not.toThrowError();
	});

	it.each([
		["no repository", undefined],
		["a mock without metadata", { find: (): void => undefined }],
		["a mock that claims another entity", { metadata: { target: AssertRepositoryOwnerEntity } }],
	])("does not check %s", (_label: string, repository: unknown) => {
		expect(() => ApiControllerAssertRepositoryEntity(AssertRepositoryRootEntity as never, repository, "MockController")).not.toThrowError();
	});

	it.each([
		["from another TypeORM copy", (repository: Repository<object>): unknown => ({ manager: repository.manager, metadata: repository.metadata })],
		["wrapped in a Proxy", (repository: Repository<object>): unknown => new Proxy({}, { get: (_target: object, property: string | symbol): unknown => Reflect.get(repository, property) })],
	])("checks a repository %s", (_label: string, wrap: (repository: Repository<object>) => unknown) => {
		expect(() => ApiControllerAssertRepositoryEntity(AssertRepositoryOwnerEntity as never, wrap(dataSource.getRepository(AssertRepositoryOwnerEntity)), "CopyController")).not.toThrowError();
		expect(() => ApiControllerAssertRepositoryEntity(AssertRepositoryRootEntity as never, wrap(dataSource.getRepository(AssertRepositoryOwnerEntity)), "CopyController")).toThrowError('Controller "CopyController" serves entity AssertRepositoryRootEntity');
	});

	it("does not check a repository of a schema without a class", () => {
		expect(() => ApiControllerAssertRepositoryEntity(AssertRepositoryOwnerEntity as never, dataSource.getRepository(SchemaEntity), "SchemaController")).not.toThrowError();
	});

	it("refuses a same-named class, naming both tables and the shared token", () => {
		const check = (): void => ApiControllerAssertRepositoryEntity(FirstSameNamedEntity as never, dataSource.getRepository(SecondSameNamedEntity), "SameNameController");

		expect(check).toThrowError('Controller "SameNameController" serves entity AssertRepositorySameNameEntity (table assert_repository_same_first), but its service repository is for AssertRepositorySameNameEntity (table assert_repository_same_second).');
		expect(check).toThrowError("The two classes share one class name, so they have one repository token");
	});

	it("refuses an unrelated class and a sibling, naming the table of the root for a child", () => {
		const unrelated = (): void => ApiControllerAssertRepositoryEntity(AssertRepositoryOwnerEntity as never, dataSource.getRepository(AssertRepositoryRootEntity), "UnrelatedController");
		const sibling = (): void => ApiControllerAssertRepositoryEntity(AssertRepositoryFirstChildEntity as never, dataSource.getRepository(AssertRepositorySecondChildEntity), "SiblingController");

		expect(unrelated).toThrowError('Controller "UnrelatedController" serves entity AssertRepositoryOwnerEntity (table assert_repository_owners), but its service repository is for AssertRepositoryRootEntity (table assert_repository_roots).');
		expect(unrelated).toThrowError("Generated routes read and write through the service repository");
		expect(sibling).toThrowError("serves entity AssertRepositoryFirstChildEntity (table assert_repository_roots), but its service repository is for AssertRepositorySecondChildEntity (table assert_repository_roots)");
	});
});
