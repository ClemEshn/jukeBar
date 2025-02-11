import { Body, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PriceHistory } from './entities/price-history.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, MoreThan, Not, Repository } from 'typeorm';
import { EventDrinksPair } from 'event-drinks-pairs/entities/event-drinks-pair.entity';
import { Event } from '../event/entities/event.entity';
import { findManyPrices } from './dto/find-many-prices.dto';
import { EVENT_TTL } from 'const/const';
import { PriceHistoryGateway } from './websockets/websocket.gateway';
import { EventDrinksPairsService } from 'event-drinks-pairs/event-drinks-pairs.service';

@Injectable()
export class PriceHistoryService {
  constructor(
    @InjectRepository(PriceHistory)
    private priceRepository: Repository<PriceHistory>,
    @InjectRepository(EventDrinksPair)
    private pairRepository: Repository<EventDrinksPair>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    private priceHistoryGateway: PriceHistoryGateway,
    private eventsDrinksPairService : EventDrinksPairsService,
  ) {}

  async buy(id : number, @Body() body: any) {
    const currentEvent = await this.eventRepository.findOne({
      where: { 
        createdAt: MoreThan(new Date(Date.now() - EVENT_TTL)),
        active : true 
      },
      order: { id: 'DESC' },
    });
    if(!currentEvent){
      throw new HttpException({ message: 'Error : no active event at the moment' }, HttpStatus.BAD_REQUEST);
    }

    const pairId = await this.pairRepository.findOne({
      where: [
        { id, idEvent: { id: currentEvent.id } },
      ],
    });

    const otherPairs = await this.pairRepository.find({
      where: [
        {
          id : Not(id),
          idEvent : { id : currentEvent.id},
        }
      ],
    });

    //Get old price, increase it and save it
    var oldPrice = await this.priceRepository.findOne({
      where: { pairId : id },
      order: { id: 'DESC' },
    });

    //init if not done before
    if(!oldPrice){
      await this.init(id);
      var oldPrice = await this.priceRepository.findOne({
        where: { pairId : id },
        order: { id: 'DESC' },
      });
    }

    const time : string =  new Date().toISOString();
    let newPriceData = {
      pairId: oldPrice.pairId,
      price_drink_1: oldPrice.price_drink_1,
      price_drink_2: oldPrice.price_drink_2,
      time : time
    };


    if (body.isDrinkOne) {
      newPriceData.price_drink_1 = Number(newPriceData.price_drink_1) + Number(pairId.price_inc_1);
      if(pairId.min_price_2 < Number(newPriceData.price_drink_2) - Number(pairId.price_sub_2)){
        newPriceData.price_drink_2 = Number(newPriceData.price_drink_2) - Number(pairId.price_sub_2);
      }else{
        newPriceData.price_drink_2 = pairId.min_price_2;
      }
    } else {
      if(pairId.min_price_1 < Number(newPriceData.price_drink_1) - Number(pairId.price_sub_1)){
        newPriceData.price_drink_1 = Number(newPriceData.price_drink_1) - Number(pairId.price_sub_1);
      }else{
        newPriceData.price_drink_1 = pairId.min_price_1;
      }
      newPriceData.price_drink_2 = Number(newPriceData.price_drink_2) + Number(pairId.price_inc_2);
    }    
    const newPrice = this.priceRepository.create(newPriceData);

    this.priceHistoryGateway.sendPriceUpdate({
      pairId: newPrice.pairId,
      price_drink_1: newPrice.price_drink_1,
      price_drink_2: newPrice.price_drink_2,
      time: time,
    });

    //get all other active pairs from event, and save them again
    const otherPairIds = otherPairs.map(pairId => pairId.id); 
    if(otherPairIds.length > 0 ){
      const prices = await this.priceRepository
      .createQueryBuilder('price')
      .innerJoin(
        (subQuery) =>
          subQuery
            .select('MAX(price.id)', 'maxId')
            .addSelect('price.pairId', 'pairId')
            .from('price_history', 'price')
            .where('price.pairId IN (:...otherPairIds)', { otherPairIds })
            .groupBy('price.pairId'),
        'maxPrice',
        'price.id = maxPrice.maxId'
      )
      .select('price.id', 'id')
      .addSelect('price.pairId', 'pairId')
      .addSelect('price.price_drink_1', 'price_drink_1')
      .addSelect('price.price_drink_2', 'price_drink_2')
      .getRawMany();
      type PriceHistoryWithId = PriceHistory & { number: number };
      var toSave: PriceHistoryWithId[] = [];
      prices.forEach((price) => {
      const saveSamePrice = {
        pairId : price.pairId,
        price_drink_1: price.price_drink_1,
        price_drink_2: price.price_drink_2,
        time : time
      } 
      const samePrice = this.priceRepository.create(saveSamePrice);
      toSave.push({...samePrice, number : price.pairId});
      this.priceHistoryGateway.sendPriceUpdate({
        pairId: saveSamePrice.pairId,
        price_drink_1: saveSamePrice.price_drink_1,
        price_drink_2: saveSamePrice.price_drink_2,
        time: time,
      });
    });
    }
    var isSaved : boolean = false;
    var res;
    if(toSave){
      toSave.sort((a, b) => a.number - b.number);
      toSave.forEach(async priceToSave => {
        if(id === priceToSave.number - 1 && !isSaved){
          res = await this.priceRepository.save(newPrice);
          isSaved = true;
        }
        
        await this.priceRepository.save(priceToSave);
        if(id === priceToSave.number + 1 && !isSaved){
          res = await this.priceRepository.save(newPrice);
          isSaved = true;
        }
      });
    }
    else{
      await this.priceRepository.save(newPrice);
    }
    return res;
  }

