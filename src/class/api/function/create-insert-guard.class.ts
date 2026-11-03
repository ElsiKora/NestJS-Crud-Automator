import type { AsyncLocalStorage } from "node:async_hooks";

import type { IApiFunctionCreateInsertGuardSave } from "@interface/class/api/function/create-insert-guard";
import type { TApiEntityReference } from "@type/api-entity-reference.type";
import type { DataSource, DeepPartial, EntityMetadata, EntitySubscriberInterface, FindOptionsWhere, InsertEvent, ObjectLiteral, RecoverEvent, RemoveEvent, Repository, SoftRemoveEvent, UpdateEvent } from "typeorm";

import { AsyncLocalStorage as NodeAsyncLocalStorage } from "node:async_hooks";

import { ErrorDuplicateKeyException } from "@utility/error/duplicate-key-exception.utility";
import { InstanceChecker } from "typeorm";

/**
 * Keeps the save of a create function to inserts, so a create never changes a row that already exists.
 * TypeORM `save` updates a row whose primary key it finds, a cascaded related row whose columns differ, and an existing to-many row it links to the new row.
 * A row the body names by its whole primary key is looked up before the save, by the value TypeORM writes into each key column. The rest is a TypeORM subscriber on the DataSource of the repository, which answers 409 before TypeORM sends any write when the save would update, remove, soft remove or recover a row.
 * TypeORM broadcasts the before events of one save in one synchronous loop before its first write, and the row it was given comes first when it is inserted.
 * The subscriber acts only in the asynchronous context of the save the create function starts, so other saves, also on the same query runner or in the same transaction, are never refused.
 * A change that an application subscriber or entity listener makes to an existing related object during the before events is outside the guard: TypeORM computes it again afterwards and writes it as an update that broadcasts no before event.
 */
export class ApiFunctionCreateInsertGuard implements EntitySubscriberInterface {
	private static readonly INSTANCE: ApiFunctionCreateInsertGuard = new ApiFunctionCreateInsertGuard();

	// The save of a create function, in the asynchronous context of that save only.
	private static readonly STORAGE: AsyncLocalStorage<IApiFunctionCreateInsertGuardSave> = new NodeAsyncLocalStorage<IApiFunctionCreateInsertGuardSave>();

	/**
	 * Reads the whole primary key of a row as the find condition of its key columns.
	 * Each key column is matched with the value TypeORM writes into it, which the find runs through the column transformer as the write does.
	 * A key column that a relation also joins takes that value from the related object when the row holds one, and from its own property otherwise.
	 * TypeORM `getEntityIdMap` returns the whole related object for such a column instead, which no database compares with a column value.
	 * @template E The entity type
	 * @param {EntityMetadata} metadata - Metadata of the entity
	 * @param {DeepPartial<E>} row - Row to read, as a create function saves it or as TypeORM returns it
	 * @returns {FindOptionsWhere<E> | undefined} The condition, or undefined when a key column has no value
	 */
	public static readKey<E extends ObjectLiteral>(metadata: EntityMetadata, row: DeepPartial<E>): FindOptionsWhere<E> | undefined {
		const key: Record<string, unknown> = {};

		for (const column of metadata.primaryColumns) {
			const value: unknown = column.getEntityValue(row as ObjectLiteral);

			if (value === undefined || value === null) {
				return undefined;
			}

			// A column inside an embedded property sits under that property, as in the entity.
			this.mergeKey(key, column.createValueMap(value));
		}

		return key as FindOptionsWhere<E>;
	}

	/**
	 * Saves the row of a create function and refuses the save when it would change a row that already exists.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository the create function saves through
	 * @param {DeepPartial<E>} properties - Row the create function saves
	 * @param {TApiEntityReference} entity - Entity of the create function, named in the refusal
	 * @returns {Promise<E>} The saved row
	 * @throws {Error} A 409 conflict when the row or a row the save reaches through its relations already exists and would change
	 */
	public static async save<E extends ObjectLiteral>(repository: Repository<E>, properties: DeepPartial<E>, entity: TApiEntityReference): Promise<E> {
		const dataSource: DataSource | undefined = (repository.manager as Partial<Repository<E>["manager"]> | undefined)?.dataSource;

		// A repository object without a TypeORM DataSource, such as a test double, writes nothing TypeORM could report.
		if (!InstanceChecker.isDataSource(dataSource)) {
			return await repository.save(properties);
		}

		this.register(dataSource);
		// Without a value for each key column, the save alone decides.
		const key: FindOptionsWhere<E> | undefined = this.readKey(repository.metadata, properties);

		if (key && (await this.isStored(repository, key))) {
			throw ErrorDuplicateKeyException(entity);
		}

		const save: IApiFunctionCreateInsertGuardSave = { entity, isInserted: false, isOpen: false, root: properties };
		const result: E = await this.STORAGE.run(save, async (): Promise<E> => await repository.save(properties));

		// A row another request committed with the same key and the same values gives TypeORM nothing to write, so no event refused it. A stubbed save writes nothing either, and finds no row.
		if (!save.isInserted && key && (await this.isStored(repository, key))) {
			throw ErrorDuplicateKeyException(entity);
		}

		return result;
	}

