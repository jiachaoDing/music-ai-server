import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TreeService } from './tree.service';

@ApiTags('tree')
@Controller('api/tree')
export class TreeController {
  constructor(private readonly treeService: TreeService) {}

  @Get(':id')
  @ApiOperation({ summary: '翻唱进化树' })
  getTree(@Param('id') id: string) {
    return this.treeService.getTree(id);
  }
}
