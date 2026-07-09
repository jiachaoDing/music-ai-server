import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';
import {
  AdminCreateInviteDto,
  AdminCreateTopicDto,
  AdminCreateUserDto,
  AdminUpdateSongDto,
  AdminUpdateSongStatusDto,
  AdminUpdateTopicDto,
  AdminUpdateUserDto,
} from './dto/admin.dto';

@ApiTags('admin')
@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: '用户列表' })
  listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  @ApiOperation({ summary: '创建用户' })
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: '更新用户' })
  updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Get('songs')
  @ApiOperation({ summary: '作品列表' })
  listSongs(@Query('status') status?: string) {
    return this.adminService.listSongs(status);
  }

  @Patch('songs/:id/status')
  @ApiOperation({ summary: '管理作品状态' })
  updateSongStatus(
    @Param('id') id: string,
    @Body() dto: AdminUpdateSongStatusDto,
  ) {
    return this.adminService.updateSongStatus(id, dto.status, dto.reason);
  }

  @Patch('songs/:id')
  @ApiOperation({ summary: '作品管理' })
  updateSong(@Param('id') id: string, @Body() dto: AdminUpdateSongDto) {
    return this.adminService.updateSong(id, dto);
  }

  @Delete('songs/:id')
  @ApiOperation({ summary: '删除作品' })
  deleteSong(@Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.adminService.deleteSong(id, body?.reason);
  }

  @Get('invite-codes')
  @ApiOperation({ summary: '邀请码列表' })
  listInviteCodes() {
    return this.adminService.listInviteCodes();
  }

  @Post('invite-codes')
  @ApiOperation({ summary: '生成邀请码' })
  createInviteCode(
    @CurrentUser() admin: User,
    @Body() dto: AdminCreateInviteDto,
  ) {
    if (dto.count && dto.count > 1) {
      return this.adminService.createInviteCodes(admin, dto.count);
    }
    return this.adminService.createInviteCode(
      admin,
      dto.code ?? `ECHO${Date.now().toString(36).toUpperCase()}`,
    );
  }

  @Get('comments')
  @ApiOperation({ summary: '评论管理' })
  listComments() {
    return this.adminService.listComments();
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: '删除评论' })
  deleteComment(@Param('id') id: string) {
    return this.adminService.deleteComment(id);
  }

  @Get('challenges')
  @ApiOperation({ summary: '话题挑战管理' })
  listTopics() {
    return this.adminService.listTopics();
  }

  @Post('challenges')
  @ApiOperation({ summary: '新增话题挑战' })
  createTopic(@Body() dto: AdminCreateTopicDto) {
    return this.adminService.createTopic(dto);
  }

  @Patch('challenges/:id')
  @ApiOperation({ summary: '更新话题挑战' })
  updateTopic(@Param('id') id: string, @Body() dto: AdminUpdateTopicDto) {
    return this.adminService.updateTopic(id, dto);
  }

  @Delete('challenges/:id')
  @ApiOperation({ summary: '删除话题挑战' })
  deleteTopic(@Param('id') id: string) {
    return this.adminService.deleteTopic(id);
  }
}
