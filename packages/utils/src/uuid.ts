/**
 * UUID v7 (RFC 9562): 48-bit Unix millisecond timestamp, then random bits.
 * Ids sort by creation time and can be generated on the client (D-09), which the POS
 * outbox relies on while offline.
 */

// Declared locally so this package needs neither DOM nor Node typings. Web Crypto exists in
// browsers and in Node 24; React Native needs a `crypto.getRandomValues` polyfill.
declare const crypto: { getRandomValues<T extends Uint8Array>(array: T): T };

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MAX_SEQUENCE = 0xfff;

let lastTimestamp = -1;
let sequence = 0;

function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Generates a UUID v7. Ids created in the same millisecond by this process stay ordered:
 * the 12 bits after the version act as a counter.
 * @param now Unix time in milliseconds; only tests pass it.
 */
export function uuidv7(now: number = Date.now()): string {
  const random = crypto.getRandomValues(new Uint8Array(10));
  let timestamp = Math.max(Math.trunc(now), 0);

  if (timestamp <= lastTimestamp) {
    // Same millisecond, or the clock went backwards: keep ordering with the counter.
    timestamp = lastTimestamp;
    sequence += 1;
    if (sequence > MAX_SEQUENCE) {
      timestamp += 1;
      sequence = 0;
    }
  } else {
    // Start below half of the range so a burst rarely overflows into the next millisecond.
    sequence = (((random[0] ?? 0) << 8) | (random[1] ?? 0)) & 0x7ff;
  }
  lastTimestamp = timestamp;

  const bytes = new Uint8Array(16);
  // 48-bit timestamp, big-endian. Division is used because bit shifts are 32-bit only.
  bytes[0] = Math.floor(timestamp / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(timestamp / 2 ** 32) & 0xff;
  bytes[2] = Math.floor(timestamp / 2 ** 24) & 0xff;
  bytes[3] = Math.floor(timestamp / 2 ** 16) & 0xff;
  bytes[4] = Math.floor(timestamp / 2 ** 8) & 0xff;
  bytes[5] = timestamp & 0xff;
  // Version 7 in the high nibble, then the 12-bit counter.
  bytes[6] = 0x70 | (sequence >> 8);
  bytes[7] = sequence & 0xff;
  // Variant 10xx, then 62 random bits.
  bytes[8] = 0x80 | ((random[2] ?? 0) & 0x3f);
  for (let index = 9; index < 16; index += 1) {
    bytes[index] = random[index - 6] ?? 0;
  }

  const hex = toHex(bytes);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/** True when the value is a lower-case UUID v7 string. */
export function isUuidV7(value: unknown): value is string {
  return typeof value === 'string' && UUID_V7_PATTERN.test(value);
}

/** Reads the creation time stored in a UUID v7, or `null` when the value is not one. */
export function uuidV7ToDate(value: unknown): Date | null {
  if (!isUuidV7(value)) {
    return null;
  }
  const timestamp = Number.parseInt(value.slice(0, 8) + value.slice(9, 13), 16);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}
