import { describe, expect, it } from 'vitest';
import { newSessionExpiry, openSession, sealSession, type AdminSession } from '../src/admin-api/session';

describe('admin session seal', () => {
	it('round-trips a session', async () => {
		const secret = 'test-secret-please-change';
		const session: AdminSession = {
			userId: '123',
			username: 'adam',
			globalName: 'Adam',
			avatar: null,
			accessToken: 'tok',
			exp: newSessionExpiry(),
		};
		const sealed = await sealSession(session, secret);
		const opened = await openSession(sealed, secret);
		expect(opened?.userId).toBe('123');
		expect(opened?.accessToken).toBe('tok');
	});

	it('rejects tampered payload', async () => {
		const secret = 'test-secret-please-change';
		const session: AdminSession = {
			userId: '123',
			username: 'adam',
			globalName: null,
			avatar: null,
			accessToken: 'tok',
			exp: newSessionExpiry(),
		};
		const sealed = await sealSession(session, secret);
		const bad = sealed.replace(/^../, 'xx');
		expect(await openSession(bad, secret)).toBeNull();
	});
});
