import { Module } from '@nestjs/common';
import { EntityController } from './entity.controller';
import { EntityService } from './entity.service';
import { EntityRepository } from './entity.repository';
import { PrismaModule } from '../prisma';
import { QuotaModule } from '../quota';
import { ApiKeyModule } from '../api-key';

@Module({
  imports: [PrismaModule, QuotaModule, ApiKeyModule],
  controllers: [EntityController],
  providers: [EntityService, EntityRepository],
  exports: [EntityService, EntityRepository],
})
export class EntityModule {}
