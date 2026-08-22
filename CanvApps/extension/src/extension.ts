import * as vscode from 'vscode';

/**
 * CanvApps Extension Activation
 */
export function activate(context: vscode.ExtensionContext): void {
  // 1. Definition Provider (Cmd+Click / Ctrl+Click on functions, signals, and variables)
  const definitionProvider = vscode.languages.registerDefinitionProvider('canvapps', {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
      const wordRange = document.getWordRangeAtPosition(position, /[@:A-Za-z0-9_$.]+/);
      if (!wordRange) {
        return null;
      }

      let word = document.getText(wordRange);
      // Clean leading prefixes like @ or : or {{
      word = word.replace(/^[@:]/, '').replace(/\.value$/, '');

      if (!word || word === 'item' || word === 'index') {
        return null;
      }

      const text = document.getText();
      const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/i;
      const scriptMatch = scriptRegex.exec(text);
      if (!scriptMatch) {
        return null;
      }

      const scriptContent = scriptMatch[1];
      const scriptStartIndex = scriptMatch.index + scriptMatch[0].indexOf(scriptContent);

      // Search for function, const, let, var, signal, type declaration
      const defRegex = new RegExp(
        `(?:function\\s+${word}\\b|(?:const|let|var)\\s+${word}\\b|type\\s+${word}\\b|interface\\s+${word}\\b)`,
        'g'
      );

      let match: RegExpExecArray | null;
      while ((match = defRegex.exec(scriptContent)) !== null) {
        const matchOffset = scriptStartIndex + match.index;
        const targetPos = document.positionAt(matchOffset);
        return new vscode.Location(document.uri, targetPos);
      }

      return null;
    },
  });

  // 2. Completion Item Provider (Suggesting events, directives, attributes, and script symbols)
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
            { name: 'each', doc: 'Iterates an array reactively (Svelte-style @each rows as row).', snippet: '@each="${1:items.value} as ${2:item}, ${3:index}"' },
            { name: 'if', doc: 'Conditionally renders the element.', snippet: '@if="${1:condition.value}"' },
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

        // C. Standard Tag Attributes
        const staticProps = [
          'width', 'height', 'flexDirection', 'alignItems', 'justifyContent', 'flexGrow',
          'padding', 'gap', 'backgroundColor', 'borderRadius', 'borderWidth', 'borderColor',
          'fontSize', 'fontWeight', 'color', 'placeholder', 'placeholderColor', 'focusBorderColor',
          'cursor', 'label', 'labelColor', 'hoverBackgroundColor', 'activeBackgroundColor'
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

  context.subscriptions.push(definitionProvider, completionProvider);
}

export function deactivate(): void {}
