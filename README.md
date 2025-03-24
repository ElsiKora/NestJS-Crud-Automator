<p align="center">
		<img src="https://6jft62zmy9nx2oea.public.blob.vercel-storage.com/nestjs-crud-automator-HhXThTDhKyqznMLCgdmWhsPa287fIi.png" width="500" alt="project-logo">
			</p>

<h1 align="center">🚀 NestJS-Crud-Automator</h1>
<p align="center"><em>Automate CRUD operations in NestJS with powerful decorators and type-safe APIs</em></p>

<p align="center">
    <a aria-label="ElsiKora logo" href="https://elsikora.com">
  <img src="https://img.shields.io/badge/MADE%20BY%20ElsiKora-333333.svg?style=for-the-badge" alt="ElsiKora">
</a> <img src="https://img.shields.io/badge/version-blue.svg?style=for-the-badge&logo=npm&logoColor=white" alt="version"> <img src="https://img.shields.io/badge/typescript-blue.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript"> <img src="https://img.shields.io/badge/nestjs-red.svg?style=for-the-badge&logo=nestjs&logoColor=white" alt="nestjs"> <img src="https://img.shields.io/badge/typeorm-orange.svg?style=for-the-badge&logo=typeorm&logoColor=white" alt="typeorm"> <img src="https://img.shields.io/badge/license-green.svg?style=for-the-badge&logo=license&logoColor=white" alt="license"> <img src="https://img.shields.io/badge/swagger-green.svg?style=for-the-badge&logo=swagger&logoColor=white" alt="swagger">
</p>


