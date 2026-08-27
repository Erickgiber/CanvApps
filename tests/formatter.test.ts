import { formatCVS, CVSFormatter } from '../CanvApps/formatter/CVSFormatter';
import { CVSParser } from '../CanvApps/compiler/parser';

console.log('🚀 Running CanvApps CVS Formatter Tests...\n');

// Test 1: Indentation & Attribute formatting
console.log('Test 1: Basic component formatting & indentation');
const sample1 = `
<script lang="ts">
const name = signal('CanvApps');
const count = signal(0);
function increment() {
count.value++;
}
</script>

<view width="100%" height="100%" flexDirection="column" gap="10">
<text fontSize="24" color="#ffffff">Hello {{ name.value }}</text>
<button label="Click" backgroundColor="#0284c7" @click="increment" />
</view>
`;

const formatted1 = formatCVS(sample1);
if (!formatted1.includes('<view\n  width="100%"')) {
  console.log('Formatted 1:\n', formatted1);
  throw new Error('Expected multi-line attribute formatting for view');
}
if (!formatted1.includes('  const name = signal(\'CanvApps\');')) {
  throw new Error('Expected 2-space script indentation');
}
console.log('  ✓ Script and template indented with 2 spaces');

// Test 2: Idempotence (Formatting twice produces exact same output)
console.log('\nTest 2: Formatter idempotency');
const formattedTwice = formatCVS(formatted1);
if (formatted1 !== formattedTwice) {
  throw new Error('Formatter is not idempotent! Second pass differed from first pass.');
}
console.log('  ✓ Formatter is strictly idempotent');

// Test 3: String Quote Preservation (Never changes ' to " or vice versa in expressions)
console.log('\nTest 3: Preserving string quote literals in scripts and bindings');
const sampleQuotes = `
<script lang="ts">
  const single = 'single quote';
  const double = "double quote";
  const backtick = \`template \${1 + 1}\`;
</script>
<view :borderColor={isDark.value ? '#1e293b' : '#cbd5e1'}>
  <text :color={"#ffffff"}>Text</text>
</view>
`;

const formattedQuotes = formatCVS(sampleQuotes);
if (!formattedQuotes.includes("'single quote'")) throw new Error("Single quotes were altered!");
if (!formattedQuotes.includes('"double quote"')) throw new Error("Double quotes were altered!");
if (!formattedQuotes.includes("`template ${1 + 1}`")) throw new Error("Template literals were altered!");
if (!formattedQuotes.includes("isDark.value ? '#1e293b' : '#cbd5e1'")) throw new Error("Binding expression quotes were altered!");
console.log('  ✓ String quotes and expressions 100% preserved without mutation');

// Test 4: Directives formatting (@if, @else, @each)
console.log('\nTest 4: Control directives formatting');
const sampleDirectives = `
<script lang="ts">
  const isPlaying = signal(true);
</script>
<view width="100%">
@if (isPlaying.value) {
<text color="#22c55e">Playing</text>
}
@else {
<text color="#ef4444">Stopped</text>
}
</view>
`;

const formattedDirectives = formatCVS(sampleDirectives);
if (!formattedDirectives.includes('  @if (isPlaying.value) {')) {
  console.log('Directives output:\n', formattedDirectives);
  throw new Error('Expected formatted @if block');
}
if (!formattedDirectives.includes('    <text color="#22c55e">Playing</text>')) {
  throw new Error('Expected indented child inside @if block');
}
console.log('  ✓ Directives formatted with correct indentation');

// Test 5: AST Parser Equivalence (Formatted code parses into valid AST)
console.log('\nTest 5: AST Parsing of formatted code');
const ast = CVSParser.parse(formatted1);
if (!ast.template || (ast.template as any).tag !== 'view') throw new Error('Expected root view element in AST');
if ((ast.template as any).children.length !== 2) throw new Error(`Expected 2 children in root view, got ${(ast.template as any).children.length}`);
console.log('  ✓ Formatted code parses flawlessly into AST without syntax errors');

console.log('\n🎉 All CVS Formatter tests passed successfully!\n');
