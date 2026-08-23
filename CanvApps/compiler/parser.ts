import { CVSComponentAST, ASTElement, ASTNode, ASTProp, ASTDirectives, ASTIfBlock, ASTEachBlock } from './types';

/**
 * High-performance Parser converting .cvs Single File Component markup into an AST.
 */
export class CVSParser {
  /**
   * Parses the raw .cvs file string into a CVSComponentAST.
   *
   * @param source The raw string content of a .cvs file.
   * @returns The generated component AST.
   */
  public static parse(source: string): CVSComponentAST {
    let scriptContent = '';
    let templateSource = source;

    // 1. Extract <script> block
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/i;
    const scriptMatch = source.match(scriptRegex);
    if (scriptMatch) {
      scriptContent = scriptMatch[1].trim();
      templateSource = source.replace(scriptRegex, '').trim();
    }

    // 2. Parse Template Tree
    const template = this.parseTemplate(templateSource);

    return {
      script: scriptContent,
      template,
    };
  }

  /**
   * Parses the template markup into an ASTElement root.
   */
  private static parseTemplate(templateSource: string): ASTElement | null {
    const trimmed = templateSource.trim();
    if (!trimmed) {
      return null;
    }

    // Preprocess control blocks: @if and @each blocks
    const preprocessed = this.preprocessControlBlocks(trimmed);

    const tokens = this.tokenize(preprocessed);
    let index = 0;

    const parseNode = (): ASTNode | null => {
      if (index >= tokens.length) {
        return null;
      }

      const token = tokens[index];

      // Text token
      if (token.type === 'text') {
        index++;
        const content = token.value.trim();
        if (!content) {
          return null;
        }

        const hasInterpolation = content.includes('{{') && content.includes('}}');
        if (hasInterpolation) {
          const expr = '`' + content.replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, '${$1}') + '`';
          return {
            type: 'text',
            content: expr,
            isDynamic: true,
          };
        }

        return {
          type: 'text',
          content,
          isDynamic: false,
        };
      }

      // Conditional block token: <canvapps-if>
      if (token.type === 'tag-open' && token.tagName === 'canvapps-if') {
        index++;
        const conditionAttr = token.attributes?.find((a) => a.name === 'condition');
        const condition = conditionAttr ? conditionAttr.value.replace(/&quot;/g, '"') : 'true';

        const children: ASTNode[] = [];
        while (index < tokens.length) {
          const next = tokens[index];
          if (next.type === 'tag-close' && next.tagName === 'canvapps-if') {
            index++;
            break;
          }
          const child = parseNode();
          if (child) {
            children.push(child);
          }
        }

        const thenElem = children.find((c) => c.type === 'element' && c.tag === 'canvapps-then') as ASTElement | undefined;
        const elseElem = children.find((c) => c.type === 'element' && c.tag === 'canvapps-else') as ASTElement | undefined;

        const consequent = thenElem
          ? thenElem.children
          : children.filter((c) => c.type !== 'element' || (c.tag !== 'canvapps-then' && c.tag !== 'canvapps-else'));
        const alternate = elseElem ? elseElem.children : undefined;

        const ifBlock: ASTIfBlock = {
          type: 'if-block',
          condition,
          consequent,
          alternate,
        };
        return ifBlock;
      }

      // Iteration block token: <canvapps-each>
      if (token.type === 'tag-open' && token.tagName === 'canvapps-each') {
        index++;
        const iterableAttr = token.attributes?.find((a) => a.name === 'iterable');
        const itemAttr = token.attributes?.find((a) => a.name === 'item');
        const indexAttr = token.attributes?.find((a) => a.name === 'index');

        const iterable = iterableAttr ? iterableAttr.value.replace(/&quot;/g, '"') : '[]';
        const item = itemAttr ? itemAttr.value : 'item';
        const itemIndex = indexAttr && indexAttr.value !== '' && indexAttr.value !== 'undefined' ? indexAttr.value : undefined;

        const body: ASTNode[] = [];
        while (index < tokens.length) {
          const next = tokens[index];
          if (next.type === 'tag-close' && next.tagName === 'canvapps-each') {
            index++;
            break;
          }
          const child = parseNode();
          if (child) {
            body.push(child);
          }
        }

        const eachBlock: ASTEachBlock = {
          type: 'each-block',
          iterable,
          item,
          index: itemIndex,
          body,
        };
        return eachBlock;
      }

      // Element open tag
      if (token.type === 'tag-open') {
        index++;
        const tag = token.tagName!;
        const props: ASTProp[] = [];
        const directives: ASTDirectives = {};

        // Parse attributes
        for (const attr of token.attributes || []) {
          if (attr.name === '*if' || attr.name === '@if') {
            directives.ifCondition = attr.value;
          } else if (
            attr.name === '*for' ||
            attr.name === '@for' ||
            attr.name === '*each' ||
            attr.name === '@each' ||
            attr.name === 'each'
          ) {
            directives.forLoop = this.parseForDirective(attr.value);
          } else if (attr.name.startsWith('@')) {
            props.push({
              name: attr.name.slice(1),
              value: attr.value,
              isDynamic: false,
              isEvent: true,
            });
          } else if (attr.name.startsWith(':')) {
            props.push({
              name: attr.name.slice(1),
              value: attr.value,
              isDynamic: true,
              isEvent: false,
            });
          } else {
            props.push({
              name: attr.name,
              value: attr.value,
              isDynamic: false,
              isEvent: false,
            });
          }
        }

        const element: ASTElement = {
          type: 'element',
          tag,
          props,
          directives,
          children: [],
        };

        if (token.isSelfClosing) {
          return element;
        }

        // Parse children until matching close tag
        while (index < tokens.length) {
          const next = tokens[index];
          if (next.type === 'tag-close' && next.tagName === tag) {
            index++;
            break;
          }

          const child = parseNode();
          if (child) {
            element.children.push(child);
          }
        }

        return element;
      }

      index++;
      return null;
    };

