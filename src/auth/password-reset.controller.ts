import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import { PasswordResetService, Public } from '@nestjs/authentication';
import { Throttle, minutes } from '@nestjs/throttler';
import { ApiAcceptedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SignInResultEntity } from './entities/sign-in-result.entity.js';
import { accountEmail } from './account-email.js';
import { EmailDto, ResetPasswordDto } from './auth.dto.js';

@Public()
@ApiTags('auth')
@Controller('auth/password')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @ApiAcceptedResponse()
  @Throttle({
    default: { limit: 10, ttl: minutes(15) },
    account: { limit: 3, ttl: minutes(15), getTracker: accountEmail },
  })
  @Post('forgot')
  @HttpCode(202)
  forgot(@Body() body: EmailDto) {
    this.passwordResetService.request(body.email);
  }

  @ApiOkResponse({ type: SignInResultEntity })
  @Post('reset')
  @HttpCode(200)
  async reset(@Body() body: ResetPasswordDto) {
    const result = await this.passwordResetService.reset(
      body.token,
      body.password,
      { signIn: true },
    );
    if (!result) {
      throw new BadRequestException('Link inválido ou expirado');
    }
    return { mfaRequired: result.signedIn?.session.mfa === 'pending' };
  }
}
