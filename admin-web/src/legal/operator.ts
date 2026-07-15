/**
 * Fill these in before Discord app verification / public launch.
 * Values are substituted into Privacy Policy and Terms pages.
 */
export const legalOperator = {
	/** Shown in titles and “who we are” */
	productName: 'STFC Tools',
	/** Legal / trading name of the operator */
	legalName: '[OPERATOR LEGAL NAME]',
	/** Privacy / ToS contact (email or form URL) */
	contact: '[CONTACT EMAIL OR FORM]',
	/** Optional postal address */
	address: '[ADDRESS]',
	/** Governing law section */
	governingLaw: '[COUNTRY / REGION]',
	venue: '[VENUE]',
	/** Liability cap wording */
	liabilityCap: '[AMOUNT, e.g. £0 / USD 0]',
	effectiveDate: '14 July 2026',
	version: '1.0',
} as const;

/** Replace bracket placeholders used in the legal markdown. */
export function applyLegalOperator(markdown: string): string {
	const o = legalOperator;
	return markdown
		.replaceAll('[OPERATOR LEGAL NAME]', o.legalName)
		.replaceAll('[CONTACT EMAIL OR FORM]', o.contact)
		.replaceAll('[ADDRESS]', o.address)
		.replaceAll('[COUNTRY / REGION]', o.governingLaw)
		.replaceAll('[VENUE]', o.venue)
		.replaceAll('[AMOUNT, e.g. £0 / USD 0]', o.liabilityCap)
		.replaceAll('STFC Tools', o.productName);
}
