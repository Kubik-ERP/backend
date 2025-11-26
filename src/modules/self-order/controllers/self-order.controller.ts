import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseBoolPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { toCamelCase } from '../../../common/helpers/object-transformer.helper';
import { PrismaService } from '../../../prisma/prisma.service';
import { CategoriesService } from '../../categories/categories.service';
import {
  CalculationEstimationDto,
  ProceedCheckoutInvoiceDto,
  ProceedInstantPaymentDto,
} from '../../invoices/dtos/process-payment.dto';
import {
  GetInvoiceSettingDto,
  SettingInvoiceDto,
} from '../../invoices/dtos/setting-invoice.dto';
import { InvoiceService } from '../../invoices/services/invoices.service';
import { PaymentMethodService } from '../../payment-methods/services/payment-method.service';
import { ProductsService } from '../../products/products.service';
import { StoresService } from '../../stores/services/stores.service';
import { SelfOrderSignUpDto } from '../dtos/self-order-signup.dto';
import { ValidateStoreTableDto } from '../dtos/validate-store-table.dto';
import { SelfOrderService } from '../services/self-order.service';

@ApiTags('Self Order')
@Controller('self-order')
export class SelfOrderController {
  constructor(
    private readonly selfOrderService: SelfOrderService,
    private readonly categoriesService: CategoriesService,
    private readonly paymentMethodService: PaymentMethodService,
    private readonly invoiceService: InvoiceService,
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly storeService: StoresService,
  ) {}

  // Sign up: if exists (by code+number+store) return existing, else create via customersService.create
  @Post('customers/signup')
  @ApiOperation({
    summary: 'Customer Self Order Sign Up',
  })
  async signUp(
    @Body() dto: SelfOrderSignUpDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    // Memastikan store memiliki akses self-order
    await this.selfOrderService.storePermission(dto.storeId);

    const { customer, created } = await this.selfOrderService.signUp(dto, req);
    return {
      statusCode: created ? 201 : 200,
      message: created ? 'Customer created successfully' : 'Customer found',
      result: toCamelCase(customer),
    };
  }

  /* ------------------------- // * Get Payment Method ------------------------ */
  @Get('payment/method')
  @ApiOperation({
    summary: 'Get list of the payment methods',
  })
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiQuery({
    name: 'isSelfOrder',
    required: false,
    description: 'Filter for self-order payment methods',
    type: Boolean,
    example: false,
  })
  public async paymentMethodList(
    @Query('isSelfOrder', new ParseBoolPipe({ optional: true }))
    @Req()
    req: ICustomRequestHeaders,
    isSelfOrder = false,
  ) {
    const response = await this.paymentMethodService.findAllPaymentMethod(
      isSelfOrder,
      req,
    );

    return {
      result: toCamelCase(response),
    };
  }

  /* ------------------------- //  * Calculate invoice ------------------------ */
  @Post('invoice/calculate/estimation')
  @ApiOperation({
    summary: 'Simulate the total estimation',
  })
  public async calculateEstimation(
    @Body() requestData: CalculationEstimationDto,
  ) {
    let result;
    await this.prisma.$transaction(async (tx) => {
      result = await this.invoiceService.calculateTotal(tx, requestData);
    });

    return {
      result,
    };
  }

