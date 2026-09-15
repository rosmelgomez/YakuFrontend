const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('src/lib/api/session-refresh.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
new Function('exports', js)(mod.exports);

test('shares one refresh request between concurrent API failures', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { ok: true };
  };

  try {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => mod.exports.refreshSession('/api')),
    );
    assert.deepEqual(results, [true, true, true, true, true]);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
