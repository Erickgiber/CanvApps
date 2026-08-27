import { UISlider } from '../CanvApps/nodes/UISlider';
import { CVSParser } from '../CanvApps/compiler/parser';
import { CVSCodeGenerator } from '../CanvApps/compiler/codegen';

console.log('🚀 Running CanvApps UISlider & Compiler Tests...\n');

// 1. Test UISlider instance creation and properties
console.log('Test 1: UISlider node instantiation and value clamping');
const slider = new UISlider({
  min: 0,
  max: 200,
  value: 50,
  progressColor: '#1db954',
  trackColor: '#334155',
});

if (slider.getValue() !== 50) {
  throw new Error(`Expected value 50, got ${slider.getValue()}`);
}
console.log('  ✓ Initial value is 50');

slider.setValue(250);
if (slider.getValue() !== 200) {
  throw new Error(`Expected clamped value 200, got ${slider.getValue()}`);
}
console.log('  ✓ Value clamped to max 200');

slider.setValue(-50);
if (slider.getValue() !== 0) {
  throw new Error(`Expected clamped value 0, got ${slider.getValue()}`);
}
console.log('  ✓ Value clamped to min 0');

// 2. Test compiler parsing and code generation for <slider>
console.log('\nTest 2: Compiler generation for <slider> with dynamic bindings');
const sfcSource = `
<script lang="ts">
  const progress = signal(42);
</script>
<view width="100%">
  <slider :value="progress.value" :min="0" :max="100" progressColor="#1db954" />
</view>
`;

const ast = CVSParser.parse(sfcSource);
if (!ast.template) {
  throw new Error('Failed to parse AST template');
}
console.log('  ✓ Template parsed into AST');

const generator = new CVSCodeGenerator();
const generatedCode = generator.generate(ast);

if (!generatedCode.includes('new UISlider(')) {
  throw new Error('Generated code does not contain new UISlider()');
}
console.log('  ✓ Generated code instantiates UISlider');

if (!generatedCode.includes('.setValue(Number(progress.value ?? 0))')) {
  throw new Error('Generated code does not contain reactive setValue() binding');
}
console.log('  ✓ Generated code contains reactive setValue effect');

console.log('\n🎉 All UISlider & Compiler Tests passed successfully!\n');
