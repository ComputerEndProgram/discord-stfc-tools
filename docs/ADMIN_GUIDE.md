# Discord admin guide — STFC Tools

How to configure the bot **inside Discord** after it is deployed. For Cloudflare/Worker install steps, see [SETUP.md](../SETUP.md).

You need the **Administrator** permission in the Discord server for `/server` commands.

---

## Before you start

1. Invite the bot with: **Manage Roles**, **Manage Channels**, **Manage Nicknames**, **Send Messages**, **Attach Files**, **Embed Links**.
2. In **Server Settings → Roles**, drag the bot’s role **above** every role it will assign (member, guest, rank roles, overlays).
3. The bot **cannot rename the server owner** (Discord limitation). Nicknames still work for other members.
4. Members must allow DMs from server members for the join/DM verification flow.

Confirm the bot is live:

```
/server gateway
/server status
```

---

## 1. Core setup — `/server setup`

Run once (or again to change settings):

```
/server setup
  server:108
  region:EU
  mode:single_alliance
  alliance_tag:KWSN
  guest_role:@Guest
  member_roles:@Member
  create_missing_roles:true
  operative_roles:@Operative
  agent_roles:@Agent
  premier_roles:@Premier
  commodore_roles:@Commodore
  admiral_roles:@Admiral
  nickname_template:
```

| Option | Required | Description |
|--------|----------|-------------|
| `server` | Yes | STFC server number |
| `region` | No | `US` or `EU` (default US) |
| `mode` | No | `single_alliance` or `multi_alliance` |
| `alliance_tag` | Yes if single | Expected alliance tag; mismatches get guest role |
| `guest_role` | No | Role for wrong-alliance / guest members |
| `member_roles` | No | Base roles granted when alliance matches |
| `create_missing_roles` | No | Create roles by name if they do not exist |
| `operative_roles` … `admiral_roles` | No | Extra roles by in-game alliance rank |
| `nickname_template` | No | Nick pattern (see below). Empty = mode default |

Role fields accept **IDs**, **@mentions**, or **names** (with `create_missing_roles`).

### Modes

| Mode | Behaviour |
|------|-----------|
| `single_alliance` | Tag must match `alliance_tag`. Else guest role + periodic re-check. Personal channels can auto-create. |
| `multi_alliance` | Any alliance verifies as active. No guest gating. Personal auto-create is off (link existing channels instead). |

Check config anytime:

```
/server status
```

---

## 2. Nicknames

On verify (and daily sync), the bot sets the member’s nick from a template.

### Defaults (when `nickname_template` is unset)

| Mode | Pattern | Example |
|------|---------|---------|
| Single alliance | `{rank_prefix}{player_name}` | `[Admiral] Halcynicon` or `Halcynicon` |
| Multi alliance | `[{alliance_tag}]{rank_paren} {player_name}` | `[KWSN] (Admiral) Halcynicon` |

`{rank_prefix}` is `[Premier] ` / `[Commodore] ` / `[Admiral] ` only (empty for Operative/Agent).  
`{rank_paren}` is ` (Rank)` when rank is known.

### Custom template

```
/server setup … nickname_template:[{alliance_tag}] {player_name}
```

| Placeholder | Meaning |
|-------------|---------|
| `{player_name}` | In-game name |
| `{alliance_tag}` | Alliance tag (no brackets) |
| `{rank}` | Full rank or empty |
| `{rank_prefix}` | `[Admiral] ` style for leadership ranks |
| `{rank_paren}` | ` (Admiral)` when rank known |

Nicks are truncated to Discord’s **32** character limit.

---

## 3. Rank roles and overlay buckets

### Per-rank roles

Set on `/server setup` (`operative_roles`, `agent_roles`, …). On verify, the bot grants **member_roles** plus the matching rank roles.

Preview without changing anything:

```
/server rank-roles rank:Admiral
```

### Overlay buckets (e.g. leadership)

Extra roles for a set of ranks:

```
/server bucket name:leadership ranks:Premier,Commodore,Admiral role_ids:@Officer,@Diplomat create_if_missing:true
```

List roles / IDs:

```
/server roles
```

---

## 4. Verification log channel (admin archive)

Posts a **summary + screenshot** to a staff-only channel on each successful verify (active or guest). Screenshots are still stored in R2 when configured; the log channel is for day-to-day review without digging in storage.

### Create a private log channel

```
/server channels log create:true
```

Optional: `name:verification-archive`

Permissions applied:

- `@everyone` — cannot view
- Bot — can view / send / attach
- Roles from `/server channels extra-roles` — can view / send

