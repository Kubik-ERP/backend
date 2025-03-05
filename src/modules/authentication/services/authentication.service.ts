// Bcrypt
import * as bcrypt from 'bcrypt';

// Constants
import { SALT_OR_ROUND } from '../../../common/constants/common.constant';

// DTOs
import { RegisterEmailDto } from '../dtos/register.dto';

// Entities
import { UsersEntity } from '../../users/entities/users.entity';

// Interfaces
import { ILogin } from '../interfaces/authentication.interface';

// NestJS Libraries
import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Services
import { UsersService } from '../../users/services/users.service';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly _usersService: UsersService,
    private readonly _jwtService: JwtService,
  ) {}

  /**
   * @description Handle business logic for validating a user
   */
  public async validateUser(
    username: string,
    pass: string,
  ): Promise<UsersEntity | null> {
    try {
      const user = await this._usersService.findOneByUsername(username);
      const isMatch = await bcrypt.compare(`${pass}`, user!.password);

      if (!isMatch) {
        throw new BadRequestException('Bad Request', {
          cause: new Error(),
          description: 'Invalid password',
        });
      }

      return user;
    } catch (error) {
      throw new BadRequestException('Bad Request', {
        cause: new Error(),
        description: error.response ? error?.response?.error : error.message,
      });
    }
  }

  /**
   * @description Handle business logic for logging in a user
   */
  public async login(user: IRequestUser): Promise<ILogin> {
    const payload = { username: user.username, sub: user.id };

    return {
      accessToken: this._jwtService.sign(payload),
    };
  }

  /**
   * @description Handle business logic for registering a user
   */
  public async register(payload: RegisterEmailDto): Promise<UsersEntity> {
    try {
      const { email, username, password } = payload;
      const emailExists = await this._usersService.findOneByEmail(email);

      if (emailExists) {
        throw new BadRequestException(`Bad Request`, {
          cause: new Error(),
          description: 'Users with email ${email} already exists',
        });
      }

      /**
       * Hash Password
       */
      const passwordHashed = await bcrypt.hash(password, SALT_OR_ROUND);

      return await this._usersService.create({
        email,
        username,
        password: passwordHashed,
      });
    } catch (error) {
      throw new BadRequestException(error.response.message, {
        cause: new Error(),
        description: error.response ? error?.response?.error : error.message,
      });
    }
  }
}
