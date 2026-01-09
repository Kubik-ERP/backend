import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as NodeFormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { SignatureUtil } from 'src/common/utils/signature.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterBayarindDto } from './dto/create-store.dto';
import { ListBankDto } from './dto/list-bank.dto';

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

  private getTimestampWithOffset(offset: number = 7): string {
    const now = new Date();

    // 1. Hitung Waktu Target (UTC + Offset)
    const targetTime = new Date(now.getTime() + offset * 60 * 60 * 1000);

    // 2. Ambil komponen string ISO dari waktu yang sudah digeser
    const isoString = targetTime.toISOString();

    // 3. Buang milidetik dan Z
    const cleanTime = isoString.substring(0, 19);

    // 4. Format Offset String (misal: 7 jadi "+07:00")
    const sign = offset >= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset).toString().padStart(2, '0');
    const minutes = ((absOffset % 1) * 60).toString().padStart(2, '0');

    const offsetString = `${sign}${hours}:${minutes}`;
    // 5. Gabungkan
    return cleanTime + offsetString;
  }

  private getPrivateKey(): string {
    const envPath = process.env.BAYARIND_PRIVATE_KEY_PATH;

    if (!envPath) {
      throw new InternalServerErrorException(
        'ENV BAYARIND_PRIVATE_KEY_PATH belum disetting!',
      );
    }

    try {
      const keyPath = path.join(process.cwd(), envPath);

      // Cek apakah file ada
      if (!fs.existsSync(keyPath)) {
        throw new Error(`File tidak ditemukan di: ${keyPath}`);
      }

      return fs.readFileSync(keyPath, 'utf8');
    } catch (error) {
      console.error('File Read Error:', error);
      throw new InternalServerErrorException(
        `Gagal membaca Private Key: ${error.message}`,
      );
    }
  }

  async getSnapAccessToken() {
    const clientKey = process.env.BAYARIND_CLIENT_KEY!;

    // Format timestamp ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
    const timestamp = new Date().toISOString();

    // 1. Ambil isi file Private Key
    const privateKeyContent = this.getPrivateKey();

    // 2. Generate Signature pakai fungsi BARU di SignatureUtil
    const signature = SignatureUtil.generateSnapAuthSignature(
      clientKey,
      timestamp,
      privateKeyContent,
    );

    // 3. Susun Header sesuai PDF Section 3.2.1
    const headers = {
      'Content-Type': 'application/json',
      'X-TIMESTAMP': timestamp,
      'X-CLIENT-KEY': clientKey,
      'X-SIGNATURE': signature,
    };

    console.log('🚀 Requesting SNAP Access Token...');
    console.log('Headers:', headers);

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          process.env.BAYARIND_BASE_URL + '/snap/v1.0/access-token/b2b',
          {}, // Body kosong
          { headers },
        ),
      );

      console.log('✅ SNAP Token Success:', response.data);

      return {
        accessToken: response.data.accessToken,
        tokenType: response.data.tokenType,
        expiresIn: response.data.expiresIn,
      };
    } catch (error) {
      const errData = error.response?.data || error.message;
      console.error('❌ SNAP Token Failed:', errData);

      throw new InternalServerErrorException(
        'Gagal mendapatkan Access Token: ' + JSON.stringify(errData),
      );
    }
  }

  async loginBayarind(storeId: string) {
    const store = await this.prisma.stores.findUnique({
      where: { id: storeId },
    });
    if (!store || !store.bayarind_store_id) {
      throw new BadRequestException(
        'Store tidak terdaftar di Bayarind. Silakan registrasi terlebih dahulu.',
      );
    }
    // 1. Siapkan Payload
    const payload = {
      username: store.email,
      password: '123456',
    };

    const clientKey = process.env.BAYARIND_CLIENT_KEY!;
    const clientSecret = process.env.BAYARIND_CLIENT_SECRET!;
    const timestamp = this.getTimestampWithOffset(7);

    // 2. Generate Signature
    const signature = SignatureUtil.generatePOSSignature(
      clientKey,
      clientSecret,
      timestamp,
      payload,
    );

    // 3. Susun Header
    const headers = {
      'Content-Type': 'application/json',
      'X-CLIENT-KEY': clientKey,
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    console.log('Login Payload:', payload);
    console.log('Login Headers:', headers);

    try {
      // 4. Kirim Request
      const response = await lastValueFrom(
        this.httpService.post(
          process.env.BAYARIND_BASE_URL + '/acquisitor/account/login',
          payload,
          { headers },
        ),
      );

      if (response.data.status === false) {
        throw new BadRequestException(
          response.data.message || 'Login Gagal di sisi Bayar ind',
        );
      }

      if (!response.data.data || !response.data.data['access-token']) {
        throw new InternalServerErrorException(
          'Response Bayarind tidak memiliki accessToken',
        );
      }
      console.log('Login Bayarind Success:', response.data.data);

      return {
        accessToken: response.data.data['access-token'],
        storeId: store.bayarind_store_id,
      };
    } catch (error) {
      const errorData = error.response?.data || error.message;
      console.error('Bayarind API Login Error Details:', errorData);
      throw error;
    }
  }

  async registerStore(
    dto: RegisterBayarindDto,
    files: StoreFiles,
    req: ICustomRequestHeaders,
  ) {
    const { store_id } = req;
    if (!store_id) {
      throw new BadRequestException('Store ID is required');
    }
    // 1. Cek apakah Store Lokal Ada
    const store = await this.prisma.stores.findUnique({
      where: { id: store_id },
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
      where: { id: store_id },
      data: {
        bayarind_store_id: bayarindId,
      },
    });

    return {
      success: true,
      message: 'Registrasi Bayarind Berhasil',
      localStoreId: store_id,
      bayarindStoreId: bayarindId,
    };
  }

  private async callRegisterApi(
    dto: RegisterBayarindDto,
    storeData: any,
    files: StoreFiles,
  ): Promise<number> {
    const formData = new NodeFormData();

    const payloadData = {
      name: dto.ownerName,
      email: dto.ownerEmail,
      msisdn: dto.ownerPhone,
      password: '123456',
      storeName: storeData.name,
      storeAddress: storeData.address,
      businessTypeId: String(dto.bayarindBusinessTypeId),
      provinceId: String(dto.provinceId),
      cityId: String(dto.cityId),
      districtId: String(dto.districtId),
      subdistrictId: String(dto.subdistrictId),
      latitude: String(dto.latitude),
      longitude: String(dto.longitude),

      idCardNumber: dto.idCardNumber,
      birthDate: dto.birthDate,
      birthPlace: dto.birthPlace,
    };

    // 2. Masukkan ke FormData & Signature
    Object.keys(payloadData).forEach((key) => {
      const typedKey = key as keyof typeof payloadData;
      formData.append(typedKey, payloadData[typedKey]);
    });

    // 3. Append Files
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

    // --- SETUP AUTH ---
    const clientKey = process.env.BAYARIND_CLIENT_KEY!;
    const clientSecret = process.env.BAYARIND_CLIENT_SECRET!;
    const timestamp = this.getTimestampWithOffset(7);

    // 4. GENERATE SIGNATURE
    const signature = SignatureUtil.generatePOSSignature(
      clientKey,
      clientSecret,
      timestamp,
      payloadData,
    );

    const headers = {
      'X-TIMESTAMP': timestamp,
      'X-CLIENT-KEY': clientKey,
      'X-SIGNATURE': signature,
      ...formData.getHeaders(),
    };

    console.log('Sending Request to Bayarind...');
    console.log('Headers:', JSON.stringify(headers));

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          process.env.BAYARIND_BASE_URL + '/acquisitor/account/register',
          formData,
          { headers },
        ),
      );

      if (response.data.status === false) {
        console.error('Bayarind Logic Error:', response.data);
        throw new BadRequestException(
          response.data.message || 'Registrasi Gagal di sisi Bayarind',
        );
      }

      if (!response.data.data || !response.data.data.storeId) {
        throw new InternalServerErrorException(
          'Response Bayarind tidak memiliki storeId',
        );
      }

      return response.data.data.storeId;
    } catch (error) {
      const errorData = error.response?.data || error.message;
      console.error('Bayarind API Error Details:', errorData);
      throw error;
    }
  }

  // ================= MASTER DATA ================

  async getBusinessTypes(timezoneOffset: number = 7) {
    const clientKey = process.env.BAYARIND_CLIENT_KEY!;
    const clientSecret = process.env.BAYARIND_CLIENT_SECRET!;
    const timestamp = this.getTimestampWithOffset(timezoneOffset);

    // 2. Generate Signature
    const signature = SignatureUtil.generatePOSSignature(
      clientKey,
      clientSecret,
      timestamp,
      '',
    );

    const headers = {
      'Content-Type': 'application/json',
      'X-CLIENT-KEY': clientKey,
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
    };

    try {
      const response = await lastValueFrom(
        this.httpService.get(
          process.env.BAYARIND_BASE_URL + '/acquisitor/static/businesstype',
          { headers },
        ),
      );

      return response.data.data;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getProvinces(timezoneOffset: number = 7) {
    const clientKey = process.env.BAYARIND_CLIENT_KEY!;
    const clientSecret = process.env.BAYARIND_CLIENT_SECRET!;
    const timestamp = this.getTimestampWithOffset(timezoneOffset);

    // 2. Generate Signature
    const signature = SignatureUtil.generatePOSSignature(
      clientKey,
      clientSecret,
      timestamp,
      '',
    );

    const headers = {
      'Content-Type': 'application/json',
      'X-CLIENT-KEY': clientKey,
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
    };

    try {
      const response = await lastValueFrom(
        this.httpService.get(
          process.env.BAYARIND_BASE_URL + '/acquisitor/static/province',
          { headers },
        ),
      );

      return response.data.data;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getCities(timezoneOffset: number = 7, provinceId: string) {
    const clientKey = process.env.BAYARIND_CLIENT_KEY!;
    const clientSecret = process.env.BAYARIND_CLIENT_SECRET!;
    const timestamp = this.getTimestampWithOffset(timezoneOffset);

    // 2. Generate Signature
    const signature = SignatureUtil.generatePOSSignature(
      clientKey,
      clientSecret,
      timestamp,
      '',
    );

    const headers = {
      'Content-Type': 'application/json',
      'X-CLIENT-KEY': clientKey,
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
    };

    try {
      const response = await lastValueFrom(
        this.httpService.get(
          process.env.BAYARIND_BASE_URL +
            `/acquisitor/static/city/${provinceId}`,
          { headers },
        ),
      );

      return response.data.data;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getDistricts(timezoneOffset: number = 7, cityId: string) {
    const clientKey = process.env.BAYARIND_CLIENT_KEY!;
    const clientSecret = process.env.BAYARIND_CLIENT_SECRET!;
    const timestamp = this.getTimestampWithOffset(timezoneOffset);

    // 2. Generate Signature
    const signature = SignatureUtil.generatePOSSignature(
      clientKey,
      clientSecret,
      timestamp,
      '',
    );

    const headers = {
      'Content-Type': 'application/json',
      'X-CLIENT-KEY': clientKey,
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
    };

    try {
      const response = await lastValueFrom(
        this.httpService.get(
          process.env.BAYARIND_BASE_URL +
            `/acquisitor/static/district/${cityId}`,
          { headers },
        ),
      );

      return response.data.data;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getSubdistricts(timezoneOffset: number = 7, districtId: string) {
    const clientKey = process.env.BAYARIND_CLIENT_KEY!;
    const clientSecret = process.env.BAYARIND_CLIENT_SECRET!;
    const timestamp = this.getTimestampWithOffset(timezoneOffset);

    // 2. Generate Signature
    const signature = SignatureUtil.generatePOSSignature(
      clientKey,
      clientSecret,
      timestamp,
      '',
    );

    const headers = {
      'Content-Type': 'application/json',
      'X-CLIENT-KEY': clientKey,
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
    };

    try {
      const response = await lastValueFrom(
        this.httpService.get(
          process.env.BAYARIND_BASE_URL +
            `/acquisitor/static/subdistrict/${districtId}`,
          { headers },
        ),
      );

      return response.data.data;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getListBanks(dto: ListBankDto, req: ICustomRequestHeaders) {
    const { store_id } = req;
    if (!store_id) {
      throw new BadRequestException('Store ID is required');
    }
    // 1. Siapkan Payload
    const payload = {
      search: dto.search,
      page: dto.page,
      itemPerPage: dto.itemPerPage,
    };

    const clientKey = process.env.BAYARIND_CLIENT_KEY!;
    const clientSecret = process.env.BAYARIND_CLIENT_SECRET!;
    const accessToken = await this.getSnapAccessToken();
    const timestamp = this.getTimestampWithOffset(7);

    // 2. Generate Signature
    const signature = SignatureUtil.generatePOSSignature(
      clientKey,
      clientSecret,
      timestamp,
      payload,
    );

    // 3. Susun Header Sesuai Dokumen Halaman 1
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken.accessToken}`,
      'X-CLIENT-KEY': clientKey,
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
      'User-Agent': 'PostmanRuntime/7.26.8',
    };
    console.log('List Banks Payload:', payload);
    console.log('List Banks Headers:', headers);

    try {
      // 4. Kirim Request
      const response = await lastValueFrom(
        this.httpService.post(
          process.env.BAYARIND_BASE_URL + '/acquisitor/withdraw/listbank',
          payload,
          { headers },
        ),
      );

      return response.data;
    } catch (error) {
      console.error('List Bank Error:', error.response?.data || error.message);
      throw new InternalServerErrorException(
        error.response?.data?.message || error.message,
      );
    }
  }
}
