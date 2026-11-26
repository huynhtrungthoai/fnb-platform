import { Controller, Get, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';

import {
  authTokensSchema,
  DEVICE_HEADER,
  deviceListQuerySchema,
  deviceSchema,
  deviceSessionSchema,
  deviceStaffSchema,
  registerDeviceSchema,
  registeredDeviceSchema,
} from '@fnb/contract';

import {
  Auth,
  Public,
  RequirePermission,
  requireBranchId,
} from '../../common/decorators/access.decorators.js';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit/rate-limit.guard.js';
import { UuidParam, ZBody, ZQuery, ZResponse } from '../../common/zod/zod.decorators.js';
import { Audited } from '../audit/audited.interceptor.js';
import { DevicesService } from './devices.service.js';

import type { AuthContext } from '../../common/decorators/access.decorators.js';
import type {
  AuthTokens,
  Device,
  DeviceListQuery,
  DeviceSessionInput,
  DeviceStaff,
  RegisterDevice,
  RegisteredDevice,
} from '@fnb/contract';

/** POS and KDS devices (CORE-30, CORE-31, CORE-33). */
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  /** Called by the POS while a manager is signed in on it; the branch comes from `X-Branch-Id`. */
  @RequirePermission('device.manage')
  @Audited('device.register')
  @ZResponse(registeredDeviceSchema, { summary: 'Register this device; token shown once' })
  @Post()
  register(
    @Auth() auth: AuthContext,
    @ZBody(registerDeviceSchema) body: RegisterDevice,
  ): Promise<RegisteredDevice> {
    return this.devices.register(auth, requireBranchId(auth), body);
  }

  @RequirePermission('device.manage', { branch: 'any' })
  @ZResponse(deviceSchema.array())
  @Get()
  list(
    @Auth() auth: AuthContext,
    @ZQuery(deviceListQuerySchema) query: DeviceListQuery,
  ): Promise<Device[]> {
    return this.devices.list(auth, query);
  }

  @RequirePermission('device.manage', { branch: 'any' })
  @Audited('device.revoke')
  @ZResponse(deviceSchema)
  @HttpCode(200)
  @Post(':id/revoke')
  revoke(@Auth() auth: AuthContext, @UuidParam() id: string): Promise<Device> {
    return this.devices.revoke(auth, id);
  }

  /** The lock screen of a device: people who can open a session on it. Needs the device token. */
  @Public()
  @ZResponse(deviceStaffSchema.array())
  @Get('staff')
  async staff(@Headers(DEVICE_HEADER) token: string | undefined): Promise<DeviceStaff[]> {
    return this.devices.staff(await this.devices.authenticate(token));
  }

  /** A staff member picks their name and types their PIN on a registered device. */
  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit('login')
  @ZResponse(authTokensSchema, { summary: 'Open a staff session on this device' })
  @HttpCode(200)
  @Post('session')
  async openSession(
    @Headers(DEVICE_HEADER) token: string | undefined,
    @ZBody(deviceSessionSchema) body: DeviceSessionInput,
  ): Promise<AuthTokens> {
    return this.devices.openSession(await this.devices.authenticate(token), body);
  }
}
