import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommunityService } from './community.service';
import { CreateCommentDto } from './dto/create-comment.dto';

class CollectSongDto {
  playlistId?: string;
}

@ApiTags('community')
@Controller('api')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('feed')
  @ApiOperation({ summary: '社区作品流' })
  getFeed(
    @Query('sort') sort?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.communityService.getFeed(sort, +page || 1, +pageSize || 20);
  }

  @Get('resonance')
  @ApiOperation({ summary: '同频推荐' })
  getResonance(@Query('name') name?: string) {
    return this.communityService.getResonance(name);
  }

  @Post('like/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '点赞作品' })
  like(@Param('id') id: string, @CurrentUser() user: User) {
    return this.communityService.likeSong(id, user);
  }

  @Post('collect/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '收藏作品' })
  collect(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: CollectSongDto,
  ) {
    return this.communityService.collectSong(id, user, body.playlistId);
  }

  @Get('comments/:id')
  @ApiOperation({ summary: '获取作品留言' })
  getComments(@Param('id') id: string) {
    return this.communityService.getComments(id);
  }

  @Post('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发表留言' })
  addComment(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: CreateCommentDto,
  ) {
    return this.communityService.addComment(id, user, dto.text, dto.anon);
  }
}
