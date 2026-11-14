// 공식 프리셋 카탈로그(app/src/data/presets.ko-KR.json) 검증. Node 24 타입 제거 실행으로 image-core TS를 직접 import한다.
// 사용: npm run presets:validate   (문제 있으면 exit 1)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateCatalog } from '../packages/image-core/src/presets.ts';
import { resolveSpec } from '../packages/image-core/src/units.ts';

const file = resolve(import.meta.dirname, '../app/src/data/presets.ko-KR.json');
const data = JSON.parse(readFileSync(file, 'utf8'));
const errors = validateCatalog(data);
if (errors.length) {
  console.error(`프리셋 검증 실패 ${errors.length}건`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
for (const p of data.presets) {
  const s = resolveSpec(p);
  const tag = p.status === 'verified' ? '공식' : p.status === 'needs-review' ? '검증대기' : '일반';
  console.log(`${tag.padEnd(4)} ${p.id.padEnd(26)} ${s.widthPx}x${s.heightPx}px${p.constraints.maxBytes ? ` ≤${p.constraints.maxBytes}B` : ''} ${p.enabled ? '' : '(비활성)'}`);
}
console.log(`OK — ${data.presets.length}개 프리셋`);
