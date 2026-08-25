import { UIScrollView, UIView, UIText, UIElement, FlexLayout, compileCVS, CanvasPointerEvent } from '../CanvApps';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

console.log('🚀 Running UIScrollView & Internal Scroll Tests...\n');

// Test 1: UIScrollView Instantiation and Default Values
console.log('Test 1: UIScrollView Instantiation & Default Styles');
const scrollDefault = new UIScrollView();
assert(scrollDefault.styles.overflow === 'scroll', 'Default overflow should be "scroll"');
assert(scrollDefault.styles.flexDirection === 'column', 'Default flexDirection should be "column"');
assert(scrollDefault.styles.showScrollbar === 'auto', 'Default showScrollbar should be "auto"');
assert(scrollDefault.styles.scroll === 'vertical', 'Default scroll should be "vertical"');
assert(scrollDefault.styles.flexShrink === 0, 'Default flexShrink should be 0');

const scrollHoriz = new UIScrollView({ scroll: 'horizontal' });
assert(scrollHoriz.styles.flexDirection === 'row', 'Horizontal scroll should default flexDirection to "row"');
assert(scrollHoriz.styles.scroll === 'horizontal', 'Scroll direction should be "horizontal"');

// Test 2: Dual Accessors (scrollTop/scrollY, scrollLeft/scrollX)
console.log('\nTest 2: Dual Accessors & Direct Offsets');
const view = new UIScrollView({ width: 300, height: 400 });
view.maxScrollTop = 500;
view.maxScrollLeft = 200;

view.scrollY = 150;
assert(view.scrollTop === 150, 'Setting scrollY updates scrollTop');
assert(view.scrollY === 150, 'Getting scrollY returns scrollTop');

view.scrollX = 80;
assert(view.scrollLeft === 80, 'Setting scrollX updates scrollLeft');
assert(view.scrollX === 80, 'Getting scrollX returns scrollLeft');

view.setStyle({ scrollY: 200, scrollX: 100 });
assert(view.scrollTop === 200, 'setStyle({ scrollY }) updates scrollTop');
assert(view.scrollLeft === 100, 'setStyle({ scrollX }) updates scrollLeft');

// Test 3: Scroll Helper Methods
console.log('\nTest 3: Scroll Helper Methods');
view.scrollToTop('auto');
assert(view.scrollTop === 0, 'scrollToTop sets scrollTop to 0');

view.scrollToBottom('auto');
assert(view.scrollTop === 500, 'scrollToBottom sets scrollTop to maxScrollTop (500)');

const progress = view.getScrollProgress();
assert(progress.y === 1, 'Scroll progress Y is 1.0 at bottom');
assert(Math.abs(progress.x - 0.5) < 0.01, 'Scroll progress X is 0.5 at 100/200');

view.scrollBy({ top: -100, behavior: 'auto' });
assert(view.scrollTop === 400, 'scrollBy({ top: -100 }) offsets scrollTop to 400');

// Test 4: FlexLayout Scrollable Bounds Calculation
console.log('\nTest 4: FlexLayout Scroll Bounds Calculation');
const container = new UIScrollView({ width: 300, height: 200, scroll: 'vertical' });
for (let i = 0; i < 10; i++) {
  container.addChild(new UIView({ width: '100%', height: 50, marginBottom: 10 }));
}

// Lay out container inside 800x600 viewport
FlexLayout.calculateLayout(container, 800, 600);

// Total items height = 10 * 50 + 10 * 10 = 600px. Available height = 200px.
// maxScrollTop should be at least 600 - 200 = 400.
assert(container.maxScrollTop >= 400, `maxScrollTop calculated correctly: ${container.maxScrollTop} >= 400`);
assert(container.maxScrollLeft === 0, 'maxScrollLeft locked to 0 for vertical scroll view');

// Test 5: Horizontal Scroll View Bounds
console.log('\nTest 5: Horizontal Scroll View Bounds');
const horizContainer = new UIScrollView({ width: 200, height: 100, scroll: 'horizontal' });
for (let i = 0; i < 5; i++) {
  horizContainer.addChild(new UIView({ width: 80, height: 80, marginRight: 10 }));
}
FlexLayout.calculateLayout(horizContainer, 800, 600);
assert(horizContainer.maxScrollLeft >= 200, `maxScrollLeft calculated correctly: ${horizContainer.maxScrollLeft} >= 200`);
assert(horizContainer.maxScrollTop === 0, 'maxScrollTop locked to 0 for horizontal scroll view');

// Test 6: Clipping Simulation in UIElement.render
console.log('\nTest 6: Clipping in UIElement.render()');
let clipCalls = 0;
let saveCalls = 0;
let restoreCalls = 0;

const mockCtx: any = {
  save: () => { saveCalls++; },
  restore: () => { restoreCalls++; },
  beginPath: () => {},
  rect: () => {},
  clip: () => { clipCalls++; },
  translate: () => {},
  scale: () => {},
  setTransform: () => {},
  fillRect: () => {},
  stroke: () => {},
  fill: () => {},
  closePath: () => {},
  globalAlpha: 1,
};

const clippingView = new UIView({ width: 100, height: 100, overflow: 'hidden' });
clippingView.setLayout(0, 0, 100, 100);
clippingView.updateWorldTransform(0, 0);
clippingView.render(mockCtx);

assert(clipCalls === 1, `ctx.clip() was called once for overflow="hidden" (actual: ${clipCalls})`);
assert(saveCalls > 0 && restoreCalls > 0 && saveCalls === restoreCalls, 'ctx.save() and ctx.restore() are balanced');

// Test 7: Compiler Code Generation for <scroll-view>
console.log('\nTest 7: .cvs Compiler Code Generation for <scroll-view>');
const cvsTemplate = `
<script lang="ts">
  const scrollPos = signal(0);
  function onScroll(e: any) {
    scrollPos.value = e.scrollTop;
  }
</script>

<scroll-view width="340" height="400" scroll="vertical" showScrollbar="auto" @scroll="onScroll">
  <view flexDirection="column" gap="10">
    <text>Item 1</text>
    <text>Item 2</text>
  </view>
</scroll-view>
`;

const result = compileCVS(cvsTemplate);
assert(result.code.includes('import { UIView, UIText, UIButton, UIInput, UIModal, UIMotion, UIImage, UIScrollView'), 'Generated code imports UIScrollView');
assert(result.code.includes('new UIScrollView('), 'Generated code instantiates UIScrollView');
assert(result.code.includes('"scroll":"vertical"'), 'Generated code preserves scroll="vertical"');
assert(result.code.includes('"showScrollbar":"auto"'), 'Generated code preserves showScrollbar="auto"');
assert(result.code.includes('.on("scroll"'), 'Generated code binds @scroll event');

console.log('\n🎉 All UIScrollView and Internal Scroll tests passed successfully!\n');
