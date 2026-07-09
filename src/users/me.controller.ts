import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('me')
@Controller('api/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '获取个人中心信息' })
  getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user);
  }

  @Get('points-ledger')
  @ApiOperation({ summary: '获取积分流水' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  getPointsLedger(
    @CurrentUser() user: User,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.usersService.getPointsLedger(user, +page || 1, +pageSize || 20);
  }
}
