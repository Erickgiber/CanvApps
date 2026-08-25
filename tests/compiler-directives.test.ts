import { compileCVS } from '../CanvApps';
import { ASTElement, ASTIfBlock, ASTEachBlock } from '../CanvApps/compiler/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

console.log('🚀 Running CanvApps Compiler Directives & Control Flow Tests...\n');

// -----------------------------------------------------------------------------
// Test 1: Block-style @if with parentheses and @else
// -----------------------------------------------------------------------------
console.log('Test 1: Block-style @if (cond) { ... } else { ... }');
const src1 = `
<script lang="ts">
  const isMobile = signal(false);
</script>
<view>
  @if (isMobile.value) {
    <text color="#64748b">Mobile</text>
  } else {
    <text color="#0f172a">Desktop</text>
  }
</view>
`;

const res1 = compileCVS(src1);
assert(res1.ast.template !== null, 'AST template is defined');
const root1 = res1.ast.template as ASTElement;
assert(root1.children.length === 1, 'Root contains 1 child');
assert(root1.children[0].type === 'if-block', 'Child is an if-block');

const ifBlock1 = root1.children[0] as ASTIfBlock;
assert(ifBlock1.condition === 'isMobile.value', `Condition is "isMobile.value" (actual: ${ifBlock1.condition})`);
assert(ifBlock1.consequent.length === 1, 'consequent contains 1 element');
assert((ifBlock1.consequent[0] as ASTElement).tag === 'text', 'consequent tag is text');
assert(ifBlock1.alternate !== undefined && ifBlock1.alternate.length === 1, 'alternate contains 1 element');
assert((ifBlock1.alternate![0] as ASTElement).tag === 'text', 'alternate tag is text');

// -----------------------------------------------------------------------------
// Test 2: Block-style @if without parentheses and without else
// -----------------------------------------------------------------------------
console.log('\nTest 2: Block-style @if cond { ... } without parens');
const src2 = `
<script lang="ts">
  const count = signal(10);
</script>
<view>
  @if count.value > 5 {
    <text>Count is high</text>
  }
</view>
`;

const res2 = compileCVS(src2);
const root2 = res2.ast.template as ASTElement;
assert(root2.children.length === 1, 'Root contains 1 child');
assert(root2.children[0].type === 'if-block', 'Child is an if-block');
const ifBlock2 = root2.children[0] as ASTIfBlock;
assert(ifBlock2.condition === 'count.value > 5', `Condition is "count.value > 5" (actual: ${ifBlock2.condition})`);
assert(ifBlock2.consequent.length === 1, 'consequent contains 1 element');
assert(ifBlock2.alternate === undefined, 'alternate is undefined');

// -----------------------------------------------------------------------------
// Test 3: Block-style @each with iterable, item, and index
// -----------------------------------------------------------------------------
console.log('\nTest 3: Block-style @each items as item, index { ... }');
const src3 = `
<script lang="ts">
  const tasks = signal([{ id: 1, title: 'Test' }]);
</script>
<view>
  @each tasks.value as task, i {
    <text>{{ i }}: {{ task.title }}</text>
  }
</view>
`;

const res3 = compileCVS(src3);
const root3 = res3.ast.template as ASTElement;
assert(root3.children.length === 1, 'Root contains 1 child');
assert(root3.children[0].type === 'each-block', 'Child is an each-block');
const eachBlock3 = root3.children[0] as ASTEachBlock;
assert(eachBlock3.iterable === 'tasks.value', `Iterable is "tasks.value" (actual: ${eachBlock3.iterable})`);
assert(eachBlock3.item === 'task', `Item is "task" (actual: ${eachBlock3.item})`);
assert(eachBlock3.index === 'i', `Index is "i" (actual: ${eachBlock3.index})`);
assert(eachBlock3.body.length === 1, 'Body contains 1 element');

// -----------------------------------------------------------------------------
// Test 4: Inline directives (@if="..." and @each="...")
// -----------------------------------------------------------------------------
console.log('\nTest 4: Inline directives (@if="..." and @each="...")');
const src4 = `
<script lang="ts">
  const isVisible = signal(true);
  const items = signal(['A', 'B', 'C']);
</script>
<view>
  <text @if="isVisible.value">Visible Text</text>
  <view @each="item in items.value">
    <text>{{ item }}</text>
  </view>
</view>
`;

const res4 = compileCVS(src4);
const root4 = res4.ast.template as ASTElement;
assert(root4.children.length === 2, 'Root contains 2 children');
const child1 = root4.children[0] as ASTElement;
assert(child1.directives.ifCondition === 'isVisible.value', 'Child 1 has ifCondition directive');
const child2 = root4.children[1] as ASTElement;
assert(child2.directives.forLoop?.iterable === 'items.value', 'Child 2 has forLoop directive');

// -----------------------------------------------------------------------------
// Test 5: Nested @if inside @each
// -----------------------------------------------------------------------------
console.log('\nTest 5: Nested @if inside @each');
const src5 = `
<script lang="ts">
  const items = signal([{ active: true, name: 'Item 1' }, { active: false, name: 'Item 2' }]);
</script>
<view>
  @each items.value as it {
    @if (it.active) {
      <text color="#10b981">{{ it.name }} (Active)</text>
    } else {
      <text color="#ef4444">{{ it.name }} (Inactive)</text>
    }
  }
</view>
`;

const res5 = compileCVS(src5);
const root5 = res5.ast.template as ASTElement;
assert(root5.children[0].type === 'each-block', 'Root child is each-block');
const each5 = root5.children[0] as ASTEachBlock;
assert(each5.body.length === 1, 'each-block body has 1 element');
assert(each5.body[0].type === 'if-block', 'Nested element is if-block');

// -----------------------------------------------------------------------------
// Test 6: Verify Svelte-style {#if} is NOT preprocessed into if-block
// -----------------------------------------------------------------------------
console.log('\nTest 6: Verify Svelte-style {#if} is not parsed as CanvApps control block');
const src6 = `
<script lang="ts">
  const active = signal(true);
</script>
<view>
  {#if active.value}
    <text>Should not become if-block</text>
  {/if}
</view>
`;

const res6 = compileCVS(src6);
const root6 = res6.ast.template as ASTElement;
const hasIfBlock = root6.children.some((c) => c.type === 'if-block');
assert(!hasIfBlock, 'Svelte-style {#if} was NOT transformed into an if-block AST node');

console.log('\n🎉 All CanvApps Compiler Directives Tests passed successfully!\n');
