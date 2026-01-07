import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as FormData from 'form-data';
import { lastValueFrom } from 'rxjs';
import { SignatureUtil } from 'src/common/utils/signature.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterBayarindDto } from './dto/create-store.dto';

export interface StoreFiles {
  idCardImage?: Express.Multer.File[];
  businessImage?: Express.Multer.File[];
  selfie?: Express.Multer.File[];
}

@Injectable()
export class BayarindService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async registerStore(dto: RegisterBayarindDto, files: StoreFiles) {
    // 1. Cek apakah Store Lokal Ada
    const store = await this.prisma.stores.findUnique({
      where: { id: dto.storeId },
    });

    if (!store) {
      throw new NotFoundException('Store ID tidak ditemukan di database lokal');
    }

    if (store.bayarind_store_id) {
      throw new BadRequestException('Toko ini sudah terdaftar di Bayarind');
    }

    // 2. Validasi File
    if (
      !files.idCardImage?.[0] ||
      !files.businessImage?.[0] ||
      !files.selfie?.[0]
    ) {
      throw new BadRequestException(
        'Dokumen (KTP, Foto Usaha, Selfie) wajib diupload',
      );
    }

    // 3. Call API Bayarind
    let bayarindId: number;
    try {
      bayarindId = await this.callRegisterApi(dto, store, files);
    } catch (error) {
      console.error(
        'Bayarind API Error:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        `Gagal Register ke Bayarind: ${error.response?.data?.message || error.message}`,
      );
    }

    // 4. UPDATE STORE LOKAL
    await this.prisma.stores.update({
      where: { id: dto.storeId },
      data: {
        bayarind_store_id: bayarindId,
      },
    });

    return {
      success: true,
      message: 'Registrasi Bayarind Berhasil',
      localStoreId: dto.storeId,
      bayarindStoreId: bayarindId,
    };
  }

  // --- Helper Call API ---
  private async callRegisterApi(
    dto: RegisterBayarindDto,
    storeData: any,
    files: StoreFiles,
  ): Promise<number> {
    const formData = new FormData();

    formData.append('name', dto.ownerName);
    formData.append('email', dto.ownerEmail);
    formData.append('msisdn', dto.ownerPhone);
    formData.append('password', '123456');
    formData.append('storeName', storeData.name);
    formData.append('storeAddress', storeData.address);

    // Data Bayarind
    formData.append('businessTypeId', dto.bayarindBusinessTypeId);
    formData.append('provinceId', dto.provinceId);
    formData.append('cityId', dto.cityId);
    formData.append('districtId', dto.districtId);
    formData.append('subdistrictId', dto.subdistrictId);
    formData.append('latitude', dto.latitude);
    formData.append('longitude', dto.longitude);
    formData.append('idCardNumber', dto.idCardNumber);
    formData.append('birthDate', dto.birthDate);
    formData.append('birthPlace', dto.birthPlace);

    // Files
    const appendFile = (
      field: string,
      file: Express.Multer.File | undefined,
    ) => {
      if (file) {
        formData.append(field, file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      }
    };

    appendFile('idCardImage', files.idCardImage?.[0]);
    appendFile('businessImage', files.businessImage?.[0]);
    appendFile('selfie', files.selfie?.[0]);

    // Headers & Signature
    const timestamp = new Date().toISOString();
    const clientKey = process.env.BAYARIND_CLIENT_KEY!;
    const signature = SignatureUtil.generateAuthSignature(clientKey, timestamp);

    const headers = {
      'X-TIMESTAMP': timestamp,
      'X-CLIENT-KEY': clientKey,
      'X-SIGNATURE': signature,
      ...formData.getHeaders(),
    };

    const response = await lastValueFrom(
      this.httpService.post(
        process.env.BAYARIND_BASE_URL + '/acquisitor/account/register',
        formData,
        { headers },
      ),
    );

    return response.data.data.storeId;
  }
}
