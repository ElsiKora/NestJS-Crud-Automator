<p align="center">
  <img src="https://6jft62zmy9nx2oea.public.blob.vercel-storage.com/nestjs-crud-automator-HhXThTDhKyqznMLCgdmWhsPa287fIi.png" width="500" alt="project-logo">
</p>

<h1 align="center">🚀 NestJS-Crud-Automator</h1>
<p align="center"><em>A powerful library for automating CRUD operations in NestJS applications</em></p>

<p align="center">
    <a aria-label="ElsiKora logo" href="https://elsikora.com">
  <img src="https://img.shields.io/badge/MADE%20BY%20ElsiKora-333333.svg?style=for-the-badge" alt="ElsiKora">
</a> <img src="https://img.shields.io/badge/version-blue.svg?style=for-the-badge&logo=npm&logoColor=white" alt="version"> <img src="https://img.shields.io/badge/typescript-blue.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript"> <img src="https://img.shields.io/badge/nestjs-red.svg?style=for-the-badge&logo=nestjs&logoColor=white" alt="nestjs"> <img src="https://img.shields.io/badge/typeorm-orange.svg?style=for-the-badge&logo=database&logoColor=white" alt="typeorm"> <img src="https://img.shields.io/badge/license-green.svg?style=for-the-badge&logo=license&logoColor=white" alt="license">
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
NestJS-Crud-Automator is a comprehensive library designed to reduce boilerplate code and accelerate development by automatically generating fully-featured CRUD operations for NestJS applications. By leveraging TypeORM entities and built-in decorators, developers can quickly scaffold controllers and services with standardized endpoints for creating, reading, updating, and deleting resources. The library provides rich validation, sophisticated request/response transformation, automatic Swagger documentation, and supports complex filtering operations for list endpoints. NestJS-Crud-Automator is ideal for enterprise applications, microservices architectures, and any project where consistent API design and reduced development time are priorities.

## 🚀 Features
- ✨ **Zero-configuration CRUD controllers with automatic Swagger documentation**
- ✨ **Smart DTO generation for requests, responses, and query parameters**
- ✨ **Advanced filtering system with support for complex query operations**
- ✨ **Request transformation and validation pipeline**
- ✨ **Authentication and authorization integration**
- ✨ **Automatic relations handling with configurable loading strategies**
- ✨ **Comprehensive TypeScript support with full type safety**
- ✨ **Customizable error handling with correlation IDs for tracing**
- ✨ **Efficient throttling support to prevent API abuse**
- ✨ **ESM and CommonJS module support**

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


Ensure you have the required peer dependencies installed:


npm install @nestjs/common @nestjs/swagger typeorm class-transformer class-validator reflect-metadata
```

## 💡 Usage
## Basic Usage

NestJS-Crud-Automator provides a set of decorators that automate the creation of controllers and services for your entities.

### Entity Definition

First, define your TypeORM entity with the `ApiPropertyDescribe` decorators to provide metadata for Swagger and validation:

```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiPropertyDescribe } from '@elsikora/nestjs-crud-automator';
import { EApiPropertyDescribeType, EApiPropertyStringType } from '@elsikora/nestjs-crud-automator';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  @ApiPropertyDescribe({
    type: EApiPropertyDescribeType.UUID,
    description: 'Unique identifier'
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
    pattern: '/^[\w-\.]+@([\w-]+\.)+[\w-]{2,}$/',
    exampleValue: 'john@example.com'
  })
  email: string;
}
```

### Service Implementation

Create a service that extends the base functionality:

```typescript
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
  
  // You can override the default methods or add custom methods
  async findByEmail(email: string): Promise<User | undefined> {
    return this.repository.findOne({
      where: { email }
    });
  }
}
```

### Controller Implementation

Implement a controller with automatic CRUD endpoints:

```typescript
import { Controller } from '@nestjs/common';
import { ApiController } from '@elsikora/nestjs-crud-automator';
import { User } from './user.entity';
import { UserService } from './user.service';

@ApiController({
  entity: User,
  name: 'Users',
  path: 'users',
  routes: {
    // Configure routes (all enabled by default)
  }
})
@Controller('users')
export class UserController {
  constructor(public service: UserService) {}
}
```

## Advanced Configuration

### Custom Route Configuration

Customize each route with authentication, validation, and transformation:

```typescript
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EApiControllerLoadRelationsStrategy, EApiAuthenticationType, EApiDtoType, EApiRouteType } from '@elsikora/nestjs-crud-automator';

