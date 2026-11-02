import type { Repository } from "typeorm";

import { Inject, Injectable, Module, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../../src/index";

type TClass = new () => object;

const ROUTES: object = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};

export const declareOwner = (name: string, table: string): TClass => {
	const Owner: TClass = { [name]: class {} }[name] as TClass;

	Entity(table)(Owner);
	PrimaryGeneratedColumn("uuid")(Owner.prototype as object, "id");
	ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })(Owner.prototype as object, "id");
	Column({ nullable: true, type: "varchar" })(Owner.prototype as object, "label");
	ApiPropertyDescribe({ description: "label", exampleValue: "label", format: EApiPropertyStringType.STRING, isNullable: true, maxLength: 6, minLength: 1, pattern: "/^[a-z]+$/", type: EApiPropertyDescribeType.STRING })(Owner.prototype as object, "label");

	return Owner;
};

@Injectable({ scope: Scope.REQUEST })
class SameNameScopedDependency {
	public constructor(@Inject(REQUEST) public readonly request: unknown) {}
}

export const createScopedHolder = (ownerName: string, table: string, path: string, controllerName: string): { Holder: TClass; HolderModule: TClass } => {
	@Entity(table)
	class SameNameScopedHolderEntity {
		@PrimaryGeneratedColumn("uuid")
		@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
		public id!: string;

		@ManyToOne(ownerName, { nullable: true })
		@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION })
		public owner!: object | null;
	}

	@Injectable()
	@ApiService<SameNameScopedHolderEntity>({ entity: SameNameScopedHolderEntity })
	class SameNameScopedHolderService extends ApiServiceBase<SameNameScopedHolderEntity> {
		@InjectRepository(SameNameScopedHolderEntity)
		public readonly repository!: Repository<SameNameScopedHolderEntity>;
	}

	const Controller = {
		[controllerName]: class {
			public constructor(public readonly dependency: SameNameScopedDependency) {}
		},
	}[controllerName] as new (dependency: SameNameScopedDependency) => object;

	Reflect.defineMetadata("design:paramtypes", [SameNameScopedDependency], Controller);
	Inject(SameNameScopedHolderService)(Controller.prototype as object, "service");

	const Decorated = ApiController<SameNameScopedHolderEntity>({ entity: SameNameScopedHolderEntity, path, routes: ROUTES } as never)(Controller as never) as new (...arguments_: Array<never>) => object;

	@Module({ controllers: [Decorated], imports: [TypeOrmModule.forFeature([SameNameScopedHolderEntity])], providers: [SameNameScopedDependency, SameNameScopedHolderService] })
	class SameNameScopedHolderModule {}

	return { Holder: SameNameScopedHolderEntity, HolderModule: SameNameScopedHolderModule };
};