## 📚 Table of Contents
- [Description](#-description)
- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
- [Roadmap](#-roadmap)
- [FAQ](#-faq)
- [License](#-license)


## 📖 Description
NestJS-Crud-Automator is a comprehensive library designed to streamline the development of RESTful APIs in NestJS applications. It eliminates boilerplate code by providing decorators that automatically generate controllers, services, DTOs, and validation. With strong TypeScript support, it offers type-safe CRUD operations while enforcing best practices in API design. The library integrates seamlessly with TypeORM, enhances Swagger documentation, and provides built-in validation through class-validator. It's perfect for developers looking to accelerate development without sacrificing code quality or architectural principles. Whether you're building a simple API or a complex enterprise application, NestJS-Crud-Automator helps maintain clean, consistent, and well-documented endpoints with minimal effort.

## 🚀 Features
- ✨ **Automatic CRUD operations with a single decorator**
- ✨ **Type-safe API development with full TypeScript support**
- ✨ **Seamless integration with TypeORM for database operations**
- ✨ **Auto-generated DTOs with comprehensive validation rules**
- ✨ **Complete Swagger/OpenAPI documentation generation**
- ✨ **Customizable request/response transformers**
- ✨ **Built-in relation handling and eager/lazy loading support**
- ✨ **Automatic validation using class-validator**
- ✨ **Request correlation tracking for improved debugging**
- ✨ **Rate limiting and throttling capabilities**
- ✨ **Powerful filtering, pagination, and sorting for list endpoints**
- ✨ **Custom validation decorators for complex business rules**

## 🛠 Installation
```bash
# Using npm
npm install @elsikora/nestjs-crud-automator

# Using yarn
yarn add @elsikora/nestjs-crud-automator

# Using pnpm
pnpm add @elsikora/nestjs-crud-automator

# Using bun
bun add @elsikora/nestjs-crud-automator


You'll also need to install peer dependencies if you haven't already:


npm install @nestjs/common @nestjs/swagger typeorm class-transformer class-validator reflect-metadata


Once installed, you need to set up your NestJS module to import the library:

typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// Import other modules and entities as needed

@Module({
  imports: [
    TypeOrmModule.forRoot({
      // your TypeORM configuration
    }),
    // Register your entities and other modules
  ],
})
export class AppModule {}
```

## 💡 Usage
## Basic Usage

Create an entity using TypeORM and enhance it with property decorators:

```typescript
// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiPropertyDescribe } from '@elsikora/nestjs-crud-automator';
import { EApiPropertyDescribeType, EApiPropertyStringType } from '@elsikora/nestjs-crud-automator';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  @ApiPropertyDescribe({
    type: EApiPropertyDescribeType.UUID,
    description: 'Unique identifier',
  })
  id: string;

  @Column()
  @ApiPropertyDescribe({
    type: EApiPropertyDescribeType.STRING,
    description: 'User name',
    format: EApiPropertyStringType.STRING,
    minLength: 3,
    maxLength: 50,
    pattern: '/^[a-zA-Z0-9_-]+$/',
    exampleValue: 'john_doe'
  })
  username: string;

  @Column()
  @ApiPropertyDescribe({
    type: EApiPropertyDescribeType.STRING,
    description: 'User email',
    format: EApiPropertyStringType.EMAIL,
    minLength: 5,
    maxLength: 100,
    pattern: '/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/',
    exampleValue: 'john.doe@example.com'
  })
  email: string;
}
```

## Creating a Service

Create a service that extends the base service class:

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiServiceBase, ApiService } from '@elsikora/nestjs-crud-automator';
import { User } from './user.entity';

@Injectable()
@ApiService({
  entity: User
})
export class UserService extends ApiServiceBase<User> {
  constructor(
    @InjectRepository(User)
    public repository: Repository<User>
  ) {
    super();
  }
  
  // You can add custom methods here
  async findByEmail(email: string): Promise<User | undefined> {
    return this.repository.findOne({ where: { email } });
  }
}
```

## Creating a Controller

Create a controller with automated CRUD operations:

```typescript
// user.controller.ts
import { Controller } from '@nestjs/common';
import { ApiController } from '@elsikora/nestjs-crud-automator';
import { User } from './user.entity';
import { UserService } from './user.service';

@ApiController<User>({
  entity: User,
  name: 'Users',
  path: 'users',
  routes: {
    // Configure specific routes if needed
  }
})
@Controller('users')
export class UserController {
  constructor(
    public service: UserService
  ) {}
  
  // The controller methods are automatically generated
  // You can add custom endpoints here if needed
}
```

## Custom Route Configuration

You can customize individual routes with advanced options:

```typescript
// user.controller.ts with route customization
import { Controller } from '@nestjs/common';
import { ApiController } from '@elsikora/nestjs-crud-automator';
import { EApiRouteType, EApiControllerLoadRelationsStrategy } from '@elsikora/nestjs-crud-automator';
import { User } from './user.entity';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiController<User>({
  entity: User,
  name: 'Users',
  path: 'users',
  routes: {
    [EApiRouteType.CREATE]: {
      authentication: {
        guard: JwtAuthGuard,
        type: 'user',
        bearerStrategies: ['jwt']
      },
      request: {
        validators: [
          // custom validators
        ],
        transformers: {
          body: [
            // request transformers
          ]
        }
      }
    },
    [EApiRouteType.GET_LIST]: {
      request: {
        relations: {
          shouldLoadRelations: true,
          relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
          servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO
        }
      }
    }
  }
})
@Controller('users')
export class UserController {
  constructor(
    public service: UserService
  ) {}
}
```

## Working with DTOs

The library automatically generates DTOs for your entities, but you can also provide custom ones:

```typescript
// custom-create-user.dto.ts
import { ApiPropertyString, ApiPropertyUUID } from '@elsikora/nestjs-crud-automator';
import { EApiPropertyStringType } from '@elsikora/nestjs-crud-automator';

export class CustomCreateUserDto {
  @ApiPropertyString({
    entity: { name: 'User' },
    description: 'User name',
    format: EApiPropertyStringType.STRING,
    minLength: 3,
    maxLength: 50,
    pattern: '/^[a-zA-Z0-9_-]+$/',
    exampleValue: 'john_doe',
    isRequired: true
  })
  username: string;

  @ApiPropertyString({
    entity: { name: 'User' },
    description: 'User email',
    format: EApiPropertyStringType.EMAIL,
    minLength: 5,
    maxLength: 100,
    pattern: '/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/',
    exampleValue: 'john.doe@example.com',
    isRequired: true
  })
  email: string;
}
```

## Request Validation

You can add custom validators to your endpoints:

```typescript
// user.validator.ts
import { EErrorStringAction, EException } from '@elsikora/nestjs-crud-automator';
import { BadRequestException } from '@nestjs/common';
import { User } from './user.entity';

export const UniqueEmailValidator = {
  errorType: EErrorStringAction.VALIDATION_ERROR,
  exception: BadRequestException,
  validationFunction: async (entity: Partial<User>, userService: any) => {
    if (!entity.email) return true;
    const existingUser = await userService.findByEmail(entity.email);
    return !existingUser;
  }
};
```

## Using Filters, Pagination and Sorting

With the GET_LIST endpoints, you get built-in filtering, pagination and sorting:

```typescript
// Example HTTP request
// GET /users?limit=10&page=1&orderBy=username&orderDirection=asc&username[operator]=cont&username[value]=john
```

## Using the Correlation ID Interceptor

Add the built-in correlation ID interceptor for better request tracking:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CorrelationIDResponseBodyInterceptor } from '@elsikora/nestjs-crud-automator';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  
  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(3000);
}
bootstrap();
```

## Custom Property Decorators

The library provides various property decorators for different data types:

```typescript
// Example of various property decorators
import { 
  ApiPropertyBoolean, 
  ApiPropertyDate, 
  ApiPropertyNumber, 
  ApiPropertyObject, 
  ApiPropertyString, 
  ApiPropertyUUID,
  ApiPropertyEnum
} from '@elsikora/nestjs-crud-automator';
import { 
  EApiPropertyDateIdentifier, 
  EApiPropertyDateType,
  EApiPropertyNumberType,
  EApiPropertyStringType
} from '@elsikora/nestjs-crud-automator';

// Example enum
enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

class ExampleDto {
  @ApiPropertyUUID({ entity: { name: 'Example' }, isRequired: true })
  id: string;
  
  @ApiPropertyString({
    entity: { name: 'Example' },
    description: 'Example name',
    format: EApiPropertyStringType.STRING,
    minLength: 3,
    maxLength: 50,
    pattern: '/^[a-zA-Z0-9 ]+$/',
    exampleValue: 'Example Item',
    isRequired: true
  })
  name: string;
  
  @ApiPropertyBoolean({
    entity: { name: 'Example' },
    description: 'Is active',
    isRequired: false
  })
  isActive: boolean;
  
  @ApiPropertyNumber({
    entity: { name: 'Example' },
    description: 'Price',
    format: EApiPropertyNumberType.DOUBLE,
    minimum: 0,
    maximum: 1000,
    multipleOf: 0.01,
    exampleValue: 29.99,
    isRequired: true
  })
  price: number;
  
  @ApiPropertyDate({
    entity: { name: 'Example' },
    format: EApiPropertyDateType.DATE_TIME,
    identifier: EApiPropertyDateIdentifier.CREATED_AT,
    isResponse: true
  })
  createdAt: Date;
  
  @ApiPropertyEnum({
    entity: { name: 'Example' },
    description: 'User role',
    enum: UserRole,
    enumName: 'UserRole',
    isRequired: true
  })
  role: UserRole;
}
```

## 🛣 Roadmap
| Task / Feature | Status |
|---------------|--------|
| ✅ Core CRUD operations | ✅ Done |
| ✅ TypeORM integration | ✅ Done |
| ✅ Auto-generated DTOs | ✅ Done |
| ✅ Swagger documentation | ✅ Done |
| ✅ Request validation | ✅ Done |
| ✅ Response transformation | ✅ Done |
| ✅ Request correlation tracking | ✅ Done |
| ✅ Filtering, pagination and sorting | ✅ Done |
| ✅ Custom validation decorators | ✅ Done |
| ✅ Authentication integration | ✅ Done |
| 🚧 MongoDB support | 🚧 In Progress |
| 🚧 GraphQL support | 🚧 In Progress |
| 🚧 Caching mechanisms | 🚧 In Progress |
| 🚧 Advanced query building | 🚧 In Progress |
| 🚧 Soft delete functionality | 🚧 In Progress |
| 🚧 Event dispatching | 🚧 In Progress |
| 🚧 Bulk operations | 🚧 In Progress |
| 🚧 File upload handling | 🚧 In Progress |
| 🚧 Custom migration scripts | 🚧 In Progress |
| 🚧 CLI for scaffold generation | 🚧 In Progress |

## ❓ FAQ
## Frequently Asked Questions

### What is NestJS-Crud-Automator?
NestJS-Crud-Automator is a library that automates the creation of CRUD (Create, Read, Update, Delete) operations in NestJS applications. It provides decorators and utilities to generate controllers, services, DTOs, and validation with minimal boilerplate code.

### Does it work with any database?
Currently, the library is optimized for TypeORM which supports multiple databases including PostgreSQL, MySQL, MariaDB, SQLite, MS SQL Server, Oracle, and MongoDB. Support for other ORMs is planned for future releases.

### How do I customize the generated endpoints?
You can customize the endpoints by providing configuration in the `routes` property of the `@ApiController` decorator. Each route type (CREATE, GET, GET_LIST, UPDATE, PARTIAL_UPDATE, DELETE) can be configured separately with custom authentication, validation, transformation, and relation loading strategies.

### Can I extend the generated functionality?
Yes! The generated CRUD operations serve as a starting point. You can extend the controllers and services with custom methods to implement business-specific logic.

### Does it support validation?
Yes, it integrates with class-validator and provides automatic validation based on the property decorators. You can also add custom validators to the routes configuration.

### How does it handle relationships?
The library provides automatic relation loading with configurable strategies. You can specify eager or lazy loading, and control which relations are loaded for each endpoint.

### Can I use it with GraphQL?
Currently, the library focuses on REST APIs, but GraphQL support is planned for future releases.

### How do I handle authentication?
You can configure authentication at the route level by specifying the authentication guard, type, and strategies in the route configuration.

### What about performance?
The library is designed to be lightweight and efficient. It uses TypeORM's query builder to optimize database queries and supports pagination, filtering, and sorting for list endpoints.

### Can I use it with existing NestJS applications?
Yes, the library is designed to integrate seamlessly with existing NestJS applications. You can apply it gradually to specific modules or entities without affecting the rest of your application.

## 🔒 License
This project is licensed under **MIT License

Copyright (c) 2025 ElsiKora

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.**.
