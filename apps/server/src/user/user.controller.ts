/**
 * User Controller
 * 用户相关 API
 */

import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { UserService } from './user.service';
import {
  deleteAccountSchema,
  updateProfileSchema,
  changePasswordSchema,
} from './dto';

@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取当前用户完整信息（包括配额）
   */
  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserDto) {
    return this.userService.getUserProfile(user.id);
  }

  /**
   * 更新用户资料
   */
  @Patch('me')
  async updateProfile(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: unknown,
  ) {
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.userService.updateProfile(user.id, parsed.data);
  }

  /**
   * 修改密码
   */
  @Post('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: unknown,
  ): Promise<void> {
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    await this.userService.changePassword(user.id, parsed.data);
  }

  /**
   * 删除账户（软删除）
   */
  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: unknown,
  ): Promise<void> {
    // 验证请求体
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    await this.userService.deleteAccount(user.id, parsed.data);
  }
}