@ApiController({
  entity: User,
  name: 'Users',
  path: 'users',
  routes: {
    [EApiRouteType.CREATE]: {
      authentication: {
        guard: JwtAuthGuard,
        type: EApiAuthenticationType.USER,
        bearerStrategies: ['jwt']
      },
      request: {
        validators: [
          {
            errorType: EErrorStringAction.VALIDATION_ERROR,
            exception: BadRequestException,
            validationFunction: (body: Partial<User>) => {
              return body.username && body.username.length >= 3;
            }
          }
        ],
        transformers: {
          [EApiDtoType.BODY]: [
            {
              key: 'createdAt',
              type: EApiControllerRequestTransformerType.DYNAMIC,
              value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_TIMESTAMP
            }
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
```

### Working with Relations

Configure automatic loading of relations:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { ApiPropertyDescribe } from '@elsikora/nestjs-crud-automator';
import { EApiPropertyDescribeType } from '@elsikora/nestjs-crud-automator';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  @ApiPropertyDescribe({
    type: EApiPropertyDescribeType.UUID,
    description: 'Post ID'
  })
  id: string;
  
  @Column()
  @ApiPropertyDescribe({
    type: EApiPropertyDescribeType.STRING,
    // configuration...
  })
  title: string;
  
  @ManyToOne(() => User)
  @ApiPropertyDescribe({
    type: EApiPropertyDescribeType.RELATION,
    description: 'Post author'
  })
  author: User;
}

// In controller:
@ApiController({
  entity: Post,
  name: 'Posts',
  path: 'posts',
  routes: {
    [EApiRouteType.GET]: {
      request: {
        relations: {
          shouldLoadRelations: true,
          relationsLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL,
          relationsToLoad: ['author'],
          servicesLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL,
          relationsServices: {
            author: 'userService'
          }
        }
      }
    }
  }
})
export class PostController {
  constructor(
    public service: PostService,
    public userService: UserService
  ) {}
}
```

## Advanced Filtering

The GET_LIST endpoint supports sophisticated filtering operations:

```typescript
// Request example for filtering
// GET /users?page=1&limit=10&orderBy=createdAt&orderDirection=desc&username[operator]=cont&username[value]=john&createdAt[operator]=between&createdAt[values]=["2023-01-01","2023-12-31"]
```

Supported operations include:
- `eq` - Equal
- `ne` - Not equal
- `gt` - Greater than
- `gte` - Greater than or equal
- `lt` - Less than
- `lte` - Less than or equal
- `in` - In array
- `notin` - Not in array
- `cont` - Contains (for strings)
- `starts` - Starts with
- `ends` - Ends with
- `isnull` - Is null
- `notnull` - Is not null
- `between` - Between two values

## Custom DTOs and Validation

You can provide custom DTOs instead of auto-generated ones:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  username: string;
  
  @ApiProperty()
  @IsEmail()
  email: string;
}

// In controller:
@ApiController({
  entity: User,
  name: 'Users',
  path: 'users',
  routes: {
    [EApiRouteType.CREATE]: {
      dto: {
        body: CreateUserDto,
        response: UserResponseDto
      }
    }
  }
})
```

## Throttling and Rate Limiting

Implement rate limiting on endpoints:

```typescript
import { EApiRouteType } from '@elsikora/nestjs-crud-automator';

@ApiController({
  entity: User,
  name: 'Users',
  path: 'users',
  routes: {
    [EApiRouteType.CREATE]: {
      // Apply method-level throttling
      decorators: [
        ApiMethod({
          throttler: {
            limit: 5,
            ttl: 60000 // 1 minute
          }
        })
      ]
    }
  }
})
```

## Correlation ID for Request Tracing

Use the built-in correlation ID interceptor for request tracing:

```typescript
import { CorrelationIDResponseBodyInterceptor } from '@elsikora/nestjs-crud-automator';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationIDResponseBodyInterceptor,
    },
  ],
})
export class AppModule {}
```

This will ensure all responses and errors include a correlation ID for tracing through logs.

## 🛣 Roadmap
| Task / Feature | Status |
|---------------|--------|
| ## Future Development | 🚧 In Progress |
| - GraphQL support with automatic query and mutation generation | 🚧 In Progress |
| - Integration with NestJS caching mechanisms | 🚧 In Progress |
| - Extension to support NoSQL databases beyond TypeORM | 🚧 In Progress |
| - Event sourcing support for audit logging | 🚧 In Progress |
| - Expanded filtering capabilities with full-text search | 🚧 In Progress |
| - Integration with file upload handling | 🚧 In Progress |
| - Custom response serialization strategies | 🚧 In Progress |
| - Enhanced performance optimization options | 🚧 In Progress |
| - More comprehensive test utilities | 🚧 In Progress |
| - Custom pagination strategies | 🚧 In Progress |
| (done) Zero-configuration CRUD controllers with automatic Swagger documentation | 🚧 In Progress |
| (done) Smart DTO generation for requests, responses, and query parameters | 🚧 In Progress |
| (done) Advanced filtering system with support for complex query operations | 🚧 In Progress |

## ❓ FAQ
## Frequently Asked Questions

### Does this library work with NestJS microservices?
Yes, NestJS-Crud-Automator is designed to work with both monolithic NestJS applications and microservices architectures.

### How does performance compare to manually written controllers?
The library is optimized for performance and should have minimal overhead compared to manually written controllers. In many cases, the standardized patterns may even lead to better performance through consistent implementations.

### Can I use this with custom database schemas?
Yes, as long as you use TypeORM, the library works with any valid entity configuration, including custom database schemas.

### How can I extend the automatically generated endpoints?
You can always add additional methods to your controller that handle special cases or extend the functionality of the auto-generated endpoints.

### Is there a way to disable certain CRUD operations?
Yes, you can disable any operation by setting `isEnabled: false` in the route configuration object.

### How does this library handle transactions?
The library uses TypeORM's underlying transaction mechanisms. You can implement transaction handling in your custom service methods.

### Does this work with MongoDB?
Yes, as long as you use TypeORM with MongoDB, the library should work properly with MongoDB entities.

### How can I migrate from the base NestJS CRUD module?
The library provides a significantly different API from NestJS's CRUD module, so migration will require changing your decorators and service implementations. However, the entity structure can remain largely the same.

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
