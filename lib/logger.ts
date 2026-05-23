/**
 * Серверная система логирования с уровнями Development и Release
 */

export enum LogLevel {
  DEBUG = 0,    // Отладочная информация (только Development)
  INFO = 1,     // Информационные сообщения
  WARN = 2,     // Предупреждения
  ERROR = 3,    // Ошибки
}

class ServerLogger {
  private isDevelopment: boolean;
  private minLevel: LogLevel;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    return data ? `${prefix} ${message}` : `${prefix} ${message}`;
  }

  debug(message: string, data?: any) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message), data || '');
    }
  }

  info(message: string, data?: any) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message), data || '');
    }
  }

  warn(message: string, data?: any) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message), data || '');
    }
  }

  error(message: string, error?: any) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message), error || '');
    }
  }

  // Специальные методы для email
  emailSent(type: string, recipient: string) {
    this.info(`Email sent: ${type}`, { recipient });
  }

  emailError(type: string, recipient: string, error: any) {
    this.error(`Email sending failed: ${type}`, { recipient, error });
  }
}

export const logger = new ServerLogger();
