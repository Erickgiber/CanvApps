import {
  UIInput,
  UIView,
  GhostDOM,
  UIElement,
} from '../CanvApps';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

console.log('🚀 Running Ghost DOM "Color Real" & A11y / Anti-Phishing Tests...\n');

// -----------------------------------------------------------------------------
// DOM Mock Environment
// -----------------------------------------------------------------------------
const mockDomElements: any[] = [];
let injectedStyles = '';

const mockDocument: any = {
  createElement: (tag: string) => {
    const el: any = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      style: {},
      attributes: {},
      setAttribute: (k: string, v: string) => { el.attributes[k] = v; },
      getAttribute: (k: string) => el.attributes[k] ?? null,
      removeAttribute: (k: string) => { delete el.attributes[k]; },
      hasAttribute: (k: string) => k in el.attributes,
      addEventListener: (type: string, fn: Function) => {
        el._listeners = el._listeners || {};
        el._listeners[type] = el._listeners[type] || [];
        el._listeners[type].push(fn);
      },
      removeEventListener: (type: string, fn: Function) => {
        if (el._listeners && el._listeners[type]) {
          el._listeners[type] = el._listeners[type].filter((f: any) => f !== fn);
        }
      },
      dispatchEvent: (e: any) => {
        if (el._listeners && el._listeners[e.type]) {
          el._listeners[e.type].forEach((fn: any) => fn(e));
        }
      },
      remove: () => {
        const idx = mockDomElements.indexOf(el);
        if (idx !== -1) mockDomElements.splice(idx, 1);
      },
      appendChild: (child: any) => {
        child.parentElement = el;
      },
      removeChild: (child: any) => {
        child.parentElement = null;
      },
      textContent: '',
      value: '',
      placeholder: '',
      selectionStart: 0,
      selectionEnd: 0,
      setSelectionRange: (start: number, end: number) => {
        el.selectionStart = start;
        el.selectionEnd = end;
      },
      focus: () => {
        (globalThis as any).document.activeElement = el;
      },
      blur: () => {
        if ((globalThis as any).document.activeElement === el) {
          (globalThis as any).document.activeElement = null;
        }
      },
    };
    mockDomElements.push(el);
    return el;
  },
  getElementById: (id: string) => {
    return mockDomElements.find(e => e.id === id) || null;
  },
  head: {
    appendChild: (el: any) => {
      if (el.textContent) {
        injectedStyles += el.textContent;
      }
    },
  },
  body: {
    appendChild: (el: any) => {
      el.parentElement = mockDocument.body;
    },
    removeChild: (el: any) => {
      el.parentElement = null;
    },
  },
  activeElement: null,
};

(globalThis as any).document = mockDocument;
(globalThis as any).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getSelection: () => null,
  setInterval: globalThis.setInterval.bind(globalThis),
  clearInterval: globalThis.clearInterval.bind(globalThis),
};
(globalThis as any).HTMLInputElement = function () {};
(globalThis as any).HTMLTextAreaElement = function () {};
(globalThis as any).HTMLAnchorElement = function () {};

// -----------------------------------------------------------------------------
// Test 1: Container Overlay Accessibility (No aria-hidden="false")
// -----------------------------------------------------------------------------
console.log('Test 1: Overlay Container Accessibility & Style Injection');

const ghostDom = new GhostDOM();
const containerEl = mockDomElements.find(e => e.id === 'canvapps-ghost-dom-overlay');

assert(containerEl !== undefined, 'Overlay container #canvapps-ghost-dom-overlay created');
assert(!containerEl.hasAttribute('aria-hidden'), 'Overlay container does NOT have aria-hidden attribute (W3C standard)');
assert(containerEl.style.position === 'absolute', 'Overlay has position absolute');
assert(containerEl.style.pointerEvents === 'none', 'Overlay container has pointer-events none');
assert(injectedStyles.includes('caret-color: transparent !important'), 'Global styles contain caret-color reset for inputs');
assert(injectedStyles.includes('input::placeholder'), 'Global styles contain input placeholder styling');

