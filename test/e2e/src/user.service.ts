import { Injectable } from '@nestjs/common';
import { ApiServiceBase } from '@elsikora/nestjs-crud-automator';
import { User } from './user.entity';

@Injectable()
export class UserService extends ApiServiceBase<User> {} 