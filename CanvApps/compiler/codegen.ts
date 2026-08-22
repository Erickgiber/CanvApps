import { CVSComponentAST, ASTElement, ASTNode, ASTProp } from './types';

/**
 * Generates executable TypeScript code from a CVSComponentAST.
 */
export class CVSCodeGenerator {
  private idCounter = 0;

  /**
   * Transforms an AST into executable TypeScript code.
   *
   * @param ast The parsed CVSComponentAST.
   * @returns Complete TypeScript code ready for execution or bundling.
   */
  public generate(ast: CVSComponentAST): string {
    this.idCounter = 0;

    const script = ast.script || '';
    const template = ast.template;

    if (!template) {
      return `${script}\n\nexport default function createComponent() { return null; }`;
    }

    const { code: templateCode, rootVar } = this.generateNode(template);

    return `
import { UIView, UIText, UIButton, UIInput, UIElement, effect, signal } from '@canvapps';

${script}

export function createComponent(props: Record<string, any> = {}): UIElement {
${templateCode}
  return ${rootVar};
}

export default createComponent;
`.trim();
  }

  private nextId(prefix = 'node'): string {
    return `${prefix}_${++this.idCounter}`;
  }

  private generateNode(node: ASTNode): { code: string; rootVar: string } {
    if (node.type === 'text') {
      const textVar = this.nextId('textNode');
      if (node.isDynamic) {
        return {
          code: `
  const ${textVar} = new UIText('');
  effect(() => {
    ${textVar}.setText(String(${node.content}));
  });
`,
          rootVar: textVar,
        };
      } else {
        return {
          code: `  const ${textVar} = new UIText(${JSON.stringify(node.content)});\n`,
          rootVar: textVar,
        };
      }
    }

    // Element node
    const element = node as ASTElement;
    const elVar = this.nextId(element.tag);
    const codeLines: string[] = [];

    // 1. Instantiate element based on tag
    const { staticStyles, dynamicProps, events } = this.classifyProps(element.props);

    if (element.tag === 'text') {
      // Find text children if any
      const textChild = element.children.find((c) => c.type === 'text');
      const label = textChild ? textChild.content : '';
      const isDynamic = textChild?.isDynamic;

      codeLines.push(`  const ${elVar} = new UIText(${isDynamic ? "''" : JSON.stringify(label)}, ${JSON.stringify(staticStyles)});`);
      if (isDynamic && textChild) {
        codeLines.push(`  effect(() => { ${elVar}.setText(String(${textChild.content})); });`);
      }
    } else if (element.tag === 'button') {
      const textChild = element.children.find((c) => c.type === 'text');
      const label = textChild ? textChild.content : staticStyles.label ?? '';
      codeLines.push(`  const ${elVar} = new UIButton(${JSON.stringify(label)}, ${JSON.stringify(staticStyles)});`);
    } else if (element.tag === 'input') {
      codeLines.push(`  const ${elVar} = new UIInput(${JSON.stringify(staticStyles)});`);
    } else {
      // Default to UIView container
      codeLines.push(`  const ${elVar} = new UIView(${JSON.stringify(staticStyles)});`);
    }

    // 2. Attach Event Handlers (@click, @pointerdown, etc.)
    for (const evt of events) {
      codeLines.push(`  ${elVar}.on(${JSON.stringify(evt.name)}, (e) => { ${evt.value}(e); });`);
    }

    // 3. Attach Dynamic Style Bindings (:prop="expr")
    for (const dyn of dynamicProps) {
      codeLines.push(`
  effect(() => {
    ${elVar}.setStyle({ [${JSON.stringify(dyn.name)}]: ${dyn.value} });
  });`);
    }

    // 4. Handle Directives (*if, *for) & Children
    if (element.directives.forLoop) {
      const { item, index = 'index', iterable } = element.directives.forLoop;
      const listContainer = this.nextId('forContainer');
      const itemTemplate = { ...element, directives: {} };
      const { code: itemCode, rootVar: itemRoot } = this.generateNode(itemTemplate);

      return {
        code: `
  const ${listContainer} = new UIView({ width: '100%', flexDirection: 'column' });
  effect(() => {
    ${listContainer}.removeAllChildren();
    const list = ${iterable};
    if (Array.isArray(list)) {
      list.forEach((${item}, ${index}) => {
        ${itemCode}
        ${listContainer}.addChild(${itemRoot});
      });
    }
  });
`,
        rootVar: listContainer,
      };
    }

    // Process non-text children (text children are handled inside <text> or <button>)
    for (const child of element.children) {
      if (child.type === 'text' && (element.tag === 'text' || element.tag === 'button')) {
        continue;
      }
      const { code: childCode, rootVar: childVar } = this.generateNode(child);
      codeLines.push(childCode);
      codeLines.push(`  ${elVar}.addChild(${childVar});`);
    }

    return {
      code: codeLines.join('\n'),
      rootVar: elVar,
    };
  }

  private classifyProps(props: ASTProp[]): {
    staticStyles: Record<string, any>;
    dynamicProps: ASTProp[];
    events: ASTProp[];
  } {
    const staticStyles: Record<string, any> = {};
    const dynamicProps: ASTProp[] = [];
    const events: ASTProp[] = [];

    for (const prop of props) {
      if (prop.isEvent) {
        events.push(prop);
      } else if (prop.isDynamic) {
        dynamicProps.push(prop);
      } else {
        // Parse numbers, booleans, strings
        let val: any = prop.value;
        if (!isNaN(Number(val)) && val !== '') {
          val = Number(val);
        } else if (val === 'true') {
          val = true;
        } else if (val === 'false') {
          val = false;
        }
        staticStyles[prop.name] = val;
      }
    }

    return { staticStyles, dynamicProps, events };
  }
}