  findAll() {
    return this.priceRepository.find();
  }

  async findOne(id: number) {
    const price = await this.priceRepository.findOne({
        where: { pairId: id },
        order: { id: 'DESC' },
    });
    if(!price){
      await this.init(id);
      const priceInit = await this.priceRepository.findOne({
        where: { pairId: id },
        order: { id: 'DESC' },
      });
      return priceInit;
    }
    return price;
  }

  async remove(id: number) : Promise<DeleteResult> {//Edit to remove last action on a pair using its id and not the actionId
    const lastPrice = await this.priceRepository.findOne({
      where: { pairId : id },
      order : {id : 'DESC'},
    });
    return this.priceRepository.delete(lastPrice);
  }

  //insert the default data
  async init(id : number) {
    const pair = await this.pairRepository.findOne({
      where: { id },
      relations: ['idEvent', 'idDrink_1', 'idDrink_2'],
    });
    if(!pair){
      throw new HttpException({ message: 'Pair not found.' }, HttpStatus.NOT_FOUND);
    }
    const priceOne = pair.idDrink_1.price;
    const priceTwo = pair.idDrink_2.price;

    const priceInit = this.priceRepository.create();
    priceInit.pairId = id;
    priceInit.price_drink_1 = priceOne;
    priceInit.price_drink_2 = priceTwo;
    return this.priceRepository.save(priceInit);
 
  }

  async findMany(findManyPrices : findManyPrices, selectOne : boolean) {
    const ids = findManyPrices.ids;
    if (!ids || ids.length === 0) {
        throw new HttpException('No IDs provided.', HttpStatus.BAD_REQUEST);
    }
    let selectPrice: string;
    if (selectOne) {
      selectPrice = 'Max(price.id)';
    } else {
      selectPrice = 'price.id';
    }
  
    const prices = await this.priceRepository
      .createQueryBuilder('price')
      .where('price.pairId IN (:...ids)', { ids })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select(selectPrice)
          .from(PriceHistory, 'price')
          .where('price.pairId IN (:subIds)', { subIds: ids })
          .groupBy('price.pairId')
          .getQuery();
        return `price.id IN (${subQuery})`;
      })
      .orderBy('price.id', 'DESC')
      .limit(20 * ids.length)
      .getMany();
    const foundPairIds = new Set(prices.map((price) => price.pairId));
    const missingPairIds = ids.filter((id) => !foundPairIds.has(id));
    if (missingPairIds.length > 0) {
        await Promise.all(missingPairIds.map((id) => this.init(id)));
        const newPrices = await this.priceRepository
        .createQueryBuilder('price')
        .where('price.pairId IN (:missingIds)', { missingIds : missingPairIds })
        .andWhere((qb) => {
            const subQuery = qb
                .subQuery()
                .select('price.id')
                .from(PriceHistory, 'price')
                .where('price.pairId IN (:subIds)', { subIds : missingPairIds })
                .getQuery();
            return `price.id IN (${subQuery})`;
        })
        .getMany();
        prices.push(...newPrices);
    }
    prices.sort(this.compare);
    return prices;
  }

  compare(a : PriceHistory, b : PriceHistory){
    if(a.id > b.id){
      return 1;
    }
    return -1;
  }
  async getAll(lastPricesOnly : boolean){
    const currentEvent = await this.eventRepository.findOne({
      where: { 
        createdAt: MoreThan(new Date(Date.now() - EVENT_TTL)),
        active : true 
      },
      order: { id: 'DESC' },
    });
    if(!currentEvent){
      throw new HttpException({ message: 'Error : no active event at the moment' }, HttpStatus.BAD_REQUEST);
    }
    const pairs : EventDrinksPair[] = await this.eventsDrinksPairService.findAllByEvent(currentEvent.id);
    const pairsID = pairs.map(pair => pair.id);
    const obj = {
      ids : pairsID
    }
    return await this.findMany(obj, lastPricesOnly);
  }
  
}
