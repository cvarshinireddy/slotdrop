// DB-free: pure crypto and validation logic.
const otp = require('../src/services/otpService');
const s = require('../src/routes/schemas');

describe('otpService', () => {
  const id = '65f000000000000000000001';

  test('OTP is 6 digits and deterministic for the same booking + nonce', () => {
    const a = otp.deriveOtp(id, 'nonce-1');
    expect(a).toMatch(/^\d{6}$/);
    expect(otp.deriveOtp(id, 'nonce-1')).toBe(a);
  });

  test('different nonce or booking gives a different OTP (spot check over many nonces)', () => {
    const set = new Set(Array.from({ length: 200 }, (_, i) => otp.deriveOtp(id, `n${i}`)));
    expect(set.size).toBeGreaterThan(190); // 6-digit space: a handful of collisions at most
    expect(otp.deriveOtp(id, 'n')).not.toBe(otp.deriveOtp('65f000000000000000000002', 'n'));
  });

  test('delegate code is 6 chars from the unambiguous alphabet', () => {
    const c = otp.deriveDelegateCode(id, 'x');
    expect(c).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  test('safeEqual handles equal, unequal and different-length inputs', () => {
    expect(otp.safeEqual('123456', '123456')).toBe(true);
    expect(otp.safeEqual('123456', '123457')).toBe(false);
    expect(otp.safeEqual('123456', '12345')).toBe(false);
  });

  test('QR token round-trips, rejects tampering, and expires', () => {
    const live = { _id: id, otpExpiresAt: new Date(Date.now() + 60_000) };
    const token = otp.signQrToken(live);
    expect(otp.verifyQrToken(token)).toBe(id);
    expect(otp.verifyQrToken(`${token}x`)).toBeNull();
    expect(otp.verifyQrToken('garbage')).toBeNull();
    const dead = otp.signQrToken({ _id: id, otpExpiresAt: new Date(Date.now() - 60_000) });
    expect(otp.verifyQrToken(dead)).toBe('EXPIRED');
  });

  test('QR token is signed with the OTP secret, not the login JWT secret', () => {
    const jwt = require('jsonwebtoken');
    const loginToken = jwt.sign({ sub: id, role: 'guard' }, 'test-jwt-secret');
    expect(otp.verifyQrToken(loginToken)).toBeNull();
  });

  test('qrDataUrl renders a PNG data URL', async () => {
    expect(await otp.qrDataUrl('hello')).toMatch(/^data:image\/png;base64,/);
  });
});

describe('handover request validation', () => {
  const ok = (v) => s.handoverBody.safeParse(v).success;
  test('accepts exactly one proof method', () => {
    expect(ok({ qrToken: 'a'.repeat(30) })).toBe(true);
    expect(ok({ flat: 'A-1204', otp: '123456' })).toBe(true);
    expect(ok({ flat: 'A-1204', delegateCode: 'K7M2QX' })).toBe(true);
  });
  test('rejects ambiguous or incomplete input', () => {
    expect(ok({})).toBe(false);
    expect(ok({ otp: '123456' })).toBe(false); // no flat
    expect(ok({ flat: 'A-1204' })).toBe(false); // no proof
    expect(ok({ flat: 'A-1204', otp: '123456', delegateCode: 'K7M2QX' })).toBe(false);
    expect(ok({ flat: 'A-1204', otp: '12345' })).toBe(false);
    expect(ok({ qrToken: 'a'.repeat(30), flat: 'A-1204', otp: '123456' })).toBe(false);
  });
});
