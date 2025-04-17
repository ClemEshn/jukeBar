import { Module } from '@nestjs/common';
import { PriceHistoryService } from './price-history.service';
import { PriceHistoryController } from './price-history.controller';
import { EventDrinksPair } from '../event-drinks-pairs/entities/event-drinks-pair.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceHistory } from './entities/price-history.entity';
import { Event } from '../event/entities/event.entity';
import { WebSocketService } from './websockets/websocket.service';
import { PriceHistoryGateway } from './websockets/websocket.gateway';
import { EventDrinksPairsService } from 'event-drinks-pairs/event-drinks-pairs.service';
import { EventDrinksPairsModule } from 'event-drinks-pairs/event-drinks-pairs.module';

@Module({
  controllers: [PriceHistoryController],
  providers: [PriceHistoryService, PriceHistoryGateway, WebSocketService],
  imports: [TypeOrmModule.forFeature([Event, PriceHistory, EventDrinksPair, WebSocketService, PriceHistoryService]), EventDrinksPairsModule],
  exports: [PriceHistoryGateway],
})
export class PriceHistoryModule {}
