import aitDevtools from '@apps-in-toss/devtools/unplugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// SDK 3.x에는 샌드박스 앱이 없다 → 개발 서버에서 @apps-in-toss/devtools가 SDK를 모의 SDK로 바꾸고 패널을 띄운다(D-022).
// 프로덕션 빌드에는 들어가지 않는다(플러그인이 dev에서만 활성). 순수 브라우저 경로를 보려면 AIT_DEVTOOLS=off npm run dev.
const devtoolsOn = process.env.AIT_DEVTOOLS !== 'off';

export default defineConfig(({ command }) => ({
  plugins: [...(devtoolsOn ? [aitDevtools.vite()] : []), react()],
  define: {
    // 개발 서버 + devtools일 때만 true → platform/toss.ts가 SDK 경로를 탄다
    __AIT_MOCK__: JSON.stringify(command === 'serve' && devtoolsOn && !process.env.VITEST),
  },
  // 앱인토스는 dist 폴더를 그대로 패키징한다 → 상대 경로로 빌드해 어느 경로에서 열려도 에셋을 찾게 한다(사잇과 같은 방식)
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'vendor', test: /node_modules/ }],
        },
      },
    },
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
}));
