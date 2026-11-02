import "reflect-metadata";

import { Column } from "typeorm";

import { ApiPropertyDescribe, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType } from "../../../src/index";

/**
 * Adds a nullable archive date to a base entity class.
 * @param {TBase} Base - Base entity class.
 * @returns {TBase} Entity class with the archive column.
 */
export function E2eInheritedNullableArchivable<TBase extends abstract new (...arguments_: Array<any>) => object>(Base: TBase) {
	abstract class E2eInheritedNullableArchivableEntity extends Base {
		@Column({ nullable: true, type: Date })
		@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
		public archivedAt?: Date;
	}

	return E2eInheritedNullableArchivableEntity;
}
