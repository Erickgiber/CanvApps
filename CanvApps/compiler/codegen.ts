import { ASTElement, ASTNode, ASTProp, ASTTextNode, CVSComponentAST } from './types';

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
import { UIView, UIText, UIButton, UIInput, UIModal, UIMotion, UIImage, UIScrollView, UIAnchor, UILink, UIElement, KineticFX, Motion, createRouter, useRouter, effect, signal, computed, batch, untrack, createStore, persistentSignal, useBreakpoints, useMediaQuery, useWindowSize } from '@canvapps';
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
      const textVar = this.nextId('text');
      const textNode = node as ASTTextNode;
      if (textNode.isDynamic) {
        if (inLoop) {
          return {
            code: `  const ${textVar} = new UIText(String(${textNode.content}));`,
            rootVar: textVar,
          };
        } else {
          return {
            code: `
  const ${textVar} = new UIText('');
  effect(() => {
    ${textVar}.setText(String(${textNode.content}));
  });
`,
            rootVar: textVar,
          };
        }
      } else {
        return {
          code: `  const ${textVar} = new UIText(${JSON.stringify(textNode.content)}, {});`,
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
        : `{ display: 'contents' }`;

      return {
        code: `
  const ${ifContainer} = new UIView(${initialStyles});
  effect(() => {
    const isConditionActive = Boolean(${node.condition});
    untrack(() => {
      ${ifContainer}.removeAllChildren();
      if (isConditionActive) {
        ${ifContainer}.visible = true;
        ${ifContainer}.setStyle({ display: ${hasModal ? "'flex'" : "'contents'"} });
${consequentLines.join('\n')}
      }${node.alternate && node.alternate.length > 0 ? ` else {\n        ${ifContainer}.visible = true;\n        ${ifContainer}.setStyle({ display: ${hasModal ? "'flex'" : "'contents'"} });\n${alternateLines.join('\n')}\n      }` : ` else {\n        ${ifContainer}.visible = false;\n        ${ifContainer}.setStyle({ display: 'none' });\n      }`}
    });
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
  const ${forContainer} = new UIView({ display: 'contents' });
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

    // 4. Element node (<view>, <text>, <button>, <input>, <modal>, <motion>, or Custom Component <SplashView />)
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

    // Directive: forLoop attribute on element (e.g. <view @each="items as item, index"> or <view *for="...">)
    if (element.directives.forLoop) {
      const forLoop = element.directives.forLoop;
      const forContainer = this.nextId('forContainer');
      const elementWithoutFor: ASTElement = {
        ...element,
        directives: {
          ...element.directives,
          forLoop: undefined,
        },
      };
      const { code: itemCode, rootVar: itemRoot } = this.generateNode(elementWithoutFor, true);
      const indexParam = forLoop.index ? `, ${forLoop.index}` : '';

      return {
        code: `
  const ${forContainer} = new UIView({ display: 'contents' });
  effect(() => {
    ${forContainer}.removeAllChildren();
    const items = ${forLoop.iterable};
    if (Array.isArray(items)) {
      items.forEach((${forLoop.item}${indexParam}) => {
${itemCode}
        ${forContainer}.addChild(${itemRoot});
      });
    }
  });
`,
        rootVar: forContainer,
      };
    }

    // Single-item conditional tag attribute: @if="condition" or *if="condition"
    if (element.directives.ifCondition) {
      const condition = element.directives.ifCondition;
      const elementWithoutIf: ASTElement = {
        ...element,
        directives: { ...element.directives, ifCondition: undefined },
      };
      const { code: itemCode, rootVar: itemRoot } = this.generateNode(elementWithoutIf, inLoop);

      if (inLoop) {
        const isVisVar = this.nextId('isVis');
        return {
          code: `${itemCode}
  const ${isVisVar} = Boolean(${condition});
  ${itemRoot}.visible = ${isVisVar};
  ${itemRoot}.setStyle({ display: ${isVisVar} ? 'flex' : 'none' });
`,
          rootVar: itemRoot,
        };
      }

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
      const childVars: string[] = [];
      for (const child of element.children) {
        if (child.type === 'text') continue;
        const { code: childCode, rootVar: childVar } = this.generateNode(child, inLoop);
        codeLines.push(childCode);
        childVars.push(childVar);
      }

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
      if (childVars.length > 0) {
        propPairs.push(`children: [${childVars.join(', ')}]`);
      }

      const propsArg = propPairs.length > 0
        ? `{ ...${JSON.stringify(staticStyles)}, ${propPairs.join(', ')} }`
        : JSON.stringify(staticStyles);

      codeLines.push(`  const ${elVar} = ${element.tag}(${propsArg});`);
    } else if (element.tag === 'slot') {
      codeLines.push(`  const ${elVar} = new UIView({ display: 'contents', ...${JSON.stringify(staticStyles)} });`);
      const slotCondVar = this.nextId('hasSlotChildren');
      codeLines.push(`  const ${slotCondVar} = Array.isArray((props as any)?.children) ? (props as any).children.length > 0 : Boolean((props as any)?.children);`);
      codeLines.push(`  if (${slotCondVar}) {`);
      codeLines.push(`    if (Array.isArray((props as any).children)) {`);
      codeLines.push(`      for (const slotChild of (props as any).children) {`);
      codeLines.push(`        if (slotChild) ${elVar}.addChild(slotChild);`);
      codeLines.push(`      }`);
      codeLines.push(`    } else {`);
      codeLines.push(`      ${elVar}.addChild((props as any).children);`);
      codeLines.push(`    }`);
      codeLines.push(`  }`);
      if (element.children.length > 0) {
        codeLines.push(`  else {`);
        for (const child of element.children) {
          if (child.type === 'text') continue;
          const { code: childCode, rootVar: childVar } = this.generateNode(child, inLoop);
          codeLines.push(childCode);
          codeLines.push(`    ${elVar}.addChild(${childVar});`);
        }
        codeLines.push(`  }`);
      }
    } else if (element.tag === 'text') {
      const textChild = element.children.find((c) => c.type === 'text') as ASTTextNode | undefined;
      const content = textChild ? textChild.content : '';
      const isDynamic = textChild?.isDynamic;

      if (isDynamic && textChild) {
        codeLines.push(`  const ${elVar} = new UIText('', ${JSON.stringify(staticStyles)});`);
        if (inLoop) {
          codeLines.push(`  ${elVar}.setText(String(${content}));`);
        } else {
          codeLines.push(`
  effect(() => {
    ${elVar}.setText(String(${content}));
  });`);
        }
      } else {
        codeLines.push(`  const ${elVar} = new UIText(${JSON.stringify(content)}, ${JSON.stringify(staticStyles)});`);
      }
    } else if (element.tag === 'button') {
      const textChild = element.children.find((c) => c.type === 'text') as ASTTextNode | undefined;
      const label = textChild ? textChild.content : staticStyles.label ?? '';
      const isDynamic = textChild?.isDynamic;

      if (isDynamic && textChild) {
        codeLines.push(`  const ${elVar} = new UIButton('', ${JSON.stringify(staticStyles)});`);
        if (inLoop) {
          codeLines.push(`  ${elVar}.setLabel(String(${label}));`);
        } else {
          codeLines.push(`
  effect(() => {
    ${elVar}.setLabel(String(${label}));
  });`);
        }
      } else {
        codeLines.push(`  const ${elVar} = new UIButton(${JSON.stringify(label)}, ${JSON.stringify(staticStyles)});`);
      }
    } else if (element.tag === 'a' || element.tag === 'link' || element.tag === 'UIAnchor' || element.tag === 'UILink') {
      const textChild = element.children.find((c) => c.type === 'text') as ASTTextNode | undefined;
      const text = textChild ? textChild.content : staticStyles.text ?? staticStyles.label ?? '';
      const isDynamic = textChild?.isDynamic;

      if (isDynamic && textChild) {
        codeLines.push(`  const ${elVar} = new UIAnchor('', ${JSON.stringify(staticStyles)});`);
        if (inLoop) {
          codeLines.push(`  ${elVar}.setText(String(${text}));`);
        } else {
          codeLines.push(`
  effect(() => {
    ${elVar}.setText(String(${text}));
  });`);
        }
      } else {
        codeLines.push(`  const ${elVar} = new UIAnchor(${JSON.stringify(text)}, ${JSON.stringify(staticStyles)});`);
      }
    } else if (element.tag === 'image' || element.tag === 'img' || element.tag === 'UIImage') {
      const srcProp = element.props.find((p) => p.name === 'src' && !p.isDynamic);
      const fitProp = element.props.find((p) => p.name === 'fit' && !p.isDynamic);
      const srcVal = srcProp ? srcProp.value : '';
      const fitVal = fitProp ? fitProp.value : (staticStyles.fit || 'cover');
      codeLines.push(`  const ${elVar} = new UIImage(${JSON.stringify(srcVal)}, { ...${JSON.stringify(staticStyles)}, fit: ${JSON.stringify(fitVal)} });`);
    } else if (element.tag === 'input') {
      codeLines.push(`  const ${elVar} = new UIInput(${JSON.stringify(staticStyles)});`);
    } else if (element.tag === 'modal') {
      codeLines.push(`  const ${elVar} = new UIModal(${JSON.stringify(staticStyles)});`);
    } else if (element.tag === 'motion' || element.tag === 'Motion') {
      codeLines.push(`  const ${elVar} = new UIMotion(${JSON.stringify(staticStyles)});`);
    } else if (element.tag === 'scroll-view' || element.tag === 'UIScrollView' || element.tag === 'ScrollView') {
      codeLines.push(`  const ${elVar} = new UIScrollView(${JSON.stringify(staticStyles)});`);
    } else {
      // Default to UIView container
      codeLines.push(`  const ${elVar} = new UIView(${JSON.stringify(staticStyles)});`);
    }

    // 2. Attach Event Handlers (@click, @pointerdown, @submit, @close, @scroll, etc.)
    for (const evt of events) {
      const val = evt.value.trim();
      if (val.includes('=>')) {
        codeLines.push(`  ${elVar}.on(${JSON.stringify(evt.name)}, (${val}) as any);`);
      } else if (val.endsWith(')')) {
        codeLines.push(`  ${elVar}.on(${JSON.stringify(evt.name)}, ($event) => { ${val}; });`);
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
        } else if ((element.tag === 'image' || element.tag === 'img' || element.tag === 'UIImage') && dyn.name === 'src') {
          codeLines.push(`  ${elVar}.setSrc(String(${dyn.value} ?? ''));`);
        } else if ((element.tag === 'image' || element.tag === 'img' || element.tag === 'UIImage') && dyn.name === 'fit') {
          codeLines.push(`  ${elVar}.setFit((${dyn.value}) as any);`);
        } else if (element.tag === 'modal' && dyn.name === 'open') {
          codeLines.push(`  ${elVar}.setOpen(Boolean(${dyn.value}));`);
        } else if (element.tag === 'modal' && dyn.name === 'originRect') {
          codeLines.push(`  ${elVar}.setStyle({ originRect: ${dyn.value} });`);
        } else if (element.tag === 'text' && dyn.name === 'text') {
          codeLines.push(`  ${elVar}.setText(String(${dyn.value} ?? ''));`);
        } else if (element.tag === 'text' && dyn.name === 'selectable') {
          codeLines.push(`  ${elVar}.setSelectable(Boolean(${dyn.value}));`);
        } else if (element.tag === 'button' && dyn.name === 'label') {
          codeLines.push(`  ${elVar}.setLabel(String(${dyn.value} ?? ''));`);
        } else if ((element.tag === 'a' || element.tag === 'link' || element.tag === 'UIAnchor' || element.tag === 'UILink') && dyn.name === 'href') {
          codeLines.push(`  ${elVar}.setHref(String(${dyn.value} ?? ''));`);
        } else if ((element.tag === 'a' || element.tag === 'link' || element.tag === 'UIAnchor' || element.tag === 'UILink') && (dyn.name === 'text' || dyn.name === 'label')) {
          codeLines.push(`  ${elVar}.setText(String(${dyn.value} ?? ''));`);
        } else if ((element.tag === 'a' || element.tag === 'link' || element.tag === 'UIAnchor' || element.tag === 'UILink') && dyn.name === 'target') {
          codeLines.push(`  ${elVar}.setTarget((${dyn.value}) as any);`);
        } else if ((element.tag === 'a' || element.tag === 'link' || element.tag === 'UIAnchor' || element.tag === 'UILink') && dyn.name === 'rel') {
          codeLines.push(`  ${elVar}.setRel(String(${dyn.value} ?? ''));`);
        } else if ((element.tag === 'a' || element.tag === 'link' || element.tag === 'UIAnchor' || element.tag === 'UILink') && dyn.name === 'underline') {
          codeLines.push(`  ${elVar}.setUnderline((${dyn.value}) as any);`);
        } else if ((element.tag === 'a' || element.tag === 'link' || element.tag === 'UIAnchor' || element.tag === 'UILink') && dyn.name === 'disabled') {
          codeLines.push(`  ${elVar}.setDisabled(Boolean(${dyn.value}));`);
        } else if ((element.tag === 'scroll-view' || element.tag === 'UIScrollView' || element.tag === 'ScrollView') && (dyn.name === 'scroll' || dyn.name === 'scrollDirection')) {
          codeLines.push(`  ${elVar}.setScroll((${dyn.value}) as any);`);
        } else if ((element.tag === 'scroll-view' || element.tag === 'UIScrollView' || element.tag === 'ScrollView') && dyn.name === 'showScrollbar') {
          codeLines.push(`  ${elVar}.setShowScrollbar((${dyn.value}) as any);`);
        } else if (dyn.name === 'scrollY' || dyn.name === 'scrollTop') {
          codeLines.push(`  ${elVar}.scrollTop = Number(${dyn.value} ?? 0);`);
        } else if (dyn.name === 'scrollX' || dyn.name === 'scrollLeft') {
          codeLines.push(`  ${elVar}.scrollLeft = Number(${dyn.value} ?? 0);`);
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
        } else if ((element.tag === 'image' || element.tag === 'img' || element.tag === 'UIImage') && dyn.name === 'src') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setSrc(String(${dyn.value} ?? ''));
  });`);
        } else if ((element.tag === 'image' || element.tag === 'img' || element.tag === 'UIImage') && dyn.name === 'fit') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setFit((${dyn.value}) as any);
  });`);
        } else if (element.tag === 'modal' && dyn.name === 'open') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setOpen(Boolean(${dyn.value}));
  });`);
        } else if (element.tag === 'modal' && dyn.name === 'originRect') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setStyle({ originRect: ${dyn.value} });
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
        } else if ((element.tag === 'a' || element.tag === 'link' || element.tag === 'UIAnchor' || element.tag === 'UILink') && dyn.name === 'href') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setHref(String(${dyn.value} ?? ''));
  });`);
        } else if ((element.tag === 'a' || element.tag === 'link' || element.tag === 'UIAnchor' || element.tag === 'UILink') && (dyn.name === 'text' || dyn.name === 'label')) {
          codeLines.push(`
  effect(() => {
    ${elVar}.setText(String(${dyn.value} ?? ''));
  });`);
        } else if ((element.tag === 'a' || element.tag === 'link' || element.tag === 'UIAnchor' || element.tag === 'UILink') && dyn.name === 'target') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setTarget((${dyn.value}) as any);
  });`);
        } else if ((element.tag === 'a' || element.tag === 'link' || element.tag === 'UIAnchor' || element.tag === 'UILink') && dyn.name === 'rel') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setRel(String(${dyn.value} ?? ''));
  });`);
        } else if ((element.tag === 'a' || element.tag === 'link' || element.tag === 'UIAnchor' || element.tag === 'UILink') && dyn.name === 'underline') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setUnderline((${dyn.value}) as any);
  });`);
        } else if ((element.tag === 'a' || element.tag === 'link' || element.tag === 'UIAnchor' || element.tag === 'UILink') && dyn.name === 'disabled') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setDisabled(Boolean(${dyn.value}));
  });`);
        } else if ((element.tag === 'scroll-view' || element.tag === 'UIScrollView' || element.tag === 'ScrollView') && (dyn.name === 'scroll' || dyn.name === 'scrollDirection')) {
          codeLines.push(`
  effect(() => {
    ${elVar}.setScroll((${dyn.value}) as any);
  });`);
        } else if ((element.tag === 'scroll-view' || element.tag === 'UIScrollView' || element.tag === 'ScrollView') && dyn.name === 'showScrollbar') {
          codeLines.push(`
  effect(() => {
    ${elVar}.setShowScrollbar((${dyn.value}) as any);
  });`);
        } else if (dyn.name === 'scrollY' || dyn.name === 'scrollTop') {
          codeLines.push(`
  effect(() => {
    ${elVar}.scrollTop = Number(${dyn.value} ?? 0);
  });`);
        } else if (dyn.name === 'scrollX' || dyn.name === 'scrollLeft') {
          codeLines.push(`
  effect(() => {
    ${elVar}.scrollLeft = Number(${dyn.value} ?? 0);
  });`);
        } else {
          codeLines.push(`
  effect(() => {
    ${elVar}.setStyle({ [${JSON.stringify(dyn.name)}]: ${dyn.value} });
  });`);
        }
      }
    }

    // Process children for native container elements
    if (!isCustomComponent && element.tag !== 'slot') {
      for (const child of element.children) {
        if (
          child.type === 'text' &&
          (element.tag === 'text' ||
            element.tag === 'button' ||
            element.tag === 'a' ||
            element.tag === 'link' ||
            element.tag === 'UIAnchor' ||
            element.tag === 'UILink')
        ) {
          continue;
        }
        const { code: childCode, rootVar: childVar } = this.generateNode(child, inLoop);
        codeLines.push(childCode);
        codeLines.push(`  ${elVar}.addChild(${childVar});`);
      }
    }


    // Declarative Motion animation attributes (enter="scale" or enter="fade") on standard nodes
    const enterProp = element.props.find((p) => p.name === 'enter' || p.name === 'transition');
    if (enterProp && !inLoop && element.tag !== 'motion' && element.tag !== 'Motion') {
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