// -----------------------------------------------------------------------------
// Test 2: Real Color Resolution (resolveEffectiveBackgroundColor)
// -----------------------------------------------------------------------------
console.log('\nTest 2: Background Color Resolution (resolveEffectiveBackgroundColor)');

const defaultInput = new UIInput();
assert(ghostDom.resolveEffectiveBackgroundColor(defaultInput as any) === '#ffffff', 'Default input background resolves to "#ffffff"');

const darkParent = new UIView({ backgroundColor: '#1e293b' });
const childInput = new UIInput({ backgroundColor: 'transparent' });
darkParent.addChild(childInput);
assert(ghostDom.resolveEffectiveBackgroundColor(childInput as any) === '#1e293b', 'Input inherits ancestor background "#1e293b" when transparent');

const explicitColorInput = new UIInput({ backgroundColor: '#f0fdf4' });
assert(ghostDom.resolveEffectiveBackgroundColor(explicitColorInput as any) === '#f0fdf4', 'Explicit background "#f0fdf4" respected');

// -----------------------------------------------------------------------------
// Test 3: Input Registration with Transparent Fill & Opacity 1 (Single Source of Truth)
// -----------------------------------------------------------------------------
console.log('\nTest 3: Ghost Input Registration (Transparent Text Fill & Opacity 1)');

const testInput = new UIInput({
  value: 'user@example.com',
  placeholder: 'Enter your email',
  fontSize: 16,
  fontFamily: 'Inter, sans-serif',
  fontWeight: '500',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  padding: [10, 16],
  borderRadius: 8,
});
testInput.setLayout(20, 50, 280, 48);
testInput.updateWorldTransform(20, 50);

const ghostInput = ghostDom.register(testInput as any) as any;
assert(ghostInput !== null, 'Ghost input registered');
assert(ghostInput.tagName === 'INPUT', 'Projected element tag is <INPUT>');
assert(ghostInput.style.opacity === '1', 'Ghost input opacity is "1" (NOT 0, passes anti-phishing scanner)');
assert(ghostInput.style.color === 'transparent', 'Ghost input text color is transparent (prevents double text)');
assert(ghostInput.style.WebkitTextFillColor === 'transparent', 'Ghost input WebkitTextFillColor is transparent');
assert(ghostInput.style.pointerEvents === 'auto', 'Ghost input pointer-events is "auto"');
assert(ghostInput.style.boxSizing === 'border-box', 'Ghost input boxSizing is "border-box"');
assert(ghostInput.style.caretColor === 'transparent', 'Ghost input caretColor is "transparent"');

// -----------------------------------------------------------------------------
// Test 4: Dynamic Synchronization (updatePosition)
// -----------------------------------------------------------------------------
console.log('\nTest 4: Dynamic Geometry and Typography Synchronization');

testInput.setLayout(30, 80, 320, 52);
testInput.updateWorldTransform(0, 0);
ghostDom.updatePosition(testInput as any);

assert(ghostInput.style.left === '30px', `Left synchronized: ${ghostInput.style.left}`);
assert(ghostInput.style.top === '80px', `Top synchronized: ${ghostInput.style.top}`);
assert(ghostInput.style.width === '320px', `Width synchronized: ${ghostInput.style.width}`);
assert(ghostInput.style.height === '52px', `Height synchronized: ${ghostInput.style.height}`);
assert(ghostInput.style.fontSize === '16px', `FontSize synchronized: ${ghostInput.style.fontSize}`);
assert(ghostInput.style.fontFamily === 'Inter, sans-serif', `FontFamily synchronized: ${ghostInput.style.fontFamily}`);
assert(ghostInput.style.padding === '10px 16px 10px 16px', `Padding synchronized: ${ghostInput.style.padding}`);
assert(ghostInput.value === 'user@example.com', `Input value synchronized: ${ghostInput.value}`);
assert(ghostInput.placeholder === 'Enter your email', `Input placeholder synchronized: ${ghostInput.placeholder}`);

