import { Test, TestingModule } from '@nestjs/testing';
import { SuppliesController } from './supplies.controller.js';
import { SuppliesService } from './supplies.service.js';

describe('SuppliesController', () => {
  let controller: SuppliesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliesController],
      providers: [SuppliesService],
    }).compile();

    controller = module.get<SuppliesController>(SuppliesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
