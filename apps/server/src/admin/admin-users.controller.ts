/**
 * Admin Users Controller
 * 用户管理 API
 */

import {
  Controller,
  Get,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { AdminService } from './admin.service';
import { userQuerySchema, updateUserSchema } from './dto';

@ApiTags('Admin')
@Controller({ path: 'admin/users', version: VERSION_NEUTRAL })
@RequireAdmin()
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 获取用户列表
   * GET /api/admin/users
   */
  @Get()
  async getUsers(@Query() query: unknown) {
    const parsed = userQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminService.getUsers(parsed.data);
  }

  /**
   * 获取单个用户
   * GET /api/admin/users/:id
   */
  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  /**
   * 更新用户
   * PATCH /api/admin/users/:id
   */
  @Patch(':id')
  async updateUser(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminService.updateUser(id, parsed.data);
  }

  /**
   * 删除用户（软删除）
   * DELETE /api/admin/users/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string): Promise<void> {
    await this.adminService.deleteUser(id);
  }
}
