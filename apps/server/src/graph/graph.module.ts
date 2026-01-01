import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { EntityModule } from '../entity';
import { RelationModule } from '../relation';
import { ApiKeyModule } from '../api-key';
import { QuotaModule } from '../quota';

@Module({
  imports: [EntityModule, RelationModule, ApiKeyModule, QuotaModule],
  controllers: [GraphController],
  providers: [GraphService],
  exports: [GraphService],
})
export class GraphModule {}
