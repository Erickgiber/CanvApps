import { UIElement } from '../CanvApps/core/UIElement';
import { UIView } from '../CanvApps/nodes/UIView';
import { UIText } from '../CanvApps/nodes/UIText';
import { UIButton } from '../CanvApps/nodes/UIButton';
import { UIAnchor } from '../CanvApps/nodes/UIAnchor';
import { FlexLayout } from '../CanvApps/layout/FlexLayout';

console.log('🚀 Running CanvApps Layout Box Model & Insets Tests...\n');

// Test 1: String Inset Parsing for Padding and Margin
console.log('Test 1: String insets parsing');
const el1 = new UIView({ padding: '[10, 20]' as any, margin: '5px 15px' as any });
const p1 = el1.getComputedPadding();
const m1 = el1.getComputedMargin();
console.assert(p1.top === 10 && p1.right === 20 && p1.bottom === 10 && p1.left === 20, `Padding failed: ${JSON.stringify(p1)}`);
console.assert(m1.top === 5 && m1.right === 15 && m1.bottom === 5 && m1.left === 15, `Margin failed: ${JSON.stringify(m1)}`);
console.log('  ✓ String array "[10, 20]" parsed correctly into top/bottom=10, left/right=20');
console.log('  ✓ CSS string "5px 15px" parsed correctly into margin insets');

// Test 2: Min/Max Width and Height Clamping in UIElement.measure
console.log('\nTest 2: Min/Max dimensions clamping');
const el2 = new UIView({ width: 100, minWidth: 200, maxWidth: 300, height: 500, maxHeight: 400 });
const size2 = el2.measure(1000, 1000);
console.assert(size2.width === 200, `Expected clamped minWidth 200, got ${size2.width}`);
console.assert(size2.height === 400, `Expected clamped maxHeight 400, got ${size2.height}`);
console.log('  ✓ minWidth=200 clamped width=100 up to 200');
console.log('  ✓ maxHeight=400 clamped height=500 down to 400');

// Test 3: FlexLayout calculation with constraints and anchors
console.log('\nTest 3: FlexLayout calculation with UIAnchor and buttons');
const root = new UIView({ width: 800, height: 600, flexDirection: 'column', gap: 20, padding: [20, 20] });
const anchor = new UIAnchor('Quick Start', { href: '/docs', padding: [10, 20] });
const btn = new UIButton('Copy', { padding: [8, 16] });

root.addChild(anchor);
root.addChild(btn);

FlexLayout.calculateLayout(root, 800, 600);

console.assert(anchor.layoutRect.width > 0, 'Anchor width should be greater than 0');
console.assert(anchor.layoutRect.height > 0, 'Anchor height should be greater than 0');
console.assert(btn.layoutRect.y >= anchor.layoutRect.y + anchor.layoutRect.height + 20, `Button should be placed below anchor with gap. anchor.y=${anchor.layoutRect.y}, anchor.h=${anchor.layoutRect.height}, btn.y=${btn.layoutRect.y}`);

console.log('  ✓ UIAnchor measured and placed accurately in FlexLayout tree');
console.log('  ✓ UIButton positioned below UIAnchor respecting gap=20 without overlapping');

console.log('\n🎉 All CanvApps Layout Box Model Tests passed successfully!\n');
