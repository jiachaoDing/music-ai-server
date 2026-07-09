import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BattlesService } from './battles.service';
import { CreateBattleDto, VoteBattleDto } from './dto/battle.dto';

@ApiTags('battles')
@Controller('api')
export class BattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  @Get('battles')
  @ApiOperation({ summary: 'PK 擂台列表' })
  list() {
    return this.battlesService.list();
  }

  @Post('battle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建 PK 擂台' })
  create(@CurrentUser() user: User, @Body() dto: CreateBattleDto) {
    return this.battlesService.create(user, dto.topic, dto.aId, dto.bId);
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
