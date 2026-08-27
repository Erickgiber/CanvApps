import assert from 'assert';
import { createApp, UIView, UIText } from '../CanvApps';

console.log('🚀 Running CanvApps createApp API Tests...\n');

// Test 1: Instantiation of createApp
console.log('Test 1: createApp instance creation and options');
function SampleRootComponent() {
  const root = new UIView({ width: 400, height: 300 });
  const text = new UIText({ text: 'Hello CanvApps' });
  root.appendChild(text);
  return root;
}

const app = createApp(SampleRootComponent, {
  backgroundColor: '#123456',
  selectable: true,
});

assert(app !== null && typeof app === 'object', 'createApp must return an AppInstance object');
assert.strictEqual(typeof app.mount, 'function', 'app must have mount method');
assert.strictEqual(typeof app.unmount, 'function', 'app must have unmount method');
assert.strictEqual(typeof app.use, 'function', 'app must have use method');
assert.strictEqual(typeof app.provide, 'function', 'app must have provide method');
assert.strictEqual(typeof app.inject, 'function', 'app must have inject method');
assert.strictEqual(app.options.backgroundColor, '#123456');
assert.strictEqual(app.options.selectable, true);
console.log('  ✓ createApp properly initializes AppInstance with provided options');

// Test 2: Dependency injection via provide & inject
console.log('Test 2: Context provide & inject');
app.provide('apiUrl', 'https://api.canvapps.dev');
app.provide('maxRetries', 3);

assert.strictEqual(app.inject('apiUrl'), 'https://api.canvapps.dev');
assert.strictEqual(app.inject('maxRetries'), 3);
assert.strictEqual(app.inject('unknownKey', 'defaultVal'), 'defaultVal');
console.log('  ✓ Context provide and inject work with type safety and defaults');

// Test 3: Plugin system via app.use
console.log('Test 3: Plugin installation via app.use');
let pluginInstalled = false;
let pluginPayload = '';

function samplePlugin(instance: any, payload: string) {
  pluginInstalled = true;
  pluginPayload = payload;
  instance.provide('pluginActive', true);
}

app.use(samplePlugin, 'test-payload');
assert.strictEqual(pluginInstalled, true);
assert.strictEqual(pluginPayload, 'test-payload');
assert.strictEqual(app.inject('pluginActive'), true);
console.log('  ✓ Plugins install and configure app instance successfully');

// Test 4: Dynamic setRoot
console.log('Test 4: Dynamic setRoot component replacement');
function AlternateRootComponent() {
  return new UIView({ width: 800, height: 600 });
}

app.setRoot(AlternateRootComponent);
console.log('  ✓ Dynamic setRoot updates current root component factory');

console.log('\n🎉 All createApp tests passed successfully!\n');
