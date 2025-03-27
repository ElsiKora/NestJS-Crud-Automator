<p align="center">
  <img src="https://6jft62zmy9nx2oea.public.blob.vercel-storage.com/nestjs-crud-automator-HhXThTDhKyqznMLCgdmWhsPa287fIi.png" width="500" alt="project-logo">
</p>

<h1 align="center">NestJS-Crud-Automator 🚀</h1>
<p align="center"><em>A powerful library for automating CRUD operations in NestJS applications</em></p>

<p align="center">
    <a aria-label="ElsiKora logo" href="https://elsikora.com">
  <img src="https://img.shields.io/badge/MADE%20BY%20ElsiKora-333333.svg?style=for-the-badge" alt="ElsiKora">
</a> <img src="https://img.shields.io/badge/npm-blue.svg?style=for-the-badge&logo=npm&logoColor=white" alt="npm"> <img src="https://img.shields.io/badge/typescript-blue.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript"> <img src="https://img.shields.io/badge/nestjs-red.svg?style=for-the-badge&logo=nestjs&logoColor=white" alt="nestjs"> <img src="https://img.shields.io/badge/swagger-green.svg?style=for-the-badge&logo=swagger&logoColor=white" alt="swagger"> <img src="https://img.shields.io/badge/license-blue.svg?style=for-the-badge&logo=license&logoColor=white" alt="license"> <img src="https://img.shields.io/badge/version-1.6.2-brightgreen.svg?style=for-the-badge&logo=v&logoColor=white" alt="version-1.6.2">
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
NestJS-Crud-Automator is a comprehensive library designed to eliminate repetitive code when building RESTful APIs with NestJS. It provides a suite of decorators, utilities, and validation tools that automatically generate controllers, DTOs, and service methods for handling Create, Read, Update, and Delete operations. This library significantly reduces development time by providing a declarative approach to API development. By simply describing your entity properties once, the library auto-generates all the necessary boilerplate code including Swagger documentation, validation rules, and transformation logic. Perfect for developers working on data-heavy applications who want to focus on business logic rather than repetitive CRUD implementation.

## 🚀 Features
- ✨ **🏗️ Automatic generation of controllers, DTOs, and service methods for CRUD operations**
- ✨ **📝 Comprehensive Swagger/OpenAPI documentation generation for all endpoints**
- ✨ **✅ Built-in validation rules with class-validator integration**
- ✨ **🔄 Data transformation with class-transformer for request/response handling**
- ✨ **🧩 Type-safe decorators for entity properties with rich metadata support**
- ✨ **🔒 Authentication and authorization guards integration**
- ✨ **🔍 Advanced filtering, sorting, and pagination for list operations**
- ✨ **📚 Support for object relations with automatic loading strategies**
- ✨ **⚡ Performance optimized with TypeORM integration for database operations**
- ✨ **🌐 Full support for TypeScript with strong typing throughout the library**

## 🛠 Installation
```bash
## Installation

Install NestJS-Crud-Automator using your preferred package manager:


# Using npm
npm install @elsikora/nestjs-crud-automator

# Using yarn
yarn add @elsikora/nestjs-crud-automator

# Using pnpm
pnpm add @elsikora/nestjs-crud-automator


### Prerequisites

Make sure you have the following dependencies installed in your NestJS project:

- NestJS (^9.0.0)
- TypeORM (^0.3.0)
- class-validator (^0.14.0)
- class-transformer (^0.5.1)
- @nestjs/swagger (^6.0.0)

You might need to install these peer dependencies if they're not already in your project:


npm install @nestjs/common @nestjs/swagger @nestjs/throttler typeorm class-transformer class-validator reflect-metadata
```

## 💡 Usage
## Basic Usage

### 1. Define Your Entity

