import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * Resolves a module specifier to an absolute file path on disk.
 */
function resolveImportPath(baseDir: string, importPath: string): string | null {
  const extensions = ['', '.cvs', '.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.cvs', '/index.js'];
  for (const ext of extensions) {
    const candidate = path.resolve(baseDir, importPath + ext);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

/**
 * Checks if a target file exports a given symbol name.
 */
function fileExportsSymbol(filePath: string, symbol: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Default import or standard export check
    if (symbol === 'default') {
      return /export\s+default\b/m.test(content);
    }

    // Direct named export: `export function Foo`, `export const Bar`, `export class Baz`, `export type Qux`, `export interface Quux`, `export enum Corge`
    const directExportRegex = new RegExp(
      `export\\s+(?:const|let|var|function|class|type|interface|enum|async\\s+function)\\s+${symbol}\\b`,
      'm'
    );
    if (directExportRegex.test(content)) {
      return true;
    }

    // Export list: `export { Foo, Bar as Baz }`
    const exportListRegex = /export\s*\{([^}]+)\}/g;
    let listMatch: RegExpExecArray | null;
    while ((listMatch = exportListRegex.exec(content)) !== null) {
      const specifiers = listMatch[1].split(',').map((s) => s.trim());
      for (const spec of specifiers) {
        const parts = spec.split(/\s+as\s+/);
        const exportedName = parts[1] || parts[0];
        if (exportedName === symbol) {
          return true;
        }
      }
    }

    // If it's a .cvs file, default export is always the compiled component
    if (filePath.endsWith('.cvs')) {
      return true;
    }
  } catch {
    // If unreadable, don't trigger false positives
    return true;
  }

  return false;
}

/**
 * Validates a CanvApps .cvs document and returns diagnostic errors and warnings.
 */
