import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

const STORE_HEADER = {
  name: 'X-STORE-ID',
  description: 'Store ID associated with this request',
  required: true,
  schema: { type: 'string' },
};

const BATCH_ID_PARAM = {
  name: 'id',
  description: 'Batch recipe ID',
  required: true,
};

export function CreateBatchDocs() {
  return applyDecorators(
    HttpCode(HttpStatus.CREATED),
    ApiOperation({ summary: 'Create batch cooking plan' }),
    ApiBearerAuth(),
    ApiHeader(STORE_HEADER),
    ApiResponse({ status: 201, description: 'Batch recipe created' }),
  );
}
export function StartBatchDocs() {
  return applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Start cooking batch recipe' }),
    ApiBearerAuth(),
    ApiHeader(STORE_HEADER),
    ApiParam(BATCH_ID_PARAM),
    ApiResponse({ status: 200, description: 'Batch cooking started' }),
  );
}

export function GetBatchDocs() {
  return applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Get batch cooking plans by store' }),
    ApiBearerAuth(),
    ApiHeader(STORE_HEADER),
    ApiResponse({ status: 200, description: 'Batch recipes retrieved' }),
  );
}

export function GetBatchDetailDocs() {
  return applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Get batch cooking detail' }),
    ApiBearerAuth(),
    ApiHeader(STORE_HEADER),
    ApiParam(BATCH_ID_PARAM),
    ApiResponse({ status: 200, description: 'Batch recipe detail retrieved' }),
  );
}

export function CancelBatchDocs() {
  return applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Cancel batch cooking' }),
    ApiBearerAuth(),
    ApiHeader(STORE_HEADER),
    ApiParam(BATCH_ID_PARAM),
    ApiResponse({ status: 200, description: 'Batch cooking cancelled' }),
  );
}

export function CompleteBatchDocs() {
  return applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Complete batch cooking' }),
    ApiBearerAuth(),
    ApiHeader(STORE_HEADER),
    ApiParam(BATCH_ID_PARAM),
    ApiResponse({ status: 200, description: 'Batch cooking completed' }),
  );
}

export function DeleteBatchDocs() {
  return applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Delete batch cooking plan' }),
    ApiBearerAuth(),
    ApiHeader(STORE_HEADER),
    ApiParam(BATCH_ID_PARAM),
    ApiResponse({ status: 200, description: 'Batch recipe deleted' }),
  );
}