First, define your entity with the `ApiPropertyDescribe` decorators to provide metadata for CRUD generation:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType, EApiPropertyDateIdentifier, EApiPropertyDateType } from '@elsikora/nestjs-crud-automator';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  @ApiPropertyDescribe({
    type: EApiPropertyDescribeType.UUID,
    description: 'User unique identifier'
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
    maxLength: 255,
    pattern: '/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/',
    exampleValue: 'user@example.com'
  })
  email: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @ApiPropertyDescribe({
    type: EApiPropertyDescribeType.DATE,
    identifier: EApiPropertyDateIdentifier.CREATED_AT,
    format: EApiPropertyDateType.DATE_TIME
  })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  @ApiPropertyDescribe({
    type: EApiPropertyDescribeType.DATE,
    identifier: EApiPropertyDateIdentifier.UPDATED_AT,
    format: EApiPropertyDateType.DATE_TIME
  })
  updatedAt: Date;
}
```

### 2. Create a Service

Create a service with the `ApiService` decorator to add CRUD operations:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiService, ApiServiceBase } from '@elsikora/nestjs-crud-automator';
import { UserEntity } from './user.entity';

@Injectable()
@ApiService<UserEntity>({
  entity: UserEntity
})
export class UserService extends ApiServiceBase<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    public repository: Repository<UserEntity>
  ) {
    super();
  }

  // You can add custom methods here that go beyond basic CRUD
  async findByEmail(email: string): Promise<UserEntity | undefined> {
    return this.repository.findOne({ where: { email } });
  }
}
```

### 3. Create a Controller

Create a controller with the `ApiController` decorator to generate all CRUD endpoints:

```typescript
import { Controller, UseGuards } from '@nestjs/common';
import { ApiController, EApiRouteType } from '@elsikora/nestjs-crud-automator';
import { UserEntity } from './user.entity';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@ApiController<UserEntity>({
  entity: UserEntity,
  name: 'Users',
  routes: {
    [EApiRouteType.CREATE]: {
      authentication: {
        guard: JwtAuthGuard,
        bearerStrategies: ['jwt']
      }
    },
    [EApiRouteType.UPDATE]: {
      authentication: {
        guard: JwtAuthGuard,
        bearerStrategies: ['jwt']
      }
    },
    [EApiRouteType.DELETE]: {
      authentication: {
        guard: JwtAuthGuard,
        bearerStrategies: ['jwt']
      }
    },
    [EApiRouteType.GET]: {},
    [EApiRouteType.GET_LIST]: {}
  }
})
export class UserController {
  constructor(public service: UserService) {}
}
```

## Advanced Usage

### Custom Validation

Add custom validators to your DTOs:

```typescript
import { ApiController, EApiRouteType, EApiDtoType, AllOrNoneOfListedPropertiesValidator } from '@elsikora/nestjs-crud-automator';

@ApiController<UserEntity>({
  entity: UserEntity,
  name: 'Users',
  routes: {
    [EApiRouteType.CREATE]: {
      autoDto: {
        [EApiDtoType.BODY]: {
          validators: [
            {
              constraintClass: AllOrNoneOfListedPropertiesValidator,
              options: ['firstName', 'lastName']
            }
          ]
        }
      }
    }
  }
})
export class UserController {
  constructor(public service: UserService) {}
}
```

### Request Transformation

Automatically transform request data:

```typescript
import { ApiController, EApiRouteType, EApiDtoType, EApiControllerRequestTransformerType, TRANSFORMER_VALUE_DTO_CONSTANT } from '@elsikora/nestjs-crud-automator';

@ApiController<UserEntity>({
  entity: UserEntity,
  name: 'Users',
  routes: {
    [EApiRouteType.CREATE]: {
      request: {
        transformers: {
          [EApiDtoType.BODY]: [
            {
              key: 'createdBy',
              type: EApiControllerRequestTransformerType.DYNAMIC,
              value: TRANSFORMER_VALUE_DTO_CONSTANT.AUTHORIZED_ENTITY,
              shouldSetValueEvenIfMissing: true
            }
          ]
        }
      }
    }
  }
})
export class UserController {
  constructor(public service: UserService) {}
}
```

### Handling Relations

Automatically load related entities:

```typescript
import { ApiController, EApiRouteType, EApiControllerLoadRelationsStrategy } from '@elsikora/nestjs-crud-automator';

@ApiController<PostEntity>({
  entity: PostEntity,
  name: 'Posts',
  routes: {
    [EApiRouteType.GET]: {
      request: {
        relations: {
          shouldLoadRelations: true,
          relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
          servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
          shouldForceAllServicesToBeSpecified: false,
          relationsToLoad: ['author', 'comments']
        }
      },
      response: {
        relations: ['author', 'comments']
      }
    }
  }
})
export class PostController {
  constructor(
    public service: PostService,
    public authorService: UserService,
    public commentsService: CommentService
  ) {}
}
```

