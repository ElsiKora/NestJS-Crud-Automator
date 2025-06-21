import { ApiController } from '@elsikora/nestjs-crud-automator';
import { UserService } from './user.service';
import { User } from './user.entity';

@ApiController({
  entity: User,
  routes: {},
})
export class UserController {
  constructor(public readonly service: UserService) {}
} 