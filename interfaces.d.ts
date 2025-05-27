export {};

/**
 * @description Here's a way to extend the global interfaces.
 */
declare global {
  interface IRequestUser {
    id: number;
    email: string;
    username: string;
    phone: number;
    ext: number;
    fullname?: string;
    verified_at?: Date;
    pin?: string;
    role?: string;
  }

  interface IResultFilter {
    data: Record<string, unknown> | unknown;
    total: number;
    totalData: number;
  }

  interface IConstructBaseResponse {
    statusCode: number;
    message: string;
    data: T;
  }

  interface IConstructPageMeta {
    page: number;
    pageCount?: number;
    size: number;
    total: number;
    totalData: number;
  }

  interface ICustomRequestHeaders extends Request {
    user: IRequestUser;
  }

  interface IValidateJWTStrategy {
    sub: string;
    fullname: string;
    verified_at: Date;
    email: string;
    phone: string;
    ext: string;
    role: string;
    pin: string;

  }
}
