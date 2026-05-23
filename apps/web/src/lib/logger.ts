/**
 * Система логирования с уровнями Development и Release
 */

export enum LogLevel {
  DEBUG = 0,    // Отладочная информация (только Development)
  INFO = 1,     // Информационные сообщения
  WARN = 2,     // Предупреждения
  ERROR = 3,    // Ошибки
}

class Logger {
  private readonly isDevelopment: boolean;
  private readonly minLevel: LogLevel;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    return `${prefix} ${message}`;
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

  // Специальные методы для конкретных сценариев
  apiRequest(method: string, url: string, data?: any) {
    this.debug(`API Request: ${method} ${url}`, data);
  }

  apiResponse(status: number, url: string, data?: any) {
    if (status >= 400) {
      this.error(`API Response Error: ${status} ${url}`, data);
    } else {
      this.debug(`API Response: ${status} ${url}`, data);
    }
  }

  authEvent(event: string, details?: any) {
    this.info(`Auth Event: ${event}`, details);
  }

  authError(event: string, error: any) {
    this.error(`Auth Error: ${event}`, error);
  }
}

export const logger = new Logger();
