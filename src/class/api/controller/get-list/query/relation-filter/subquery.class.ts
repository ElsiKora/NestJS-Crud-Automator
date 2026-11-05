import type { IApiControllerGetListQueryOperator, IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanFilterField } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerGetListQueryPlanFilterRelation, IApiControllerGetListQueryPlanFilterRelationCondition, IApiControllerGetListQueryPlanFilterRelationHop } from "@interface/class/api/controller/get-list/query/plan/filter/relation";
import type { IApiControllerGetListQueryRelationFilterShape } from "@interface/class/api/controller/get-list/query/relation-filter";
import type { IApiSubqueryJoinPair, IApiSubqueryJoinTable } from "@interface/class/api/subquery";
import type { TTypeOrmColumnMetadata } from "@type/utility/typeorm";
import type { DataSource, EntityMetadata, FindOperator, ObjectLiteral, RelationMetadata, Repository } from "typeorm";

import { createHash } from "node:crypto";

import { ApiSubqueryJoin, ApiSubqueryOperand, ApiSubqueryRaw } from "@class/api/subquery";
import { FILTER_OPERATOR_REGISTRY_CONSTANT } from "@constant/filter";
import { FILTER_RELATION_CONSTANT } from "@constant/filter/relation.constant";
import { EFilterOperand } from "@enum/filter";
import { DatabaseTypeOrmIsRepository } from "@utility/database/typeorm/is/repository.utility";
import { ErrorException } from "@utility/error/exception.utility";

// The subquery of each relation filter field, per DataSource: the metadata that writes it never changes.
const RELATION_FILTER_SHAPES: WeakMap<DataSource, WeakMap<IApiControllerGetListQueryPlanFilterField, IApiControllerGetListQueryRelationFilterShape>> = new WeakMap<DataSource, WeakMap<IApiControllerGetListQueryPlanFilterField, IApiControllerGetListQueryRelationFilterShape>>();

/**
 * Compiles a relation filter field to one parameterized `EXISTS (SELECT 1 FROM ... WHERE ...)` on the main query, from
 * the entity metadata of the DataSource that reads the route entity. Every name is one that metadata holds, escaped by
 * its driver; every value is a bound parameter. It means that a related row exists that matches, so the list gains no
 * row and loses no row to a join, and the condition ANDs with every other filter, scope and cursor window.
 */
export class ApiControllerGetListQueryRelationFilterSubquery {
	/**
	 * Fails startup when a relation filter field of a route cannot read exactly on the DataSource of the route.
	 * @param {IApiControllerGetListQueryPlan} plan - Compiled query plan of the route.
	 * @param {Repository<ObjectLiteral>} repository - Repository of the route entity.
	 * @param {string} source - Controller and route named in the error.
	 * @throws {Error} Naming the controller, the route, the field and the reason.
	 */
	public static assertPlan(plan: IApiControllerGetListQueryPlan, repository: Repository<ObjectLiteral>, source: string): void {
		for (const field of Object.values(plan.filter.fields)) {
			if (field.isEnabled && field.relationFilter) {
				this.readShape(field, repository, source);
			}
		}
	}