### Use an existing staff channel

```
/server channels log channel:#staff-verify-log
```

Ensure the bot can **View Channel**, **Send Messages**, **Embed Links**, and **Attach Files** there.

### Disable

```
/server channels log clear:true
```

---

## 5. Personal / member channels

### Auto-create (single-alliance)

Buckets use the **first letter** of the in-game name (`A`–`Z`). Names starting with a digit or symbol go in `#` (non-alphabetic), always at the end of the alphabet (e.g. range `N-#`).

**Recommended:** let the bot plan and apply categories (handles Discord’s ~50 channels/category limit):

```
/server channels plan
/server channels rebalance apply:true
```

That creates/renames categories like `Member Channels A-M` / `Member Channels N-#`, updates the map, and moves linked member channels.

The planner splits **fairly evenly** under the soft limit (50 players → two ~25 buckets, not 45+5). Re-run when occupancy nears the limit (`/server channels status` shows counts).

| Option | Default | Description |
|--------|---------|-------------|
| `soft_limit` | `45` | Target max channels per category (headroom under Discord’s 50) |
| `name_template` | `Member Channels {range}` | Category name; `{range}` → `A-M`, `N-#`, etc. |
| `rename_categories` | `true` | Rename existing mapped categories to match new ranges |
| `create_categories` | `true` | Create extra categories when more buckets are needed |
| `create_missing` | `false` | Create personal channels for verified players who have none |
| `archive_unlinked` | `true` | Move text channels in member categories that are **not** linked to any player into the archive |
| `archive_category` | — | Existing Discord category to use as archive |
| `archive_name` | `Member Channels Archive` | Find or create archive category by name |
| `apply` | `false` | Preview only unless `true` |

**Workflow for an existing server:**

1. Verify players (`/verify` or `/server verify`).
2. `/server channels link` for members who already have a channel (rebalance will **not** guess links by name).
3. `/server channels plan` — review suggested ranges, missing channels, and unlinked channels.
4. `/server channels rebalance apply:true create_missing:true` — splits categories, creates missing channels, moves linked ones, archives unlinked ones.

**Manual map** (if you prefer to create categories yourself):

```
/server categories
/server channels map category_map:A-M=111...,N-#=222...
```

Or one range at a time: `range:A-M` + `category_id:…`.

Roles that can see **all** personal channels (officers, diplomats):

```
/server channels extra-roles roles:@Officer,@Diplomat
```

On verify, the bot creates a private channel for the member in the matching category (name slug from player name), with access for the member + extra-roles.

Clear mappings (disables auto-create):

```
/server channels map clear:true
```

### Link existing channels (any mode)

If the server already has member or diplomacy channels, **do not recreate them** — link them:

```
/server channels link channel:#halcynicon player:Halcynicon
```

```
/server channels link channel:#kwsn-diplomacy player:301268920
```

```
/server channels link channel:#some-channel user:@Member
```

| Option | Description |
|--------|-------------|
| `channel` | Existing text channel (required) |
| `player` | In-game name, STFC player ID, or Discord snowflake |
| `user` | Discord member (alternative to `player`) |
| `apply_permissions` | Default `true` — rewrite perms for member + extra-roles. Set `false` to only store the link and leave existing permissions alone |

Examples for an existing framework:

```
/server channels link channel:#adam-diplomacy player:Adam apply_permissions:false
```

Status:

```
/server channels status
```

---

## 5b. Diplomacy channels (multi-alliance)

One shared text channel **per alliance tag** (not per player). Typical use: everyone can **see** the channel; only leadership ranks and/or a Diplomat role can **write**.

Discord cannot gate on in-game rank directly — write access uses the Discord roles assigned for those ranks (`commodore_roles` / `admiral_roles` from `/server setup`) plus any `write_roles` you configure.

### Configure

```
/server channels diplomacy
  enable:true
  everyone_can_view:true
  write_roles:Diplomat
  write_ranks:Commodore,Admiral
  category:#Diplomacy
  name_template:diplomacy-{tag}
```

| Option | Meaning |
|--------|---------|
| `enable` | Turn feature on and save options |
| `disable` | Stop auto-create (keeps linked channels) |
| `everyone_can_view` | `@everyone` can view; send still denied (default true) |
| `view_roles` | Extra viewer roles (especially if everyone cannot view) |
| `write_roles` | Roles that can send (e.g. Diplomat) — created by name if missing |
| `write_ranks` | In-game ranks whose Discord rank roles may write |
| `category` | Parent category for newly created channels |
| `name_template` | Channel name; `{tag}` → alliance tag (default `diplomacy-{tag}`) |

