# Prospect Engine CRM — build overlay

`app.prospectengine.com` runs a modified distribution of [Twenty](https://github.com/twentyhq/twenty) (AGPL-3.0).
This directory produces the image:

    docker build -t pe-crm:$(date +%Y%m%d) -f overlay/Dockerfile overlay/

- Starts FROM the upstream community image (pinned by `TWENTY_TAG`); rebrands the built front end, PWA icons, palette,
  links and transactional emails to Prospect Engine at build time. No source is compiled, so an upgrade is a tag bump.
- Files marked `/* @license Enterprise */` upstream are neither enabled nor modified, and no enterprise key is configured.
- Licence obligations kept: AGPL and copyright notices stay in the image; `NOTICE.md` names the modifications; the hosted
  service links to this repository as its corresponding source (AGPL-3.0 §13); Twenty's name and marks do not appear
  in the product (they are trademarks of their owners).
- Staging before prod: run the new image on `127.0.0.1:3010` against a copy of the database, look at it, then
  "deploy prod go" swaps `/opt/crm.dewx.com/docker-compose.yml` to the new tag.

Our own features that need source changes (client scope for the Client role, see `../PE-CRM.md`) live as a small patch
series on a source branch and are built with upstream's own Dockerfile; this overlay is applied on top of that image.
