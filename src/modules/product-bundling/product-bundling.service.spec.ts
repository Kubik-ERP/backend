import { Test, TestingModule } from '@nestjs/testing';
import { ProductBundlingService } from './product-bundling.service';

describe('ProductBundlingService', () => {
  let service: ProductBundlingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductBundlingService],
    }).compile();

    service = module.get<ProductBundlingService>(ProductBundlingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
