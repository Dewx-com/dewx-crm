"""Validate a candidate on Contabo without changing active configuration.

Run: python3 prepare.py /var/tmp/pe-domain-20260909
The generated Caddyfile stays on Contabo because existing routes are private.
"""

import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys


def main():
    source = Path(__file__).resolve().parent
    target = Path(sys.argv[1])
    os.umask(0o077)
    target.mkdir(parents=True, exist_ok=True)
    active = Path('/etc/caddy/Caddyfile').read_text()
    pattern = r'(?m)^app\.prospectengine\.com\s*\{\s*redir https://app\.dewx\.com\{uri\} permanent\s*\}'
    if len(re.findall(pattern, active)) != 1:
        raise SystemExit('STOP: expected one existing Prospect Engine redirect block')
    candidate = re.sub(pattern, lambda _: (source / 'app.prospectengine.com.caddy').read_text().rstrip(), active)
    # The only permitted change is the existing redirect block. All private
    # proposal handlers and every other site's routing remain byte-for-byte.
    assert re.sub(pattern, '', active) == candidate.replace(
        (source / 'app.prospectengine.com.caddy').read_text().rstrip(), '', 1
    )
    (target / 'Caddyfile.candidate').write_text(candidate)
    (target / 'active-caddy.sha256').write_text(hashlib.sha256(active.encode()).hexdigest() + '\n')
    checks = [
        ['caddy', 'validate', '--config', str(target / 'Caddyfile.candidate'), '--adapter', 'caddyfile'],
        ['docker', 'compose', '--project-directory', '/opt/crm.dewx.com',
         '-f', '/opt/crm.dewx.com/docker-compose.yml',
         '-f', str(source / 'docker-compose.override.yml'), 'config', '--quiet'],
    ]
    for command in checks:
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode:
            # Config diagnostics can contain private paths or values. Keep
            # them on the host instead of printing them to a shared transcript.
            (target / 'validation-error.log').write_text(result.stdout + result.stderr)
            raise SystemExit('FAIL: inspect restricted validation-error.log on Contabo')
    print('PASS: Caddy config validates; Compose config validates; other routes unchanged')
    print('Prepared only. No service restarted and no active configuration changed.')


if __name__ == '__main__':
    main()
