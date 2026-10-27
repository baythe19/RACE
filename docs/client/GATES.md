# Gates: client-doc vs existing build

OWNS: docs/client/CLIENT_DOC_VS_BUILD.md, docs/client/GATES.md, docs/client/scripts/verify-gap-report.mjs, .cursor/memory/**

Scope: One reviewable gap report that maps every point in root clintdoc.md to what exists in customer, partner, admin, and backend code, with status, score, and confidence.

- [x] G1: gap report file exists and names all ten numbered client-doc modules
  CHECK: node scripts/verify-gap-report.mjs
  EXPECT: gap report verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=14bd58602353115d0689f55cd975247a9aa0a33584096ec6c9e4eadee580bad8; exit=0; EXPECT=matched; output-sha256=3cbbb1c093e410cebc620edb14d12ea5764b95b8fbc553fa4fe45edd59485102; output-bytes=31; shell=/bin/sh; cwd=/workspaces/RACE/docs/client; path=9d3a0d0ee85a/40 entries

- [x] G2: report uses only allowed status labels and includes overall plus per-module scores
  CHECK: node scripts/verify-gap-report.mjs --scores
  EXPECT: gap report verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=89aaaa245b86669824517f2affa1a9aaec5b3ffd16ec0a713d8b3265b7cc3d47; exit=0; EXPECT=matched; output-sha256=3cbbb1c093e410cebc620edb14d12ea5764b95b8fbc553fa4fe45edd59485102; output-bytes=31; shell=/bin/sh; cwd=/workspaces/RACE/docs/client; path=9d3a0d0ee85a/40 entries

- [x] G3: report is readable by a non-engineer (tables, flows, no secret values)
  EVIDENCE: 2026-09-05 reviewed CLIENT_DOC_VS_BUILD.md: legend + SCORE_TABLE first, then connection diagram in plain text, then per-module tables with What’s there / What’s left; no JWT/Twilio/Mongo passwords; work queue is the action list. Suitable for client-side review.
