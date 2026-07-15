import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type GuildListItem, type MeResponse } from '../api';
import './pages.css';

export function HomePage() {
	const navigate = useNavigate();
	const [me, setMe] = useState<MeResponse | null>(null);
	const [guilds, setGuilds] = useState<GuildListItem[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		void (async () => {
			const meRes = await api<MeResponse>('/api/admin/me');
			if (meRes.status === 401) {
				navigate('/login');
				return;
			}
			if (meRes.error || !meRes.data) {
				setError(meRes.error || 'Failed to load profile');
				setLoading(false);
				return;
			}
			setMe(meRes.data);
			const gRes = await api<{ guilds: GuildListItem[] }>('/api/admin/guilds');
			if (gRes.error || !gRes.data) {
				setError(gRes.error || 'Failed to load guilds');
			} else {
				setGuilds(gRes.data.guilds);
			}
			setLoading(false);
		})();
	}, [navigate]);

	async function logout() {
		await api('/api/admin/auth/logout', { method: 'POST' });
		navigate('/login');
	}

	if (loading) {
		return (
			<div className="shell center">
				<p className="muted">Loading…</p>
			</div>
		);
	}

	return (
		<div className="shell">
			<header className="top">
				<div>
					<p className="eyebrow">STFC Tools · v{me?.bot_version}</p>
					<h1>Your guilds</h1>
				</div>
				<div className="top-actions">
					{me ? (
						<span className="muted">
							{me.user.global_name || me.user.username}
						</span>
					) : null}
					<button type="button" className="btn" onClick={() => void logout()}>
						Log out
					</button>
				</div>
			</header>
			{error ? <p className="error">{error}</p> : null}
			{guilds.length === 0 ? (
				<div className="card">
					<p>No accessible guilds. Invite the bot and run <code>/server setup</code>, or ensure you have Administrator / a web-admin role.</p>
				</div>
			) : (
				<ul className="guild-list">
					{guilds.map((g) => (
						<li key={g.id}>
							<Link className="card guild-link" to={`/guilds/${g.id}`}>
								<strong>{g.name}</strong>
								<span className="muted">
									{g.alliance_tag ? `[${g.alliance_tag}] · ` : ''}
									{g.mode} · via {g.via}
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
