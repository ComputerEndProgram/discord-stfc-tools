import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './pages.css';

export function LoginPage() {
	const [params] = useSearchParams();
	const error = params.get('error');

	const apiBase = useMemo(
		() => (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '') || '(set VITE_API_BASE_URL)',
		[],
	);

	function startLogin() {
		const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
		if (!base) {
			alert('Set VITE_API_BASE_URL to your Worker URL (see admin-web/.env.example)');
			return;
		}
		window.location.href = `${base}/api/admin/auth/login?redirect=1`;
	}

	return (
		<div className="shell center">
			<div className="card login-card">
				<p className="eyebrow">STFC Tools</p>
				<h1>Admin console</h1>
				<p className="muted">
					Sign in with Discord. You will see guilds where you are an Administrator or hold a
					configured web-admin role.
				</p>
				{error ? <p className="error">Login failed: {error}</p> : null}
				<button type="button" className="btn primary" onClick={startLogin}>
					Continue with Discord
				</button>
				<p className="tiny muted">API: {apiBase}</p>
				<p className="tiny muted">
					Slash commands still work in Discord — this UI is an addition.
				</p>
				<p className="landing-links" style={{ marginTop: '1rem' }}>
					<Link to="/privacy">Privacy</Link>
					<span className="muted">·</span>
					<Link to="/terms">Terms</Link>
					<span className="muted">·</span>
					<Link to="/">Home</Link>
				</p>
			</div>
		</div>
	);
}
