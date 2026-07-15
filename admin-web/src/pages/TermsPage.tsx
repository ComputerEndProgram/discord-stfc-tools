import termsMd from '../legal/terms.md?raw';
import { LegalPage } from './LegalPage';

export function TermsPage() {
	return <LegalPage title="Terms of Service" markdown={termsMd} />;
}
