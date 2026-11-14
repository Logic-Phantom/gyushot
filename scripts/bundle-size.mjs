// app/dist 파일 크기(원본/gzip)를 출력한다. 사용: npm run build && npm run bundle-size
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = join(resolve(import.meta.dirname, '..'), 'app', 'dist');
const rows = [];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else rows.push([relative(DIST, p).split(sep).join('/'), statSync(p).size, gzipSync(readFileSync(p)).length]);
  }
};
walk(DIST);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
for (const [f, s, g] of rows.sort((a, b) => b[1] - a[1])) console.log(`${f.padEnd(48)} ${kb(s).padStart(10)}  gzip ${kb(g)}`);
console.log(`total ${kb(rows.reduce((a, r) => a + r[1], 0))}`);