	/**
	 * Compiles the client's condition on a relation filter field.
	 * @param {IApiControllerGetListQueryPlanFilterField} field - The field.
	 * @param {FindOperator<unknown>} compiled - The client's condition, as the operator registry compiled it for the driver.
	 * @param {Repository<ObjectLiteral>} repository - Repository of the route entity.
	 * @param {string} source - Controller and route named in an error.
	 * @returns {{ key: string; operator: FindOperator<unknown> }} The query path of the route entity the condition attaches to, and the condition.
	 */
	public static compile(field: IApiControllerGetListQueryPlanFilterField, compiled: FindOperator<unknown>, repository: Repository<ObjectLiteral>, source: string): { key: string; operator: FindOperator<unknown> } {
		const shape: IApiControllerGetListQueryRelationFilterShape = this.readShape(field, repository, source);
		const dataSource: DataSource = repository.manager.dataSource;
		const parameters: Record<string, unknown> = {};
		const predicates: Array<string> = [this.render(compiled, shape.leaf, parameters, dataSource, field.path, source)];

		for (const { condition, expression } of shape.conditions) {
			predicates.push(this.render(this.compileCondition(condition, dataSource), expression, parameters, dataSource, field.path, source));
		}

		const sql = (columnAlias: string): string => {
			// TypeORM passes `<alias>.<property>` of the column the condition attaches to; the row's alias is all this reads of it.
			const alias: string = dataSource.driver.escape(columnAlias.slice(0, columnAlias.lastIndexOf(".")));
			const correlation: Array<string> = shape.correlation.map(({ inner, outer }: { inner: string; outer: string }): string => `${inner} = ${alias}.${outer}`);

			return `EXISTS (SELECT 1 FROM ${shape.from} WHERE ${[...correlation, ...shape.rowConditions, ...predicates].join(" AND ")})`;
		};

		return { key: shape.key, operator: ApiSubqueryRaw.create(sql, parameters) };
	}

	/**
	 * Compiles a fixed condition for the driver.
	 * @param {IApiControllerGetListQueryPlanFilterRelationCondition} condition - The condition.
	 * @param {DataSource} dataSource - The DataSource.
	 * @returns {FindOperator<unknown>} The condition as a TypeORM operator.
	 */
	private static compileCondition(condition: IApiControllerGetListQueryPlanFilterRelationCondition, dataSource: DataSource): FindOperator<unknown> {
		const descriptor: IApiControllerGetListQueryOperator = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[condition.operation];

		return descriptor.compile(descriptor.operand === EFilterOperand.VALUE ? condition.value : condition.values, dataSource.options.type);
	}

	/**
	 * Names the relation property of the route entity that already crosses a link's edge, when there is one.
	 * @param {EntityMetadata} current - The entity the link starts at.
	 * @param {RelationMetadata} sourceRelation - The link's source relation.
	 * @param {RelationMetadata} targetRelation - The link's target relation.
	 * @returns {string | undefined} The start of the property path to declare instead.
	 */
	private static findPropertyEdge(current: EntityMetadata, sourceRelation: RelationMetadata, targetRelation: RelationMetadata): string | undefined {
		for (const relation of current.relations) {
			if (relation.isOneToMany && relation.inverseRelation === sourceRelation) {
				return `${relation.propertyPath}.${targetRelation.propertyPath}`;
			}

			if (relation.isManyToMany && relation.inverseEntityMetadata === targetRelation.inverseEntityMetadata && relation.junctionEntityMetadata?.tablePath === sourceRelation.entityMetadata.tablePath) {
				return relation.propertyPath;
			}
		}

		return undefined;
	}

	/**
	 * Reads the plain primary column of the route entity a condition can attach to.
	 * @param {EntityMetadata} root - Metadata of the route entity.
	 * @param {(reason: string) => Error} fail - Writes the error.
	 * @returns {string} Its query path.
	 */
	private static readKey(root: EntityMetadata, fail: (reason: string) => Error): string {
		const column: TTypeOrmColumnMetadata | undefined = root.primaryColumns.find((candidate: TTypeOrmColumnMetadata): boolean => !candidate.embeddedMetadata && !candidate.transformer && !root.findRelationWithPropertyPath(candidate.propertyPath));

		if (!column) {
			throw fail(`entity "${root.name}" has no primary column outside an embedded or a relation without a value transformer, which the condition attaches to`);
		}

		return column.propertyPath;
	}

