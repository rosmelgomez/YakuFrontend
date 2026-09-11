const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('src/lib/firmware/esp-flasher.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'exports', 'setTimeout', js)(() => ({}), mod.exports, (fn, ms) => setTimeout(fn, ms === 12000 ? 30 : ms));
const { EspFlasher } = mod.exports;
function fake(response, failWrite = false) {
  let sent = '';
  const flasher = new EspFlasher(() => {});
  flasher.monitorActive = true;
  flasher.sleep = async () => {};
  flasher.port = { writable: { getWriter: () => ({
    write: async bytes => {
      if (failWrite) throw new Error('write failed');
      sent += new TextDecoder().decode(bytes);
      if (sent.endsWith('\n') && response) {
        for (const chunk of response) for (const listener of flasher.serialListeners) listener(chunk);
      }
    }, releaseLock() {},
  }) } };
  return { flasher, sent: () => sent };
}
test('waits for fragmented ESP32 acknowledgement and frames JSON', async () => {
  const { flasher, sent } = fake(['YAKU_PROVIS', 'IONING_OK\r\n']);
  await flasher.sendProvisioning({ wifi: { ssid: 'test', password: 'dummy' } });
  assert.equal(JSON.parse(sent()).wifi.ssid, 'test');
  assert.ok(sent().endsWith('\n'));
  assert.equal(flasher.serialListeners.size, 0);
});
test('rejects firmware error', async () => {
  await assert.rejects(fake(['YAKU_PROVISIONING_ERROR\n']).flasher.sendProvisioning({}), /rechazó/);
});
test('does not claim saved when ESP32 stays silent', async () => {
  const { flasher } = fake(null);
  await assert.rejects(flasher.sendProvisioning({}), /no confirmó/);
  assert.equal(flasher.provisioningPending, false);
  assert.equal(flasher.serialListeners.size, 0);
});
test('disconnect and write failure do not report success', async () => {
  await assert.rejects(fake(['YAKU_SERIAL_CLOSED\n']).flasher.sendProvisioning({}), /cerró/);
  await assert.rejects(fake(null, true).flasher.sendProvisioning({}), /write failed/);
});
test('requires the firmware baud rate', async () => {
  const { flasher } = fake(null);
  flasher.monitorBaudRate = 9600;
  await assert.rejects(flasher.sendProvisioning({}), /115200/);
});
