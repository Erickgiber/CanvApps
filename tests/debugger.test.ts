import { CanvAppsErrorOverlay } from '../CanvApps/debug/ErrorOverlay';

console.log('🚀 Running CanvApps Error Overlay Debugger Tests...\n');

// Test 1: Code Frame Generation
console.log('Test 1: Code frame generation with error marker');
const sampleSource = `
<script lang="ts">
  const count = signal(0);
</script>
<view width="100%">
  <text color="#ffffff">Valid</text>
  </unexpected>
</view>
`.trim();

const frame = CanvAppsErrorOverlay.generateCodeFrame(sampleSource, 6, 3, 2);

if (!frame.includes('> 6 |   </unexpected>')) {
  console.log('Generated frame:\n', frame);
  throw new Error('Codeframe does not contain highlighted line 6 marker');
}
if (!frame.includes('^')) {
  throw new Error('Codeframe does not contain column caret indicator');
}
console.log('  ✓ Code frame generated with correct line number, > indicator, and column caret');

// Test 2: Overlay instantiation methods
console.log('\nTest 2: Overlay methods existence');
if (typeof CanvAppsErrorOverlay.showError !== 'function') throw new Error('showError method missing');
if (typeof CanvAppsErrorOverlay.hideError !== 'function') throw new Error('hideError method missing');
if (typeof CanvAppsErrorOverlay.initGlobalErrorHandling !== 'function') throw new Error('initGlobalErrorHandling method missing');
console.log('  ✓ Overlay diagnostic methods correctly exported');

console.log('\n🎉 All Error Overlay Debugger tests passed successfully!\n');