	/**
	 * Reads the tables a link hop crosses, and refuses a link that is not the one way to write its edge.
	 * @param {IApiControllerGetListQueryPlanFilterRelationHop} hop - The hop.
	 * @param {EntityMetadata} current - The entity the hop starts at.
	 * @param {DataSource} dataSource - The DataSource.
	 * @param {(reason: string) => Error} fail - Writes the error.
	 * @returns {ReadonlyArray<IApiSubqueryJoinTable>} The link table and the target table.
	 */
	private static readLinkHop(hop: IApiControllerGetListQueryPlanFilterRelationHop, current: EntityMetadata, dataSource: DataSource, fail: (reason: string) => Error): ReadonlyArray<IApiSubqueryJoinTable> {
		if (!dataSource.hasMetadata(hop.entity as never)) {
			throw fail(`link entity "${hop.entity.name}" is not an entity of the DataSource that reads the route`);
		}

		const link: EntityMetadata = dataSource.getMetadata(hop.entity as never);
		const sourceRelation: RelationMetadata | undefined = link.findRelationWithPropertyPath(hop.source ?? "");
		const targetRelation: RelationMetadata | undefined = link.findRelationWithPropertyPath(hop.relation);

		if (!sourceRelation?.isOwning || !targetRelation?.isOwning || sourceRelation.isManyToMany || targetRelation.isManyToMany) {
			throw fail(`relations "${String(hop.source)}" and "${hop.relation}" of link entity "${hop.entity.name}" must both be owning to-one relations`);
		}

		const propertyEdge: string | undefined = this.findPropertyEdge(current, sourceRelation, targetRelation);

		if (propertyEdge !== undefined) {
			throw fail(`entity "${current.name}" holds a relation for this edge, so the property path is the one way to declare it: use "${propertyEdge}.<field>" in fields instead of a link`);
		}

		const tables: ReadonlyArray<IApiSubqueryJoinTable> | undefined = ApiSubqueryJoin.readThrough(sourceRelation, targetRelation);

		if (!tables) {
			throw fail(`link entity "${hop.entity.name}" has no join columns for relations "${String(hop.source)}" and "${hop.relation}"`);
		}

		return tables;
	}

	/**
	 * Reads the tables a relation property crosses.
	 * @param {IApiControllerGetListQueryPlanFilterRelationHop} hop - The hop.
	 * @param {EntityMetadata} current - The entity the hop starts at.
	 * @returns {ReadonlyArray<IApiSubqueryJoinTable> | undefined} The tables, or undefined when the metadata names no join column.
	 */
	private static readPropertyHop(hop: IApiControllerGetListQueryPlanFilterRelationHop, current: EntityMetadata): ReadonlyArray<IApiSubqueryJoinTable> | undefined {
		const relation: RelationMetadata | undefined = current.findRelationWithPropertyPath(hop.relation);

		return relation ? ApiSubqueryJoin.readRelation(relation) : undefined;
	}

	/**
	 * Reads the subquery of a field on the DataSource of the route, once per DataSource.
	 * @param {IApiControllerGetListQueryPlanFilterField} field - The field.
	 * @param {Repository<ObjectLiteral>} repository - Repository of the route entity.
	 * @param {string} source - Controller and route named in an error.
	 * @returns {IApiControllerGetListQueryRelationFilterShape} The subquery.
	 */
	private static readShape(field: IApiControllerGetListQueryPlanFilterField, repository: Repository<ObjectLiteral>, source: string): IApiControllerGetListQueryRelationFilterShape {
		// A service with no TypeORM repository has no metadata to write the subquery from, and a dotted key must never reach it as a nested condition.
		if (!DatabaseTypeOrmIsRepository(repository)) {
			throw ErrorException(`${source}: GET_LIST filter field "${field.path}" needs a TypeORM repository on the service of the route`);
		}

		const dataSource: DataSource = repository.manager.dataSource;
		let shapes: undefined | WeakMap<IApiControllerGetListQueryPlanFilterField, IApiControllerGetListQueryRelationFilterShape> = RELATION_FILTER_SHAPES.get(dataSource);

		if (!shapes) {
			shapes = new WeakMap<IApiControllerGetListQueryPlanFilterField, IApiControllerGetListQueryRelationFilterShape>();
			RELATION_FILTER_SHAPES.set(dataSource, shapes);
		}

		const cached: IApiControllerGetListQueryRelationFilterShape | undefined = shapes.get(field);

		if (cached) {
			return cached;
		}

		const shape: IApiControllerGetListQueryRelationFilterShape = this.writeShape(field, repository.metadata, dataSource, (reason: string): Error => ErrorException(`${source}: GET_LIST filter field "${field.path}" ${reason}`));

		shapes.set(field, shape);

		return shape;
	}

