import { ASTElement, ASTNode, ASTProp, CVSComponentAST } from './types';

/**
 * Generates executable TypeScript code from a CVSComponentAST.
 */
export class CVSCodeGenerator {
  private idCounter = 0;

  /**
   * Generates full TypeScript source file string for the given component AST.
   */
  public generate(ast: CVSComponentAST): string {
    const { script, template } = ast;

    if (!template) {
      return `${script}\n\nexport default function createComponent() { return null; }`;
    }

    const { code: templateCode, rootVar } = this.generateNode(template);

    // Separate imports from script body so variables and props are scoped inside createComponent
    const importLines: string[] = [];
    const bodyLines: string[] = [];

    const lines = script.split('\n');
    let inMultiImport = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ') || trimmed.startsWith('import{') || inMultiImport) {
        importLines.push(line);
        if (trimmed.includes('from ') || trimmed.endsWith(';') || (!trimmed.startsWith('import') && trimmed.includes('}'))) {
          inMultiImport = false;
        } else if (trimmed.startsWith('import') && !trimmed.includes('from')) {
          inMultiImport = true;
        }
      } else {
        bodyLines.push(line);
      }
    }

    return `
import { UIView, UIText, UIButton, UIInput, UIModal, UIElement, KineticFX, Motion, createRouter, useRouter, effect, signal, useBreakpoints, useMediaQuery } from '@canvapps';
${importLines.join('\n')}

export function createComponent(props: Record<string, any> = {}): UIElement {
${bodyLines.join('\n')}

${templateCode}
  return ${rootVar};
}

export default createComponent;
`.trim();
  }

  private nextId(prefix = 'node'): string {
    const clean = prefix.replace(/[^a-zA-Z0-9_$]/g, '_');
    return `${clean}_${++this.idCounter}`;
  }

  private generateNode(node: ASTNode, inLoop = false): { code: string; rootVar: string } {
    // 1. Text node
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

    // 2. Conditional block node (@if ... { ... } else { ... })
    if (node.type === 'if-block') {
      const ifContainer = this.nextId('ifContainer');
      const consequentLines: string[] = [];
      const alternateLines: string[] = [];
      const hasModal = node.consequent.some((c) => c.type === 'element' && (c as ASTElement).tag === 'modal');

      for (const child of node.consequent) {
        const { code: cCode, rootVar: cVar } = this.generateNode(child, inLoop);
        consequentLines.push(cCode);
        consequentLines.push(`        ${ifContainer}.addChild(${cVar});`);
      }

      if (node.alternate && node.alternate.length > 0) {
        for (const child of node.alternate) {
          const { code: aCode, rootVar: aVar } = this.generateNode(child, inLoop);
          alternateLines.push(aCode);
          alternateLines.push(`        ${ifContainer}.addChild(${aVar});`);
        }
      }

      const initialStyles = hasModal
        ? `{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }`
        : `{}`;

      return {
        code: `
  const ${ifContainer} = new UIView(${initialStyles});
  effect(() => {
    ${ifContainer}.removeAllChildren();
    if (${node.condition}) {
      ${ifContainer}.visible = true;
      ${ifContainer}.setStyle({ display: 'flex' });
${consequentLines.join('\n')}
    }${node.alternate && node.alternate.length > 0 ? ` else {\n      ${ifContainer}.visible = true;\n      ${ifContainer}.setStyle({ display: 'flex' });\n${alternateLines.join('\n')}\n    }` : ` else {\n      ${ifContainer}.visible = false;\n      ${ifContainer}.setStyle({ display: 'none' });\n    }`}
  });
`,
        rootVar: ifContainer,
      };
    }

    // 3. Iteration block node (@each rows as row { ... })
    if (node.type === 'each-block') {
      const forContainer = this.nextId('forContainer');
      const itemCodeLines: string[] = [];
      for (const child of node.body) {
        const { code: cCode, rootVar: cVar } = this.generateNode(child, true);
        itemCodeLines.push(cCode);
        itemCodeLines.push(`        ${forContainer}.addChild(${cVar});`);
      }

      const indexParam = node.index ? `, ${node.index}` : '';

      return {
        code: `
  const ${forContainer} = new UIView({ width: '100%', flexDirection: 'column', gap: 6 });
  effect(() => {
    ${forContainer}.removeAllChildren();
    const items = ${node.iterable};
    if (Array.isArray(items)) {
      items.forEach((${node.item}${indexParam}) => {
${itemCodeLines.join('\n')}
      });
    }
  });
`,
        rootVar: forContainer,
      };
    }

    // 4. Element node (<view>, <text>, <button>, <input>, <modal>, or Custom Component <SplashView />)
    const element = node as ASTElement;
    if (element.tag === 'template') {
      const fragmentVar = this.nextId('fragment');
      const childLines: string[] = [];
      for (const child of element.children) {
        const { code: cCode, rootVar: cVar } = this.generateNode(child, inLoop);
        childLines.push(cCode);
        childLines.push(`  ${fragmentVar}.addChild(${cVar});`);
      }
      return {
        code: `  const ${fragmentVar} = new UIView({ width: '100%', height: '100%' });\n${childLines.join('\n')}`,
        rootVar: fragmentVar,
      };
    }

    // Single-item conditional tag attribute: @if="condition" or *if="condition"
    if (element.directives.ifCondition) {
      const condition = element.directives.ifCondition;
      const elementWithoutIf = {
        ...element,
        directives: { ...element.directives, ifCondition: undefined },
      };
      const { code: itemCode, rootVar: itemRoot } = this.generateNode(elementWithoutIf, inLoop);

      return {
        code: `${itemCode}
  effect(() => {
    const isVis = Boolean(${condition});
    ${itemRoot}.visible = isVis;
    ${itemRoot}.setStyle({ display: isVis ? 'flex' : 'none' });
  });
`,
        rootVar: itemRoot,
      };
    }

    const elVar = this.nextId(element.tag);
    const codeLines: string[] = [];

    // 1. Instantiate element based on tag
    const { staticStyles, dynamicProps, events } = this.classifyProps(element.props);
    const isCustomComponent = /^[A-Z]/.test(element.tag);

    if (isCustomComponent) {
      const propPairs: string[] = [];
      for (const evt of events) {
        const val = evt.value.trim();
        const handlerName = `on${evt.name.charAt(0).toUpperCase()}${evt.name.slice(1)}`;
        if (val.includes('=>')) {
          propPairs.push(`${handlerName}: (${val}) as any`);
        } else if (val.endsWith(')')) {
          propPairs.push(`${handlerName}: () => { ${val}; }`);
        } else {
          propPairs.push(`${handlerName}: (e) => { ${val}(e); }`);
        }
      }
      for (const dyn of dynamicProps) {
        propPairs.push(`${dyn.name}: ${dyn.value}`);
      }
      const propsArg = propPairs.length > 0
        ? `{ ...${JSON.stringify(staticStyles)}, ${propPairs.join(', ')} }`
        : JSON.stringify(staticStyles);

      codeLines.push(`  const ${elVar} = ${element.tag}(${propsArg});`);
    } else if (element.tag === 'text') {
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
    } else if (element.tag === 'modal') {
      codeLines.push(`  const ${elVar} = new UIModal(${JSON.stringify(staticStyles)});`);
    } else {
      // Default to UIView container
      codeLines.push(`  const ${elVar} = new UIView(${JSON.stringify(staticStyles)});`);
    }

    // 2. Attach Event Handlers (@click, @pointerdown, @submit, @close, etc.)
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

    // 3. Attach Dynamic Bindings (:prop="expr" or :prop={expr})
    for (const dyn of dynamicProps) {
      if (inLoop) {
        if (element.tag === 'input' && dyn.name === 'value') {
          codeLines.push(`  ${elVar}.setValue(String(${dyn.value} ?? ''));`);
        } else if (element.tag === 'input' && dyn.name === 'placeholder') {
          codeLines.push(`  ${elVar}.setPlaceholder(String(${dyn.value} ?? ''));`);
        } else if (element.tag === 'modal' && dyn.name === 'open') {
          codeLines.push(`  ${elVar}.setOpen(Boolean(${dyn.value}));`);
        } else if (element.tag === 'text' && dyn.name === 'text') {
          codeLines.push(`  ${elVar}.setText(String(${dyn.value} ?? ''));`);
        } else if (element.tag === 'text' && dyn.name === 'selectable') {
          codeLines.push(`  ${elVar}.setSelectable(Boolean(${dyn.value}));`);
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
        } else if (element.tag === 'input' && dyn.name === 'placeholder') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setPlaceholder(String(${dyn.value} ?? ''));
  });`);
        } else if (element.tag === 'modal' && dyn.name === 'open') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setOpen(Boolean(${dyn.value}));
  });`);
        } else if (element.tag === 'text' && dyn.name === 'text') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setText(String(${dyn.value} ?? ''));
  });`);
        } else if (element.tag === 'text' && dyn.name === 'selectable') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setSelectable(Boolean(${dyn.value}));
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

    // Process children
    for (const child of element.children) {
      if (child.type === 'text' && (element.tag === 'text' || element.tag === 'button')) {
        continue;
      }
      const { code: childCode, rootVar: childVar } = this.generateNode(child, inLoop);
      codeLines.push(childCode);
      codeLines.push(`  ${elVar}.addChild(${childVar});`);
    }

    // Declarative Motion animation attributes (enter="scale" or enter="fade")
    const enterProp = element.props.find((p) => p.name === 'enter' || p.name === 'transition');
    if (enterProp && !inLoop) {
      const enterVal = enterProp.value.trim() || 'scale';
      codeLines.push(`  Motion.enter(${elVar}, { type: ${JSON.stringify(enterVal)} });`);
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
        staticStyles[prop.name] = this.coerceStaticValue(prop.name, prop.value);
      }
    }

    return { staticStyles, dynamicProps, events };
  }

  private coerceStaticValue(key: string, value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;

    if (
      key === 'width' ||
      key === 'height' ||
      key === 'minWidth' ||
      key === 'minHeight' ||
      key === 'maxWidth' ||
      key === 'maxHeight'
    ) {
      if (/^\d+%$/.test(value)) {
        return value;
      }
    }

    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }

    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch {
        const parts = value.slice(1, -1).split(',').map((s) => s.trim());
        return parts.map((p) => (/^-?\d+$/.test(p) ? Number(p) : p));
      }
    }

    return value;
  }
}
