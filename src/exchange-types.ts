export type ExchangeLayout = 'hub' | 'category';
export type ExchangeRequestStatus = 'open' | 'claimed' | 'completed' | 'cancelled';

export interface ExchangeResource {
	id: number;
	guild_id: string;
	name: string;
	slug: string;
	donor_role_id: string;
	recipient_role_id: string;
	channel_id: string;
	pinned_message_id: string | null;
	active: boolean;
	created_at: string;
}

export interface ExchangeRequest {
	id: number;
	resource_id: number;
	recipient_discord_user_id: string;
	status: ExchangeRequestStatus;
	claimed_by: string | null;
	claimed_at: string | null;
	created_at: string;
	updated_at: string;
}
