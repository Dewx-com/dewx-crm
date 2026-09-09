#!/usr/bin/env bash
set -euo pipefail
umask 077

# Fixed, synthetic targets only. This script never connects to the live CRM.
stage_dir=/opt/pe-crm-build/saas-stage-0910
restore_dir=/opt/pe-crm-build/saas-restore-0910
build_dir=/opt/pe-crm-build/saas-0909
restore_network=pe-saas-0910-restore

test -f "$stage_dir/app.env"
test -f "$stage_dir/db.env"
test -d "$build_dir/packages/twenty-server/dist"
if test -e "$restore_dir" || docker network inspect "$restore_network" >/dev/null 2>&1; then
  echo 'Restore fixture already exists; inspect it before starting another restore.' >&2
  exit 1
fi

mkdir -m 700 "$restore_dir"
mkdir -p "$stage_dir/storage"

# Quiesce only our test app so the database and attachment snapshot agree.
docker stop --timeout 10 pe-saas-0910-app >/dev/null
trap 'docker start pe-saas-0910-app >/dev/null' EXIT
docker exec pe-saas-0910-db pg_dump -U pe_stage -d pe_stage -Fc \
  > "$restore_dir/database.dump"
tar -C "$stage_dir" -czf "$restore_dir/storage.tar.gz" storage
docker start pe-saas-0910-app >/dev/null
trap - EXIT
tar -C "$restore_dir" -xzf "$restore_dir/storage.tar.gz"

docker network create --internal --label task=pe-saas-0910 "$restore_network" >/dev/null
docker run -d --name pe-saas-0910-restore-db --label task=pe-saas-0910 \
  --network "$restore_network" --network-alias pe-saas-0910-db \
  --memory=1g --cpus=1 --env-file "$stage_dir/db.env" \
  -v pe-saas-0910-restore-db:/var/lib/postgresql/data \
  -v "$restore_dir/database.dump:/snapshot.dump:ro" \
  postgres:16-alpine >/dev/null

ready=false
for attempt in {1..30}; do
  if docker exec pe-saas-0910-restore-db pg_isready -U pe_stage -d pe_stage >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if test "$ready" != true; then
  echo 'Restore database did not become ready.' >&2
  exit 1
fi

if ! docker exec pe-saas-0910-restore-db pg_restore --exit-on-error --no-owner --no-acl \
  -U pe_stage -d pe_stage /snapshot.dump > "$restore_dir/restore.log" 2>&1; then
  echo 'Database restore failed; inspect the private restore log.' >&2
  exit 1
fi

docker run -d --name pe-saas-0910-restore-redis --label task=pe-saas-0910 \
  --network "$restore_network" --network-alias pe-saas-0910-redis \
  --memory=256m --cpus=0.5 redis:7-alpine \
  redis-server --maxmemory 192mb --maxmemory-policy noeviction >/dev/null

# Reuse the test environment and TLS key in place. The isolated network aliases
# select the restored DB/Redis; only the restored attachment directory is writable.
docker run -d --name pe-saas-0910-restore-app --label task=pe-saas-0910 \
  --network "$restore_network" --network-alias pe-saas-0910-app \
  --memory=3g --cpus=2 --env-file "$stage_dir/app.env" \
  -v "$stage_dir:/stage:ro" -v "$restore_dir/storage:/stage/storage" \
  -v "$build_dir:/app:ro" -w /app/packages/twenty-server \
  node:24.18.0-alpine3.23 node dist/main.js >/dev/null

echo 'Synthetic database and attachment snapshot restored on the private restore network.'
echo 'Next: wait for restored HTTPS health, then run verify-staging-accounts.cjs on pe-saas-0910-restore.'
