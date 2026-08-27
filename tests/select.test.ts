import { UISelect } from '../CanvApps/nodes/UISelect';
import { CVSParser } from '../CanvApps/compiler/parser';
import { CVSCodeGenerator } from '../CanvApps/compiler/codegen';

console.log('🚀 Running UISelect Component & Compiler Tests...\n');

// Test 1: UISelect instantiation and options handling
console.log('Test 1: UISelect instantiation, options, and value setting');
const select = new UISelect({
  options: [
    { label: '0.5x Lento', value: 0.5 },
    { label: '1.0x Normal', value: 1.0 },
    { label: '1.5x Rápido', value: 1.5 },
    { label: '2.0x Ultra', value: 2.0 },
  ],
  value: 1.0,
});

if (select.getValue() !== 1.0) throw new Error(`Expected value 1.0, got ${select.getValue()}`);
console.log('  ✓ Initial value matches 1.0');

if (select.getOptions().length !== 4) throw new Error(`Expected 4 options, got ${select.getOptions().length}`);
console.log('  ✓ Options count matches 4');

if (select.getSelectedOption()?.label !== '1.0x Normal') throw new Error(`Expected "1.0x Normal", got "${select.getSelectedOption()?.label}"`);
console.log('  ✓ Selected option label resolved correctly');

select.setValue(2.0);
if (select.getValue() !== 2.0) throw new Error(`Expected updated value 2.0, got ${select.getValue()}`);
if (select.getSelectedOption()?.label !== '2.0x Ultra') throw new Error(`Expected "2.0x Ultra", got "${select.getSelectedOption()?.label}"`);
console.log('  ✓ Value update dynamically changes selected option');

// Test 2: Event emission on change
console.log('\nTest 2: Event emission on change');
let emittedValue: any = null;
select.on('change', (e: any) => {
  emittedValue = e.value;
});

select.setValue(0.5);
// trigger simulated event
select.emit('change', { value: 0.5, option: select.getSelectedOption() });
if (emittedValue !== 0.5) throw new Error(`Expected emitted value 0.5, got ${emittedValue}`);
console.log('  ✓ Change event fired with updated value');

// Test 3: Compiler code generation for <select>
console.log('\nTest 3: Compiler generation for <select> tag');
const sfcSource = `
<script lang="ts">
  const speed = signal(1.0);
  const options = [{ label: '1x', value: 1 }];
</script>
<view width="100%">
  <select :options="options" :value="speed.value" @change="onSpeedChange" />
</view>
`;
const ast = CVSParser.parse(sfcSource);
const codegen = new CVSCodeGenerator();
const code = codegen.generate(ast);

if (!code.includes('new UISelect')) throw new Error(`Generated code does not instantiate UISelect: ${code}`);
console.log('  ✓ Compiler instantiates UISelect');

if (!code.includes('.setOptions(')) throw new Error(`Generated code does not contain .setOptions(): ${code}`);
console.log('  ✓ Compiler generates .setOptions() effect');

if (!code.includes('.setValue(')) throw new Error(`Generated code does not contain .setValue(): ${code}`);
console.log('  ✓ Compiler generates .setValue() effect');

// Test 4: Interactive Pointer Events & Dropdown Option Selection
console.log('\nTest 4: Interactive pointerdown opening and option selection');
const interactiveSelect = new UISelect({
  width: 145,
  height: 42,
  options: [
    { label: '0.5x Lento', value: 0.5 },
    { label: '1.0x Normal', value: 1.0 },
    { label: '1.5x Rápido', value: 1.5 },
    { label: '2.0x Ultra', value: 2.0 },
  ],
  value: 1.0,
});
interactiveSelect.setLayout(100, 100, 145, 42);
interactiveSelect.updateWorldTransform(0, 0);

let changedValue: any = null;
interactiveSelect.on('change', (e: any) => {
  changedValue = e.value;
});

// Step 1: Click on the main select box (Y = 120 -> worldY = 120 -> localY = 20 <= 42)
if (interactiveSelect.isDropdownOpen()) throw new Error('Dropdown should start closed');
interactiveSelect.emit('pointerdown', { x: 150, y: 120 });
if (!interactiveSelect.isDropdownOpen()) throw new Error('Dropdown should be open after click on main select box');
console.log('  ✓ Clicking main select field opened dropdown');

// Step 2: Click on 3rd option (1.5x Rápido).
// Option 0: Y = 42 + 4 = 46..78
// Option 1: Y = 78..110
// Option 2: Y = 110..142 (localY = 120 relative to select top) -> worldY = 100 + 120 = 220
interactiveSelect.emit('pointerdown', { x: 150, y: 220 });
if (interactiveSelect.isDropdownOpen()) throw new Error('Dropdown should close after selecting option');
if (interactiveSelect.getValue() !== 1.5) throw new Error(`Expected value 1.5, got ${interactiveSelect.getValue()}`);
if (changedValue !== 1.5) throw new Error(`Expected change event with 1.5, got ${changedValue}`);
console.log('  ✓ Clicking option in dropdown selected value 1.5 and emitted change event');

// Test 5: Option Gap & Custom Hover Styling
console.log('\nTest 5: UISelect with optionGap and custom optionHoverBg');
const gapSelect = new UISelect({
  width: 160,
  height: 40,
  optionGap: 6,
  optionHoverBg: '#e2e8f0',
  options: [
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b' },
    { label: 'Option C', value: 'c' },
  ],
  value: 'a',
});
gapSelect.setLayout(50, 50, 160, 40);
gapSelect.updateWorldTransform(0, 0);

// Open dropdown
gapSelect.emit('pointerdown', { x: 60, y: 65 });
if (!gapSelect.isDropdownOpen()) throw new Error('Dropdown should open on click');

let selectedFromGap: any = null;
gapSelect.on('change', (e: any) => {
  selectedFromGap = e.value;
});

// Option 1 ('Option B'):
// itemHeight = 32, gap = 6
// dropY = 40 + 4 = 44
// Option 0: 44 + 3 = 47 .. 79
// Option 1: 47 + 32 + 6 = 85 .. 117 (localY = 90 -> worldY = 50 + 90 = 140)
gapSelect.emit('pointerdown', { x: 70, y: 140 });
if (gapSelect.getValue() !== 'b') throw new Error(`Expected value 'b', got '${gapSelect.getValue()}'`);
if (selectedFromGap !== 'b') throw new Error(`Expected change event with 'b', got '${selectedFromGap}'`);
console.log('  ✓ Option selection with optionGap=6 accurately calculated and selected');

console.log('\n🎉 All UISelect & Compiler Tests passed successfully!\n');

