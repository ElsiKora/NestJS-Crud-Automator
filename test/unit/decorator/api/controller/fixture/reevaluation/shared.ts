import "reflect-metadata";

import type * as LibraryModule from "../../../../../../../src/index";

import { ApiProperty } from "@nestjs/swagger";
import { Column, DataSource, Entity, PrimaryGeneratedColumn, type Repository } from "typeorm";

// The library comes from the test, so evaluating these modules again re-creates the controller and DTO classes but keeps the library, as with an application module under webpack HMR or `vi.resetModules`.
export const library: typeof LibraryModule = (globalThis as { reevaluationLibrary?: typeof LibraryModule }).reevaluationLibrary as typeof LibraryModule;

@Entity("reevaluation_items")
export class ReevaluationItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@library.ApiPropertyDescribe({ description: "id", type: library.EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@library.ApiPropertyDescribe({
		description: "name",
		exampleValue: "Name",
		format: library.EApiPropertyStringType.STRING,
		maxLength: 50,
		minLength: 1,
		pattern: "/^.+$/",
		type: library.EApiPropertyDescribeType.STRING,
	})
	public name!: string;
}

const dataSource: DataSource = new DataSource({ entities: [ReevaluationItemEntity], type: "postgres" });

// Metadata is enough for the startup check; the test never connects.
await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

@library.ApiService({ entity: ReevaluationItemEntity })
class ReevaluationItemService extends library.ApiServiceBase<ReevaluationItemEntity> {
	public readonly repository: Repository<ReevaluationItemEntity> = dataSource.getRepository(ReevaluationItemEntity);
}

export const REEVALUATION_SERVICE: LibraryModule.ApiServiceBase<ReevaluationItemEntity> = new ReevaluationItemService();

export class ReevaluationItemNoteDto {
	@ApiProperty({ type: String })
	public text!: string;
}

export class ReevaluationItemResponseDto {
	@ApiProperty({ type: String })
	public id!: string;

	@ApiProperty({ type: ReevaluationItemNoteDto })
	public note!: ReevaluationItemNoteDto;
}

// Both controllers use the same hand-written response DTO class.
export const REEVALUATION_ROUTES: LibraryModule.IApiControllerProperties<ReevaluationItemEntity>["routes"] = {
	[library.EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[library.EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[library.EApiRouteType.GET]: { dto: { [library.EApiDtoType.RESPONSE]: ReevaluationItemResponseDto } },
	[library.EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[library.EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[library.EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};