### Create for a tag

```
/server channels diplomacy create_tag:KWSN
```

Also happens automatically on verify/sync in **multi_alliance** mode when diplomacy is enabled and the player has an alliance tag.

### Adopt an existing channel

```
/server channels diplomacy link_tag:KWSN channel:#kwsn-diplo
/server channels diplomacy link_tag:KWSN channel:#kwsn-diplo apply_permissions:false
```

### Status

```
/server channels diplomacy
```

(with no action options) prints the current diplomacy config and tag→channel map.

---

## 6. Member verification flow

### What members do

1. Join the server → bot DMs them (if DMs allowed), **or**
2. Admin runs `/server test-invite`, **or**
3. Member runs `/verify link:https://stfc.pro/players/…` (optional screenshot attachment)

DM flow: screenshot (optional depending on policy) → stfc.pro link → roles / nick / channel / log post.

### Manual verify (existing servers)

Admins can link a Discord member to an stfc.pro profile **without** the DM flow — useful when onboarding a server that already has members:

```
/server verify user:@Them link:https://stfc.pro/players/…
/server verify user:@Them link:https://stfc.pro/players/… screenshot:<file>
```

This runs the same pipeline as self-verify (roles, nickname template, personal/diplomacy channels, verification log). The log embed notes `Manual by @Admin`. Repeat once per member; alliance guest rules still apply in single-alliance mode.

Requires Administrator. Set the archive channel first (`/server channels log`) so staff can audit these posts.

### Admin testing

```
/server test-invite              # DM yourself
/server test-invite user:@Them
/verify link:https://stfc.pro/players/…
/server test-reset               # clear your record to re-test
/server test-reset user:@Them
```

### Guest re-check (single-alliance)

Wrong alliance → guest role. Cron re-checks periodically; when the tag matches, they are promoted like a normal verify.

---

## 7. Resource exchange (`/exchange`)

Cross-alliance resource matching (best for **multi_alliance**). Same-alliance donors are never notified. Verified players only.

### Setup (admin)

Two layouts:

| Layout | Behaviour |
|--------|-----------|
| **hub** | One channel; each resource gets a **pinned** post with buttons |
| **category** | One text channel **per resource** under a category; each pinned |

```
/exchange setup layout:hub channel:#resource-exchange
/exchange setup layout:category create_category:true category_name:Resource Exchange
/exchange setup admin_roles:Officer
```

Bot role must sit **above** the Donor / Need roles it creates.

### Resources

```
/exchange resource create name:Crystal
/exchange resource list
/exchange resource disable name:Crystal
```

Creates Discord roles `{Name} Donor` and `{Name} Need`, posts + pins **Register as donor** / **Stop donating** / **I need this** / **I no longer need this**.

### Player flow

1. Donor registers (button or `/exchange donate resource:Crystal`)
2. Recipient taps **I need this** (or `/exchange need`) → eligible donors get a DM (name + ops) with **Help** / **Ignore**
3. First **Help** wins → recipient gets donor details + **Completed** / **Ask again**
4. **Ask again** re-notifies current cross-alliance donors
5. **I no longer need this** cancels an open/claimed request (e.g. resolved offline); notifies the claimer if someone had claimed Help

Same-alliance donors are **never** notified (tags compared case-insensitively).

Slash `donate` / `need` / `undonate` must be run in that resource’s channel (hub or dedicated).

---

## 8. Surveys & polls (`/survey`)

Button surveys for verified players (DM or personal channel). Votes land in a **private** log channel (default `#survey-{id}`). Results use ASCII tables (buttons stay on the message — never inside tables).

### Who can create

| Setting | Default |
|---------|---------|
| Creators | **Administrators** only |
| Log / results viewers | Survey creator + creator roles + Administrators |
| Log channel name | `survey-{id}` |

```
/survey creators                          # show current settings
/survey creators roles:Officer,Leadership
/survey creators results_roles:Officer
/survey creators log_name:poll-{id}
/survey creators create_category:true category_name:Surveys
/survey creators category:#ExistingCategory
/survey creators clear_category:true
```

Use role IDs or `<@&id>` mentions, comma-separated. Empty `roles` clears back to admins-only.

**Log channels are private:** `@everyone` cannot see them. Access is granted to the bot, the member who created the survey, configured **creator** roles, and **results_roles**. Discord Administrators can still see them via admin override.

**Category:** New survey logs go under the configured **server default** category (if set). Override per survey with `/survey create … log_category:#Events`. `create_category:true` makes a private default category (name `Surveys` unless `category_name` is set). Does not move already-created channels.