	/**
	 * Writes a condition on a column of the subquery.
	 * @param {FindOperator<unknown>} operand - The condition.
	 * @param {string} expression - The escaped column.
	 * @param {Record<string, unknown>} parameters - Parameters of the subquery, which this adds to.
	 * @param {DataSource} dataSource - The DataSource.
	 * @param {string} path - Key of the field, for an error.
	 * @param {string} source - Controller and route, for an error.
	 * @returns {string} The SQL.
	 */
	private static render(operand: FindOperator<unknown>, expression: string, parameters: Record<string, unknown>, dataSource: DataSource, path: string, source: string): string {
		// PostgreSQL deduces one type per parameter, so a name holds the column as well as the value.
		const createName = (value: unknown): string =>
			`relationFilter${createHash("sha256")
				.update(JSON.stringify([expression, value]))
				.digest("hex")
				.slice(0, FILTER_RELATION_CONSTANT.PARAMETER_HASH_LENGTH)}`;

		const bind = (value: unknown): string => {
			const name: string = createName(value);

			parameters[name] = value;

			return `:${name}`;
		};

		const renderOther = (operator: FindOperator<unknown>): string | undefined => {
			if (operator.type === "between") {
				const [start, end]: Array<unknown> = operator.value as Array<unknown>;

				return `${expression} BETWEEN ${bind(start)} AND ${bind(end)}`;
			}

			if (operator.type === "ilike") {
				return dataSource.options.type === "postgres" ? `${expression} ILIKE ${bind(operator.value)}` : `UPPER(${expression}) LIKE UPPER(${bind(operator.value)})`;
			}

			if (operator.type === "like") {
				return `${expression} LIKE ${bind(operator.value)}`;
			}

			if (operator.type === "or") {
				const branches: Array<string | undefined> = (operator.value as Array<unknown>).map((branch: unknown): string | undefined => ApiSubqueryOperand.render(branch, expression, parameters, createName, renderOther));

				return branches.includes(undefined) ? undefined : `(${branches.join(" OR ")})`;
			}

			return undefined;
		};

		const sql: string | undefined = ApiSubqueryOperand.render(operand, expression, parameters, createName, renderOther);

		if (sql === undefined) {
			throw ErrorException(`${source}: GET_LIST filter field "${path}" has a condition "${operand.type}" a relation filter cannot write`);
		}

		return sql;
	}

