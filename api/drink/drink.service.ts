import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateDrinkDto } from './dto/create-drink.dto';
import { UpdateDrinkDto } from './dto/update-drink.dto';
import { DeleteResult, Repository } from 'typeorm';
import { Drink } from './entities/drink.entity';
import { InjectRepository } from '@nestjs/typeorm';


@Injectable()
export class DrinkService {
  constructor(
    @InjectRepository(Drink)
    private drinkRepository: Repository<Drink>,
  ) {}

  async create(createDrinkDto: CreateDrinkDto) {
    const existingDrink = await this.drinkRepository.findOneBy({
      name: createDrinkDto.name,
    });
  
    if (existingDrink) {
      throw new HttpException({ message: 'There is already a drink with this name' }, HttpStatus.BAD_REQUEST);
    }
  
    const newDrink = this.drinkRepository.create(createDrinkDto);
      return await this.drinkRepository.save(newDrink);
  }
  

  findAll(): Promise<Drink[]> {
        return this.drinkRepository.find();  }

  findOne(id: number) : Promise<Drink> {
    return this.drinkRepository.findOneBy({id});
  }

  update(id: number, updateDrinkDto: UpdateDrinkDto) {
    return `This action updates a #${id} drink`;
  }

  remove(id: number) : Promise<DeleteResult> {
    return this.drinkRepository.delete(id);
  }
}
