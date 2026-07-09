import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FortuneService } from './fortune.service';

@ApiTags('fortune')
@Controller('api')
export class FortuneController {
  constructor(private readonly fortuneService: FortuneService) {}

  @Get('dayfortune')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取每日时运' })
  dayFortune(@CurrentUser() user: User) {
    return this.fortuneService.getDayFortune(user);
  }

  @Get('dayart')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '每日治愈插画' })
  dayArt() {
    return this.fortuneService.getDayArt();
  }

  @Get('fortunes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取时运日历' })
  @ApiQuery({ name: 'month', required: true })
  getFortunes(@CurrentUser() user: User, @Query('month') month: string) {
    return this.fortuneService.getFortunes(user, month);
  }
}
