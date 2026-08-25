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
        text: '### `<text>` (Direct Canvas Text Node)\n\nHardware-accelerated text rendering with automatic line-breaking and sub-pixel glyph alignment.\n\n**Props**: `fontSize`, `fontWeight`, `fontFamily`, `color`, `lineHeight`, `textAlign`, `selectable`.',
        button: '### `<button>` (Interactive Canvas Button)\n\nZero-DOM interactive button with built-in hover, active, and focus states.\n\n**Props**: `label`, `labelColor`, `backgroundColor`, `hoverBackgroundColor`, `activeBackgroundColor`, `borderRadius`, `padding`, `@click`.',
        image: '### `<image>` (Pure Canvas Image Node)\n\nHardware-accelerated bitmap rendering with automatic loader spinners, error fallbacks, and off-thread GPU decode.\n\n**Props**: `src`, `fit`, `width`, `height`, `borderRadius`, `showLoader`, `showErrorIcon`.',
        input: '### `<input>` (Ghost DOM Input Node)\n\nCombines native IME touch keyboard entry and clipboard support with Pure Canvas rendering.\n\n**Props**: `placeholder`, `placeholderColor`, `:value`, `focusBorderColor`, `@input`, `@submit`, `@change`.',
        modal: '### `<modal>` (Fullscreen Canvas Dialog Overlay)\n\nFrosted glass blur, backdrop dimming, and Smart Hero morph animations with zero DOM overhead.\n\n**Props**: `:open`, `animation`, `@close`, `originRect`.',
        motion: '### `<motion>` (GPU-Timed Motion Wrapper)\n\nSpring physics and timeline animations (`scale-in`, `fade`, `slide-up`, `cinematic-splash`).\n\n**Props**: `animation`, `duration`, `delay`, `spring`.',
        slot: '### `<slot />` (Dynamic Layout Outlet)\n\nRenders child scene content injected from parent layouts.',
        '@if': '### `@if (condition) { ... }`\n\nConditional directive that dynamically mounts or unmounts branches based on reactive signals.',
        '@each': '### `@each array as item, index { ... }`\n\nReactive iteration directive that projects an array of items without Virtual DOM diffing.',
        '@click': '### `@click="handler"`\n\nFires on pointer release when coordinates match element bounding box.',
        '@input': '### `@input="handler"`\n\nFires in real-time when text input value changes.',
        '@submit': '### `@submit="handler"`\n\nFires when user presses Enter in an input element.',
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

  // 3. Completion Item Provider (Suggesting events, directives, attributes, and script symbols)
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    'canvapps',
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        const items: vscode.CompletionItem[] = [];

        // A. Event completions (@click, @input, @submit, @hover, etc.)
        if (linePrefix.endsWith('@') || /@\w*$/.test(linePrefix)) {
          const events = [
            { name: 'click', doc: 'Fires when a pointer clicks the element.', snippet: '@click="${1:handleClick}"' },
            { name: 'submit', doc: 'Fires when user submits an input via Enter key.', snippet: '@submit="${1:handleSubmit}"' },
            { name: 'input', doc: 'Fires in real-time when text input changes.', snippet: '@input="${1:handleInput}"' },
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

        // B. Reactive Property Bindings (:value, :color, :fontSize, etc.)
        if (linePrefix.endsWith(':') || /:\w*$/.test(linePrefix)) {
          const dynamicProps = [
            { name: 'value', doc: 'Two-way reactive value binding for UIInput.' },
            { name: 'text', doc: 'Dynamic text content binding.' },
            { name: 'label', doc: 'Dynamic button label binding.' },
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
            { name: 'open', doc: 'Controls modal open state (boolean).' },
            { name: 'originRect', doc: 'Origin bounding box for Smart Hero Morph animations.' },
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

        // C. Built-in Tag Snippets (<view>, <text>, <button>, <image>, <input>, <modal>)
        if (linePrefix.endsWith('<') || /<\w*$/.test(linePrefix)) {
          const tags = [
            { name: 'view', snippet: '<view width="${1:100%}" flexDirection="${2|column,row|}" gap="${3:10}">\n\t$0\n</view>' },
            { name: 'text', snippet: '<text fontSize="${1:14}" fontWeight="${2|normal,bold,600|}" color="${3:#ffffff}">$0</text>' },
            { name: 'button', snippet: '<button label="${1:Click Me}" backgroundColor="${2:#3b82f6}" color="#ffffff" borderRadius="12" padding="[8, 16]" @click="${3:handleClick}" />' },
            { name: 'image', snippet: '<image src="${1:url}" width="${2:100%}" height="${3:200}" fit="${4|cover,contain,fill|}" borderRadius="12" />' },
            { name: 'input', snippet: '<input placeholder="${1:Enter text...}" value="${2:myInput.value}" @input="${3:onInput}" />' },
            { name: 'modal', snippet: '<modal :open="${1:isOpen.value}" animation="hero" @close="${2:closeModal}">\n\t<view width="${3:500}" backgroundColor="#1e1e24" borderRadius="20" padding="20">\n\t\t$0\n\t</view>\n</modal>' },
            { name: 'motion', snippet: '<motion animation="${1|fade,scale-in,slide-up|}" duration="${2:300}">\n\t$0\n</motion>' },
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

        // D. Standard Tag Attributes
        const staticProps = [
          'width', 'height', 'flexDirection', 'alignItems', 'justifyContent', 'flexGrow', 'flexShrink',
          'padding', 'gap', 'backgroundColor', 'borderRadius', 'borderWidth', 'borderColor', 'boxShadow',
          'fontSize', 'fontWeight', 'color', 'placeholder', 'placeholderColor', 'focusBorderColor',
          'cursor', 'label', 'labelColor', 'hoverBackgroundColor', 'activeBackgroundColor', 'selectable',
          'fit', 'src', 'showLoader', 'showErrorIcon', 'loaderColor', 'errorColor', 'animation', 'duration'
        ];

        for (const p of staticProps) {
          const item = new vscode.CompletionItem(p, vscode.CompletionItemKind.Field);
          item.detail = `CanvApps Attribute: ${p}`;
          item.insertText = new vscode.SnippetString(`${p}="\${1}"`);
          items.push(item);
        }

        return items;
      },
    },
    '@', ':', '<', '"', ' '
  );

  context.subscriptions.push(definitionProvider, hoverProvider, completionProvider);
}

export function deactivate(): void {}

