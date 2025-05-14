import { Test, TestingModule } from '@nestjs/testing';
import { EventService } from './event.service';
import { Event } from './entities/event.entity';
import { PriceHistory } from 'price-history/entities/price-history.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpException } from '@nestjs/common';
import { UpdateEventDto } from './dto/update-event.dto';
import { EVENT_TTL } from '../const/const';

const mockEventRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
});

const mockPriceRepo = () => ({
  clear: jest.fn(),
});
describe('EventService', () => {
  let service: EventService;
  let eventRepo: jest.Mocked<Repository<Event>>;
  let priceRepo: jest.Mocked<Repository<PriceHistory>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: getRepositoryToken(Event), useFactory: mockEventRepo },
        { provide: getRepositoryToken(PriceHistory), useFactory: mockPriceRepo },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    eventRepo = module.get(getRepositoryToken(Event));
    priceRepo = module.get(getRepositoryToken(PriceHistory));
  });

  describe('create', () => {
    it('should throw conflict if an active event exists', async () => {
      eventRepo.findOne.mockResolvedValueOnce({ id: 1, active: true } as Event);
      await expect(service.create()).rejects.toThrow(HttpException);
    });

    it('should clear prices and create a new event if no active event', async () => {
      const newEvent = { 
        id: 123,
        createdAt : new Date(),
        active : true
       };
      eventRepo.findOne.mockResolvedValueOnce(null); // no active event
      eventRepo.create.mockReturnValue(newEvent);
      eventRepo.save.mockResolvedValueOnce(newEvent);

      const result = await service.create();

      expect(priceRepo.clear).toHaveBeenCalled();
      expect(eventRepo.save).toHaveBeenCalledWith(newEvent);
      expect(result).toEqual(newEvent);
    });
  });
});