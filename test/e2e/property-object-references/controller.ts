import { HttpStatus, RequestMethod } from "@nestjs/common";
import { ApiExtraModels, PickType } from "@nestjs/swagger";

import { ApiController, ApiPropertyCopy, ApiPropertyObject, ApiRouteCustom, EApiDtoType, EApiRouteType } from "../../../src/index";

import { E2eReferenceGeneratedEntity, E2eReferenceSourceEntity } from "./entity";
import { createObjectOptions, createUnion, createVariant } from "./variant";

const COPY = { dtoType: EApiDtoType.RESPONSE, entity: E2eReferenceSourceEntity, method: EApiRouteType.GET } as const;

export class E2eReferenceUnionHostDTO {
	@ApiPropertyCopy<E2eReferenceSourceEntity>({ ...COPY, propertyName: "union" })
	public union!: unknown;
}

export class E2eReferenceUnionListHostDTO {
	@ApiPropertyCopy<E2eReferenceSourceEntity>({ ...COPY, propertyName: "unionList" })
	public unionList!: Array<unknown>;
}

export class E2eReferenceSingleHostDTO {
	@ApiPropertyCopy<E2eReferenceSourceEntity>({ ...COPY, propertyName: "single" })
	public single!: unknown;
}

export class E2eReferenceOverrideHostDTO {
	@ApiPropertyCopy<E2eReferenceSourceEntity>({ ...COPY, metadata: createUnion("E2eReferenceOverride") as never, propertyName: "single" })
	public single!: unknown;
}

export class E2eReferenceDynamicHostDTO {
	@ApiPropertyCopy<E2eReferenceSourceEntity>({ ...COPY, propertyName: "dynamic" })
	public dynamic!: unknown;
}

export class E2eReferenceDynamicListHostDTO {
	@ApiPropertyCopy<E2eReferenceSourceEntity>({ ...COPY, propertyName: "dynamicList" })
	public dynamicList!: Array<unknown>;
}

export class E2eReferenceHolderHostDTO {
	@ApiPropertyCopy<E2eReferenceSourceEntity>({ ...COPY, propertyName: "holder" })
	public holder!: unknown;
}

export class E2eReferenceRelationHostDTO {
	@ApiPropertyCopy<E2eReferenceSourceEntity>({ ...COPY, propertyName: "relative" })
	public relative!: unknown;
}

export class E2eReferenceHandWrittenHostDTO {
	@ApiPropertyObject(createObjectOptions("E2eReferenceHandWritten", E2eReferenceHandWrittenHostDTO))
	public union!: unknown;
}

class E2eReferenceBaseHostDTO {
	@ApiPropertyObject(createObjectOptions("E2eReferenceInherited", E2eReferenceBaseHostDTO))
	public union!: unknown;
}

export class E2eReferenceInheritedHostDTO extends E2eReferenceBaseHostDTO {}

const PICKED_UNION: ReturnType<typeof createUnion> = createUnion("E2eReferencePicked");

class E2eReferencePickSourceDTO {
	@ApiPropertyObject({ description: "picked", discriminator: PICKED_UNION.discriminator, entity: E2eReferencePickSourceDTO, isResponse: true, type: PICKED_UNION.dataType } as never)
	public union!: unknown;
}

// A Swagger mapped type copies the property and not the extra models of the class it maps.
@ApiExtraModels(...PICKED_UNION.dataType)
export class E2eReferencePickedHostDTO extends PickType(E2eReferencePickSourceDTO, ["union"] as const) {}

const DISABLED = { generation: { isEnabled: false } } as const;

const HOSTS = {
	dynamic: E2eReferenceDynamicHostDTO,
	dynamicList: E2eReferenceDynamicListHostDTO,
	handWritten: E2eReferenceHandWrittenHostDTO,
	holder: E2eReferenceHolderHostDTO,
	inherited: E2eReferenceInheritedHostDTO,
	override: E2eReferenceOverrideHostDTO,
	picked: E2eReferencePickedHostDTO,
	relation: E2eReferenceRelationHostDTO,
	single: E2eReferenceSingleHostDTO,
	union: E2eReferenceUnionHostDTO,
	unionList: E2eReferenceUnionListHostDTO,
} as const;

const route = (name: keyof typeof HOSTS): MethodDecorator => ApiRouteCustom<E2eReferenceSourceEntity>({ resource: { action: `custom.${name}`, entity: E2eReferenceSourceEntity }, response: { status: HttpStatus.OK, type: HOSTS[name] }, route: { method: RequestMethod.GET, path: name, type: EApiRouteType.GET } });

@ApiExtraModels(createVariant("E2eReferenceConsumerDTO"))
@ApiController<E2eReferenceSourceEntity>({ entity: E2eReferenceSourceEntity, path: "references", routes: { [EApiRouteType.CREATE]: DISABLED, [EApiRouteType.DELETE]: DISABLED, [EApiRouteType.GET]: DISABLED, [EApiRouteType.GET_LIST]: DISABLED, [EApiRouteType.PARTIAL_UPDATE]: DISABLED, [EApiRouteType.UPDATE]: DISABLED } })
export class E2eReferenceController {
	public service!: never;

	@route("dynamic")
	public dynamic(): void {}

	@route("dynamicList")
	public dynamicList(): void {}

	@route("handWritten")
	public handWritten(): void {}

	@route("holder")
	public holder(): void {}

	@route("inherited")
	public inherited(): void {}

	@route("override")
	public override(): void {}

	@route("picked")
	public picked(): void {}

	@route("relation")
	public relation(): void {}

	@route("single")
	public single(): void {}

	@route("union")
	public union(): void {}

	@route("unionList")
	public unionList(): void {}
}

@ApiController<E2eReferenceGeneratedEntity>({ entity: E2eReferenceGeneratedEntity, path: "generated-references", routes: { [EApiRouteType.CREATE]: DISABLED, [EApiRouteType.DELETE]: DISABLED, [EApiRouteType.GET_LIST]: DISABLED, [EApiRouteType.PARTIAL_UPDATE]: DISABLED, [EApiRouteType.UPDATE]: DISABLED } })
export class E2eReferenceGeneratedController {
	public service!: never;
}
