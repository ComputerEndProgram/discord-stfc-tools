import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import './lcars.css';

export type LcarsNavItem = {
	label: string;
	/** Short label for narrow / mobile rail */
	short?: string;
	to?: string;
	onClick?: () => void;
	color?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 'alert';
	active?: boolean;
};

type Props = {
	title: string;
	eyebrow?: string;
	actions?: ReactNode;
	navTop?: LcarsNavItem[];
	navBottom?: LcarsNavItem[];
	children: ReactNode;
};

function colorClass(color?: LcarsNavItem['color']) {
	if (color === 'alert') return 'lcars-panel-btn--alert';
	if (color) return `lcars-panel-btn--a${color}`;
	return 'lcars-panel-btn--a3';
}

function PanelBtn({ item }: { item: LcarsNavItem }) {
	const className = `lcars-panel-btn ${colorClass(item.color)}${
		item.active ? ' lcars-panel-btn--active' : ''
	}${!(item.to || item.onClick) ? ' lcars-panel-btn--ghost' : ''}`;
	const label = (
		<>
			<span className="lcars-panel-btn__full">{item.label}</span>
			<span className="lcars-panel-btn__short">{item.short ?? item.label.slice(0, 3)}</span>
		</>
	);

	if (item.to) {
		return (
			<Link className={className} to={item.to}>
				{label}
			</Link>
		);
	}
	if (item.onClick) {
		return (
			<button type="button" className={className} onClick={item.onClick}>
				{label}
			</button>
		);
	}
	return <div className={className}>{label}</div>;
}

function MobileNav({ items }: { items: LcarsNavItem[] }) {
	const interactive = items.filter((i) => i.to || i.onClick);
	if (interactive.length === 0) return null;
	return (
		<nav className="lcars-mobile-nav" aria-label="Console navigation">
			{interactive.map((item) => {
				const className = `lcars-pill lcars-pill--sm ${colorClass(item.color).replace(
					'lcars-panel-btn',
					'lcars-pill',
				)}`;
				if (item.to) {
					return (
						<Link key={item.label} className={className} to={item.to}>
							{item.label}
						</Link>
					);
				}
				return (
					<button key={item.label} type="button" className={className} onClick={item.onClick}>
						{item.label}
					</button>
				);
			})}
		</nav>
	);
}

/**
 * LCARS console frame modeled on thelcars.com classic layout:
 * top wrap (left-frame-top + banner/bars) + bottom wrap (left-frame + content).
 */
export function LcarsFrame({
	title,
	eyebrow,
	actions,
	navTop = [],
	navBottom = [],
	children,
}: Props) {
	const top =
		navTop.length > 0
			? navTop
			: [
					{ label: 'STFC', short: '01', color: 5 as const },
					{ label: 'Tools', short: '22', color: 6 as const },
				];
	const bot =
		navBottom.length > 0
			? navBottom
			: [
					{ label: '04-881', short: '04', color: 2 as const },
					{ label: '44-019', short: '44', color: 1 as const },
				];

	return (
		<div className="lcars-screen">
			{/* Top wrap: elbow + title + divider bars */}
			<div className="lcars-wrap lcars-wrap--top">
				<aside className="lcars-left-top" aria-label="Primary navigation">
					{top.map((item) => (
						<PanelBtn key={item.label} item={item} />
					))}
				</aside>
				<div className="lcars-right-top">
					{eyebrow ? <p className="lcars-eyebrow">{eyebrow}</p> : null}
					<div className="lcars-title-row">
						<h1 className="lcars-title">{title}</h1>
						{actions ? <div className="lcars-title-actions">{actions}</div> : null}
					</div>
					<div className="lcars-bar-row" aria-hidden="true">
						<span className="lcars-bar lcars-bar--1" />
						<span className="lcars-bar lcars-bar--2" />
						<span className="lcars-bar lcars-bar--3" />
						<span className="lcars-bar lcars-bar--4" />
						<span className="lcars-bar lcars-bar--5" />
					</div>
				</div>
			</div>

			{/* Bottom wrap: lower rail + main content */}
			<div className="lcars-wrap lcars-wrap--bot">
				<aside className="lcars-left-bot" aria-label="Secondary navigation">
					{bot.map((item) => (
						<PanelBtn key={item.label} item={item} />
					))}
					<div className="lcars-panel-spacer" aria-hidden="true" />
				</aside>
				<main className="lcars-right-main">
					<div className="lcars-bar-row lcars-bar-row--lower" aria-hidden="true">
						<span className="lcars-bar lcars-bar--6" />
						<span className="lcars-bar lcars-bar--7" />
						<span className="lcars-bar lcars-bar--8" />
						<span className="lcars-bar lcars-bar--9" />
						<span className="lcars-bar lcars-bar--10" />
					</div>
					<MobileNav items={[...top, ...bot]} />
					<div className="lcars-content">{children}</div>
				</main>
			</div>
		</div>
	);
}

type PanelProps = {
	label: string;
	cap?: 'a1' | 'a2' | 'a5' | 'a6' | 'a8';
	children: ReactNode;
};

export function LcarsPanel({ label, cap = 'a1', children }: PanelProps) {
	return (
		<section className="lcars-panel">
			<div className={`lcars-text-bar lcars-text-bar--${cap}`}>{label}</div>
			<div className="lcars-panel-body">{children}</div>
		</section>
	);
}
