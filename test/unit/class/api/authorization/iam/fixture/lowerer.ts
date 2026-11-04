import type { IApiAuthorizationIamColumn, IApiAuthorizationIamDialect, IApiAuthorizationIamPredicateColumn, IApiAuthorizationIamQueryField } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamPredicate } from "@type/class/api/authorization/iam";
import type { DataSourceOptions, FindOptionsWhere } from "typeorm";

import { ApiAuthorizationIamMysqlLowerer, ApiAuthorizationIamPortableLowerer, ApiAuthorizationIamPostgresLowerer, ApiAuthorizationIamSqliteLowerer } from "@class/api/authorization/iam";
import { EApiAuthorizationIamColumnFamily, EApiAuthorizationIamDialect } from "@enum/class/authorization";
import { Column, DataSource, Entity, ManyToOne, PrimaryColumn } from "typeorm";

@Entity("iam_lowerer_owners")
export class IamLowererOwnerEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ nullable: true, type: "varchar" })
	public name!: null | string;
}

@Entity("iam_lowerer_items")
export class IamLowererItemEntity {
	@Column({ nullable: true, type: "varchar" })
	public code!: null | string;

	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ nullable: true, type: "varchar" })
	public name!: null | string;

	@ManyToOne(() => IamLowererOwnerEntity, { nullable: true })
	public owner!: IamLowererOwnerEntity | null;

	@Column({ nullable: true, type: "int" })
	public rank!: null | number;
}

/**
 * Builds a predicate column with the metadata a test names, so one entity serves every column type the lowerers tell apart.
 * @param {string} queryPath - Query path on `IamLowererItemEntity`.
 * @param {Partial<IApiAuthorizationIamColumn>} [column] - Column metadata over a nullable text column.
 * @param {Partial<IApiAuthorizationIamQueryField>} [field] - Query field over a resolvable, required, non-boolean path.
 * @returns {IApiAuthorizationIamPredicateColumn} The predicate column.
 */
export function createIamLowererColumn(queryPath: string, column: Partial<IApiAuthorizationIamColumn> = {}, field: Partial<IApiAuthorizationIamQueryField> = {}): IApiAuthorizationIamPredicateColumn {
	return {
		field: {
			column: { family: EApiAuthorizationIamColumnFamily.TEXT, hasTransformer: false, isArray: false, isJson: false, isNullable: true, isPrimary: false, type: "varchar", ...column },
			isBoolean: false,
			isOptional: false,
			isResolvable: true,
			...field,
		},
		queryPath,
	};
}

/**
 * Picks the lowerer a dialect uses, as the query planner does.
 * @param {IApiAuthorizationIamDialect} dialect - Dialect.
 * @returns {ApiAuthorizationIamPortableLowerer} The lowerer.
 */
export function createIamLowerer(dialect: IApiAuthorizationIamDialect): ApiAuthorizationIamPortableLowerer {
	switch (dialect.type) {
		case EApiAuthorizationIamDialect.MARIADB:
		// falls through

		case EApiAuthorizationIamDialect.MYSQL: {
			return new ApiAuthorizationIamMysqlLowerer(dialect);
		}

		case EApiAuthorizationIamDialect.POSTGRES: {
			return new ApiAuthorizationIamPostgresLowerer(dialect);
		}

		case EApiAuthorizationIamDialect.SQLITE: {
			return new ApiAuthorizationIamSqliteLowerer(dialect);
		}

		default: {
			return new ApiAuthorizationIamPortableLowerer(dialect);
		}
	}
}

/**
 * Builds the metadata of a DataSource that never connects, so a test can render the SQL of a `where`.
 * @param {DataSourceOptions["type"]} type - Driver type.
 * @returns {Promise<DataSource>} The DataSource with its entity metadata built.
 */
export async function createIamLowererDataSource(type: "better-sqlite3" | "mysql" | "postgres"): Promise<DataSource> {
	const options: Record<string, unknown> = type === "better-sqlite3" ? { database: ":memory:", type } : type === "mysql" ? { connectorPackage: "mysql2", database: "iam", driver: { isStub: true }, type } : { database: "iam", type };
	const dataSource: DataSource = new DataSource({ ...options, entities: [IamLowererItemEntity, IamLowererOwnerEntity] } as unknown as DataSourceOptions);

	await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

	return dataSource;
}

/**
 * Lowers a predicate and renders the WHERE clause and parameters TypeORM builds from it.
 * @param {DataSource} dataSource - DataSource built by `createIamLowererDataSource`.
 * @param {IApiAuthorizationIamDialect} dialect - Dialect to lower to.
 * @param {TApiAuthorizationIamPredicate} predicate - Predicate.
 * @returns {{ parameters: Array<unknown>; where: string } | undefined} The WHERE clause and its parameters, or undefined when the predicate does not lower.
 */
export function renderIamLowererWhere(dataSource: DataSource, dialect: IApiAuthorizationIamDialect, predicate: TApiAuthorizationIamPredicate): { parameters: Array<unknown>; where: string } | undefined {
	const lowered: { branches?: Array<FindOptionsWhere<IamLowererItemEntity>>; isCompilable: boolean } = createIamLowerer(dialect).lower<IamLowererItemEntity>(predicate, 128);

	if (!lowered.isCompilable || !lowered.branches) {
		return undefined;
	}

	const [query, parameters]: [string, Array<unknown>] = dataSource.getRepository(IamLowererItemEntity).createQueryBuilder().setFindOptions({ where: lowered.branches }).getQueryAndParameters();
	const whereIndex: number = query.indexOf(" WHERE ");

	return { parameters, where: whereIndex === -1 ? "" : query.slice(whereIndex + " WHERE ".length) };
}