`log_name` uses `{id}` (or `{n}`) for the survey number — e.g. `event-feedback-{id}` → `#event-feedback-12`. Applies to **new** surveys only (rename `#survey-1` manually in Discord if you want).

Empty `log_name` resets to `survey-{id}`.

### Create → test → send

```
/survey create question:"Ready for the event?" options:Yes|No|Maybe target:grade grades:5,6
```

| Option | Purpose |
|--------|---------|
| `question` | Shown to players |
| `options` | `A\|B\|C` — **2–5** answers (Discord button limit) |
| `target` | `all` · `role` · `rank` · `level` · `grade` · `users` |
| `delivery` | `dm` (default) or `personal_channel` (falls back to DM) |
| `grades` / `ranks` / `roles` / `users` / `ops_min` / `ops_max` | Filters for the chosen `target` |
| `alliance_tags` | Optional extra filter (comma-separated tags) |
| `log_category` | Optional category for **this** survey’s log channel (else server default from `/survey creators`) |

After create you get an ephemeral draft with buttons:

1. **Test to me** — DM yourself (draft clicks are **not** counted)
2. **Approve & send** — creates private log channel (name from `log_name` template), DMs/posts buttons to matched players, logs each vote
3. **Cancel** — deletes the draft

### Results & close

```
/survey list
/survey results id:12
/survey close id:12
```

`/survey results` shows a **Summary** vote table and a **Who voted** table.

---

## 9. Other `/server` commands

| Command | Purpose |
|---------|---------|
| `/server status` | Full config summary |
| `/server gateway` | Gateway WebSocket health |
| `/server roles` | List Discord roles + IDs |
| `/server categories` | List categories + IDs |
| `/server rank-roles` | Preview roles for a rank |
| `/server bucket` | Configure overlay buckets |
| `/server channels …` | Personal channels + verification log |

---

## 10. Utility commands (everyone)

| Command | Purpose |
|---------|---------|
| `/player` | Live stfc.pro lookup (needs `/server setup`) |
| `/lookup` | Coordinate share-string lookup |
| `/table` / `/tablehelp` | CSV → ASCII table |
| `/survey …` | Surveys / polls (creator roles; see §8) |
| `/exchange …` | Resource exchange (see §7) |

---

## 11. Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| Roles not assigned | Bot role **above** target roles; bot has Manage Roles |
| Nickname fails (403) | Manage Nicknames; bot role above member; **owner cannot be renamed** |
| No verification DM | Member privacy (allow DMs); `/server gateway` Ready; bot token secret set |
| “Server not configured” | Run `/server setup` |
| Log channel silent | `/server channels log` set; bot can attach files; redeploy after feature add |
| Personal channel not created | Single-alliance + category map set; check `/server channels status` |
| Diplomacy channel not created | Multi-alliance + `/server channels diplomacy enable:true`; rank write roles must exist from setup |
| Link finds no player | Member must verify first, or use `user:@Member` |
| stfc.pro lookup fails | Bot falls back to HTML scrape for numeric player IDs; confirm URL/server/region |
| Survey create denied | Admin or `/survey creators` role; run `/server setup` first |
| Survey DM missing | Member allows DMs from server members; bot can message them |
| Zero matched players | Check `target` filters vs verified roster (`/survey list` shows target count) |
| Exchange no donors notified | Need cross-alliance donors; verify alliance tags differ |
| Exchange role assign fails | Bot role above `{Resource} Donor` / `Need` roles |

---

## Quick checklist (new alliance server)

1. [ ] Bot invited; role near top of list  
2. [ ] `/server setup` with server, region, mode, tag, roles  
3. [ ] `/server channels extra-roles` for officers who see all member channels  
4. [ ] `/server channels plan` then `/server channels rebalance apply:true` (or manual `/server channels map`) — link existing channels with `/server channels link` first if needed  
5. [ ] `/server channels log create:true`  
6. [ ] Optional: `nickname_template`, rank roles, `/server bucket`  
7. [ ] Multi-alliance: `/server channels diplomacy enable:true write_roles:Diplomat write_ranks:Commodore,Admiral`  
8. [ ] Optional: `/survey creators` for officers who may poll the alliance  
9. [ ] Optional: `/exchange setup` + `/exchange resource create` for cross-alliance resources  
10. [ ] `/server test-invite` → verify yourself → check roles, log, personal/diplomacy channels
11. [ ] Existing members: `/server verify user:@Them link:https://stfc.pro/…` (repeat as needed)  
11. [ ] `/server status` looks correct  
