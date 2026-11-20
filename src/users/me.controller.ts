import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserEntity } from './entities/user.entity.js';
import type { User } from './user.js';

@ApiTags('me')
@ApiCookieAuth()
@Controller('me')
export class MeController {
  @ApiOkResponse({ type: UserEntity })
  @Get()
  me(@CurrentUser() user: User) {
    return user;
  }
}
