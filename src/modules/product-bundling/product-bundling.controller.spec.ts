import { Test, TestingModule } from '@nestjs/testing';
import { ProductBundlingController } from './product-bundling.controller';
import { ProductBundlingService } from './product-bundling.service';

describe('ProductBundlingController', () => {
  let controller: ProductBundlingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductBundlingController],
      providers: [ProductBundlingService],
    }).compile();

    controller = module.get<ProductBundlingController>(ProductBundlingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
