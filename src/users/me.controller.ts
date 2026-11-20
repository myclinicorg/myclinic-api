import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { User } from './user.js';

@ApiTags('me')
@ApiCookieAuth()
@Controller('me')
export class MeController {
  @Get()
  me(@CurrentUser() user: User) {
    return user;
  }
}
