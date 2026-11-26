import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { MetadataScanner } from '@nestjs/core';

import type { DiscoveryService } from '@nestjs/core';

/** One HTTP endpoint of the application. */
export interface RouteInfo {
  /** Upper-case HTTP method. */
  method: string;
  /** Full path in Nest syntax, for example `/users/:id`. */
  path: string;
  controllerName: string;
  handlerName: string;
  /** The handler function; decorators store their metadata on it. */
  handler: object;
  /** The controller class; class-level decorators store their metadata on it. */
  controllerClass: object;
}

/** HTTP method names by the numeric code Nest stores in the handler metadata. */
const METHOD_NAMES = new Map<number, string>([
  [RequestMethod.GET, 'GET'],
  [RequestMethod.POST, 'POST'],
  [RequestMethod.PUT, 'PUT'],
  [RequestMethod.DELETE, 'DELETE'],
  [RequestMethod.PATCH, 'PATCH'],
]);

function toPaths(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [typeof value === 'string' ? value : ''];
}

function joinPath(prefix: string, path: string): string {
  const joined = [prefix, path]
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter((part) => part.length > 0)
    .join('/');
  return `/${joined}`;
}

/**
 * Lists every HTTP endpoint with its handler, by walking the registered controllers.
 * Used by the OpenAPI document and by `route-permissions.test.ts` (every endpoint declares access).
 */
export function exploreRoutes(discovery: DiscoveryService): RouteInfo[] {
  const scanner = new MetadataScanner();
  const routes: RouteInfo[] = [];

  for (const wrapper of discovery.getControllers()) {
    const controllerClass: unknown = wrapper.metatype;
    const instance: unknown = wrapper.instance;
    if (
      typeof controllerClass !== 'function' ||
      instance === null ||
      typeof instance !== 'object'
    ) {
      continue;
    }
    const prototype: unknown = Object.getPrototypeOf(instance);
    if (prototype === null || typeof prototype !== 'object') {
      continue;
    }
    const prefixes = toPaths(Reflect.getMetadata(PATH_METADATA, controllerClass));

    for (const handlerName of scanner.getAllMethodNames(prototype)) {
      const handler: unknown = Reflect.get(prototype, handlerName);
      if (typeof handler !== 'function') {
        continue;
      }
      const methodCode: unknown = Reflect.getMetadata(METHOD_METADATA, handler);
      if (typeof methodCode !== 'number') {
        continue;
      }
      const method = METHOD_NAMES.get(methodCode);
      if (!method) {
        continue;
      }
      for (const prefix of prefixes) {
        for (const path of toPaths(Reflect.getMetadata(PATH_METADATA, handler))) {
          routes.push({
            method,
            path: joinPath(prefix, path),
            controllerName: controllerClass.name,
            handlerName,
            handler,
            controllerClass,
          });
        }
      }
    }
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}
