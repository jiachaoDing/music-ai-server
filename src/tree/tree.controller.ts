import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { TreeService } from './tree.service';

type AuthRequest = Request & { user?: User | null };

@ApiTags('tree')
@Controller('api/tree')
export class TreeController {
  constructor(private readonly treeService: TreeService) {}

  @Get(':id')
  @ApiOperation({ summary: '翻唱进化树' })
  @UseGuards(OptionalJwtAuthGuard)
  getTree(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.treeService.getTree(id, req.user?.id);
  }
}