	/**
	 * Writes the subquery of a field from the entity metadata.
	 * @param {IApiControllerGetListQueryPlanFilterField} field - The field.
	 * @param {EntityMetadata} root - Metadata of the route entity.
	 * @param {DataSource} dataSource - The DataSource.
	 * @param {(reason: string) => Error} fail - Writes the error.
	 * @returns {IApiControllerGetListQueryRelationFilterShape} The subquery.
	 */
	private static writeShape(field: IApiControllerGetListQueryPlanFilterField, root: EntityMetadata, dataSource: DataSource, fail: (reason: string) => Error): IApiControllerGetListQueryRelationFilterShape {
		const relationFilter: IApiControllerGetListQueryPlanFilterRelation | undefined = field.relationFilter;

		if (!relationFilter) {
			throw fail("has no relation path");
		}

		if (!FILTER_RELATION_CONSTANT.SUPPORTED_DRIVER_TYPES.has(dataSource.options.type)) {
			throw fail(`cannot compile on driver "${dataSource.options.type}": a relation filter runs on ${[...FILTER_RELATION_CONSTANT.SUPPORTED_DRIVER_TYPES].join(", ")}`);
		}

		const key: string = this.readKey(root, fail);
		const tables: Array<IApiSubqueryJoinTable> = [];
		const rowTables: Array<number> = [];
		let current: EntityMetadata = root;

		for (const hop of relationFilter.hops) {
			if (!dataSource.hasMetadata(hop.target as never)) {
				throw fail(`crosses entity "${hop.target.name}", which is not an entity of the DataSource that reads the route`);
			}

			const hopTables: ReadonlyArray<IApiSubqueryJoinTable> | undefined = hop.source === undefined ? this.readPropertyHop(hop, current) : this.readLinkHop(hop, current, dataSource, fail);

			if (!hopTables) {
				throw fail(`has no join columns for relation "${hop.relation}" of entity "${current.name}"`);
			}

			if (hop.source !== undefined) {
				rowTables.push(tables.length);
			}

			tables.push(...hopTables);
			rowTables.push(tables.length - 1);
			current = dataSource.getMetadata(hop.target as never);
		}

		const child: IApiSubqueryJoinTable | undefined = tables.find((table: IApiSubqueryJoinTable): boolean => table.metadata.tableType === FILTER_RELATION_CONSTANT.TABLE_TYPE_ENTITY_CHILD);

		if (child) {
			throw fail(`crosses entity "${child.metadata.name}", which shares the table of its single-table-inheritance parent, so its rows cannot be told exactly`);
		}

		const alias = (index: number): string => dataSource.driver.escape(`${FILTER_RELATION_CONSTANT.ALIAS_PREFIX}${String(index)}`);
		const column = (index: number, columnMetadata: TTypeOrmColumnMetadata): string => `${alias(index)}.${dataSource.driver.escape(columnMetadata.databaseName)}`;
		const [first, ...joined]: Array<IApiSubqueryJoinTable> = tables;

		if (!first) {
			throw fail("crosses no relation");
		}

		const joins: Array<string> = joined.map((table: IApiSubqueryJoinTable, offset: number): string => {
			const index: number = offset + 1;
			const on: string = table.on.map((pair: IApiSubqueryJoinPair): string => `${column(index, pair.column)} = ${column(index - 1, pair.previous)}`).join(" AND ");

			return `INNER JOIN ${ApiSubqueryJoin.writeTable(dataSource, table.metadata)} ${alias(index)} ON ${on}`;
		});
		const leafTable: number = tables.length - 1;
		const leafColumn: TTypeOrmColumnMetadata | undefined = current.findColumnWithPropertyPath(relationFilter.leafProperty);

		if (!leafColumn) {
			throw fail(`names no column "${relationFilter.leafProperty}" of entity "${current.name}"`);
		}

		const conditions: Array<{ condition: IApiControllerGetListQueryPlanFilterRelationCondition; expression: string }> = relationFilter.conditions.map((condition: IApiControllerGetListQueryPlanFilterRelationCondition): { condition: IApiControllerGetListQueryPlanFilterRelationCondition; expression: string } => {
			const tableIndex: number = rowTables[condition.rowIndex] ?? leafTable;
			const metadata: EntityMetadata | undefined = tables[tableIndex]?.metadata;
			const conditionColumn: TTypeOrmColumnMetadata | undefined = metadata?.findColumnWithPropertyPath(condition.field);

			if (!conditionColumn) {
				throw fail(`has a fixed condition on "${condition.field}", which is no column of entity "${String(metadata?.name)}"`);
			}

			return { condition, expression: column(tableIndex, conditionColumn) };
		});

		return {
			conditions,
			correlation: first.on.map((pair: IApiSubqueryJoinPair): { inner: string; outer: string } => ({ inner: column(0, pair.column), outer: dataSource.driver.escape(pair.previous.databaseName) })),
			from: [`${ApiSubqueryJoin.writeTable(dataSource, first.metadata)} ${alias(0)}`, ...joins].join(" "),
			key,
			leaf: column(leafTable, leafColumn),
			rowConditions: tables.flatMap((table: IApiSubqueryJoinTable, index: number): Array<string> => (table.metadata.deleteDateColumn ? [`${column(index, table.metadata.deleteDateColumn)} IS NULL`] : [])),
		};
	}
}
