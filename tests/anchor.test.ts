import {
  UIAnchor,
  UILink,
  UIView,
  compileCVS,
  GhostDOM,
  createRouter,
  FlexLayout,
  signal,
} from '../CanvApps';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

console.log('🚀 Running UIAnchor / UILink & Ghost DOM Navigation Tests...\n');

// -----------------------------------------------------------------------------
// Test 1: Instantiation, Defaults, and UILink Alias
// -----------------------------------------------------------------------------
console.log('Test 1: UIAnchor & UILink Instantiation and Defaults');

const defaultAnchor = new UIAnchor();
assert(defaultAnchor.styles.cursor === 'pointer', 'Default cursor should be "pointer"');
assert(defaultAnchor.styles.color === '#1a73e8', 'Default color should be "#1a73e8"');
assert(defaultAnchor.styles.hoverColor === '#174ea6', 'Default hoverColor should be "#174ea6"');
assert(defaultAnchor.styles.activeColor === '#185abc', 'Default activeColor should be "#185abc"');
assert(defaultAnchor.styles.visitedColor === '#681da8', 'Default visitedColor should be "#681da8"');
assert(defaultAnchor.styles.underline === 'hover', 'Default underline mode should be "hover"');
assert(defaultAnchor.styles.underlineOffset === 2, 'Default underlineOffset should be 2');
assert(defaultAnchor.styles.underlineThickness === 1, 'Default underlineThickness should be 1');
assert(defaultAnchor.styles.target === '_self', 'Default target should be "_self"');
assert(defaultAnchor.getGhostType() === 'anchor', 'getGhostType() should return "anchor"');
assert(UILink === UIAnchor, 'UILink is an alias for UIAnchor');

// Overload 1: Text + Styles
const privacyLink = new UIAnchor('Privacy Policy', {
  href: 'https://policies.google.com/privacy',
  target: '_blank',
  underline: 'always',
});
assert(privacyLink.getText() === 'Privacy Policy', 'Text initialized via constructor');
assert(privacyLink.getHref() === 'https://policies.google.com/privacy', 'Href initialized via constructor');
assert(privacyLink.getTarget() === '_blank', 'Target initialized via constructor');
assert(privacyLink.getRel() === 'noopener noreferrer', 'Rel defaults to "noopener noreferrer" for _blank');
assert(privacyLink.getUnderline() === 'always', 'Underline initialized via constructor');

// Overload 2: Text + String Href + Options
const helpLink = new UIAnchor('Help Center', 'https://help.example.com', { color: '#0f9d58' });
assert(helpLink.getText() === 'Help Center', 'Text initialized via string overload');
assert(helpLink.getHref() === 'https://help.example.com', 'Href initialized via string overload');
assert(helpLink.styles.color === '#0f9d58', 'Color initialized via string overload');

// Overload 3: Single Options Object
const settingsLink = new UIAnchor({ text: 'Settings', href: '/settings' });
assert(settingsLink.getText() === 'Settings', 'Text initialized via options object');
assert(settingsLink.getHref() === '/settings', 'Href initialized via options object');

// -----------------------------------------------------------------------------
// Test 2: Accessors & Mutators
// -----------------------------------------------------------------------------
console.log('\nTest 2: Accessors & Dynamic Mutators');

const anchor = new UIAnchor('Home', { href: '/' });
anchor.setHref('/dashboard');
assert(anchor.getHref() === '/dashboard', 'setHref() updates href');

anchor.setText('Dashboard');
assert(anchor.getText() === 'Dashboard', 'setText() updates text');
assert(anchor.getLabel() === 'Dashboard', 'getLabel() returns updated text');

anchor.setLabel('User Dashboard');
assert(anchor.getText() === 'User Dashboard', 'setLabel() updates text');

anchor.setTarget('_top');
assert(anchor.getTarget() === '_top', 'setTarget() updates target');

anchor.setRel('author');
assert(anchor.getRel() === 'author', 'setRel() updates rel');

anchor.setUnderline('never');
assert(anchor.getUnderline() === 'never', 'setUnderline() updates underline');

anchor.setDisabled(true);
assert(anchor.isDisabled() === true, 'setDisabled(true) sets disabled state');
assert(anchor.styles.cursor === 'not-allowed', 'Disabled anchor changes cursor to "not-allowed"');

