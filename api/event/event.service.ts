import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, MoreThan, Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { EVENT_TTL } from "../const/const";
import { PriceHistory } from 'price-history/entities/price-history.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(PriceHistory)
    private priceRepository: Repository<PriceHistory>,
  ) {}
  async create() {
    const newEvent = this.eventRepository.create();
    //make sure that all previous event are inactive
    const activeEvent = await this.getActive();
    if(activeEvent){
      throw new HttpException({ message: 'Previous event still active, please close it manually if you want to create a new one' }, HttpStatus.CONFLICT);
    }
    this.priceRepository.clear();
    return await this.eventRepository.save(newEvent);
  }

  findAll(): Promise<Event[]> {
    return this.eventRepository.find({
      order : { id : "desc"}
    });
  }

  findOne(id: number) : Promise<Event> {
    return this.eventRepository.findOneBy({id});
  }
  getActive(): Promise<Event | null> {
    return this.eventRepository.findOne({
      where: { 
        createdAt: MoreThan(new Date(Date.now() - EVENT_TTL)),
        active : true
      },
      order: { id: 'DESC' },
    });
  }  
  async update(id: number, updateEventDto: UpdateEventDto) {
    const currentEvent = await this.eventRepository.findOneBy({id});
    currentEvent.active = !updateEventDto.closeEvent;
    return this.eventRepository.save(currentEvent);
  }

  remove(id: number) : Promise<DeleteResult> {
    return this.eventRepository.delete(id);
  }
}