// -----------------------------------------------------------------------------
// Test 5: Bidirectional Native Input & Keyboard Events
// -----------------------------------------------------------------------------
console.log('\nTest 5: Bidirectional Events (Native Input & Focus/Blur)');

let receivedInputVal = '';
testInput.on('input', (e: any) => {
  receivedInputVal = e.value;
});

// Simulate native input typing
ghostInput.value = 'new_value@test.com';
ghostInput.selectionStart = 18;
ghostInput.dispatchEvent({ type: 'input' });

assert(testInput.getValue() === 'new_value@test.com', 'Native input event updated UIInput value');
assert(receivedInputVal === 'new_value@test.com', 'UIInput emitted "input" event with new value');

// Focus & Blur
ghostInput.dispatchEvent({ type: 'focus' });
assert(testInput.isFocused === true, 'Ghost focus event focused UIInput');

ghostInput.dispatchEvent({ type: 'blur' });
assert(testInput.isFocused === false, 'Ghost blur event blurred UIInput');

// -----------------------------------------------------------------------------
// Test 6: Cmd+A -> Backspace -> Type (Bug Regression Test)
// -----------------------------------------------------------------------------
console.log('\nTest 6: Cmd+A -> Backspace -> Type new text (No Ghosting/Resurrection)');

const inputForEdit = new UIInput({ value: 'julian.vance@canvapps.dev' });
inputForEdit.setLayout(0, 0, 200, 40);
const ghostForEdit = ghostDom.register(inputForEdit as any) as any;
ghostForEdit.value = 'julian.vance@canvapps.dev';

// Step 1: Cmd+A (Select All)
ghostForEdit.selectionStart = 0;
ghostForEdit.selectionEnd = ghostForEdit.value.length;
ghostForEdit.dispatchEvent({ type: 'select' });
assert(inputForEdit.hasSelection(), 'Canvas UIInput recognized full selection range from native select');
assert(inputForEdit.getSelectionRange().start === 0 && inputForEdit.getSelectionRange().end === 25, 'Selection range covers full string (0..25)');

// Step 2: Backspace (Native deletion of selection)
ghostForEdit.value = '';
ghostForEdit.selectionStart = 0;
ghostForEdit.selectionEnd = 0;
ghostForEdit.dispatchEvent({ type: 'input' });
assert(inputForEdit.getValue() === '', 'UIInput value successfully cleared on backspace');
assert(!inputForEdit.hasSelection(), 'UIInput selection cleared');

// Step 3: Type new text
ghostForEdit.value = 'fresh_input';
ghostForEdit.selectionStart = 11;
ghostForEdit.selectionEnd = 11;
ghostForEdit.dispatchEvent({ type: 'input' });
assert(inputForEdit.getValue() === 'fresh_input', `UIInput value contains strictly new text: "${inputForEdit.getValue()}"`);
assert(!inputForEdit.getValue().includes('julian.vance'), 'Old deleted text does NOT resurrect');

// Step 4: Programmatic selectAll() and setValue() sync to DOM
inputForEdit.setValue('reset_value');
assert(ghostForEdit.value === 'reset_value', 'Programmatic setValue() synchronized to ghost DOM element value');

inputForEdit.selectAll();
assert(ghostForEdit.selectionStart === 0 && ghostForEdit.selectionEnd === 11, 'Programmatic selectAll() synchronized selection range to ghost DOM element');

// -----------------------------------------------------------------------------
// Test 7: Pruning & Destruction
// -----------------------------------------------------------------------------
console.log('\nTest 7: Pruning and Ghost DOM Destruction');

const activeSet = new Set<string>(); // empty set -> testInput should be pruned
ghostDom.prune(activeSet);
assert(!mockDomElements.includes(ghostInput), 'Prune removed unreferenced ghost input');

ghostDom.destroy();
assert(containerEl.parentElement === null, 'GhostDOM container detached on destroy');

console.log('\n🎉 All Ghost DOM "Color Real", Accessibility, and Anti-Phishing Tests passed successfully!\n');
