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

  private generateNode(node: ASTNode, inLoop = false): { code: string; rootVar: string } {
    if (node.type === 'text') {
      const textVar = this.nextId('textNode');
      if (node.isDynamic) {
        if (inLoop) {
          return {
            code: `  const ${textVar} = new UIText(String(${node.content}));\n`,
            rootVar: textVar,
          };
        } else {
          return {
            code: `
  const ${textVar} = new UIText('');
  effect(() => {
    ${textVar}.setText(String(${node.content}));
  });
`,
            rootVar: textVar,
          };
        }
      } else {
        return {
          code: `  const ${textVar} = new UIText(${JSON.stringify(node.content)});\n`,
          rootVar: textVar,
        };
      }
    }

    // Element node
    const element = node as ASTElement;

    // Handle Directives (*for / @each) BEFORE generating local element code
    if (element.directives.forLoop) {
      const { item, index = 'index', iterable } = element.directives.forLoop;
      const listContainer = this.nextId('forContainer');
      const itemTemplate = { ...element, directives: {} };
      const { code: itemCode, rootVar: itemRoot } = this.generateNode(itemTemplate, true);

      return {
        code: `
  const ${listContainer} = new UIView({ width: '100%', flexDirection: 'column', gap: 6 });
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

    const elVar = this.nextId(element.tag);
    const codeLines: string[] = [];

    // 1. Instantiate element based on tag
    const { staticStyles, dynamicProps, events } = this.classifyProps(element.props);

    if (element.tag === 'text') {
      const textChild = element.children.find((c) => c.type === 'text');
      const label = textChild ? textChild.content : '';
      const isDynamic = textChild?.isDynamic;

      codeLines.push(`  const ${elVar} = new UIText(${isDynamic ? "''" : JSON.stringify(label)}, ${JSON.stringify(staticStyles)});`);
      if (isDynamic && textChild) {
        if (inLoop) {
          codeLines.push(`  ${elVar}.setText(String(${textChild.content}));`);
        } else {
          codeLines.push(`  effect(() => { ${elVar}.setText(String(${textChild.content})); });`);
        }
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

    // 2. Attach Event Handlers (@click, @pointerdown, @submit, etc.)
    for (const evt of events) {
      const val = evt.value.trim();
      if (val.includes('=>')) {
        codeLines.push(`  ${elVar}.on(${JSON.stringify(evt.name)}, (${val}) as any);`);
      } else if (val.endsWith(')')) {
        codeLines.push(`  ${elVar}.on(${JSON.stringify(evt.name)}, () => { ${val}; });`);
      } else {
        codeLines.push(`  ${elVar}.on(${JSON.stringify(evt.name)}, (e) => { ${val}(e); });`);
      }
    }

    // 3. Attach Dynamic Bindings (:prop="expr")
    for (const dyn of dynamicProps) {
      if (inLoop) {
        if (element.tag === 'input' && dyn.name === 'value') {
          codeLines.push(`  ${elVar}.setValue(String(${dyn.value} ?? ''));`);
        } else if (element.tag === 'text' && dyn.name === 'text') {
          codeLines.push(`  ${elVar}.setText(String(${dyn.value} ?? ''));`);
        } else if (element.tag === 'button' && dyn.name === 'label') {
          codeLines.push(`  ${elVar}.setLabel(String(${dyn.value} ?? ''));`);
        } else {
          codeLines.push(`  ${elVar}.setStyle({ [${JSON.stringify(dyn.name)}]: ${dyn.value} });`);
        }
      } else {
        if (element.tag === 'input' && dyn.name === 'value') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setValue(String(${dyn.value} ?? ''));
  });`);
        } else if (element.tag === 'text' && dyn.name === 'text') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setText(String(${dyn.value} ?? ''));
  });`);
        } else if (element.tag === 'button' && dyn.name === 'label') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setLabel(String(${dyn.value} ?? ''));
  });`);
        } else {
          codeLines.push(`
  effect(() => {
    ${elVar}.setStyle({ [${JSON.stringify(dyn.name)}]: ${dyn.value} });
  });`);
        }
      }
    }

    // Process non-text children
    for (const child of element.children) {
      if (child.type === 'text' && (element.tag === 'text' || element.tag === 'button')) {
        continue;
      }
      const { code: childCode, rootVar: childVar } = this.generateNode(child, inLoop);
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
        // Parse numbers, booleans, arrays, strings
        let val: any = prop.value;
        if (!isNaN(Number(val)) && val !== '') {
          val = Number(val);
        } else if (val === 'true') {
          val = true;
        } else if (val === 'false') {
          val = false;
        } else if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
          try {
            val = JSON.parse(val);
          } catch {
            // fallback
          }
        }
        staticStyles[prop.name] = val;
      }
    }

    return { staticStyles, dynamicProps, events };
  }
}
