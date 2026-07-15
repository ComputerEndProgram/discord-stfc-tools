const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function api<T>(
	path: string,
	init: RequestInit = {},
): Promise<{ data?: T; error?: string; status: number }> {
	const url = `${API_BASE}${path}`;
	const res = await fetch(url, {
		...init,
		credentials: 'include',
		headers: {
			...(init.body ? { 'Content-Type': 'application/json' } : {}),
			...init.headers,
		},
	});
	let body: unknown = null;
	const text = await res.text();
	try {
		body = text ? JSON.parse(text) : null;
	} catch {
		body = { error: text };
	}
	if (!res.ok) {
		const err =
			body && typeof body === 'object' && 'error' in body
				? String((body as { error: unknown }).error)
				: res.statusText;
		return { error: err, status: res.status };
	}
	return { data: body as T, status: res.status };
}

export type MeResponse = {
	user: { id: string; username: string; global_name: string | null; avatar: string | null };
	bot_version: string;
};

export type GuildListItem = {
	id: string;
	name: string;
	icon: string | null;
	alliance_tag: string | null;
	mode: string;
	via: string;
};

export type GuildStatus = {
	guild_id: string;
	bot_version: string;
	config: Record<string, unknown>;
	stats: {
		verified_total: number;
		by_grade: Array<{ grade: number; count: number }>;
		by_status: Array<{ verification_status: string; count: number }>;
		by_alliance: Array<{ alliance_tag: string; count: number }>;
	};
	gateway: { ready?: boolean; lastEventAt?: string | null } | null;
};