function validateCanvAppsDocument(document: vscode.TextDocument): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const text = document.getText();
  const currentDir = path.dirname(document.uri.fsPath);

  // ---------------------------------------------------------------------------
  // 1. Script Block Extraction & TypeScript / Import Validation
  // ---------------------------------------------------------------------------
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let scriptMatch: RegExpExecArray | null;
  let scriptCount = 0;

  while ((scriptMatch = scriptRegex.exec(text)) !== null) {
    scriptCount++;
    const scriptContent = scriptMatch[2];
    const scriptStartIndex = scriptMatch.index + scriptMatch[0].indexOf(scriptContent);

    // TypeScript syntax diagnostics on script block
    const sourceFile = ts.createSourceFile(
      'component.ts',
      scriptContent,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    // Report parse/syntax errors from TypeScript
    const parseDiagnostics = (sourceFile as any).parseDiagnostics || [];
    for (const diag of parseDiagnostics) {
      if (typeof diag.start === 'number' && typeof diag.length === 'number') {
        const absStart = scriptStartIndex + diag.start;
        const absEnd = absStart + diag.length;
        const startPos = document.positionAt(absStart);
        const endPos = document.positionAt(absEnd);
        const messageText = typeof diag.messageText === 'string' ? diag.messageText : diag.messageText?.messageText || 'TypeScript syntax error';

        diagnostics.push(
          new vscode.Diagnostic(
            new vscode.Range(startPos, endPos),
            `[CanvApps TS] ${messageText}`,
            vscode.DiagnosticSeverity.Error
          )
        );
      }
    }

    // Validate Import Statements
    const importRegex = /import\s+([\s\S]*?)\s+from\s+(['"])([^'"]+)\2/g;
    let impMatch: RegExpExecArray | null;

    while ((impMatch = importRegex.exec(scriptContent)) !== null) {
      const fullImportClause = impMatch[1].trim();
      const importSource = impMatch[3].trim();
      const matchOffsetInScript = impMatch.index;
      const sourceOffsetInScript = matchOffsetInScript + impMatch[0].lastIndexOf(importSource);
      const absSourceStart = scriptStartIndex + sourceOffsetInScript;
      const absSourceEnd = absSourceStart + importSource.length;

      // Only check relative / local path imports (start with ./ or ../ or /)
      if (importSource.startsWith('.') || importSource.startsWith('/')) {
        const resolved = resolveImportPath(currentDir, importSource);

        if (!resolved) {
          const range = new vscode.Range(
            document.positionAt(absSourceStart),
            document.positionAt(absSourceEnd)
          );
          diagnostics.push(
            new vscode.Diagnostic(
              range,
              `Cannot find module '${importSource}' or its corresponding type declarations.`,
              vscode.DiagnosticSeverity.Error
            )
          );
        } else {
          // If file exists, validate named imports: `import { A, B } from '...'`
          if (fullImportClause.includes('{') && fullImportClause.includes('}')) {
            const namedClause = fullImportClause.substring(
              fullImportClause.indexOf('{') + 1,
              fullImportClause.indexOf('}')
            );
            const specifiers = namedClause.split(',').map((s) => s.trim()).filter(Boolean);

            for (const spec of specifiers) {
              const symbolName = spec.split(/\s+as\s+/)[0].trim();
              if (symbolName && !fileExportsSymbol(resolved, symbolName)) {
                const specIndex = matchOffsetInScript + impMatch[0].indexOf(spec);
                const absSpecStart = scriptStartIndex + specIndex;
                const absSpecEnd = absSpecStart + spec.length;
                const range = new vscode.Range(
                  document.positionAt(absSpecStart),
                  document.positionAt(absSpecEnd)
                );

                diagnostics.push(
                  new vscode.Diagnostic(
                    range,
                    `Module '${importSource}' has no exported member '${symbolName}'.`,
                    vscode.DiagnosticSeverity.Error
                  )
                );
              }
            }
          }
        }
      }
    }
  }

  // Check for duplicate script blocks
  if (scriptCount > 1) {
    diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 8)),
        'CanvApps Single-File Components only support one <script> block per file.',
        vscode.DiagnosticSeverity.Error
      )
    );
  }

  // Check for unclosed <script> tag
  const openScriptMatch = /<script\b[^>]*>/i.exec(text);
  const closeScriptMatch = /<\/script>/i.exec(text);
  if (openScriptMatch && !closeScriptMatch) {
    const startPos = document.positionAt(openScriptMatch.index);
    const endPos = document.positionAt(openScriptMatch.index + openScriptMatch[0].length);
    diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(startPos, endPos),
        'Unclosed <script> tag. Missing matching </script>.',
        vscode.DiagnosticSeverity.Error
      )
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Robust Template Structure & Tag Matching Diagnostics
  // ---------------------------------------------------------------------------
  // Step A: Mask <script> blocks with whitespace of equal length
  let cleanTemplate = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => ' '.repeat(m.length));

  // Step B: Mask HTML comments <!-- ... -->
  cleanTemplate = cleanTemplate.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));

  // Step C: Mask mustache interpolations {{ ... }} to protect JS expressions (<, >, =>)
  cleanTemplate = cleanTemplate.replace(/\{\{[\s\S]*?\}\}/g, (m) => ' '.repeat(m.length));

  // Step D: Mask control directive headers (@if, @else if, @each, etc.) before the body "{"
  cleanTemplate = cleanTemplate.replace(/(@(?:if|else\s+if|each))\b[^{]*\{/g, (m) => ' '.repeat(m.length - 1) + '{');
  cleanTemplate = cleanTemplate.replace(/\{#(?:if|each)\b[^}]*\}/g, (m) => ' '.repeat(m.length));
  cleanTemplate = cleanTemplate.replace(/\{:else\}/g, (m) => ' '.repeat(m.length));
  cleanTemplate = cleanTemplate.replace(/\{\/(?:if|each)\}/g, (m) => ' '.repeat(m.length));

  // Step E: Parse and match tags
  const tagStack: { name: string; pos: vscode.Position; index: number; length: number }[] = [];
  const voidTags = new Set(['slot', 'image', 'input', 'br', 'hr', 'img']);

  let i = 0;
  const len = cleanTemplate.length;

  while (i < len) {
    if (cleanTemplate[i] === '<') {
      const isClosing = cleanTemplate[i + 1] === '/';
      const startName = isClosing ? i + 2 : i + 1;

      // Ensure tag name begins with a valid ASCII alphabetic character
      if (startName < len && /[a-zA-Z]/.test(cleanTemplate[startName])) {
        let nameEnd = startName + 1;
        while (nameEnd < len && /[a-zA-Z0-9_.-]/.test(cleanTemplate[nameEnd])) {
          nameEnd++;
        }
        const tagName = cleanTemplate.slice(startName, nameEnd);

        // Find matching tag end '>' while respecting quotes, template literals, and nested braces
        let inQuotes = false;
        let quoteChar = '';
        let braceDepth = 0;
        let tagEnd = -1;

        for (let j = nameEnd; j < len; j++) {
          const ch = cleanTemplate[j];
          if ((ch === '"' || ch === "'" || ch === '`') && !inQuotes) {
            inQuotes = true;
            quoteChar = ch;
          } else if (inQuotes && ch === quoteChar && cleanTemplate[j - 1] !== '\\') {
            inQuotes = false;
            quoteChar = '';
          } else if (!inQuotes && ch === '{') {
            braceDepth++;
          } else if (!inQuotes && ch === '}' && braceDepth > 0) {
            braceDepth--;
          } else if (!inQuotes && braceDepth === 0 && ch === '>') {
            tagEnd = j;
            break;
          }
        }

        if (tagEnd !== -1) {
          const matchLength = tagEnd - i + 1;
          const tagInner = cleanTemplate.slice(nameEnd, tagEnd).trim();
          const isSelfClosing = tagInner.endsWith('/') || voidTags.has(tagName.toLowerCase());

          if (isClosing) {
            if (tagStack.length === 0) {
              const pos = document.positionAt(i);
              diagnostics.push(
                new vscode.Diagnostic(
                  new vscode.Range(pos, document.positionAt(i + matchLength)),
                  `Unexpected closing tag </${tagName}> without matching opening tag.`,
                  vscode.DiagnosticSeverity.Error
                )
              );
            } else {
              const last = tagStack.pop()!;
              if (last.name.toLowerCase() !== tagName.toLowerCase()) {
                const pos = document.positionAt(i);
                diagnostics.push(
                  new vscode.Diagnostic(
                    new vscode.Range(pos, document.positionAt(i + matchLength)),
                    `Mismatched closing tag </${tagName}>. Expected </${last.name}> (opened on line ${last.pos.line + 1}).`,
                    vscode.DiagnosticSeverity.Error
                  )
                );
              }
            }
          } else if (!isSelfClosing) {
            tagStack.push({
              name: tagName,
              pos: document.positionAt(i),
              index: i,
              length: matchLength,
            });
          }

          i = tagEnd + 1;
          continue;
        }
      }
    }
    i++;
  }

  // Report any remaining unclosed tags
  for (const unclosed of tagStack) {
    const startPos = unclosed.pos;
    const endPos = document.positionAt(unclosed.index + unclosed.name.length + 1);
    diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(startPos, endPos),
        `Unclosed opening tag <${unclosed.name}>. Missing closing </${unclosed.name}> tag.`,
        vscode.DiagnosticSeverity.Error
      )
    );
  }

  return diagnostics;
}

/**
 * CanvApps Extension Activation
 */
export function activate(context: vscode.ExtensionContext): void {
  // 0. Real-time Diagnostic Collection
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('canvapps');

  const updateDiagnostics = (document: vscode.TextDocument) => {
    if (document.languageId === 'canvapps' || document.fileName.endsWith('.cvs')) {
      const diags = validateCanvAppsDocument(document);
      diagnosticCollection.set(document.uri, diags);
    }
  };

  // Validate on open, change, and save
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(updateDiagnostics),
    vscode.workspace.onDidChangeTextDocument((e) => updateDiagnostics(e.document)),
    vscode.workspace.onDidSaveTextDocument(updateDiagnostics),
    vscode.workspace.onDidCloseTextDocument((doc) => diagnosticCollection.delete(doc.uri)),
    diagnosticCollection
  );

  // Validate all currently open documents
  vscode.workspace.textDocuments.forEach(updateDiagnostics);

  // 1. Definition Provider (Cmd+Click / Ctrl+Click on symbols & imports)
  const definitionProvider = vscode.languages.registerDefinitionProvider('canvapps', {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
      const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z0-9_$]+/);
      if (!wordRange) return null;

      const word = document.getText(wordRange);
      if (!word) return null;

      const text = document.getText();
      const currentDir = path.dirname(document.uri.fsPath);

      // Extract <script> block
      const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/i;
      const scriptMatch = scriptRegex.exec(text);

      if (scriptMatch) {
        const scriptContent = scriptMatch[1];
        const scriptStartIndex = scriptMatch.index + scriptMatch[0].indexOf(scriptContent);

        // A. Search for local definitions (function, const, let, var, class, type, interface) in <script>
        const localDefRegex = new RegExp(
          `(?:function\\s+${word}\\b|(?:const|let|var)\\s+${word}\\b|class\\s+${word}\\b|type\\s+${word}\\b|interface\\s+${word}\\b|enum\\s+${word}\\b)`,
          'g'
        );

        let localMatch: RegExpExecArray | null;
        while ((localMatch = localDefRegex.exec(scriptContent)) !== null) {
          const matchOffset = scriptStartIndex + localMatch.index;
          const targetPos = document.positionAt(matchOffset);
          return new vscode.Location(document.uri, targetPos);
        }

        // B. Search for imported symbols in <script>
        const importRegex = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
        let impMatch: RegExpExecArray | null;

        while ((impMatch = importRegex.exec(scriptContent)) !== null) {
          const importClause = impMatch[1].trim();
          const importSource = impMatch[2].trim();

          const resolvedFilePath = resolveImportPath(currentDir, importSource);
          if (!resolvedFilePath) continue;

          // Case B1: Default import (e.g. `import DashboardView from './views/DashboardView.cvs'`)
          const defaultImportMatch = importClause.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
          if (defaultImportMatch && defaultImportMatch[0] === word) {
            return new vscode.Location(vscode.Uri.file(resolvedFilePath), new vscode.Position(0, 0));
          }

          // Case B2: Named imports (e.g. `import { sessionStore, navigateRoute } from './stores/session.store'`)
          if (importClause.includes('{') && importClause.includes('}')) {
            const namedClause = importClause.substring(importClause.indexOf('{') + 1, importClause.indexOf('}'));
            const specifiers = namedClause.split(',').map((s) => s.trim().split(/\s+as\s+/)[0]);

            if (specifiers.includes(word)) {
              try {
                const targetContent = fs.readFileSync(resolvedFilePath, 'utf8');
                const targetDefRegex = new RegExp(
                  `(?:export\\s+(?:const|let|var|function|class|type|interface|enum)\\s+${word}\\b|(?:const|let|var|function|class|type|interface|enum)\\s+${word}\\b)`,
                  'm'
                );
                const targetMatch = targetDefRegex.exec(targetContent);

                if (targetMatch) {
                  const linesBefore = targetContent.substring(0, targetMatch.index).split('\n');
                  const lineNum = linesBefore.length - 1;
                  const charNum = linesBefore[linesBefore.length - 1].length;
                  return new vscode.Location(vscode.Uri.file(resolvedFilePath), new vscode.Position(lineNum, charNum));
                }
              } catch {
                // Fallback to top of file
              }
              return new vscode.Location(vscode.Uri.file(resolvedFilePath), new vscode.Position(0, 0));
            }
          }
        }
      }

      return null;
    },
  });

  // 2. Hover Provider (Provides instant documentation on CanvApps built-in elements & directives)
  const hoverProvider = vscode.languages.registerHoverProvider('canvapps', {
    provideHover(document: vscode.TextDocument, position: vscode.Position) {
      const wordRange = document.getWordRangeAtPosition(position, /[@:A-Za-z0-9_$-]+/);
      if (!wordRange) return null;

      const word = document.getText(wordRange);

      const docs: Record<string, string> = {
        view: '### `<view>` (Pure Canvas 2D Flexbox Container)\n\nUniversal layout container rendered directly on Canvas 2D using sub-pixel flexbox math.\n\n**Props**: `width`, `height`, `flexDirection`, `alignItems`, `justifyContent`, `gap`, `padding`, `backgroundColor`, `borderRadius`, `borderColor`, `borderWidth`, `boxShadow`, `opacity`, `position`, `zIndex`.',
        text: '### `<text>` (Direct Canvas Text Node)\n\nHardware-accelerated text rendering with automatic line-breaking and sub-pixel glyph alignment.\n\n**Props**: `fontSize`, `fontWeight`, `fontFamily`, `color`, `lineHeight`, `letterSpacing`, `textAlign`, `selectable`.',
        button: '### `<button>` (Interactive Canvas Button)\n\nZero-DOM interactive button with built-in hover, active, and focus states.\n\n**Props**: `label`, `labelColor`, `backgroundColor`, `hoverBackgroundColor`, `activeBackgroundColor`, `borderRadius`, `padding`, `disabled`, `@click`.',
        image: '### `<image>` (Pure Canvas Image Node)\n\nHardware-accelerated bitmap rendering with automatic loader spinners, error fallbacks, and off-thread GPU decode.\n\n**Props**: `src`, `fit`, `width`, `height`, `borderRadius`, `showLoader`, `showErrorIcon`.',
        input: '### `<input>` (Ghost DOM Input Node)\n\nCombines native IME touch keyboard entry and clipboard support with Pure Canvas rendering.\n\n**Props**: `placeholder`, `placeholderColor`, `:value`, `focusBorderColor`, `@input`, `@submit`, `@change`.',
        modal: '### `<modal>` (Fullscreen Canvas Dialog Overlay)\n\nFrosted glass background blur (`backdrop-filter: blur`), backdrop dimming, and Smart Hero morph animations with zero DOM overhead.\n\n**Props**: `:open`, `backdropBlur`, `backdropFilter`, `backdropColor`, `blur`, `blurRadius`, `animation`, `duration`, `originRect`, `closeOnBackdropClick`, `@close`.',
        'scroll-view': '### `<scroll-view>` (Hardware-Accelerated Scroll Container)\n\nHardware-accelerated scrolling with momentum physics, touch drag panning, mouse wheel, and customizable scrollbars.\n\n**Props**: `scroll`, `scrollDirection`, `showScrollbar`, `scrollY`, `scrollX`, `scrollTop`, `scrollLeft`, `scrollbarColor`, `scrollbarWidth`, `overflow`, `@scroll`.',
        a: '### `<a>` (Native Hyperlink & Ghost DOM Anchor Node)\n\nZero-DOM Canvas hyperlink with hover/active underline transitions, built-in SPA router navigation, and native Ghost DOM right-click context menu.\n\n**Props**: `href`, `target`, `rel`, `download`, `color`, `hoverColor`, `activeColor`, `visitedColor`, `underline`, `underlineOffset`, `underlineThickness`, `disabled`, `@click`.',
        link: '### `<link>` (SPA Route Hyperlink Node)\n\nDeclarative Single-Page Application route link. Navigates seamlessly via CanvApps Router without page reload.\n\n**Props**: `href`, `target`, `rel`, `color`, `hoverColor`, `activeColor`, `visitedColor`, `underline`, `disabled`, `@click`.',
        motion: '### `<motion>` (GPU-Timed Motion Wrapper)\n\nSpring physics and timeline animations (`scale-in`, `fade`, `slide-up`, `cinematic-splash`).\n\n**Props**: `animation`, `duration`, `delay`, `spring`.',
        slot: '### `<slot />` (Dynamic Layout Outlet)\n\nRenders child scene content injected from parent layouts.',
        backdropBlur: '### `backdropBlur` (Modal Frosted Glass Blur)\n\nApplies a hardware-accelerated Gaussian background blur behind the modal overlay (e.g. `backdropBlur="12px"`, `backdropBlur={16}`, `backdropBlur={true}`).',
        backdropFilter: '### `backdropFilter` (CSS-Style Modal Blur Filter)\n\nApplies a CSS-like filter effect to the modal backdrop (e.g. `backdropFilter="blur(14px)"`).',
        backdropColor: '### `backdropColor` (Modal Backdrop Tint Color)\n\nSpecifies the translucent tint color rendered over the blurred background (e.g. `backdropColor="rgba(15, 23, 42, 0.65)"`).',
        blur: '### `blur` (Modal Blur Toggle)\n\nEnables or disables frosted glass backdrop blur on modal dialog overlays.',
        href: '### `href` (Hyperlink Destination URL / Route)\n\nSpecifies the target URL or SPA route for `<a>` / `<link>` components (e.g. `href="/dashboard"` or `href="https://example.com"`).',
        target: '### `target` (Anchor Browsing Context)\n\nSpecifies where to open the linked URL (`_self`, `_blank`, `_parent`, `_top`).',
        underline: '### `underline` (Anchor Underline Transition)\n\nControls text underline behavior (`"hover"`, `"always"`, `"never"`). Defaults to `"hover"`.',
        hoverColor: '### `hoverColor` (Interactive Hover Text Color)\n\nSpecifies the color applied when the mouse pointer hovers over an anchor or button.',
        activeColor: '### `activeColor` (Interactive Pressed Text Color)\n\nSpecifies the color applied while the pointer button is held down.',
        visitedColor: '### `visitedColor` (Visited Link Text Color)\n\nSpecifies the color applied after a link has been navigated.',
        scroll: '### `scroll` (Scroll Container Direction)\n\nControls scroll axes for `<scroll-view>`: `"vertical"`, `"horizontal"`, or `"both"`.',
        showScrollbar: '### `showScrollbar` (Scrollbar Indicator Visibility)\n\nControls scrollbar pill visibility: `"auto"` (fades out when idle), `"always"`, or `"never"`.',
        scrollY: '### `scrollY` / `scrollTop` (Vertical Scroll Offset)\n\nGets or sets the vertical scroll offset in pixels.',
        scrollX: '### `scrollX` / `scrollLeft` (Horizontal Scroll Offset)\n\nGets or sets the horizontal scroll offset in pixels.',
        '@scroll': '### `@scroll="handler"`\n\nFires in real-time as a `<scroll-view>` is scrolled via touch drag, mouse wheel, or scroll API.',
        '@close': '### `@close="handler"`\n\nFires when the modal is dismissed via backdrop click or programmatic close event.',
        '@if': '### `@if (condition) { ... }`\n\nConditional directive that dynamically mounts or unmounts branches based on reactive signals.',
        '@each': '### `@each array as item, index { ... }`\n\nReactive iteration directive that projects an array of items without Virtual DOM diffing.',
        '@click': '### `@click="handler"`\n\nFires on pointer release when coordinates match element bounding box.',
        '@input': '### `@input="handler"`\n\nFires in real-time when text input value changes.',
        '@submit': '### `@submit="handler"`\n\nFires when user presses Enter in an input element.',
        safeArea: '### `safeArea` (Topnav & Status Bar Inset)\n\nAutomatically applies device safe-area insets (notch, status bar, home indicator, desktop PWA titlebar) to element padding.\n\n**Values**: `"top"`, `"bottom"`, `"left"`, `"right"`, `"all"`, `"horizontal"`, `"vertical"`, or `true`.',
        safeAreaTop: '### `safeAreaTop` (Custom Top Safe Area Inset)\n\nOverrides or sets top safe area inset padding in pixels or boolean.',
        safeAreaBottom: '### `safeAreaBottom` (Custom Bottom Safe Area Inset)\n\nOverrides or sets bottom safe area inset padding in pixels or boolean.',
        safeAreaLeft: '### `safeAreaLeft` (Custom Left Safe Area Inset)\n\nOverrides or sets left safe area inset padding in pixels or boolean.',
        safeAreaRight: '### `safeAreaRight` (Custom Right Safe Area Inset)\n\nOverrides or sets right safe area inset padding in pixels or boolean.',
        useSafeArea: '### `useSafeArea()`\n\nReactive hook returning signals for device safe-area insets (`top`, `bottom`, `left`, `right`, `insets`).',
        getSafeAreaInsets: '### `getSafeAreaInsets()`\n\nSynchronously measures current device safe area insets in logical pixels.',
        setThemeColor: '### `setThemeColor(color, mode?)`\n\nDynamically synchronizes HTML5 `<meta name="theme-color">`, `<meta name="color-scheme">`, Apple status bar style, and document background across desktop and mobile in real time.',
        configureThemePalette: '### `configureThemePalette(palette)`\n\nRegisters a global named theme palette (e.g. `{ light: "#fff", dark: "#101010" }`).',
        getThemeColor: '### `getThemeColor()`\n\nReturns the currently active theme color hex string.',
        getThemeMode: '### `getThemeMode()`\n\nReturns the currently active theme mode key.',
        signal: '### `signal(initialValue)`\n\nCreates a fine-grained reactive Signal in direct memory. Access or mutate via `.value`.',
        computed: '### `computed(() => expr)`\n\nCreates a memoized reactive value that updates only when dependencies change.',
        effect: '### `effect(() => fn)`\n\nExecutes a side-effect whenever reactive signals accessed inside change.',
        batch: '### `batch(() => fn)`\n\nBatches multiple reactive signal mutations into a single draw frame.',
      };

      if (docs[word]) {
        return new vscode.Hover(new vscode.MarkdownString(docs[word]));
      }

      return null;
    },
  });


  // 3. Completion Item Provider (Suggesting events, directives, attributes, and tags)
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    'canvapps',
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const lineText = document.lineAt(position).text;
        const linePrefix = lineText.substring(0, position.character);
        const textBefore = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        const items: vscode.CompletionItem[] = [];

        // Detect if cursor is currently inside an opening tag: <tag-name ... |
        const tagMatch = textBefore.match(/<([a-zA-Z][a-zA-Z0-9_-]*)(?:\s+[^>]*)?$/);
        const currentTag = tagMatch ? tagMatch[1].toLowerCase() : null;

        // A. Event completions (@click, @scroll, @close, @input, @submit, etc.)
        if (linePrefix.endsWith('@') || /@\w*$/.test(linePrefix)) {
          const events = [
            { name: 'click', doc: 'Fires when a pointer clicks the element.', snippet: '@click="${1:handleClick}"' },
            { name: 'close', doc: 'Fires when modal overlay is dismissed via backdrop click or close action.', snippet: '@close="${1:handleClose}"' },
            { name: 'scroll', doc: 'Fires in real-time when a <scroll-view> is scrolled.', snippet: '@scroll="${1:handleScroll}"' },
            { name: 'input', doc: 'Fires in real-time when text input changes.', snippet: '@input="${1:handleInput}"' },
            { name: 'submit', doc: 'Fires when user submits an input via Enter key.', snippet: '@submit="${1:handleSubmit}"' },
            { name: 'change', doc: 'Fires when an input value is committed.', snippet: '@change="${1:handleChange}"' },
            { name: 'hover', doc: 'Fires when pointer enters element bounds.', snippet: '@hover="${1:handleHover}"' },
            { name: 'pointerdown', doc: 'Fires when pointer button is pressed.', snippet: '@pointerdown="${1:onPointerDown}"' },
            { name: 'pointerup', doc: 'Fires when pointer button is released.', snippet: '@pointerup="${1:onPointerUp}"' },
            { name: 'pointermove', doc: 'Fires when pointer moves across the element.', snippet: '@pointermove="${1:onPointerMove}"' },
            { name: 'pointerenter', doc: 'Fires when pointer enters element bounds.', snippet: '@pointerenter="${1:onPointerEnter}"' },
            { name: 'pointerleave', doc: 'Fires when pointer leaves element bounds.', snippet: '@pointerleave="${1:onPointerLeave}"' },
            { name: 'dblclick', doc: 'Fires on rapid double-click.', snippet: '@dblclick="${1:handleDblClick}"' },
            { name: 'keydown', doc: 'Fires when a key is pressed down.', snippet: '@keydown="${1:handleKeyDown}"' },
            { name: 'keyup', doc: 'Fires when a key is released.', snippet: '@keyup="${1:handleKeyUp}"' },
            { name: 'focus', doc: 'Fires when the element gains focus.', snippet: '@focus="${1:handleFocus}"' },
            { name: 'blur', doc: 'Fires when the element loses focus.', snippet: '@blur="${1:handleBlur}"' },
            { name: 'each', doc: 'Iterates an array reactively (@each items.value as item, index { ... }).', snippet: '@each ${1:items.value} as ${2:item}, ${3:index} {\n\t$0\n}' },
            { name: 'if', doc: 'Conditionally renders template branches (@if (condition.value) { ... }).', snippet: '@if (${1:condition.value}) {\n\t$0\n}' },
          ];

          for (const ev of events) {
            const item = new vscode.CompletionItem(`@${ev.name}`, vscode.CompletionItemKind.Event);
            item.detail = `CanvApps Event @${ev.name}`;
            item.documentation = new vscode.MarkdownString(ev.doc);
            item.insertText = new vscode.SnippetString(ev.snippet);
            items.push(item);
          }
          return items;
        }

        // B. Reactive Property Bindings (:prop="expr")
        if (linePrefix.endsWith(':') || /:\w*$/.test(linePrefix)) {
          const dynamicProps = [
            // Modal bindings
            { name: 'open', doc: 'Controls modal open state (boolean).' },
            { name: 'backdropBlur', doc: 'Dynamic frosted glass blur for modal overlay ("12px", 16, boolean).' },
            { name: 'backdropFilter', doc: 'Dynamic CSS-style filter for modal overlay ("blur(14px)").' },
            { name: 'backdropColor', doc: 'Dynamic translucent backdrop color ("rgba(15,23,42,0.65)").' },
            { name: 'blur', doc: 'Dynamic toggle for modal frosted glass backdrop blur.' },
            { name: 'originRect', doc: 'Origin bounding box for Smart Hero Morph modal animations.' },

            // Hyperlink / Anchor bindings
            { name: 'href', doc: 'Dynamic destination URL or SPA route for <a> / <link>.' },
            { name: 'target', doc: 'Dynamic browsing target ("_self" | "_blank").' },
            { name: 'rel', doc: 'Dynamic link rel relationship string.' },
            { name: 'underline', doc: 'Dynamic underline transition ("hover" | "always" | "never").' },
            { name: 'hoverColor', doc: 'Dynamic hover state color.' },
            { name: 'activeColor', doc: 'Dynamic active/pressed state color.' },
            { name: 'visitedColor', doc: 'Dynamic visited state color.' },

            // Scroll View bindings
            { name: 'scroll', doc: 'Dynamic scroll direction ("vertical" | "horizontal" | "both").' },
            { name: 'showScrollbar', doc: 'Dynamic scrollbar visibility ("auto" | "always" | "never").' },
            { name: 'scrollY', doc: 'Two-way reactive vertical scroll offset in pixels.' },
            { name: 'scrollX', doc: 'Two-way reactive horizontal scroll offset in pixels.' },
            { name: 'scrollTop', doc: 'Reactive vertical scroll offset alias.' },
            { name: 'scrollLeft', doc: 'Reactive horizontal scroll offset alias.' },

            // Safe Area Insets (Topnav, Status Bar & Home Indicator)
            { name: 'safeArea', doc: 'Dynamic safe-area padding for notch, status bar, or titlebar ("top" | "bottom" | "all" | "horizontal" | "vertical" | boolean).' },
            { name: 'safeAreaTop', doc: 'Dynamic top safe-area padding in pixels or boolean.' },
            { name: 'safeAreaBottom', doc: 'Dynamic bottom safe-area padding in pixels or boolean.' },
            { name: 'safeAreaLeft', doc: 'Dynamic left safe-area padding in pixels or boolean.' },
            { name: 'safeAreaRight', doc: 'Dynamic right safe-area padding in pixels or boolean.' },

            // Standard bindings

            { name: 'value', doc: 'Two-way reactive value binding for UIInput.' },
            { name: 'text', doc: 'Dynamic text content binding.' },
            { name: 'label', doc: 'Dynamic button label binding.' },
            { name: 'disabled', doc: 'Dynamic disabled state binding (boolean).' },
            { name: 'backgroundColor', doc: 'Dynamic background color binding.' },
            { name: 'color', doc: 'Dynamic text color binding.' },
            { name: 'fontSize', doc: 'Dynamic font size binding.' },
            { name: 'padding', doc: 'Dynamic padding binding ([top, right, bottom, left] or number).' },
            { name: 'gap', doc: 'Dynamic flex gap binding.' },
            { name: 'width', doc: 'Dynamic width binding (number or percentage string).' },
            { name: 'height', doc: 'Dynamic height binding (number or percentage string).' },
            { name: 'flexDirection', doc: 'Dynamic flex direction ("row" | "column").' },
            { name: 'alignItems', doc: 'Dynamic flex cross-axis alignment.' },
            { name: 'justifyContent', doc: 'Dynamic flex main-axis alignment.' },
            { name: 'borderRadius', doc: 'Dynamic border radius binding.' },
            { name: 'borderColor', doc: 'Dynamic border color binding.' },
            { name: 'borderWidth', doc: 'Dynamic border width binding.' },
            { name: 'opacity', doc: 'Dynamic opacity binding (0.0 to 1.0).' },
            { name: 'selectable', doc: 'Controls whether text can be selected and copied (boolean).' },
            { name: 'src', doc: 'Dynamic image source URL.' },
            { name: 'fit', doc: 'Dynamic image object fit mode.' },
          ];

          for (const prop of dynamicProps) {
            const item = new vscode.CompletionItem(`:${prop.name}`, vscode.CompletionItemKind.Property);
            item.detail = `CanvApps Binding :${prop.name}`;
            item.documentation = new vscode.MarkdownString(prop.doc);
            item.insertText = new vscode.SnippetString(`:${prop.name}="\${1:${prop.name}.value}"`);
            items.push(item);
          }
          return items;
        }

        // C. Built-in Tag Snippets (<view>, <text>, <button>, <modal>, <scroll-view>, <a>, <link>, etc.)
        if (linePrefix.endsWith('<') || /<\w*$/.test(linePrefix)) {
          const tags = [
            { name: 'view', snippet: '<view width="${1:100%}" flexDirection="${2|column,row|}" gap="${3:10}">\n\t$0\n</view>' },
            { name: 'text', snippet: '<text fontSize="${1:14}" fontWeight="${2|normal,bold,600|}" color="${3:#ffffff}">$0</text>' },
            { name: 'button', snippet: '<button label="${1:Click Me}" backgroundColor="${2:#3b82f6}" color="#ffffff" borderRadius="12" padding="[8, 16]" @click="${3:handleClick}" />' },
            { name: 'a', snippet: '<a href="${1:https://example.com}"${2: target="_blank"} color="${3:#1a73e8}" hoverColor="${4:#174ea6}" underline="${5|hover,always,never|}">${6:Link text}</a>' },
            { name: 'link', snippet: '<link href="${1:/settings}" color="${2:#1a73e8}" underline="${3|hover,always,never|}">${4:Link text}</link>' },
            { name: 'modal', snippet: '<modal :open="${1:isOpen.value}" backdropBlur="${2:12px}" backdropColor="${3:rgba(15, 23, 42, 0.65)}" @close="${4:closeModal}">\n\t<view width="${5:480}" backgroundColor="#1e293b" borderRadius="16" padding="24" gap="16">\n\t\t<text fontSize="20" fontWeight="bold" color="#ffffff">${6:Modal Title}</text>\n\t\t$0\n\t</view>\n</modal>' },
            { name: 'scroll-view', snippet: '<scroll-view width="${1:100%}" height="${2:400}" scroll="${3|vertical,horizontal,both|}" showScrollbar="${4|auto,always,never|}">\n\t$0\n</scroll-view>' },
            { name: 'image', snippet: '<image src="${1:url}" width="${2:100%}" height="${3:200}" fit="${4|cover,contain,fill|}" borderRadius="12" />' },
            { name: 'input', snippet: '<input placeholder="${1:Enter text...}" value="${2:myInput.value}" @input="${3:onInput}" />' },
            { name: 'motion', snippet: '<motion animation="${1|fade,scale-in,slide-up,zoom-center|}" duration="${2:300}">\n\t$0\n</motion>' },
            { name: 'slot', snippet: '<slot />' },
          ];

          for (const t of tags) {
            const item = new vscode.CompletionItem(t.name, vscode.CompletionItemKind.Class);
            item.detail = `CanvApps Component <${t.name}>`;
            item.insertText = new vscode.SnippetString(t.snippet);
            items.push(item);
          }
          return items;
        }

        // D. Comprehensive Tag Attributes with Documentation & Smart Snippets
        const attributeDefs: { name: string; doc: string; snippet?: string; tags?: string[] }[] = [
          // Modal specific
          { name: 'backdropBlur', doc: 'Hardware-accelerated frosted glass background blur behind modal overlay (e.g. "12px", "16", 12, true).', snippet: 'backdropBlur="${1:12px}"', tags: ['modal', 'uimodal'] },
          { name: 'backdropFilter', doc: 'CSS-style backdrop filter for modal overlay.', snippet: 'backdropFilter="blur(${1:14}px)"', tags: ['modal', 'uimodal'] },
          { name: 'backdropColor', doc: 'Translucent tint color for modal backdrop overlay.', snippet: 'backdropColor="${1:rgba(15, 23, 42, 0.65)}"', tags: ['modal', 'uimodal'] },
          { name: 'backdropColors', doc: 'Gradient backdrop colors for modal overlay.', snippet: 'backdropColors="${1:[\'rgba(0,0,0,0.8)\', \'rgba(0,0,0,0.4)\']}"', tags: ['modal', 'uimodal'] },
          { name: 'blur', doc: 'Toggles modal frosted glass backdrop blur.', snippet: 'blur="${1|true,false|}"', tags: ['modal', 'uimodal'] },
          { name: 'blurBackdrop', doc: 'Toggles modal frosted glass backdrop blur.', snippet: 'blurBackdrop="${1|true,false|}"', tags: ['modal', 'uimodal'] },
          { name: 'blurRadius', doc: 'Modal blur radius in pixels.', snippet: 'blurRadius="${1:10}"', tags: ['modal', 'uimodal'] },
          { name: 'closeOnBackdropClick', doc: 'Whether clicking the backdrop dismisses the modal.', snippet: 'closeOnBackdropClick="${1|true,false|}"', tags: ['modal', 'uimodal'] },
          { name: 'open', doc: 'Controls modal open state.', snippet: 'open="${1|true,false|}"', tags: ['modal', 'uimodal'] },
          { name: 'animation', doc: 'Modal entrance/exit transition animation.', snippet: 'animation="${1|hero,zoom-center,scale-in,slide-up,fade,none|}"', tags: ['modal', 'uimodal', 'motion', 'uimotion'] },
          { name: 'duration', doc: 'Animation transition duration in milliseconds.', snippet: 'duration="${1:300}"', tags: ['modal', 'uimodal', 'motion', 'uimotion'] },
          { name: 'originRect', doc: 'Source bounding rectangle for Smart Hero Morph expansion.', snippet: 'originRect="${1:originRect}"', tags: ['modal', 'uimodal'] },

          // Anchor / Link specific
          { name: 'href', doc: 'Target navigation destination URL or SPA route.', snippet: 'href="${1:https://example.com}"', tags: ['a', 'link', 'uianchor', 'uilink'] },
          { name: 'target', doc: 'Anchor browsing target context ("_self", "_blank", "_parent", "_top").', snippet: 'target="${1|_self,_blank,_parent,_top|}"', tags: ['a', 'link', 'uianchor', 'uilink'] },
          { name: 'rel', doc: 'Relationship between linked document and current page.', snippet: 'rel="${1:noopener noreferrer}"', tags: ['a', 'link', 'uianchor', 'uilink'] },
          { name: 'download', doc: 'Prompts the user to save the linked resource.', snippet: 'download="${1:filename}"', tags: ['a', 'link', 'uianchor', 'uilink'] },
          { name: 'underline', doc: 'Anchor underline transition mode.', snippet: 'underline="${1|hover,always,never|}"', tags: ['a', 'link', 'uianchor', 'uilink'] },
          { name: 'underlineOffset', doc: 'Distance between baseline and underline in pixels.', snippet: 'underlineOffset="${1:2}"', tags: ['a', 'link', 'uianchor', 'uilink'] },
          { name: 'underlineThickness', doc: 'Thickness of underline stroke in pixels.', snippet: 'underlineThickness="${1:1}"', tags: ['a', 'link', 'uianchor', 'uilink'] },
          { name: 'hoverColor', doc: 'Text color applied when hovered.', snippet: 'hoverColor="${1:#174ea6}"', tags: ['a', 'link', 'uianchor', 'uilink', 'button', 'uibutton'] },
          { name: 'activeColor', doc: 'Text color applied when pressed.', snippet: 'activeColor="${1:#185abc}"', tags: ['a', 'link', 'uianchor', 'uilink', 'button', 'uibutton'] },
          { name: 'visitedColor', doc: 'Text color applied after link is visited.', snippet: 'visitedColor="${1:#681da8}"', tags: ['a', 'link', 'uianchor', 'uilink'] },

          // Scroll View specific
          { name: 'scroll', doc: 'Scroll direction mode for <scroll-view>.', snippet: 'scroll="${1|vertical,horizontal,both|}"', tags: ['scroll-view', 'uiscrollview', 'scrollview'] },
          { name: 'scrollDirection', doc: 'Scroll direction alias for <scroll-view>.', snippet: 'scrollDirection="${1|vertical,horizontal,both|}"', tags: ['scroll-view', 'uiscrollview', 'scrollview'] },
          { name: 'showScrollbar', doc: 'Scrollbar indicator pill visibility mode.', snippet: 'showScrollbar="${1|auto,always,never|}"', tags: ['scroll-view', 'uiscrollview', 'scrollview'] },
          { name: 'scrollY', doc: 'Vertical scroll offset in pixels.', snippet: 'scrollY="${1:0}"', tags: ['scroll-view', 'uiscrollview', 'scrollview'] },
          { name: 'scrollX', doc: 'Horizontal scroll offset in pixels.', snippet: 'scrollX="${1:0}"', tags: ['scroll-view', 'uiscrollview', 'scrollview'] },
          { name: 'scrollTop', doc: 'Vertical scroll offset alias.', snippet: 'scrollTop="${1:0}"', tags: ['scroll-view', 'uiscrollview', 'scrollview'] },
          { name: 'scrollLeft', doc: 'Horizontal scroll offset alias.', snippet: 'scrollLeft="${1:0}"', tags: ['scroll-view', 'uiscrollview', 'scrollview'] },
          { name: 'scrollbarColor', doc: 'Scrollbar indicator pill color.', snippet: 'scrollbarColor="${1:rgba(255,255,255,0.3)}"', tags: ['scroll-view', 'uiscrollview', 'scrollview'] },
          { name: 'scrollbarWidth', doc: 'Scrollbar indicator width in pixels.', snippet: 'scrollbarWidth="${1:6}"', tags: ['scroll-view', 'uiscrollview', 'scrollview'] },
          { name: 'overflow', doc: 'Overflow clipping behavior ("scroll", "hidden", "visible").', snippet: 'overflow="${1|scroll,hidden,visible|}"' },

          // General Box & Layout
          { name: 'width', doc: 'Element width in pixels or percentage ("100%").', snippet: 'width="${1:100%}"' },
          { name: 'height', doc: 'Element height in pixels or percentage ("100%").', snippet: 'height="${1:100%}"' },
          { name: 'minWidth', doc: 'Minimum width constraint.', snippet: 'minWidth="${1:0}"' },
          { name: 'maxWidth', doc: 'Maximum width constraint.', snippet: 'maxWidth="${1:100%}"' },
          { name: 'minHeight', doc: 'Minimum height constraint.', snippet: 'minHeight="${1:0}"' },
          { name: 'maxHeight', doc: 'Maximum height constraint.', snippet: 'maxHeight="${1:100%}"' },
          { name: 'flexDirection', doc: 'Flex direction for child flow.', snippet: 'flexDirection="${1|column,row,column-reverse,row-reverse|}"' },
          { name: 'alignItems', doc: 'Cross-axis alignment of flex items.', snippet: 'alignItems="${1|stretch,flex-start,flex-end,center,baseline|}"' },
          { name: 'justifyContent', doc: 'Main-axis distribution of flex items.', snippet: 'justifyContent="${1|flex-start,flex-end,center,space-between,space-around,space-evenly|}"' },
          { name: 'flexGrow', doc: 'Flex grow factor.', snippet: 'flexGrow="${1:1}"' },
          { name: 'flexShrink', doc: 'Flex shrink factor.', snippet: 'flexShrink="${1:0}"' },
          { name: 'flexWrap', doc: 'Flex item wrapping behavior.', snippet: 'flexWrap="${1|nowrap,wrap,wrap-reverse|}"' },
          { name: 'padding', doc: 'Inner padding (number, [top, right, bottom, left], or [vertical, horizontal]).', snippet: 'padding="${1:16}"' },
          { name: 'safeArea', doc: 'Applies device safe-area insets for notch, status bar, and desktop PWA titlebar ("top", "bottom", "all", "horizontal", "vertical", true).', snippet: 'safeArea="${1|top,all,bottom,horizontal,vertical,true|}"', tags: ['view', 'uiview', 'scroll-view', 'uiscrollview'] },
          { name: 'safeAreaTop', doc: 'Custom top safe-area padding override (number or boolean).', snippet: 'safeAreaTop="${1:true}"', tags: ['view', 'uiview', 'scroll-view', 'uiscrollview'] },
          { name: 'safeAreaBottom', doc: 'Custom bottom safe-area padding override (number or boolean).', snippet: 'safeAreaBottom="${1:true}"', tags: ['view', 'uiview', 'scroll-view', 'uiscrollview'] },
          { name: 'safeAreaLeft', doc: 'Custom left safe-area padding override (number or boolean).', snippet: 'safeAreaLeft="${1:true}"', tags: ['view', 'uiview', 'scroll-view', 'uiscrollview'] },
          { name: 'safeAreaRight', doc: 'Custom right safe-area padding override (number or boolean).', snippet: 'safeAreaRight="${1:true}"', tags: ['view', 'uiview', 'scroll-view', 'uiscrollview'] },
          { name: 'margin', doc: 'Outer margin (number, [top, right, bottom, left], or [vertical, horizontal]).', snippet: 'margin="${1:0}"' },

          { name: 'gap', doc: 'Gap spacing between flex children in pixels.', snippet: 'gap="${1:12}"' },
          { name: 'rowGap', doc: 'Row gap spacing in pixels.', snippet: 'rowGap="${1:12}"' },
          { name: 'columnGap', doc: 'Column gap spacing in pixels.', snippet: 'columnGap="${1:12}"' },
          { name: 'backgroundColor', doc: 'Background color fill (#hex, rgb, rgba).', snippet: 'backgroundColor="${1:#1e293b}"' },
          { name: 'borderRadius', doc: 'Border corner rounding radius in pixels.', snippet: 'borderRadius="${1:12}"' },
          { name: 'borderWidth', doc: 'Border stroke width in pixels.', snippet: 'borderWidth="${1:1}"' },
          { name: 'borderColor', doc: 'Border stroke color.', snippet: 'borderColor="${1:#334155}"' },
          { name: 'boxShadow', doc: 'Shadow offset, blur, and color (e.g. "0 4px 12px rgba(0,0,0,0.25)").', snippet: 'boxShadow="${1:0 4px 12px rgba(0,0,0,0.25)}"' },
          { name: 'opacity', doc: 'Element transparency level (0.0 to 1.0).', snippet: 'opacity="${1:1.0}"' },
          { name: 'display', doc: 'Layout participation ("flex", "contents", "none").', snippet: 'display="${1|flex,contents,none|}"' },
          { name: 'position', doc: 'Positioning model ("relative", "absolute").', snippet: 'position="${1|relative,absolute|}"' },
          { name: 'left', doc: 'Left coordinate offset.', snippet: 'left="${1:0}"' },
          { name: 'top', doc: 'Top coordinate offset.', snippet: 'top="${1:0}"' },
          { name: 'right', doc: 'Right coordinate offset.', snippet: 'right="${1:0}"' },
          { name: 'bottom', doc: 'Bottom coordinate offset.', snippet: 'bottom="${1:0}"' },
          { name: 'zIndex', doc: 'Stacking order index.', snippet: 'zIndex="${1:10}"' },
          { name: 'cursor', doc: 'Mouse cursor style ("pointer", "default", "text", "not-allowed", "grab").', snippet: 'cursor="${1|pointer,default,text,not-allowed,grab|}"' },

          // Typography
          { name: 'fontSize', doc: 'Font size in pixels.', snippet: 'fontSize="${1:14}"' },
          { name: 'fontWeight', doc: 'Font weight ("normal", "bold", "500", "600", "700").', snippet: 'fontWeight="${1|normal,bold,500,600,700|}"' },
          { name: 'fontFamily', doc: 'Font family stack.', snippet: 'fontFamily="${1:system-ui, sans-serif}"' },
          { name: 'fontStyle', doc: 'Font style ("normal", "italic").', snippet: 'fontStyle="${1|normal,italic|}"' },
          { name: 'color', doc: 'Foreground text color.', snippet: 'color="${1:#ffffff}"' },
          { name: 'lineHeight', doc: 'Line height multiplier or pixel value.', snippet: 'lineHeight="${1:1.4}"' },
          { name: 'letterSpacing', doc: 'Letter spacing in pixels.', snippet: 'letterSpacing="${1:0.5}"' },
          { name: 'textAlign', doc: 'Text horizontal alignment ("left", "center", "right").', snippet: 'textAlign="${1|left,center,right|}"' },
          { name: 'selectable', doc: 'Whether text can be highlighted and copied (boolean).', snippet: 'selectable="${1|true,false|}"' },
          { name: 'text', doc: 'Direct text content.', snippet: 'text="${1:Text}"' },

          // Button
          { name: 'label', doc: 'Button label text.', snippet: 'label="${1:Button}"' },
          { name: 'labelColor', doc: 'Button label text color.', snippet: 'labelColor="${1:#ffffff}"' },
          { name: 'hoverBackgroundColor', doc: 'Button background color when hovered.', snippet: 'hoverBackgroundColor="${1:#2563eb}"' },
          { name: 'activeBackgroundColor', doc: 'Button background color when pressed.', snippet: 'activeBackgroundColor="${1:#1d4ed8}"' },
          { name: 'disabled', doc: 'Disables button interactions.', snippet: 'disabled="${1|true,false|}"' },

          // Input
          { name: 'placeholder', doc: 'Placeholder prompt text when input is empty.', snippet: 'placeholder="${1:Enter text...}"' },
          { name: 'placeholderColor', doc: 'Placeholder text color.', snippet: 'placeholderColor="${1:#64748b}"' },
          { name: 'value', doc: 'Input text value.', snippet: 'value="${1}"' },
          { name: 'focusBorderColor', doc: 'Border color applied when input is focused.', snippet: 'focusBorderColor="${1:#38bdf8}"' },
          { name: 'secureTextEntry', doc: 'Masks input characters for passwords.', snippet: 'secureTextEntry="${1|true,false|}"' },

          // Image
          { name: 'src', doc: 'Image source URL or asset path.', snippet: 'src="${1:https://...}"' },
          { name: 'fit', doc: 'Image scaling fit mode ("cover", "contain", "fill", "none").', snippet: 'fit="${1|cover,contain,fill,none|}"' },
          { name: 'showLoader', doc: 'Shows loading spinner while image downloads.', snippet: 'showLoader="${1|true,false|}"' },
          { name: 'showErrorIcon', doc: 'Shows error indicator if image fails to load.', snippet: 'showErrorIcon="${1|true,false|}"' },

          // Motion
          { name: 'spring', doc: 'Enables spring-physics damping curve.', snippet: 'spring="${1|true,false|}"' },
          { name: 'delay', doc: 'Animation start delay in milliseconds.', snippet: 'delay="${1:100}"' },
          { name: 'repeat', doc: 'Animation repeat count.', snippet: 'repeat="${1:1}"' },
        ];

        for (const attr of attributeDefs) {
          const isTagMatch = currentTag && attr.tags ? attr.tags.includes(currentTag) : false;
          const item = new vscode.CompletionItem(attr.name, vscode.CompletionItemKind.Field);
          item.detail = `CanvApps Attribute: ${attr.name}`;
          item.documentation = new vscode.MarkdownString(attr.doc);
          item.insertText = new vscode.SnippetString(attr.snippet || `${attr.name}="\${1}"`);
          // Prioritize attributes that specifically belong to the active tag
          item.sortText = isTagMatch ? `0_${attr.name}` : `1_${attr.name}`;
          items.push(item);
        }

        return items;
      },
    },
    '@', ':', '<', ' ', '"', '/', '.', '-', '_', '{', '=',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
  );

  context.subscriptions.push(definitionProvider, hoverProvider, completionProvider);
}

export function deactivate(): void {}


