import type { IApiSubqueryJoinPair, IApiSubqueryJoinTable } from "@interface/class/api/subquery";
import type { TTypeOrmColumnMetadata } from "@type/utility/typeorm";
import type { DataSource, EntityMetadata, RelationMetadata } from "typeorm";

/**
 * Reads which tables a relation crosses inside a correlated subquery, and on which columns, from the entity metadata of
 * the DataSource that reads it. It takes no table or column name from anywhere else, and a composite join column reads
 * as one pair per column.
 */
export class ApiSubqueryJoin {
	/**
	 * Reads the tables of a relation, on either side and of any kind.
	 * @param {RelationMetadata} relation - The relation.
	 * @returns {ReadonlyArray<IApiSubqueryJoinTable> | undefined} The tables in join order, or undefined when the metadata names no join column.
	 */
	public static readRelation(relation: RelationMetadata): ReadonlyArray<IApiSubqueryJoinTable> | undefined {
		if (relation.isManyToMany) {
			return this.readManyToMany(relation);
		}

		if (relation.isOneToMany || relation.isOneToOneNotOwner) {
			const on: ReadonlyArray<IApiSubqueryJoinPair> | undefined = this.readForeignPairs(relation.inverseRelation?.joinColumns);

			return on ? [{ metadata: relation.inverseEntityMetadata, on }] : undefined;
		}

		const on: ReadonlyArray<IApiSubqueryJoinPair> | undefined = this.readOwnedPairs(relation.joinColumns);

		return on ? [{ metadata: relation.inverseEntityMetadata, on }] : undefined;
	}

	/**
	 * Reads the tables of a link entity from its two owning relations, without a relation on the entity the subquery correlates to.
	 * @param {RelationMetadata} source - Owning relation of the link entity that points back at the row.
	 * @param {RelationMetadata} target - Owning relation of the link entity that leads on.
	 * @returns {ReadonlyArray<IApiSubqueryJoinTable> | undefined} The link table and the target table, or undefined when the metadata names no join column.
	 */
	public static readThrough(source: RelationMetadata, target: RelationMetadata): ReadonlyArray<IApiSubqueryJoinTable> | undefined {
		const linkOn: ReadonlyArray<IApiSubqueryJoinPair> | undefined = this.readForeignPairs(source.joinColumns);
		const targetOn: ReadonlyArray<IApiSubqueryJoinPair> | undefined = this.readOwnedPairs(target.joinColumns);

		return linkOn && targetOn
			? [
					{ metadata: source.entityMetadata, on: linkOn },
					{ metadata: target.inverseEntityMetadata, on: targetOn },
				]
			: undefined;
	}

	/**
	 * Writes the name of a table for the driver.
	 * @param {DataSource} dataSource - The DataSource that reads the table.
	 * @param {EntityMetadata} metadata - Metadata of the table.
	 * @returns {string} The escaped name, with its schema when it has one.
	 */
	public static writeTable(dataSource: DataSource, metadata: EntityMetadata): string {
		return metadata.tablePath
			.split(".")
			.map((part: string): string => dataSource.driver.escape(part))
			.join(".");
	}

	/**
	 * Reads pairs where the table being joined holds the join columns, which refer to the table before it.
	 * @param {ReadonlyArray<TTypeOrmColumnMetadata> | undefined} joinColumns - The join columns.
	 * @returns {ReadonlyArray<IApiSubqueryJoinPair> | undefined} The pairs, or undefined when a column refers to nothing.
	 */
	private static readForeignPairs(joinColumns: ReadonlyArray<TTypeOrmColumnMetadata> | undefined): ReadonlyArray<IApiSubqueryJoinPair> | undefined {
		return this.readPairs(joinColumns, (column: TTypeOrmColumnMetadata, referenced: TTypeOrmColumnMetadata): IApiSubqueryJoinPair => ({ column, previous: referenced }));
	}

	/**
	 * Reads a ManyToMany: the junction table, joined to the related table.
	 * @param {RelationMetadata} relation - The relation, on either side.
	 * @returns {ReadonlyArray<IApiSubqueryJoinTable> | undefined} The junction and related tables, or undefined when the metadata names no join column.
	 */
	private static readManyToMany(relation: RelationMetadata): ReadonlyArray<IApiSubqueryJoinTable> | undefined {
		const junction: EntityMetadata | undefined = relation.junctionEntityMetadata;
		// The owner side holds the junction columns; the inverse side reads them swapped.
		const ownerOn: ReadonlyArray<IApiSubqueryJoinPair> | undefined = this.readForeignPairs(relation.isOwning ? relation.joinColumns : relation.inverseRelation?.inverseJoinColumns);
		const targetOn: ReadonlyArray<IApiSubqueryJoinPair> | undefined = this.readOwnedPairs(relation.isOwning ? relation.inverseJoinColumns : relation.inverseRelation?.joinColumns);

		return junction && ownerOn && targetOn
			? [
					{ metadata: junction, on: ownerOn },
					{ metadata: relation.inverseEntityMetadata, on: targetOn },
				]
			: undefined;
	}

	/**
	 * Reads pairs where the table before holds the join columns, which refer to the table being joined.
	 * @param {ReadonlyArray<TTypeOrmColumnMetadata> | undefined} joinColumns - The join columns.
	 * @returns {ReadonlyArray<IApiSubqueryJoinPair> | undefined} The pairs, or undefined when a column refers to nothing.
	 */
	private static readOwnedPairs(joinColumns: ReadonlyArray<TTypeOrmColumnMetadata> | undefined): ReadonlyArray<IApiSubqueryJoinPair> | undefined {
		return this.readPairs(joinColumns, (column: TTypeOrmColumnMetadata, referenced: TTypeOrmColumnMetadata): IApiSubqueryJoinPair => ({ column: referenced, previous: column }));
	}

	/**
	 * Reads a pair from every join column and the column it refers to.
	 * @param {ReadonlyArray<TTypeOrmColumnMetadata> | undefined} joinColumns - The join columns.
	 * @param {(column: TTypeOrmColumnMetadata, referenced: TTypeOrmColumnMetadata) => IApiSubqueryJoinPair} createPair - Writes a pair.
	 * @returns {ReadonlyArray<IApiSubqueryJoinPair> | undefined} The pairs, or undefined without a column or when one refers to nothing.
	 */
	private static readPairs(joinColumns: ReadonlyArray<TTypeOrmColumnMetadata> | undefined, createPair: (column: TTypeOrmColumnMetadata, referenced: TTypeOrmColumnMetadata) => IApiSubqueryJoinPair): ReadonlyArray<IApiSubqueryJoinPair> | undefined {
		const pairs: Array<IApiSubqueryJoinPair> = (joinColumns ?? []).flatMap((column: TTypeOrmColumnMetadata): Array<IApiSubqueryJoinPair> => (column.referencedColumn ? [createPair(column, column.referencedColumn)] : []));

		return pairs.length > 0 && pairs.length === joinColumns?.length ? pairs : undefined;
	}
}