anchor.setDisabled(false);
assert(anchor.isDisabled() === false, 'setDisabled(false) restores enabled state');
assert(anchor.styles.cursor === 'pointer', 'Enabled anchor restores cursor to "pointer"');

// -----------------------------------------------------------------------------
// Test 3: Layout Measurement & Constraints
// -----------------------------------------------------------------------------
console.log('\nTest 3: Layout Measurement & Constraints');

const measuredAnchor = new UIAnchor('Click Here to Learn More', {
  fontSize: 16,
  padding: [6, 12],
});

const size = measuredAnchor.measure(800, 600);
assert(size.width > 0, `Measured width is positive (${size.width}px)`);
assert(size.height >= 16 + 12, `Measured height accounts for font and padding (${size.height}px)`);

// Fixed width/height
const fixedAnchor = new UIAnchor('Fixed Link', { width: 200, height: 40 });
const fixedSize = fixedAnchor.measure(800, 600);
assert(fixedSize.width === 200, 'Explicit width respected');
assert(fixedSize.height === 40, 'Explicit height respected');

// FlexLayout integration
const container = new UIView({ width: 400, height: 300, flexDirection: 'column', gap: 10 });
container.addChild(new UIAnchor('Link 1', { href: '/1' }));
container.addChild(new UIAnchor('Link 2', { href: '/2' }));
FlexLayout.calculateLayout(container, 400, 300);
assert(container.children[0].layoutRect.height > 0, 'First child laid out with non-zero height');
assert(container.children[1].layoutRect.y > container.children[0].layoutRect.y, 'Second child positioned below first child');

// -----------------------------------------------------------------------------
// Test 4: Canvas 2D Rendering & Interactive Visual States
// -----------------------------------------------------------------------------
console.log('\nTest 4: Canvas 2D Paint Pass & State Transitions');

let filledText = '';
let textFillColor = '';
let strokeCalls = 0;
let strokeStyle = '';

const mockCtx: any = {
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  closePath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  rect: () => {},
  stroke: () => { strokeCalls++; },
  fill: () => {},
  fillText: (text: string) => {
    filledText = text;
    textFillColor = mockCtx.fillStyle;
  },
  measureText: (str: string) => ({ width: str.length * 8 }),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: '',
  textBaseline: '',
};

// 4.1 Default normal state (underline="hover", isHovered=false)
const testAnchor = new UIAnchor('Docs', {
  color: '#1a73e8',
  hoverColor: '#174ea6',
  activeColor: '#185abc',
  visitedColor: '#681da8',
  underline: 'hover',
});
testAnchor.setLayout(0, 0, 100, 30);
testAnchor.updateWorldTransform(0, 0);

filledText = '';
strokeCalls = 0;
testAnchor.draw(mockCtx);
assert(filledText === 'Docs', 'Draw renders link text');
assert(textFillColor === '#1a73e8', `Default color is #1a73e8 (actual: ${textFillColor})`);
assert(strokeCalls === 0, 'No underline stroke in normal state when underline="hover"');

// 4.2 Hovered state (underline="hover", isHovered=true)
testAnchor.isHovered = true;
strokeCalls = 0;
testAnchor.draw(mockCtx);
assert(textFillColor === '#174ea6', `Hover color applied on hover (actual: ${textFillColor})`);
assert(strokeCalls === 1, 'Underline stroke line drawn on hover when underline="hover"');

// 4.3 Pressed state (isPressed=true)
testAnchor.isPressed = true;
testAnchor.draw(mockCtx);
assert(textFillColor === '#185abc', `Active color applied when pressed (actual: ${textFillColor})`);
testAnchor.isPressed = false;
testAnchor.isHovered = false;

// 4.4 Visited state (isVisited=true)
testAnchor.isVisited = true;
testAnchor.draw(mockCtx);
assert(textFillColor === '#681da8', `Visited color applied when visited (actual: ${textFillColor})`);

// 4.5 Underline mode "always"
const alwaysUnderline = new UIAnchor('Always Underlined', { underline: 'always', color: '#2563eb' });
alwaysUnderline.setLayout(0, 0, 150, 30);
strokeCalls = 0;
alwaysUnderline.draw(mockCtx);
assert(strokeCalls === 1, 'Underline stroke drawn when underline="always" even if not hovered');

