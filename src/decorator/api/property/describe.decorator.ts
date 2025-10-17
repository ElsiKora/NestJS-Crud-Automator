import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { MetadataStorage } from "@class/metadata-storage.class";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";

/**
 * Creates a decorator for entity properties that provides metadata used for automatic
 * DTO generation, validation rules, and Swagger documentation.
 *
 * This decorator serves as the foundation for the automated CRUD system by storing
 * property metadata that is later used to:
 * - Generate appropriate DTOs for requests and responses
 * - Apply validation rules based on the property type
 * - Generate Swagger/OpenAPI documentation
 * - Enable intelligent filtering and sorting for list operations
 *
 * The decorator accepts various property types including string, number, boolean, date,
 * enum, UUID, object, and relation properties, each with their specific configuration options.
 * @param {TApiPropertyDescribeProperties} properties - Configuration options for the property,
 *   which varies based on the property type (string, number, boolean, date, enum, UUID, object, relation)
 * @returns {PropertyDecorator} A decorator function that can be applied to entity properties
 * @example
 * ```typescript
 * // UUID property (primary key)
 * @PrimaryGeneratedColumn('uuid')
 * @ApiPropertyDescribe({
 *   type: EApiPropertyDescribeType.UUID,
 *   description: 'Unique identifier'
 * })
 * id: string;
 *
 * // String property with validation rules
 * @Column()
 * @ApiPropertyDescribe({
 *   type: EApiPropertyDescribeType.STRING,
 *   description: 'User name',
 *   format: EApiPropertyStringType.STRING,
 *   minLength: 3,
 *   maxLength: 50,
 *   pattern: '/^[a-zA-Z0-9_-]+$/',
 *   exampleValue: 'john_doe'
 * })
 * username: string;
 *
 * // Number property
 * @Column()
 * @ApiPropertyDescribe({
 *   type: EApiPropertyDescribeType.NUMBER,
 *   description: 'User age',
 *   format: EApiPropertyNumberType.INTEGER,
 *   minimum: 18,
 *   maximum: 120,
 *   exampleValue: 25
 * })
 * age: number;
 *
 * // Enum property
 * @Column({
 *   type: 'enum',
 *   enum: UserRole,
 *   default: UserRole.USER
 * })
 * @ApiPropertyDescribe({
 *   type: EApiPropertyDescribeType.ENUM,
 *   description: 'User role',
 *   enum: UserRole,
 *   enumName: 'UserRole',
 *   defaultValue: UserRole.USER
 * })
 * role: UserRole;
 *
 * // Relation property
 * @OneToMany(() => Post, post => post.author)
 * @ApiPropertyDescribe({
 *   type: EApiPropertyDescribeType.RELATION,
 *   description: 'User posts',
 *   isArray: true,
 *   relationMetadata: {
 *     relationType: 'one-to-many',
 *     entity: Post,
 *     isEager: false
 *   }
 * })
 * posts: Post[];
 * ```
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators#apipropertydescribe | API Reference - ApiPropertyDescribe}
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/core-concepts/entities | Core Concepts - Entities}
 */
export function ApiPropertyDescribe(properties: TApiPropertyDescribeProperties): PropertyDecorator {
	return (target: Record<never, unknown>, propertyKey: string | symbol): void => {
		const entityName: string = target.constructor.name;
		MetadataStorage.getInstance().setMetadata(entityName, propertyKey, PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY, properties);
	};
}
