import { describe, expect, it } from 'vitest';
import {
	filterCrossAllianceDonors,
	slugifyResourceName,
	buildResourcePinComponents,
	buildDonorOfferComponents,
} from '../src/exchange-service';
import type { VerifiedPlayer } from '../src/types';

function player(partial: Partial<VerifiedPlayer> & { discord_user_id: string }): VerifiedPlayer {
	return {
		id: 1,
		guild_id: 'g1',
		player_id: 1,
		player_name: 'P',
		alliance_tag: null,
		alliance_rank: null,
		ops_level: 50,
		power: null,
		grade: 5,
		stfc_pro_url: null,
		verification_status: 'active',
		personal_channel_id: null,
		verified_at: null,
		last_synced_at: null,
		...partial,
	};
}

describe('exchange helpers', () => {
	it('slugifyResourceName normalizes names', () => {
		expect(slugifyResourceName('Crystal Ore')).toBe('crystal-ore');
		expect(slugifyResourceName('  Dilithium!! ')).toBe('dilithium');
	});

	it('filterCrossAllianceDonors excludes same alliance and self', () => {
		const recipient = player({
			discord_user_id: 'r1',
			alliance_tag: 'ABC',
			player_name: 'Recip',
		});
		const donors = [
			player({ discord_user_id: 'd1', alliance_tag: 'XYZ', player_name: 'Other' }),
			player({ discord_user_id: 'd2', alliance_tag: 'abc', player_name: 'Same' }),
			player({ discord_user_id: 'r1', alliance_tag: 'XYZ', player_name: 'Self' }),
			player({ discord_user_id: 'd3', alliance_tag: null, player_name: 'NoTag' }),
		];
		const eligible = filterCrossAllianceDonors(recipient, donors);
		expect(eligible.map((p) => p.discord_user_id)).toEqual(['d1']);
	});

	it('pin components use exch: prefix and no table markup', () => {
		const rows = buildResourcePinComponents(42);
		expect(rows[0].components.map((c) => c.custom_id)).toEqual([
			'exch:donor:add:42',
			'exch:donor:rem:42',
			'exch:need:42',
			'exch:need:cancel:42',
		]);
		expect(rows[0].components).toHaveLength(4);
		const offer = buildDonorOfferComponents(9);
		expect(offer[0].components[0].custom_id).toBe('exch:help:9');
		expect(offer[0].components[1].custom_id).toBe('exch:ignore:9');
	});
});
