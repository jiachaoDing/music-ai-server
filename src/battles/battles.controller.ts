import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { BattlesService } from './battles.service';
import { CreateBattleDto, VoteBattleDto } from './dto/battle.dto';

type AuthRequest = Request & { user?: User | null };

@ApiTags('battles')
@Controller('api')
export class BattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  @Get('battles')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'PK 擂台列表' })
  list(@Req() req: AuthRequest) {
    return this.battlesService.list(req.user ?? undefined);
  }

  @Get('battles/:id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'PK 擂台详情' })
  findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.battlesService.findOne(id, req.user ?? undefined);
  }

  @Post('battle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建 PK 擂台' })
  create(@CurrentUser() user: User, @Body() dto: CreateBattleDto) {
    return this.battlesService.create(user, dto.topic, dto.aId, dto.bId);
  }

  @Delete('battles/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除 PK 擂台' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.battlesService.remove(id, user);
  }

  @Post('battle/:id/vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '擂台投票' })
  vote(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: VoteBattleDto,
  ) {
    return this.battlesService.vote(id, user, dto.side);
  }
}
