import { Engine, UIView, UIText } from './../CanvApps';
// 1. Initialize CanvApps Engine connected to the container
const engine = new Engine({
    container: '#app-container',
    backgroundColor: '#0f172a', // Deep slate background
    autoResize: true,
});
// 2. Build the Root Container (Column flex layout, centered content)
const root = new UIView({
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 24,
});
// 3. Header Card
const headerCard = new UIView({
    width: 580,
    padding: 24,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    boxShadow: {
        offsetX: 0,
        offsetY: 10,
        blur: 25,
        color: 'rgba(0, 0, 0, 0.5)',
    },
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
});
const title = new UIText('🚀 CanvApps UI Engine', {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#38bdf8',
    textAlign: 'center',
});
const subtitle = new UIText('A high-performance 100% Canvas UI Framework with pure mathematical Flexbox, multi-target build support (SPA, PWA, Capacitor), and zero DOM overhead.', {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 1.5,
    wordWrap: true,
});
headerCard.addChild(title).addChild(subtitle);
// 4. Feature Badges Row (Flexbox Row with auto wrapping & space distribution)
const badgesRow = new UIView({
    width: 580,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
});
function createFeatureCard(icon, name, desc) {
    const card = new UIView({
        flexGrow: 1,
        flexBasis: 0,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
    });
    const cardTitle = new UIText(`${icon} ${name}`, {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#f8fafc',
    });
    const cardDesc = new UIText(desc, {
        fontSize: 12,
        color: '#64748b',
        lineHeight: 1.4,
        wordWrap: true,
    });
    return card.addChild(cardTitle).addChild(cardDesc);
}
badgesRow
    .addChild(createFeatureCard('⚡', 'Pure Canvas', 'Zero DOM elements. Rendered entirely via Canvas 2D / Retina HiDPI.'))
    .addChild(createFeatureCard('📐', 'Flexbox Math', 'Built-in W3C flexbox mathematical solver without browser DOM.'))
    .addChild(createFeatureCard('📱', 'Multi-Target', 'Compiles cleanly to SPA, PWA, or native mobile with Capacitor.'));
// 5. Interactive Demo Button / Status Pill
const statusPill = new UIView({
    padding: [10, 20],
    backgroundColor: '#0284c7',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: {
        offsetX: 0,
        offsetY: 4,
        blur: 14,
        color: 'rgba(2, 132, 199, 0.4)',
    },
});
const statusText = new UIText('Phase 1 Active: Graphics Core Ready', {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
});
statusPill.addChild(statusText);
// 6. Assemble hierarchy & start engine
root.addChild(headerCard).addChild(badgesRow).addChild(statusPill);
engine.setRoot(root);
engine.start();
console.log('✨ CanvApps Engine started successfully!');
