import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { Type } from "@nestjs/common";
import type { TMetadataStorageTarget } from "@type/class";

import { DatabaseTypeOrmIsRepository } from "@utility/database/typeorm/is/repository.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { GetEntityTableName } from "@utility/get/entity-table-name.utility";
import { IsEntityConstructor } from "@utility/is/entity/constructor.utility";
import { ResolveMetadataTarget } from "@utility/resolve/metadata-target.utility";

/**
 * Refuses a controller whose generated routes would read and write through the repository of another entity.
 * The repository of the entity, of a table inheritance root, or of a child of the entity is allowed. Anything but a TypeORM repository, such as a mock, is not checked.
 * @param {IApiBaseEntity} entity - Entity the controller serves.
 * @param {unknown} repository - The `repository` of the controller's service.
 * @param {string} controllerName - Controller named in the error.
 * @returns {void}
 * @throws {Error} When the repository is for a class outside the lineage of the entity.
 */
export function ApiControllerAssertRepositoryEntity(entity: IApiBaseEntity, repository: unknown, controllerName: string): void {
	if (!DatabaseTypeOrmIsRepository(repository)) {
		return;
	}

	const repositoryTarget: unknown = repository.metadata.target;
	const entityTarget: TMetadataStorageTarget = ResolveMetadataTarget(entity);

	if (!IsEntityConstructor(repositoryTarget) || isClassInHierarchy(entityTarget, repositoryTarget) || isClassInHierarchy(repositoryTarget, entityTarget)) {
		return;
	}

	const reason: string = repositoryTarget.name === entityTarget.name ? "The two classes share one class name, so they have one repository token and the last one registered wins. Give them different names or declare each in its own module." : "Generated routes read and write through the service repository. Point the service at the repository of the entity, or disable the generated routes.";

	throw ErrorException(`Controller "${controllerName}" serves entity ${entityTarget.name} (table ${GetEntityTableName(entityTarget)}), but its service repository is for ${repositoryTarget.name} (table ${repository.metadata.tableName}). ${reason}`);
}

/**
 * Tells whether a class is the given class or one of its parents.
 * @param {unknown} target - Class to start from.
 * @param {unknown} candidate - Class to look for.
 * @returns {boolean} Whether the candidate is the class or one of its parents.
 */
function isClassInHierarchy(target: unknown, candidate: unknown): boolean {
	return GetClassHierarchy(target).includes(candidate as Type<unknown>);
}
