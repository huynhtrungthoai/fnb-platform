import { RequestContext } from '../context/request-context.js';

import type { LoggerService } from '@nestjs/common';

type Level = 'log' | 'warn' | 'error' | 'debug' | 'verbose' | 'fatal';

/** One log line before formatting. */
export interface LogEntry {
  level: Level;
  time: string;
  context?: string;
  message: string;
  requestId?: string;
  userId?: string;
  stack?: string;
}

/** Where formatted lines go; tests pass a collector. */
export type LogSink = (line: string, level: Level) => void;

const defaultSink: LogSink = (line, level) => {
  const stream = level === 'error' || level === 'fatal' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
};

function toText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Application logger. Every line carries the id of the request being handled, so one request
 * can be followed through the log and matched with the `requestId` of an error response.
 * JSON lines in production (for log collectors), readable text otherwise.
 */
export class AppLogger implements LoggerService {
  constructor(
    private readonly options: { json: boolean; minLevel?: Level },
    private readonly sink: LogSink = defaultSink,
  ) {}

  log(message: unknown, ...rest: unknown[]): void {
    this.write('log', message, rest);
  }

  warn(message: unknown, ...rest: unknown[]): void {
    this.write('warn', message, rest);
  }

  error(message: unknown, ...rest: unknown[]): void {
    this.write('error', message, rest);
  }

  debug(message: unknown, ...rest: unknown[]): void {
    this.write('debug', message, rest);
  }

  verbose(message: unknown, ...rest: unknown[]): void {
    this.write('verbose', message, rest);
  }

  fatal(message: unknown, ...rest: unknown[]): void {
    this.write('fatal', message, rest);
  }

  private write(level: Level, message: unknown, rest: unknown[]): void {
    if ((level === 'debug' || level === 'verbose') && this.options.minLevel !== 'debug') {
      return;
    }
    // Nest passes the context name last; for errors the stack may come before it.
    const extras = rest.filter((item): item is string => typeof item === 'string');
    const context = extras.at(-1);
    const stack =
      message instanceof Error ? message.stack : extras.length > 1 ? extras[0] : undefined;
    const store = RequestContext.get();
    const entry: LogEntry = {
      level,
      time: new Date().toISOString(),
      ...(context ? { context } : {}),
      message: toText(message),
      ...(store?.requestId ? { requestId: store.requestId } : {}),
      ...(store?.userId ? { userId: store.userId } : {}),
      ...(stack ? { stack } : {}),
    };
    this.sink(this.options.json ? JSON.stringify(entry) : formatText(entry), level);
  }
}

function formatText(entry: LogEntry): string {
  const parts = [
    entry.time,
    entry.level.toUpperCase().padEnd(5),
    entry.context ? `[${entry.context}]` : '',
    entry.message,
    entry.requestId ? `requestId=${entry.requestId}` : '',
    entry.userId ? `userId=${entry.userId}` : '',
  ].filter((part) => part.length > 0);
  return entry.stack ? `${parts.join(' ')}\n${entry.stack}` : parts.join(' ');
}
