import type { Provider } from "@nestjs/common";
import type { Repository } from "typeorm";

import { Inject, Injectable, Module, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { ChildEntity, Column, DataSource, Entity, PrimaryGeneratedColumn, TableInheritance } from "typeorm";

import { ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

type TClass = new () => object;

const LABEL_DESCRIBE = { description: "label", exampleValue: "label", format: EApiPropertyStringType.STRING, isNullable: true, maxLength: 6, minLength: 1, pattern: "/^[a-z]+$/", type: EApiPropertyDescribeType.STRING } as const;

const LIST_ONLY: object = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};

const NO_GENERATED_ROUTE: object = { ...LIST_ONLY, [EApiRouteType.GET_LIST]: { generation: { isEnabled: false } } };

export const createEntity = (table: string, name: string = "RepositoryEntityDoc"): TClass => {
	const Created: TClass = { [name]: class {} }[name] as TClass;

	Entity(table)(Created);
	PrimaryGeneratedColumn("uuid")(Created.prototype as object, "id");
	ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })(Created.prototype as object, "id");
	Column({ nullable: true, type: "varchar" })(Created.prototype as object, "label");
	ApiPropertyDescribe(LABEL_DESCRIBE)(Created.prototype as object, "label");

	return Created;
};

@Entity("repository_entity_roots")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
export class RepositoryEntityRoot {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ ...LABEL_DESCRIBE, description: "kind", isNullable: false })
	public kind!: string;
}

@ChildEntity("first")
export class RepositoryEntityFirstChild extends RepositoryEntityRoot {}

@ChildEntity("second")
export class RepositoryEntitySecondChild extends RepositoryEntityRoot {}

export const createService = (entity: TClass, dataSourceName?: string): new () => object => {
	@Injectable()
	@ApiService<object>({ entity } as never)
	class RepositoryEntityService extends ApiServiceBase<object> {
		@InjectRepository(entity, dataSourceName)
		public readonly repository!: Repository<object>;
	}

	return RepositoryEntityService;
};

export const createSubclassedService = (entity: TClass): new () => object => {
	class RepositoryEntityBaseService extends ApiServiceBase<object> {
		@InjectRepository(entity)
		public readonly repository!: Repository<object>;
	}

	@Injectable()
	@ApiService<object>({ entity } as never)
	class RepositoryEntitySubclassService extends RepositoryEntityBaseService {}

	return RepositoryEntitySubclassService;
};

export const CUSTOM_REPOSITORY: string = "REPOSITORY_ENTITY_CUSTOM_REPOSITORY";

export const createCustomRepositoryProvider = (entity: TClass): Provider => ({
	inject: [DataSource],
	provide: CUSTOM_REPOSITORY,
	useFactory: (dataSource: DataSource): Repository<object> => dataSource.getRepository(entity).extend({ countLabels: (): number => 0 }),
});

export const createCustomRepositoryService = (entity: TClass): new () => object => {
	@Injectable()
	@ApiService<object>({ entity } as never)
	class RepositoryEntityCustomService extends ApiServiceBase<object> {
		@Inject(CUSTOM_REPOSITORY)
		public readonly repository!: Repository<object>;
	}

	return RepositoryEntityCustomService;
};

export const createController = (entity: TClass, service: new () => object, name: string, path: string, routes: object = LIST_ONLY): new () => object => {
	const Created = { [name]: class {} }[name] as new () => object;

	Inject(service)(Created.prototype as object, "service");

	return ApiController<object>({ entity, path, routes } as never)(Created as never) as new () => object;
};

export const createCustomOnlyController = (entity: TClass, service: new () => object, name: string, path: string): new () => object => createController(entity, service, name, path, NO_GENERATED_ROUTE);

@Injectable({ scope: Scope.REQUEST })
export class RepositoryEntityRequestDependency {
	public constructor(@Inject(REQUEST) public readonly request: unknown) {}
}

export const createRequestScopedController = (entity: TClass, service: new () => object, name: string, path: string): new (...arguments_: Array<never>) => object => {
	const Created = {
		[name]: class {
			public constructor(public readonly dependency: RepositoryEntityRequestDependency) {}
		},
	}[name] as new (dependency: RepositoryEntityRequestDependency) => object;

	Reflect.defineMetadata("design:paramtypes", [RepositoryEntityRequestDependency], Created);
	Inject(service)(Created.prototype as object, "service");

	return ApiController<object>({ entity, path, routes: LIST_ONLY } as never)(Created as never) as new (...arguments_: Array<never>) => object;
};

export const createModule = (controllers: Array<new (...arguments_: Array<never>) => object>, providers: Array<Provider>, entities: Array<TClass>, dataSourceName?: string): new () => object => {
	@Module({ controllers, imports: [TypeOrmModule.forFeature(entities, dataSourceName)], providers: [...providers, RepositoryEntityRequestDependency] })
	class RepositoryEntityModule {}

	return RepositoryEntityModule;
};
