/**
 * CanvApps Single File Component (.cvs) Code Formatter
 *
 * Provides safe, non-destructive formatting for .cvs files:
 * - Normalizes 2-space hierarchical indentation.
 * - Formats tag attributes (compact inline for short tags, clean multi-line for complex tags).
 * - Accurately indents control flow directives (@if, @else if, @else, @each).
 * - Normalizes blank lines (maximum 1 empty line).
 * - ZERO destructive alterations: Preserves exact string quotes (', ", `), expressions, bindings, and logic.
 */

export interface CVSFormatOptions {
  indentSize?: number;
  maxLineLength?: number;
}

export class CVSFormatter {
  /**
   * Formats a complete .cvs Single File Component source string.
   */
  public static format(source: string, options: CVSFormatOptions = {}): string {
    if (!source || !source.trim()) return '';

    const indentSize = options.indentSize ?? 2;
    const maxLineLength = options.maxLineLength ?? 80;

    const scriptMatch = source.match(/<script\b([^>]*)>([\s\S]*?)<\/script>/i);
    const styleMatch = source.match(/<style\b([^>]*)>([\s\S]*?)<\/style>/i);

    let scriptFormatted = '';
    if (scriptMatch) {
      const scriptAttrs = scriptMatch[1] ? scriptMatch[1].trim() : 'lang="ts"';
      const scriptBody = scriptMatch[2];
      const formattedBody = this.formatScript(scriptBody, indentSize);
      scriptFormatted = `<script ${scriptAttrs}>\n${formattedBody}\n</script>\n\n`;
    }

    let styleFormatted = '';
    if (styleMatch) {
      const styleAttrs = styleMatch[1] ? styleMatch[1].trim() : '';
      const styleBody = styleMatch[2];
      const formattedBody = this.formatStyle(styleBody, indentSize);
      styleFormatted = `\n<style${styleAttrs ? ' ' + styleAttrs : ''}>\n${formattedBody}\n</style>\n`;
    }

    // Extract template section
    let templateSource = source;
    if (scriptMatch) {
      templateSource = templateSource.replace(scriptMatch[0], '');
    }
    if (styleMatch) {
      templateSource = templateSource.replace(styleMatch[0], '');
    }

    const templateFormatted = this.formatTemplate(templateSource, indentSize, maxLineLength);

    const result = `${scriptFormatted}${templateFormatted}${styleFormatted}`.trim() + '\n';
    return result;
  }

