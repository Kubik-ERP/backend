// Bcrypt
import * as bcrypt from 'bcrypt';

// DTOs
import { RegisterEmailDto } from '../dtos/register.dto';

// Entities
import { users as UserModel } from '@prisma/client';

// Modules
import { JwtConfigModule } from '../../../configurations/jwt/jwt-configuration.module';

// NestJS Libraries
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';

// Services
import { AuthenticationService } from './authentication.service';
import { UsersService } from '../../users/services/users.service';

const expectedValue = {
  username: 'name #1',
  created_at: 123123123,
  email: 'email #1',
  id: 1,
  password: 'password',
  updated_at: 123123123,
} as UserModel;

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let userService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtConfigModule,
        PassportModule,
        JwtModule.register({
          secretOrPrivateKey: 'secret',
          signOptions: {
            expiresIn: 3600,
          },
        }),
      ],
      providers: [
        AuthenticationService,
        {
          provide: UsersService,
          useValue: {
            findOneByEmail: jest.fn().mockImplementation((id: string) =>
              Promise.resolve({
                email: 'email #1',
                username: 'name #1',
                id,
              }),
            ),
            findOneByUsername: jest.fn().mockImplementation((id: string) =>
              Promise.resolve({
                email: 'email #1',
                username: 'name #1',
                id,
              }),
            ),
            create: jest
              .fn()
              .mockImplementation((user: UsersService) =>
                Promise.resolve({ id: '1', ...user }),
              ),
          },
        },
      ],
    }).compile();

    userService = module.get<UsersService>(UsersService);
    service = module.get<AuthenticationService>(AuthenticationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return bad request invalid credentials when user not found', async () => {
      const username = 'username';
      const password = 'secret';

      jest
        .spyOn(userService, 'findOneByUsername')
        .mockResolvedValue(expectedValue);

      // Expecting a bad request error when user not found
      try {
        await service.validateUser(username, password);
      } catch (error) {
        expect(error.message).toBe('Invalid credentials');
      }
    });

    it('should return bad request invalid credentials when password invalid', async () => {
      const username = 'username';
      const password = 'secret';

      // Mocking bcrypt.compare to return false
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation((data: string, hash: string) => {
          return Promise.resolve(false); // Simulate password mismatch
        });

      // Expecting a bad request error when password invalid
      try {
        await service.validateUser(username, password);
      } catch (error) {
        expect(error.message).toBe('Invalid credentials');
      }
    });

    it('should return a user', async () => {
      const username = 'username';
      const password = 'secret';

      jest.spyOn(bcrypt, 'compare').mockImplementation(() => true);

      expect(await service.validateUser(username, password)).toHaveProperty(
        'id',
      );
    });
  });

  describe('login', () => {
    it('should return a accessToken', async () => {
      const request = {
        user: {
          id: 1,
          name: 'user name',
          email: 'email@test.com',
          username: 'username',
        },
      };

      expect(await service.login(request.user)).toHaveProperty('accessToken');
    });
  });

  describe('register', () => {
    it('should return error email exists', async () => {
      const body = new RegisterEmailDto();
      body.username = 'user name';
      body.email = 'email@test.com';
      body.password = 'secret';

      try {
        await service.register(body);
      } catch (error) {
        expect(error.message).toBe(
          'Users with email email@test.com already exists',
        );
      }
    });
  });
});
