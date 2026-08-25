import { UIModal, UIView, UIText, compileCVS } from '../CanvApps';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

console.log('🚀 Running UIModal Backdrop Blur (Frosted Glass) Tests...\n');

// -----------------------------------------------------------------------------
// Test 1: Backdrop Blur Radius Resolution from Various Formats
// -----------------------------------------------------------------------------
console.log('Test 1: Backdrop Blur Radius Resolution');

const modalPixelStr = new UIModal({ backdropBlur: '12px' });
assert(modalPixelStr.getBackdropBlurRadius() === 12, 'Resolves string "12px" to 12');

const modalNumStr = new UIModal({ backdropBlur: '15' });
assert(modalNumStr.getBackdropBlurRadius() === 15, 'Resolves string "15" to 15');

const modalNum = new UIModal({ backdropBlur: 20 });
assert(modalNum.getBackdropBlurRadius() === 20, 'Resolves number 20 to 20');

const modalBoolTrue = new UIModal({ backdropBlur: true });
assert(modalBoolTrue.getBackdropBlurRadius() === 10, 'Resolves boolean true to default 10');

const modalFilterStr = new UIModal({ backdropFilter: 'blur(16px)' });
assert(modalFilterStr.getBackdropBlurRadius() === 16, 'Resolves backdropFilter "blur(16px)" to 16');

const modalBlurBackdrop = new UIModal({ blurBackdrop: true, blurRadius: 18 });
assert(modalBlurBackdrop.getBackdropBlurRadius() === 18, 'Resolves blurBackdrop=true with blurRadius=18 to 18');

const modalBlur = new UIModal({ blur: true });
assert(modalBlur.getBackdropBlurRadius() === 10, 'Resolves blur=true to default 10');

const modalNoBlur = new UIModal();
assert(modalNoBlur.getBackdropBlurRadius() === 0, 'Defaults to 0 when no blur attribute specified');

// -----------------------------------------------------------------------------
// Test 2: Dynamic setBackdropBlur Mutator
// -----------------------------------------------------------------------------
console.log('\nTest 2: Dynamic setBackdropBlur Mutator');

const dynamicModal = new UIModal();
assert(dynamicModal.getBackdropBlurRadius() === 0, 'Initial radius is 0');

dynamicModal.setBackdropBlur('24px');
assert(dynamicModal.getBackdropBlurRadius() === 24, 'setBackdropBlur("24px") updates radius to 24');

dynamicModal.setBackdropBlur(8);
assert(dynamicModal.getBackdropBlurRadius() === 8, 'setBackdropBlur(8) updates radius to 8');

dynamicModal.setBackdropBlur(false);
assert(dynamicModal.getBackdropBlurRadius() === 0, 'setBackdropBlur(false) disables blur (0)');

// -----------------------------------------------------------------------------
// Test 3: Hardware-Accelerated Canvas 2D Frosted Glass Paint Pass
// -----------------------------------------------------------------------------
console.log('\nTest 3: Canvas 2D Frosted Glass Paint Pass');

let filterAssigned = '';
let drawImageCalls = 0;
let fillRectCalls = 0;

const mockCanvas: any = {
  width: 1600,
  height: 1200,
};

const mockCtx: any = {
  canvas: mockCanvas,
  save: () => {},
  restore: () => {},
  setTransform: () => {},
  translate: () => {},
  scale: () => {},
  beginPath: () => {},
  closePath: () => {},
  rect: () => {},
  fill: () => {},
  stroke: () => {},
  fillText: () => {},
  clearRect: () => {},
  fillRect: () => { fillRectCalls++; },
  drawImage: () => { drawImageCalls++; },
  filter: 'none',
  fillStyle: '',
  globalAlpha: 1,
  measureText: (str: string) => ({ width: str.length * 8 }),
};


// Setup mock document for offscreen buffer
const mockBufferCanvas: any = {
  width: 0,
  height: 0,
  getContext: () => ({
    clearRect: () => {},
    drawImage: () => {},
    measureText: (str: string) => ({ width: str.length * 8 }),
  }),
};


(globalThis as any).document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') return mockBufferCanvas;
    return {};
  },
};

const blurModal = new UIModal({
  backdropBlur: '14px',
  backdropColor: 'rgba(15, 23, 42, 0.65)',
  open: true,
  animated: false,
});

const dialogCard = new UIView({ width: 400, height: 250, backgroundColor: '#ffffff' });
dialogCard.addChild(new UIText('Modal Dialog Content'));
blurModal.addChild(dialogCard);

drawImageCalls = 0;
fillRectCalls = 0;
blurModal.render(mockCtx);

assert(drawImageCalls > 0, `drawImage called to render blurred backdrop (actual: ${drawImageCalls})`);
assert(fillRectCalls > 0, 'fillRect called to render translucent tinted backdrop overlay');

// Test with no blur (blurRadius = 0)
const sharpModal = new UIModal({
  open: true,
  animated: false,
});
sharpModal.addChild(new UIView({ width: 300, height: 200 }));

drawImageCalls = 0;
sharpModal.render(mockCtx);
assert(drawImageCalls === 0, 'No drawImage blur pass executed when backdropBlur is not set (0 overhead)');

// -----------------------------------------------------------------------------
// Test 4: .cvs Compiler Code Generation for Modal Blur
// -----------------------------------------------------------------------------
console.log('\nTest 4: .cvs Compiler Code Generation for <modal>');

const cvsTemplate = `
<script lang="ts">
  const isModalOpen = signal(true);
  const blurAmount = signal('16px');
</script>

<view>
  <modal :open="isModalOpen.value" backdropBlur="12px" backdropColor="rgba(0,0,0,0.5)">
    <view width="400" height="300" backgroundColor="#1e293b" borderRadius="12">
      <text>Frosted Glass Modal</text>
    </view>
  </modal>

  <modal :open="isModalOpen.value" :backdropBlur="blurAmount.value">
    <view width="400" height="300" backgroundColor="#1e293b">
      <text>Dynamic Blur Modal</text>
    </view>
  </modal>
</view>
`;


const result = compileCVS(cvsTemplate);
assert(result.code.includes('new UIModal('), 'Compiler generates UIModal instantiation');
assert(result.code.includes('"backdropBlur":"12px"'), 'Compiler preserves static backdropBlur="12px"');
assert(result.code.includes('.setBackdropBlur('), 'Compiler generates reactive .setBackdropBlur() binding');

console.log('\n🎉 All UIModal Backdrop Blur tests passed successfully!\n');
