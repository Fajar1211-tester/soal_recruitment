#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo 'Pasang Node.js 24 atau lebih baru sebelum menjalankan Talenta.' >&2
  exit 1
fi
node scripts/check-runtime.cjs
echo 'Talenta: buka browser pada port 3000 (atau PORT yang Anda atur).'
echo 'Biarkan terminal ini tetap terbuka selama aplikasi digunakan.'
exec node server.js