// 4.6 Underline mode "never"
const neverUnderline = new UIAnchor('Never Underlined', { underline: 'never', color: '#2563eb' });
neverUnderline.setLayout(0, 0, 150, 30);
neverUnderline.isHovered = true;
strokeCalls = 0;
neverUnderline.draw(mockCtx);
assert(strokeCalls === 0, 'No underline stroke drawn when underline="never" even when hovered');

// -----------------------------------------------------------------------------
// Test 5: Built-in SPA Router Navigation & Window Open
// -----------------------------------------------------------------------------
console.log('\nTest 5: Built-in Router & Window Navigation');

// Setup global router
const router = createRouter({
  routes: [
    { path: '/', component: () => new UIView() },
    { path: '/settings', component: () => new UIView() },
    { path: '/profile', component: () => new UIView() },
  ],
  initialRoute: '/',
  mode: 'memory',
});

assert(router.currentPath.value === '/', 'Initial router path is "/"');

// 5.1 Internal route navigation
const navAnchor = new UIAnchor('Settings', { href: '/settings' });
assert(!navAnchor.isVisited, 'Link is initially unvisited');

navAnchor.navigate();
assert(router.currentPath.value === '/settings', `Router navigated to internal route "${router.currentPath.value}"`);
assert(navAnchor.isVisited === true, 'Link marked as visited after navigation');

// 5.2 Click event triggers navigate
const profileAnchor = new UIAnchor('Profile', { href: '/profile' });
profileAnchor.emit('click', { defaultPrevented: false });
assert(router.currentPath.value === '/profile', `Click event navigated to "${router.currentPath.value}"`);

// 5.3 PreventDefault on click prevents navigation
profileAnchor.setHref('/');
profileAnchor.emit('click', { defaultPrevented: true });
assert(router.currentPath.value === '/profile', 'preventDefault on click prevented router navigation');

// 5.4 External URL & _blank simulation
let openedUrl = '';
let openedTarget = '';
let openedRel = '';

const originalWindow = (globalThis as any).window;
(globalThis as any).window = {
  open: (url: string, target: string, rel: string) => {
    openedUrl = url;
    openedTarget = target;
    openedRel = rel;
  },
  location: { href: '' },
};

const externalBlankAnchor = new UIAnchor('External', {
  href: 'https://example.com/docs',
  target: '_blank',
});
externalBlankAnchor.navigate();
assert(openedUrl === 'https://example.com/docs', `window.open called with url: ${openedUrl}`);
assert(openedTarget === '_blank', `window.open called with target: ${openedTarget}`);
assert(openedRel === 'noopener noreferrer', `window.open called with rel: ${openedRel}`);

// Restore global window
if (originalWindow) {
  (globalThis as any).window = originalWindow;
} else {
  delete (globalThis as any).window;
}

// -----------------------------------------------------------------------------
// Test 6: Ghost DOM Projection & HTML Anchor Mapping
// -----------------------------------------------------------------------------
console.log('\nTest 6: Ghost DOM Projection (<a class="canvapps-ghost-anchor">)');

// Mock minimal document & DOM for GhostDOM testing
const mockDomElements: any[] = [];
const mockDocument: any = {
  createElement: (tag: string) => {
    const el: any = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      style: {},
      attributes: {},
      setAttribute: (k: string, v: string) => { el.attributes[k] = v; },
      getAttribute: (k: string) => el.attributes[k] || (el as any)[k],
      removeAttribute: (k: string) => { delete el.attributes[k]; },
      addEventListener: () => {},
      removeEventListener: () => {},
      remove: () => {
        const idx = mockDomElements.indexOf(el);
        if (idx !== -1) mockDomElements.splice(idx, 1);
      },
      appendChild: () => {},
      textContent: '',
    };
    mockDomElements.push(el);
    return el;
  },
  getElementById: () => null,
  body: {
    appendChild: () => {},
  },
  head: {
    appendChild: () => {},
  },
};

(globalThis as any).document = mockDocument;
(globalThis as any).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getSelection: () => null,
};
(globalThis as any).HTMLAnchorElement = function () {};

const ghostDom = new GhostDOM();

