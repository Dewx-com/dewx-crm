# NOTICE

Prospect Engine CRM (app.prospectengine.com) and Dewx CRM (crm.dewx.com) are modified distributions of Twenty
(https://github.com/twentyhq/twenty), Copyright (c) Twenty PBC and contributors, licensed under the GNU Affero
General Public License v3.0 (see LICENSE). "Twenty" is a trademark of its owners and is not used in the distributed
products.

This repository is the complete corresponding source for both hosted services, offered in accordance with
AGPL-3.0 section 13. Branch `dewx` = Dewx CRM; branch `pe` = Prospect Engine CRM.

Modifications by Dewx (https://dewx.com) for Prospect Engine (https://prospectengine.com):
- Branding: product name "Prospect Engine", icons, teal palette, legal/docs links, transactional email strings
  (applied at image build time — see pe/Dockerfile; Dewx CRM: dewx/Dockerfile)
- Server: permissions exception filter registered globally (upstream commit 25f28ee2)
- Planned, in our own AGPL code (see pe/PE-CRM.md): a per-role record scope for client logins. Files marked
  "@license Enterprise" upstream are neither enabled nor modified, and no enterprise licence key is configured.

All upstream copyright and license notices are retained.
