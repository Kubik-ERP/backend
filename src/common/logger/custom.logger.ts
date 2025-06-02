// logger/custom-logger.service.ts
import { ConsoleLogger, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CustomLogger extends ConsoleLogger {
  private getLogPath(): string {
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logsDir = path.join(__dirname, '../../logs');

    // Buat folder jika belum ada
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    return path.join(logsDir, `app-${dateStr}.log`);
  }

  private writeToFile(message: string) {
    const logPath = this.getLogPath();
    fs.appendFileSync(logPath, message + '\n', { encoding: 'utf8' });
  }

  log(message: any, context?: string) {
    super.log(message, context);
    this.writeToFile(
      `[LOG] ${new Date().toISOString()} [${context ?? 'App'}] ${message}`,
    );
  }

  error(message: any, trace?: string, context?: string) {
    super.error(message, trace, context);
    this.writeToFile(
      `[ERROR] ${new Date().toISOString()} [${context ?? 'App'}] ${message}\n${trace}`,
    );
  }

  warn(message: any, context?: string) {
    super.warn(message, context);
    this.writeToFile(
      `[WARN] ${new Date().toISOString()} [${context ?? 'App'}] ${message}`,
    );
  }

  debug(message: any, context?: string) {
    super.debug(message, context);
    this.writeToFile(
      `[DEBUG] ${new Date().toISOString()} [${context ?? 'App'}] ${message}`,
    );
  }

  verbose(message: any, context?: string) {
    super.verbose(message, context);
    this.writeToFile(
      `[VERBOSE] ${new Date().toISOString()} [${context ?? 'App'}] ${message}`,
    );
  }
}
