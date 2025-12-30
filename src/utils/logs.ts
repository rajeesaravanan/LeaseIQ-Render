enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

interface LogOptions {
  level?: LogLevel;
  timestamp?: boolean;
  context?: string;
}

class Logger {
  private formatMessage(
    level: LogLevel,
    message: string,
    options?: LogOptions
  ): string {
    const timestamp = options?.timestamp !== false
      ? new Date().toISOString()
      : "";
    const context = options?.context ? `[${options.context}]` : "";
    const parts = [timestamp, level, context, message].filter(Boolean);
    return parts.join(" ");
  }

  private log(level: LogLevel, message: string, options?: LogOptions): void {
    const formattedMessage = this.formatMessage(level, message, options);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  debug(message: string, options?: LogOptions): void {
    this.log(LogLevel.DEBUG, message, options);
  }

  info(message: string, options?: LogOptions): void {
    this.log(LogLevel.INFO, message, options);
  }

  warn(message: string, options?: LogOptions): void {
    this.log(LogLevel.WARN, message, options);
  }

  error(message: string, error?: Error | unknown, options?: LogOptions): void {
    const errorMessage =
      error instanceof Error
        ? `${message}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`
        : `${message}: ${JSON.stringify(error)}`;
    this.log(LogLevel.ERROR, errorMessage, options);
  }
}

export const logger = new Logger();
export { LogLevel };
export type { LogOptions };

