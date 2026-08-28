import assert from 'assert';
import { es } from '../src/i18n/es';
import { en } from '../src/i18n/en';
import { currentLocale, t, setLocale, toggleLocale } from '../src/i18n/index';

console.log('🚀 Running CanvApps i18n Tests...\n');

// Test 1: Parity between ES and EN dictionaries
console.log('Test 1: Exact key structure parity between ES and EN');
function compareKeys(objA: any, objB: any, path = ''): void {
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  for (const k of keysA) {
    const currentPath = path ? `${path}.${k}` : k;
    assert(keysB.includes(k), `Key "${currentPath}" missing in comparison dictionary`);
    if (typeof objA[k] === 'object' && objA[k] !== null && !Array.isArray(objA[k])) {
      compareKeys(objA[k], objB[k], currentPath);
    }
  }
}

compareKeys(es, en);
compareKeys(en, es);
console.log('  ✓ All dictionary keys match between ES and EN without any missing entries');

// Test 2: Unmodified code literals and translated code comments
console.log('Test 2: Preserving untranslated code commands & translating code comments');
assert.strictEqual(es.home.installCommand, 'npm create canvapps@latest my-app');
assert.strictEqual(en.home.installCommand, 'npm create canvapps@latest my-app');
assert(es.docs.codeComments.createApp.includes('Crear nuevo proyecto'));
assert(en.docs.codeComments.createApp.includes('Create new interactive'));
console.log('  ✓ Code literals preserved intact and code comments localized');

// Test 3: Reactive switching via setLocale and toggleLocale
console.log('Test 3: Reactive locale switching');
setLocale('es');
assert.strictEqual(currentLocale.value, 'es');
assert.strictEqual(t.value.header.navHome, 'Inicio');

toggleLocale();
assert.strictEqual(currentLocale.value, 'en');
assert.strictEqual(t.value.header.navHome, 'Home');

setLocale('es');
assert.strictEqual(currentLocale.value, 'es');
assert.strictEqual(t.value.header.navHome, 'Inicio');
assert.strictEqual(t.value.showcase.galleryAction, 'Explorar Galería →');
assert.strictEqual(t.value.showcase.musicAction, 'Abrir Reproductor →');
assert.strictEqual(t.value.gallery.allCategory, 'Todos');
assert.strictEqual(t.value.music.title, 'Reproductor');

setLocale('en');
assert.strictEqual(currentLocale.value, 'en');
assert.strictEqual(t.value.header.navHome, 'Home');
assert.strictEqual(t.value.showcase.galleryAction, 'Explore Gallery →');
assert.strictEqual(t.value.showcase.musicAction, 'Launch Player →');
assert.strictEqual(t.value.gallery.allCategory, 'All');
assert.strictEqual(t.value.music.title, 'Music Player');
console.log('  ✓ Signals reactively update translation dictionary on locale change');

console.log('\n🎉 All i18n tests passed successfully!\n');
