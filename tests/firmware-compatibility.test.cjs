const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(path) {
  const source = fs.readFileSync(path, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function('exports', js)(mod.exports);
  return mod.exports;
}
const { firmwareTypeForDevice } = load('src/lib/firmware/compatibility.ts');
const { installationResult } = load('src/lib/firmware/installation-result.ts');

test('measurement method overrides conflicting legacy names', () => {
  assert.equal(firmwareTypeForDevice({ metodo_medicion: 'proximidad', tipo: { nombre: 'Riego flujometro' } }), 'riego');
  assert.equal(firmwareTypeForDevice({ metodo_medicion: 'flujometro', tipo: { nombre: 'Sensor de nivel' } }), 'riego_flujo');
});
test('legacy names and unknown devices remain supported', () => {
  assert.equal(firmwareTypeForDevice({ tipo: { nombre: 'Flujometro' } }), 'riego_flujo');
  assert.equal(firmwareTypeForDevice({ tipo: { nombre: 'Actuador' } }), 'riego');
  assert.equal(firmwareTypeForDevice({ tipo: { nombre: 'Colector S3' } }), 'sensores');
  assert.equal(firmwareTypeForDevice(), '');
});
test('409 is returned as serializable feedback rather than thrown', async () => {
  const detail = 'Firmware incompatible con el método de medición del dispositivo.';
  assert.deepEqual(await installationResult(new Response(JSON.stringify({ detail }), { status: 409 })), { ok: false, error: detail });
});
test('successful installation returns its identifier', async () => {
  assert.deepEqual(await installationResult(new Response(JSON.stringify({ id: 42 }), { status: 201 })), { ok: true, installation: { id: 42 } });
});
test('non-JSON and structured validation failures use safe fallback text', async () => {
  for (const body of ['<html>Bad gateway</html>', JSON.stringify({ detail: [{ msg: 'invalid' }] })]) {
    assert.deepEqual(await installationResult(new Response(body, { status: 422 })), { ok: false, error: 'No se pudo iniciar la instalacion' });
  }
});