    while (index < tokens.length) {
      const node = parseNode();
      if (node && node.type === 'element') {
        return node;
      }
    }

    return null;
  }

  /**
   * Preprocesses conditional and iteration blocks:
   * - @if (condition) { ... } else { ... }
   * - @each rows as row { ... }
   * - {#if condition} ... {:else} ... {/if}
   * - {#each items as item} ... {/each}
   */
  private static preprocessControlBlocks(src: string): string {
    // 1. Svelte-style: {#if cond} ... {:else} ... {/if}
    let result = src.replace(
      /\{#if\s+([\s\S]*?)\}([\s\S]*?)(?:\{:else\}([\s\S]*?))?\{\/if\}/g,
      (_match, cond, thenPart, elsePart) => {
        const cleanCond = cond.trim().replace(/"/g, '&quot;');
        return `<canvapps-if condition="${cleanCond}"><canvapps-then>${thenPart}</canvapps-then>${
          elsePart !== undefined ? `<canvapps-else>${elsePart}</canvapps-else>` : ''
        }</canvapps-if>`;
      }
    );

    // 2. Svelte-style: {#each iterable as item, index} ... {/each}
    result = result.replace(
      /\{#each\s+([\s\S]*?)\}([\s\S]*?)\{\/each\}/g,
      (_match, expr, body) => {
        const parsed = this.parseForDirective(expr);
        const safeIterable = parsed.iterable.trim().replace(/"/g, '&quot;');
        return `<canvapps-each iterable="${safeIterable}" item="${parsed.item}" index="${parsed.index || ''}">${body}</canvapps-each>`;
      }
    );

    // 3. Block-style @if ... { ... } else { ... }
    result = this.transformIfBlocks(result);

    // 4. Block-style @each ... as ... { ... }
    result = this.transformEachBlocks(result);

    return result;
  }

  /**
   * Scans and transforms @each rows as row { ... } blocks into <canvapps-each>.
   */
  private static transformEachBlocks(src: string): string {
    let index = 0;

    while (index < src.length) {
      const eachMatch = src.indexOf('@each', index);
      if (eachMatch === -1) {
        break;
      }

      // Check boundary so we don't match @each_xyz
      const nextChar = src[eachMatch + 5];
      if (nextChar && /[a-zA-Z0-9_]/.test(nextChar)) {
        index = eachMatch + 5;
        continue;
      }

      // Check if this @each is an attribute (e.g. @each="..." or @each='...')
      const afterEach = src.slice(eachMatch + 5);
      if (/^\s*=/.test(afterEach)) {
        index = eachMatch + 5;
        continue;
      }

      let expr = '';
      let openBrace = -1;

      const trimmedAfter = afterEach.trimStart();
      if (trimmedAfter.startsWith('(')) {
        // Parenthesized expression: @each (milestones.value as item, index) { ... }
        const openParen = src.indexOf('(', eachMatch + 5);
        const closeParen = this.findMatchingParen(src, openParen);
        if (closeParen === -1) {
          index = eachMatch + 5;
          continue;
        }

        expr = src.slice(openParen + 1, closeParen).trim();
        openBrace = src.indexOf('{', closeParen + 1);
        if (openBrace === -1) {
          index = eachMatch + 5;
          continue;
        }
      } else {
        // Non-parenthesized expression: @each milestones.value as item, index { ... }
        openBrace = src.indexOf('{', eachMatch + 5);
        if (openBrace === -1) {
          index = eachMatch + 5;
          continue;
        }

        const exprSub = src.slice(eachMatch + 5, openBrace).trim();
        // Skip if there is an HTML tag opening before '{'
        if (/<[a-zA-Z/]/.test(exprSub)) {
          index = eachMatch + 5;
          continue;
        }
        expr = exprSub;
      }

      if (!expr) {
        index = eachMatch + 5;
        continue;
      }

      // Find matching closing '}' for the body block
      const closeBrace = this.findMatchingBrace(src, openBrace);
      if (closeBrace === -1) {
        index = openBrace + 1;
        continue;
      }

      const bodyContent = src.slice(openBrace + 1, closeBrace);
      const totalEnd = closeBrace + 1;

      const parsedLoop = this.parseForDirective(expr);
      const safeIterable = parsedLoop.iterable.replace(/"/g, '&quot;');
      const safeItem = parsedLoop.item;
      const safeIndex = parsedLoop.index || '';

      const nestedBody = this.preprocessControlBlocks(bodyContent);
      const replacement = `<canvapps-each iterable="${safeIterable}" item="${safeItem}" index="${safeIndex}">${nestedBody}</canvapps-each>`;

      src = src.slice(0, eachMatch) + replacement + src.slice(totalEnd);
      index = eachMatch + replacement.length;
    }

    return src;
  }

  /**
   * Scans and transforms @if (...) { ... } else { ... } blocks into <canvapps-if>.
   */
  private static transformIfBlocks(src: string): string {
    let index = 0;

    while (index < src.length) {
      const ifMatch = src.indexOf('@if', index);
      if (ifMatch === -1) {
        break;
      }

      // Check boundary so we don't match @iframe or similar
      const nextChar = src[ifMatch + 3];
      if (nextChar && /[a-zA-Z0-9_]/.test(nextChar)) {
        index = ifMatch + 3;
        continue;
      }

      // Check if this @if is an attribute (e.g. @if="cond" or @if='cond')
      const afterIf = src.slice(ifMatch + 3);
      if (/^\s*=/.test(afterIf)) {
        index = ifMatch + 3;
        continue;
      }

      let condition = '';
      let openBrace = -1;

      const trimmedAfter = afterIf.trimStart();
      if (trimmedAfter.startsWith('(')) {
        // Parenthesized condition: @if (cycleCount.value > 50) { ... }
        const openParen = src.indexOf('(', ifMatch + 3);
        const closeParen = this.findMatchingParen(src, openParen);
        if (closeParen === -1) {
          index = ifMatch + 3;
          continue;
        }

        condition = src.slice(openParen + 1, closeParen).trim();
        openBrace = src.indexOf('{', closeParen + 1);
        if (openBrace === -1) {
          index = ifMatch + 3;
          continue;
        }
      } else {
        // Non-parenthesized condition: @if cycleCount.value > 50 { ... }
        openBrace = src.indexOf('{', ifMatch + 3);
        if (openBrace === -1) {
          index = ifMatch + 3;
          continue;
        }

        const condSub = src.slice(ifMatch + 3, openBrace).trim();
        // Skip if there is an HTML opening/closing tag before '{'
        if (/<[a-zA-Z/]/.test(condSub)) {
          index = ifMatch + 3;
          continue;
        }
        condition = condSub;
      }

      if (!condition) {
        index = ifMatch + 3;
        continue;
      }

      // Find matching closing '}' for the then block
      const closeBrace = this.findMatchingBrace(src, openBrace);
      if (closeBrace === -1) {
        index = openBrace + 1;
        continue;
      }

      const thenContent = src.slice(openBrace + 1, closeBrace);
      let totalEnd = closeBrace + 1;

      // Check if followed by else / @else
      const afterThen = src.slice(totalEnd);
      const elseMatch = afterThen.match(/^\s*(?:@?else\s*\{|@?else\s+if\b)/);

      let elseContent: string | null = null;
      if (elseMatch) {
        const elseStartInAfter = elseMatch.index ?? 0;
        const elseOpenBrace = afterThen.indexOf('{', elseStartInAfter);
        if (elseOpenBrace !== -1) {
          const absElseOpen = totalEnd + elseOpenBrace;
          const elseCloseBrace = this.findMatchingBrace(src, absElseOpen);
          if (elseCloseBrace !== -1) {
            elseContent = src.slice(absElseOpen + 1, elseCloseBrace);
            totalEnd = elseCloseBrace + 1;
          }
        }
      }

      const safeCond = condition.replace(/"/g, '&quot;');
      const nestedThen = this.preprocessControlBlocks(thenContent);
      const nestedElse = elseContent !== null ? this.preprocessControlBlocks(elseContent) : null;

      const replacement = `<canvapps-if condition="${safeCond}"><canvapps-then>${nestedThen}</canvapps-then>${
        nestedElse !== null ? `<canvapps-else>${nestedElse}</canvapps-else>` : ''
      }</canvapps-if>`;

      src = src.slice(0, ifMatch) + replacement + src.slice(totalEnd);
      index = ifMatch + replacement.length;
    }

    return src;
  }

  private static findMatchingParen(src: string, openIndex: number): number {
    let depth = 0;
    let inQuotes = false;
    let quoteChar = '';

    for (let i = openIndex; i < src.length; i++) {
      const char = src[i];
      if ((char === '"' || char === "'") && depth > 0) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
      } else if (char === '(' && !inQuotes) {
        depth++;
      } else if (char === ')' && !inQuotes) {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  }

  private static findMatchingBrace(src: string, openIndex: number): number {
    let depth = 0;
    let inQuotes = false;
    let quoteChar = '';
    let inTag = false;

    for (let i = openIndex; i < src.length; i++) {
      const char = src[i];

      if (char === '<') {
        inTag = true;
      } else if (char === '>') {
        inTag = false;
        inQuotes = false;
      }

      // Quotes only toggle inside tags (attributes) or inside nested JS expressions (depth > 1)
      if ((char === '"' || char === "'") && (inTag || depth > 1)) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
      } else if (char === '{' && !inQuotes) {
        depth++;
      } else if (char === '}' && !inQuotes) {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * Helper to parse *for="item in items" or @each="items as item, index"
   */
  private static parseForDirective(value: string): { item: string; index?: string; iterable: string } {
    // 1. Support Svelte-style "iterable as item" or "iterable as item, index" or "iterable as (item, index)"
    if (/\bas\b/.test(value)) {
      const parts = value.split(/\bas\b/);
      const iterable = parts[0].trim();
      let rhs = parts[1].trim();
      if (rhs.startsWith('(') && rhs.endsWith(')')) {
        rhs = rhs.slice(1, -1).trim();
      }
      const subParts = rhs.split(',').map((s) => s.trim());
      return {
        item: subParts[0],
        index: subParts[1],
        iterable,
      };
    }

    // 2. Support standard "item in items" or "(item, index) in items"
    const parts = value.split(/\bin\b/);
    if (parts.length !== 2) {
      return { item: 'item', iterable: value.trim() };
    }

    const lhs = parts[0].trim();
    const iterable = parts[1].trim();

    if (lhs.startsWith('(') && lhs.endsWith(')')) {
      const subParts = lhs.slice(1, -1).split(',').map((s) => s.trim());
      return {
        item: subParts[0],
        index: subParts[1],
        iterable,
      };
    }

    return {
      item: lhs,
      iterable,
    };
  }

  /**
   * Tokenizes template string into structural markup tokens.
   */
  private static tokenize(src: string): Array<{
    type: 'tag-open' | 'tag-close' | 'text';
    tagName?: string;
    value: string;
    isSelfClosing?: boolean;
    attributes?: Array<{ name: string; value: string }>;
  }> {
    const tokens: Array<{
      type: 'tag-open' | 'tag-close' | 'text';
      tagName?: string;
      value: string;
      isSelfClosing?: boolean;
      attributes?: Array<{ name: string; value: string }>;
    }> = [];

    const cleanSrc = src.replace(/<!--[\s\S]*?-->/g, '');
    let cursor = 0;
    const len = cleanSrc.length;

    while (cursor < len) {
      if (cleanSrc[cursor] === '<') {
        // Tag closing e.g. </view>
        if (cleanSrc[cursor + 1] === '/') {
          const closeEnd = cleanSrc.indexOf('>', cursor);
          if (closeEnd !== -1) {
            const tagName = cleanSrc.slice(cursor + 2, closeEnd).trim();
            tokens.push({
              type: 'tag-close',
              tagName,
              value: cleanSrc.slice(cursor, closeEnd + 1),
            });
            cursor = closeEnd + 1;
            continue;
          }
        }

        // Tag opening or self-closing e.g. <view ...> or <input ... />
        const tagEnd = this.findTagEnd(cleanSrc, cursor + 1);
        if (tagEnd !== -1) {
          const tagRaw = cleanSrc.slice(cursor + 1, tagEnd);
          const isSelfClosing = tagRaw.endsWith('/');
          const cleanRaw = isSelfClosing ? tagRaw.slice(0, -1).trim() : tagRaw.trim();

          const [tagName, ...attrChunks] = this.splitTagTokens(cleanRaw);
          const attributes = this.parseAttributes(attrChunks.join(' '));

          tokens.push({
            type: 'tag-open',
            tagName,
            value: cleanSrc.slice(cursor, tagEnd + 1),
            isSelfClosing,
            attributes,
          });

          cursor = tagEnd + 1;
          continue;
        }
      }

      // Text node
      const nextTag = cleanSrc.indexOf('<', cursor);
      const textChunk = nextTag === -1 ? cleanSrc.slice(cursor) : cleanSrc.slice(cursor, nextTag);
      if (textChunk.trim()) {
        tokens.push({
          type: 'text',
          value: textChunk,
        });
      }
      cursor = nextTag === -1 ? len : nextTag;
    }

    return tokens;
  }

  private static splitTagTokens(tagContent: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let braceDepth = 0;

    for (let i = 0; i < tagContent.length; i++) {
      const char = tagContent[i];

      if ((char === '"' || char === "'") && braceDepth === 0) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
        current += char;
      } else if (char === '{' && !inQuotes) {
        braceDepth++;
        current += char;
      } else if (char === '}' && !inQuotes && braceDepth > 0) {
        braceDepth--;
        current += char;
      } else if (/\s/.test(char) && !inQuotes && braceDepth === 0) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      tokens.push(current.trim());
    }

    return tokens;
  }

  private static parseAttributes(attrString: string): Array<{ name: string; value: string }> {
    const attrs: Array<{ name: string; value: string }> = [];
    const regex = /([@:*A-Za-z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|\{([\s\S]*?)\}|([^>\s]+)))?/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(attrString)) !== null) {
      const name = match[1];
      const value = match[2] ?? match[3] ?? match[4] ?? match[5] ?? 'true';
      attrs.push({ name, value });
    }

    return attrs;
  }

  private static findTagEnd(src: string, start: number): number {
    let inQuotes = false;
    let quoteChar = '';
    let braceDepth = 0;
    for (let i = start; i < src.length; i++) {
      const char = src[i];
      if ((char === '"' || char === "'") && braceDepth === 0) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
      } else if (char === '{' && !inQuotes) {
        braceDepth++;
      } else if (char === '}' && !inQuotes && braceDepth > 0) {
        braceDepth--;
      } else if (char === '>' && !inQuotes && braceDepth === 0) {
        return i;
      }
    }
    return -1;
  }
}