### Custom DTOs

Use custom DTOs instead of auto-generated ones:

```typescript
import { ApiController, EApiRouteType } from '@elsikora/nestjs-crud-automator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiController<UserEntity>({
  entity: UserEntity,
  name: 'Users',
  routes: {
    [EApiRouteType.CREATE]: {
      dto: {
        body: CreateUserDto,
        response: UserResponseDto
      }
    },
    [EApiRouteType.UPDATE]: {
      dto: {
        body: UpdateUserDto,
        response: UserResponseDto
      }
    }
  }
})
export class UserController {
  constructor(public service: UserService) {}
}
```

### Swagger Documentation

The library automatically generates Swagger/OpenAPI documentation for all endpoints. To enable it in your NestJS application:

```typescript
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const config = new DocumentBuilder()
    .setTitle('Your API')
    .setDescription('API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
```

### Custom Filtering

The library provides advanced filtering capabilities for list endpoints:

```typescript
// GET /users?username[operator]=cont&username[value]=john&createdAt[operator]=between&createdAt[values]=["2023-01-01","2023-12-31"]
```

This query would search for users with "john" in their username and created between Jan 1 and Dec 31, 2023.

## 🛣 Roadmap
## Roadmap

| Task / Feature | Status |
|---------------|--------|
| Core CRUD operations | ✅ Done |
| TypeORM integration | ✅ Done |
| Swagger/OpenAPI documentation | ✅ Done |
| Validation with class-validator | ✅ Done |
| Transformation with class-transformer | ✅ Done |
| Advanced filtering for GET_LIST operation | ✅ Done |
| Authentication guard integration | ✅ Done |
| Request/response transformers | ✅ Done |
| Relation loading strategies | ✅ Done |
| Custom validator integration | ✅ Done |
| Pagination support | ✅ Done |
| Error handling with standardized responses | ✅ Done |
| Support for TypeScript decorators | ✅ Done |
| Support for ESM and CommonJS modules | ✅ Done |
| MongoDB support | 🚧 In Progress |
| GraphQL integration | 🚧 In Progress |
| Support for soft deletes | 🚧 In Progress |
| Role-based access control | 🚧 In Progress |
| Cache integration | 🚧 In Progress |
| Audit logging middleware | 🚧 In Progress |
| Bulk operations (create many, update many) | 🚧 In Progress |
| Query complexity analyzer | 🚧 In Progress |
| Rate limiting enhancements | 🚧 In Progress |
| Custom parameter decorators | 🚧 In Progress |

## ❓ FAQ
## Frequently Asked Questions

### How does NestJS-Crud-Automator compare to @nestjsx/crud?

While @nestjsx/crud provides similar functionality, NestJS-Crud-Automator offers more comprehensive TypeScript integration, better Swagger documentation, and more flexible customization options. It's designed from the ground up to work with the latest NestJS and TypeORM versions.

### Can I customize the generated endpoints?

Yes! The library provides multiple ways to customize your endpoints:
1. You can disable specific routes
2. Add authentication guards to specific routes
3. Customize DTO validation and transformation
4. Add custom request validators
5. Override the auto-generated DTOs with your own

### Does it support pagination?

Yes, the GET_LIST operation automatically includes pagination with limit and page parameters, and returns count, currentPage, totalCount, and totalPages in the response.

### How is filtering implemented?

Filtering is implemented using a flexible operator-based approach that supports various operations like equals, contains, greater than, less than, between, etc. Filters can be applied to any property of your entity.

### Can I use this with NestJS microservices?

Yes, while the library primarily targets REST APIs, you can use the generated DTOs and validation logic in microservice implementations as well.

### Does it support file uploads?

The core library doesn't include file upload functionality, but you can easily extend the generated controllers to add file upload capabilities using NestJS's built-in features.

### Is it compatible with custom database repositories?

Yes, as long as your repository follows the TypeORM Repository pattern, it will work with NestJS-Crud-Automator.

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