const ghostAnchorNode = new UIAnchor('Privacy', {
  href: 'https://policies.google.com/privacy',
  target: '_blank',
});
ghostAnchorNode.setLayout(10, 20, 120, 28);
ghostAnchorNode.updateWorldTransform(10, 20);

const projectedEl = ghostDom.register(ghostAnchorNode as any);
assert(projectedEl !== null, 'GhostDOM registered anchor target');
assert(projectedEl?.tagName === 'A', `Projected tag is <A> (actual: ${projectedEl?.tagName})`);
assert(projectedEl?.className === 'canvapps-ghost-anchor', 'Ghost anchor has class "canvapps-ghost-anchor"');
assert(projectedEl?.href === 'https://policies.google.com/privacy', `Ghost anchor href synced: ${projectedEl?.href}`);
assert(projectedEl?.target === '_blank', `Ghost anchor target synced: ${projectedEl?.target}`);
assert(projectedEl?.rel === 'noopener noreferrer', `Ghost anchor rel synced: ${projectedEl?.rel}`);
assert(projectedEl?.textContent === 'Privacy', `Ghost anchor textContent synced: ${projectedEl?.textContent}`);
assert(projectedEl?.getAttribute('aria-label') === 'Privacy', 'Ghost anchor has aria-label for screen readers');

// Update position
ghostAnchorNode.setLayout(50, 100, 140, 32);
ghostAnchorNode.updateWorldTransform(0, 0);
ghostDom.updatePosition(ghostAnchorNode as any);
assert(projectedEl?.style.left === '50px', `Ghost anchor left updated: ${projectedEl?.style.left}`);
assert(projectedEl?.style.top === '100px', `Ghost anchor top updated: ${projectedEl?.style.top}`);

// Pruning
const activeIds = new Set<string>(); // anchor not in active set
ghostDom.prune(activeIds);
assert(!mockDomElements.includes(projectedEl), 'Ghost anchor pruned when removed from tree');

// -----------------------------------------------------------------------------
// Test 7: .cvs Compiler Code Generation for <a> and <link>
// -----------------------------------------------------------------------------
console.log('\nTest 7: .cvs Compiler Code Generation (<a> and <link>)');

const cvsTemplate = `
<script lang="ts">
  const externalUrl = signal('https://policies.google.com/privacy');
  const internalRoute = signal('/settings');
  const linkText = signal('Dynamic Link');
</script>

<view flexDirection="column" gap="12">
  <!-- Static <a> External Link -->
  <a href="https://google.com" target="_blank" color="#70757a" hoverColor="#202124" underline="hover" fontSize="14">
    Privacidad
  </a>

  <!-- Static <link> Internal Link -->
  <link href="/settings" color="#1a73e8" underline="hover" fontSize="15" fontWeight="500">
    Configuración
  </link>

  <!-- Dynamic :href & Text Interpolation -->
  <a :href="externalUrl.value" underline="always" @click="() => console.log('clicked')">
    {{ linkText.value }}
  </a>
</view>
`;

const result = compileCVS(cvsTemplate);
assert(result.code.includes('import { UIView, UIText, UIButton, UIInput, UIModal, UIMotion, UIImage, UIScrollView, UIAnchor, UILink'), 'Compiler imports UIAnchor and UILink');
assert(result.code.includes('new UIAnchor("Privacidad"'), 'Compiler generates UIAnchor for <a> tag');
assert(result.code.includes('"href":"https://google.com"'), 'Compiler preserves static href');
assert(result.code.includes('"target":"_blank"'), 'Compiler preserves static target="_blank"');
assert(result.code.includes('"hoverColor":"#202124"'), 'Compiler preserves hoverColor');
assert(result.code.includes('new UIAnchor("Configuración"'), 'Compiler generates UIAnchor for <link> tag');
assert(result.code.includes('"href":"/settings"'), 'Compiler preserves <link> href');
assert(result.code.includes('.setHref(String(externalUrl.value ?? \'\'))'), 'Compiler generates reactive .setHref() for :href');
assert(result.code.includes('.setText(String(`' + '${linkText.value}`'), 'Compiler generates reactive .setText() for dynamic interpolation');
assert(result.code.includes('.on("click"'), 'Compiler binds @click event');

console.log('\n🎉 All UIAnchor, UILink, Ghost DOM Navigation, and Compiler tests passed successfully!\n');
