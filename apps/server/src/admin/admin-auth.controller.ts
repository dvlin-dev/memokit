/**
 * Admin Auth Controller
 * 管理员认证 API
 */

import {
  Controller,
  Post,
  Body,
  Req,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { PrismaService } from '../prisma';
import { Public } from '../auth';
import * as bcrypt from 'bcryptjs';

interface AdminLoginDto {
  email: string;
  password: string;
}

@ApiTags('Admin')
@Controller('api/admin')
export class AdminAuthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 管理员登录
   * POST /api/admin/login
   */
  @Public()
  @ApiOperation({ summary: '管理员登录' })
  @Post('login')
  async login(@Body() dto: AdminLoginDto) {
    const { email, password } = dto;

    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required');
    }

    // 查找用户和账户信息
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          where: { providerId: 'credential' },
        },
      },
    });

    if (!user || !user.accounts.length) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 检查是否是管理员
    if (!user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    // 检查用户是否已删除
    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deleted');
    }

    // 验证密码
    const account = user.accounts[0];
    if (!account.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, account.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 创建 session token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const token = this.generateToken();

    await this.prisma.session.create({
      data: {
        id: this.generateId(),
        token,
        userId: user.id,
        expiresAt,
        ipAddress: null,
        userAgent: null,
      },
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      },
      token,
    };
  }

  /**
   * 管理员登出
   * POST /api/admin/logout
   */
  @Post('logout')
  async logout(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await this.prisma.session.deleteMany({
        where: { token },
      });
    }

    return { success: true };
  }

  private generateToken(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateId(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