  // * Get Product Detail
  @Get('products/:idOrName')
  @ApiOperation({
    summary: 'Get Product Detail by ID or Name',
  })
  async findOne(@Param('idOrName') idOrName: string) {
    try {
      const products = await this.productsService.findOne(idOrName);
      if (!products) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'products not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(products),
      };
    } catch (error) {
      console.error('Error finding products:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch products',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /* ---------------------- // * Invoice Process Instant ---------------------- */
  @Post('invoice/process/instant')
  @ApiOperation({
    summary: 'Create invoice and pay it instantly',
  })
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiOperation({
    summary: 'Create invoice and pay it instantly',
  })
  public async processInstantPayment(
    @Req() req: ICustomRequestHeaders,
    @Body() body: ProceedInstantPaymentDto,
  ) {
    // Memastikan store memiliki akses self-order
    await this.selfOrderService.storePermission(req.store_id!);

    const response = await this.invoiceService.proceedInstantPayment(req, body);
    return {
      result: toCamelCase(response),
    };
  }

  /* ---------------------- // * Invoice Process Checkout --------------------- */
  @Post('invoice/process/checkout')
  @ApiOperation({
    summary: 'Create invoice with unpaid status',
  })
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiOperation({
    summary: 'Create invoice with unpaid status',
  })
  public async processCheckout(
    @Req() req: ICustomRequestHeaders,
    @Body() body: ProceedCheckoutInvoiceDto,
  ) {
    // Memastikan store memiliki akses self-order
    await this.selfOrderService.storePermission(req.store_id!);

    const response = await this.invoiceService.proceedCheckout(req, body);
    return {
      result: toCamelCase(response),
    };
  }

  /* ----------------- // * Get invoice by ID (Detail Invoice) ---------------- */
  @Get('invoice/:invoiceId')
  @ApiOperation({
    summary: 'Get invoice by invoice ID',
  })
  public async invoiceByKey(@Param('invoiceId') invoiceId: string) {
    const response = await this.invoiceService.getInvoicePreview({
      invoiceId: invoiceId,
    });

    return {
      result: toCamelCase(response),
    };
  }

  /* -------------------------- // * Invoice Setting -------------------------- */
  @Get('invoice/setting')
  @ApiOperation({ summary: 'Get Invoice Setting' })
  public async getData(
    @Query() q: GetInvoiceSettingDto,
    @Req() req: IRequestUser,
  ) {
    const validateStore = await this.storeService.validateStore(
      q.storeId,
      req.id,
    );
    if (!validateStore) {
      throw new Error(
        'Store not found or you do not have access to this store',
      );
    }

    const response = await this.invoiceService.getInvoiceSetting(q, req.id);
    if (response.length === 0) {
      return {
        result: new SettingInvoiceDto(),
      };
    }
    return { result: response };
  }

  @Post()
  @ApiOperation({
    summary: 'Validate store and table for self-order access',
  })
  async validateStoreAndTable(@Body() body: ValidateStoreTableDto) {
    try {
      const { storeId, tablesName } = body;

      // Check if store exists and has the specified table
      const storeTable = await this.prisma.store_tables.findFirst({
        where: {
          name: tablesName,
          store_floors: {
            store_id: storeId,
          },
        },
        include: {
          store_floors: {
            include: {
              stores: true,
            },
          },
        },
      });

      if (!storeTable) {
        throw new HttpException(
          'Store or table not found',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        statusCode: 200,
        message: 'Store and table validation successful',
        result: {
          storeId: storeTable.store_floors.store_id,
          storeName: storeTable.store_floors.stores.name,
          floorName: storeTable.store_floors.floor_name,
          tableName: storeTable.name,
          tableId: storeTable.id,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Store or table not found',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /* ------------------- // * Get categories for self-order ------------------- */
  @Get('categories/all')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiOperation({
    summary: 'Get all categories',
    description:
      'Retrieve all categories from the categories table with optional search by name',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search categories by name',
    type: String,
  })
  async findAllCategory(
    @Req() req: ICustomRequestHeaders,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.categoriesService.findAllCategories(
        search,
        req,
      );
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(result),
      };
    } catch (error) {
      console.error('Error fetching all categories:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch categories',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /* ------------------- // * Get catalog products category ------------------- */
  @Get('categories/products')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiOperation({
    summary: 'Get catalog products',
    description:
      'Retrieve products from categories_has_products table related to products table',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search products by name',
    type: String,
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
    type: String,
  })
  async findCatalogProducts(
    @Req() req: ICustomRequestHeaders,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    try {
      const result = await this.categoriesService.findCatalogProducts(
        search,
        categoryId,
        req,
      );
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(result),
      };
    } catch (error) {
      console.error('Error fetching catalog products:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch catalog products',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /* ----------------------- // * Get Store Detail ----------------------- */
  @Get('store/:storeId')
  @ApiOperation({
    summary: 'Get Store Detail by ID',
  })
  async getStoreDetail(@Param('storeId') storeId: string) {
    try {
      const store = await this.storeService.getStoreDetailForSelfOrder(storeId);

      if (!store) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Store not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(store),
      };
    } catch (error) {
      console.error('Error fetching store detail:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch store detail',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