	/**
	 * Tells whether a value is a level of embedded properties that `createValueMap` built, and not a column value such as a `Date`.
	 * @param {unknown} value - Value of the key
	 * @returns {boolean} Whether the value is a plain object
	 */
	private static isLevel(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
	}

	/**
	 * Tells whether a row with the key is stored, soft deleted rows included.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository the create function saves through
	 * @param {FindOptionsWhere<E>} key - Whole primary key of the row the create function saves
	 * @returns {Promise<boolean>} Whether the database holds a row with the key
	 */
	private static async isStored<E extends ObjectLiteral>(repository: Repository<E>, key: FindOptionsWhere<E>): Promise<boolean> {
		// A soft deleted row still holds its key, and TypeORM would update it.
		return await repository.exists({ where: key, withDeleted: true });
	}

	/**
	 * Adds the condition of one key column to the key, merging the embedded properties both hold.
	 * @param {Record<string, unknown>} key - Condition built so far, changed in place
	 * @param {Record<string, unknown>} condition - Condition of one key column
	 */
	private static mergeKey(key: Record<string, unknown>, condition: Record<string, unknown>): void {
		for (const [name, value] of Object.entries(condition)) {
			const current: unknown = key[name];

			if (this.isLevel(current) && this.isLevel(value)) {
				this.mergeKey(current, value);
			} else {
				key[name] = value;
			}
		}
	}

	/**
	 * Checks one before event of a TypeORM save against the save of the create function it runs in.
	 * An event outside such a save is left alone. Inside it, the insert of its own row opens the synchronous loop of its before events, in which any update, remove, soft remove or recover is refused, and every event before that insert is refused.
	 * @param {boolean} isInsert - Whether the event announces an insert
	 * @param {ObjectLiteral | undefined} entity - Entity object of the event
	 * @throws {Error} A 409 conflict with `{ENTITY}_DUPLICATE_KEY` when the event would change a row that already exists
	 */
	private static observe(isInsert: boolean, entity: ObjectLiteral | undefined): void {
		const save: IApiFunctionCreateInsertGuardSave | undefined = this.STORAGE.getStore();

		if (!save) {
			return;
		}

		if (isInsert && entity === save.root && !save.isInserted) {
			save.isInserted = true;
			save.isOpen = true;

			// Runs once the synchronous loop of this save ended, before TypeORM writes, so a later save started by a subscriber is not refused.
			queueMicrotask((): void => {
				save.isOpen = false;
			});

			return;
		}

		if (save.isOpen) {
			if (!isInsert) {
				throw ErrorDuplicateKeyException(save.entity);
			}

			return;
		}

		// An event before the insert of its own row: a save of an existing row never reaches that insert.
		if (!save.isInserted) {
			throw ErrorDuplicateKeyException(save.entity);
		}
	}

	/**
	 * Adds the guard subscriber to the DataSource once.
	 * @param {DataSource} dataSource - DataSource of the repository the create function saves through
	 */
	private static register(dataSource: DataSource): void {
		// TypeORM replaces the subscriber list when a DataSource initializes again, so the guard checks the list itself.
		if (!dataSource.subscribers.includes(this.INSTANCE)) {
			dataSource.subscribers.push(this.INSTANCE);
		}
	}

	/**
	 * Marks the insert of the row a create function saves, and refuses a save that inserts another row before it.
	 * @param {InsertEvent<ObjectLiteral>} event - Event TypeORM broadcasts before an insert
	 */
	public beforeInsert(event: InsertEvent<ObjectLiteral>): void {
		ApiFunctionCreateInsertGuard.observe(true, event.entity);
	}

	/**
	 * Refuses a create function that recovers an existing row.
	 * @param {RecoverEvent<ObjectLiteral>} event - Event TypeORM broadcasts before a recover
	 */
	public beforeRecover(event: RecoverEvent<ObjectLiteral>): void {
		ApiFunctionCreateInsertGuard.observe(false, event.entity);
	}

	/**
	 * Refuses a create function that removes an existing row.
	 * @param {RemoveEvent<ObjectLiteral>} event - Event TypeORM broadcasts before a remove
	 */
	public beforeRemove(event: RemoveEvent<ObjectLiteral>): void {
		ApiFunctionCreateInsertGuard.observe(false, event.entity);
	}

	/**
	 * Refuses a create function that soft removes an existing row.
	 * @param {SoftRemoveEvent<ObjectLiteral>} event - Event TypeORM broadcasts before a soft remove
	 */
	public beforeSoftRemove(event: SoftRemoveEvent<ObjectLiteral>): void {
		ApiFunctionCreateInsertGuard.observe(false, event.entity);
	}

	/**
	 * Refuses a create function that updates an existing row.
	 * @param {UpdateEvent<ObjectLiteral>} event - Event TypeORM broadcasts before an update
	 */
	public beforeUpdate(event: UpdateEvent<ObjectLiteral>): void {
		ApiFunctionCreateInsertGuard.observe(false, event.entity);
	}
}
