import privacyMd from '../legal/privacy.md?raw';
import { LegalPage } from './LegalPage';

export function PrivacyPage() {
	return <LegalPage title="Privacy Policy" markdown={privacyMd} />;
}
