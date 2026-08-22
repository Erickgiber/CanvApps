import { CVSComponentAST, ASTElement, ASTNode, ASTProp, ASTDirectives } from './types';

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

    const tokens = this.tokenize(trimmed);
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
   * Helper to parse *for="item in items" or *for="(item, index) in items"
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

    for (let i = 0; i < tagContent.length; i++) {
      const char = tagContent[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
        current += char;
      } else if (/\s/.test(char) && !inQuotes) {
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
    const regex = /([@:*A-Za-z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^>\s]+)))?/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(attrString)) !== null) {
      const name = match[1];
      const value = match[2] ?? match[3] ?? match[4] ?? 'true';
      attrs.push({ name, value });
    }

    return attrs;
  }

  private static findTagEnd(src: string, start: number): number {
    let inQuotes = false;
    let quoteChar = '';
    for (let i = start; i < src.length; i++) {
      const char = src[i];
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === '>' && !inQuotes) {
        return i;
      }
    }
    return -1;
  }
}
