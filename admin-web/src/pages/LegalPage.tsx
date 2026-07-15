import { marked } from 'marked';
import { applyLegalOperator, legalOperator } from '../legal/operator';
import { LcarsFrame, LcarsPanel } from '../lcars/LcarsFrame';
import './legal.css';

marked.setOptions({ gfm: true, breaks: false });

type Props = {
	title: string;
	markdown: string;
};

export function LegalPage({ title, markdown }: Props) {
	const html = marked.parse(applyLegalOperator(markdown), { async: false }) as string;

	return (
		<LcarsFrame
			title={title}
			eyebrow={`${legalOperator.productName} · Effective ${legalOperator.effectiveDate} · v${legalOperator.version}`}
			navTop={[
				{ label: 'Home', short: '01', to: '/', color: 5 },
				{ label: 'Privacy', short: '22', to: '/privacy', color: 6 },
			]}
			navBottom={[
				{ label: 'Terms', short: '44', to: '/terms', color: 2 },
				{ label: 'Login', short: '88', to: '/login', color: 8 },
			]}
		>
			<LcarsPanel label="Document" cap="a8">
				<article className="legal-doc" dangerouslySetInnerHTML={{ __html: html }} />
			</LcarsPanel>
			<footer className="legal-footer muted tiny">
				<p>
					Contact: {legalOperator.contact}
					{legalOperator.address &&
					legalOperator.address !== '[ADDRESS]' &&
					!legalOperator.address.startsWith('[')
						? ` · ${legalOperator.address}`
						: ''}
				</p>
			</footer>
		</LcarsFrame>
	);
}
