import type { EApiDtoType, EApiRouteType } from "@enum/index";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiPropertyDescribeProperties } from "@type/index";

export type TApiPropertyCopyProperties<E> = {
	dtoType?: EApiDtoType;
	entity: (() => Type<E> | undefined) | Type<E>;
	guard?: Type<IAuthGuard>;
	metadata?: Partial<TApiPropertyDescribeProperties>;
	method?: EApiRouteType;
	propertyName: keyof E;
	shouldAutoResolveContext?: boolean;
};