  /**
   * Formats TypeScript/JS code inside <script> with clean 2-space indentation.
   * Preserves exact string literals, quotes, and inner expressions.
   */
  private static formatScript(scriptContent: string, indentSize = 2): string {
    const rawLines = scriptContent.split('\n');
    const indentStr = ' '.repeat(indentSize);
    let currentIndent = 1; // 1 level inside <script>
    const formattedLines: string[] = [];
    let lastLineWasEmpty = false;

    for (let i = 0; i < rawLines.length; i++) {
      const trimmed = rawLines[i].trim();

      if (trimmed === '') {
        if (!lastLineWasEmpty && formattedLines.length > 0) {
          formattedLines.push('');
          lastLineWasEmpty = true;
        }
        continue;
      }
      lastLineWasEmpty = false;

      // Adjust indentation for closing braces/brackets on this line
      let closingCount = 0;
      let openingCount = 0;

      let inQuote = false;
      let quoteChar = '';

      for (let c = 0; c < trimmed.length; c++) {
        const ch = trimmed[c];
        if ((ch === '"' || ch === "'" || ch === '`') && !inQuote) {
          inQuote = true;
          quoteChar = ch;
        } else if (inQuote && ch === quoteChar && trimmed[c - 1] !== '\\') {
          inQuote = false;
          quoteChar = '';
        } else if (!inQuote) {
          if (ch === '}' || ch === ')' || ch === ']') {
            closingCount++;
          } else if (ch === '{' || ch === '(' || ch === '[') {
            openingCount++;
          }
        }
      }

      const startsWithClosing = /^[\}\]\)]/.test(trimmed);
      const effectiveIndent = Math.max(1, startsWithClosing ? currentIndent - 1 : currentIndent);

      formattedLines.push(indentStr.repeat(effectiveIndent) + trimmed);

      currentIndent += openingCount - closingCount;
      if (currentIndent < 1) currentIndent = 1;
    }

    // Trim leading/trailing blank lines
    while (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === '') {
      formattedLines.pop();
    }
    while (formattedLines.length > 0 && formattedLines[0] === '') {
      formattedLines.shift();
    }

    return formattedLines.join('\n');
  }

  /**
   * Formats CSS rules inside <style> with clean 2-space indentation.
   */
  private static formatStyle(styleContent: string, indentSize = 2): string {
    const rawLines = styleContent.split('\n');
    const indentStr = ' '.repeat(indentSize);
    let depth = 1;
    const formattedLines: string[] = [];

    for (const raw of rawLines) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('}')) {
        depth = Math.max(1, depth - 1);
      }
      formattedLines.push(indentStr.repeat(depth) + trimmed);
      if (trimmed.endsWith('{')) {
        depth++;
      }
    }
    return formattedLines.join('\n');
  }

  /**
   * Formats CanvApps component template markup hierarchically.
   */
  private static formatTemplate(templateSource: string, indentSize = 2, maxLineLength = 80): string {
    const tokens = this.tokenizeTemplate(templateSource);
    const indentStr = ' '.repeat(indentSize);
    let depth = 0;
    const outputLines: string[] = [];
    let lastWasEmpty = false;

    for (const token of tokens) {
      if (token.type === 'empty-line') {
        if (!lastWasEmpty && outputLines.length > 0) {
          outputLines.push('');
          lastWasEmpty = true;
        }
        continue;
      }
      lastWasEmpty = false;

      if (token.type === 'comment') {
        outputLines.push(indentStr.repeat(depth) + token.content);
        continue;
      }

      if (token.type === 'directive-open') {
        outputLines.push(indentStr.repeat(depth) + token.content);
        depth++;
        continue;
      }

      if (token.type === 'directive-else') {
        outputLines.push(indentStr.repeat(depth) + token.content);
        depth++;
        continue;
      }

      if (token.type === 'directive-close') {
        depth = Math.max(0, depth - 1);
        outputLines.push(indentStr.repeat(depth) + '}');
        continue;
      }

      if (token.type === 'tag-closing') {
        depth = Math.max(0, depth - 1);
        outputLines.push(indentStr.repeat(depth) + `</${token.tagName}>`);
        continue;
      }

      if (token.type === 'tag-self-closing') {
        const formatted = this.formatTagAttributes(token.tagName, token.rawAttributes, true, depth, indentStr, maxLineLength);
        outputLines.push(formatted);
        continue;
      }

      if (token.type === 'tag-inline') {
        const attrs = this.parseAttributes(token.rawAttributes);
        const singleLineAttrs = attrs.join(' ');
        const singleLine = indentStr.repeat(depth) + `<${token.tagName}${singleLineAttrs ? ' ' + singleLineAttrs : ''}>${token.content}</${token.tagName}>`;

        if (attrs.length <= 3 && singleLine.length <= maxLineLength) {
          outputLines.push(singleLine);
        } else {
          const openFormatted = this.formatTagAttributes(token.tagName, token.rawAttributes, false, depth, indentStr, maxLineLength);
          outputLines.push(openFormatted);
          outputLines.push(indentStr.repeat(depth + 1) + token.content);
          outputLines.push(indentStr.repeat(depth) + `</${token.tagName}>`);
        }
        continue;
      }

      if (token.type === 'tag-opening') {
        const formatted = this.formatTagAttributes(token.tagName, token.rawAttributes, false, depth, indentStr, maxLineLength);
        outputLines.push(formatted);
        depth++;
        continue;
      }

      if (token.type === 'text') {
        const textContent = token.content.trim();
        if (textContent) {
          outputLines.push(indentStr.repeat(depth) + textContent);
        }
        continue;
      }
    }

    return outputLines.join('\n');
  }

  /**
   * Formats tag attributes either inline or broken across lines depending on attribute count and line length.
   */
  private static formatTagAttributes(
    tagName: string,
    rawAttributes: string,
    isSelfClosing: boolean,
    depth: number,
    indentStr: string,
    maxLineLength: number
  ): string {
    const baseIndent = indentStr.repeat(depth);
    const attrs = this.parseAttributes(rawAttributes);
    const closeStr = isSelfClosing ? ' />' : '>';

    if (attrs.length === 0) {
      return `${baseIndent}<${tagName}${closeStr}`;
    }

    // Try single-line format first
    const singleLineAttrs = attrs.join(' ');
    const singleLine = `${baseIndent}<${tagName} ${singleLineAttrs}${closeStr}`;

    if (attrs.length <= 2 && singleLine.length <= maxLineLength && !rawAttributes.includes('\n')) {
      return singleLine;
    }

    // Multi-line attribute format
    const attrIndent = indentStr.repeat(depth + 1);
    const attrLines = attrs.map((a) => `${attrIndent}${a}`).join('\n');
    const closingTag = isSelfClosing ? `${baseIndent}/>` : `${baseIndent}>`;

    return `${baseIndent}<${tagName}\n${attrLines}\n${closingTag}`;
  }

  /**
   * Parses individual attributes accurately without breaking expressions :prop={...} or strings.
   */
  private static parseAttributes(rawAttributes: string): string[] {
    const trimmed = (rawAttributes || '').trim();
    if (!trimmed) return [];

    const attributes: string[] = [];
    let i = 0;
    const len = trimmed.length;

    while (i < len) {
      // Skip whitespace
      while (i < len && /\s/.test(trimmed[i])) i++;
      if (i >= len) break;

      const attrStart = i;
      let inQuotes = false;
      let quoteChar = '';
      let braceDepth = 0;

      while (i < len) {
        const ch = trimmed[i];

        if ((ch === '"' || ch === "'" || ch === '`') && !inQuotes && braceDepth === 0) {
          inQuotes = true;
          quoteChar = ch;
        } else if (inQuotes && ch === quoteChar && trimmed[i - 1] !== '\\') {
          inQuotes = false;
          quoteChar = '';
        } else if (!inQuotes) {
          if (ch === '{') {
            braceDepth++;
          } else if (ch === '}' && braceDepth > 0) {
            braceDepth--;
          } else if (braceDepth === 0 && /\s/.test(ch)) {
            break;
          }
        }
        i++;
      }

      const attr = trimmed.slice(attrStart, i).trim();
      if (attr && attr !== '/') {
        attributes.push(attr);
      }
    }

    return attributes;
  }

  /**
   * Tokenizes template markup into structured formatting tokens.
   */
  private static tokenizeTemplate(templateSource: string): any[] {
    const tokens: any[] = [];
    const voidTags = new Set(['slot', 'image', 'input', 'br', 'hr', 'img', 'slider', 'select']);

    let i = 0;
    const len = templateSource.length;

    while (i < len) {
      // Check HTML Comments <!-- ... -->
      if (templateSource.startsWith('<!--', i)) {
        const end = templateSource.indexOf('-->', i);
        const comment = end !== -1 ? templateSource.slice(i, end + 3) : templateSource.slice(i);
        tokens.push({ type: 'comment', content: comment.trim() });
        i = end !== -1 ? end + 3 : len;
        continue;
      }

      // Check Mustache Interpolation {{ ... }}
      if (templateSource.startsWith('{{', i)) {
        const end = templateSource.indexOf('}}', i);
        if (end !== -1) {
          const mustache = templateSource.slice(i, end + 2);
          tokens.push({ type: 'text', content: mustache });
          i = end + 2;
          continue;
        }
      }

      // Check Directives @if, @else if, @else, @each (opening { must be on same line)
      const directiveMatch = templateSource.slice(i).match(/^(@(?:if|else\s+if|else|each))\b[^{\n\r]*\{/);
      if (directiveMatch) {
        let dirType = directiveMatch[1];
        if (!dirType.startsWith('@')) dirType = '@' + dirType;
        const matchedStr = directiveMatch[0];
        const innerExpr = matchedStr.slice(dirType.length, matchedStr.length - 1).trim();
        let fullDir: string;

        if (dirType === '@else') {
          fullDir = '@else {';
        } else if (dirType === '@each') {
          fullDir = `@each ${innerExpr} {`;
        } else {
          let cleanExpr = innerExpr;
          if (cleanExpr.startsWith('(') && cleanExpr.endsWith(')')) {
            cleanExpr = cleanExpr.slice(1, -1).trim();
          }
          fullDir = `${dirType} (${cleanExpr}) {`;
        }

        if (dirType === '@else' || dirType.startsWith('@else if')) {
          tokens.push({ type: 'directive-else', content: fullDir });
        } else {
          tokens.push({ type: 'directive-open', content: fullDir });
        }
        i += directiveMatch[0].length;
        continue;
      }

      // Check Directive closing brace "}" (when standalone)
      if (templateSource[i] === '}' && /^\s*\}\s*(?:\n|$|<|@)/.test(templateSource.slice(i))) {
        tokens.push({ type: 'directive-close' });
        i++;
        continue;
      }

      // Check HTML Tags <tag ...>
      if (templateSource[i] === '<') {
        const isClosing = templateSource[i + 1] === '/';
        const startName = isClosing ? i + 2 : i + 1;
        if (startName < len && /[a-zA-Z]/.test(templateSource[startName])) {
          let nameEnd = startName + 1;
          while (nameEnd < len && /[a-zA-Z0-9_.-]/.test(templateSource[nameEnd])) {
            nameEnd++;
          }
          const tagName = templateSource.slice(startName, nameEnd);

          // Find end of opening/closing tag
          let inQuotes = false;
          let quoteChar = '';
          let braceDepth = 0;
          let tagEnd = -1;

          for (let j = nameEnd; j < len; j++) {
            const ch = templateSource[j];
            if ((ch === '"' || ch === "'" || ch === '`') && !inQuotes) {
              inQuotes = true;
              quoteChar = ch;
            } else if (inQuotes && ch === quoteChar && templateSource[j - 1] !== '\\') {
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
            const tagInner = templateSource.slice(nameEnd, tagEnd).trim();
            const isSelfClosing = tagInner.endsWith('/') || voidTags.has(tagName.toLowerCase());

            if (isClosing) {
              tokens.push({ type: 'tag-closing', tagName });
            } else if (isSelfClosing) {
              const rawAttrs = tagInner.endsWith('/') ? tagInner.slice(0, -1).trim() : tagInner;
              tokens.push({ type: 'tag-self-closing', tagName, rawAttributes: rawAttrs });
            } else {
              // Check if tag is text/inline element: e.g. <text fontSize="14">Hello World</text> or <text>• {{ item.text }}</text>
              const afterTag = templateSource.slice(tagEnd + 1);
              const inlineCloseMatch = afterTag.match(/^([\s\S]*?)<\/([a-zA-Z0-9_.-]+)>/);

              if (
                inlineCloseMatch &&
                inlineCloseMatch[2].toLowerCase() === tagName.toLowerCase() &&
                !inlineCloseMatch[1].includes('<')
              ) {
                const normalizedContent = inlineCloseMatch[1].trim().replace(/\s+/g, ' ');
                tokens.push({
                  type: 'tag-inline',
                  tagName,
                  rawAttributes: tagInner,
                  content: normalizedContent,
                });
                i = tagEnd + 1 + inlineCloseMatch[0].length;
                continue;
              }

              tokens.push({ type: 'tag-opening', tagName, rawAttributes: tagInner });
            }

            i = tagEnd + 1;
            continue;
          }
        }
      }

      // Check text / whitespace
      const nextSpecial = templateSource.slice(i).search(/[<@\}]|\{\{|\n\s*\n/);
      if (nextSpecial === -1) {
        const text = templateSource.slice(i).trim();
        if (text) tokens.push({ type: 'text', content: text });
        break;
      } else if (nextSpecial === 0) {
        const doubleNewlineMatch = templateSource.slice(i).match(/^\n\s*\n+/);
        if (doubleNewlineMatch) {
          tokens.push({ type: 'empty-line' });
          i += doubleNewlineMatch[0].length;
        } else {
          i++;
        }
      } else {
        const text = templateSource.slice(i, i + nextSpecial).trim();
        if (text) {
          tokens.push({ type: 'text', content: text });
        }
        i += nextSpecial;
      }
    }

    return tokens;
  }
}

export function formatCVS(source: string, options?: CVSFormatOptions): string {
  return CVSFormatter.format(source, options);
}
