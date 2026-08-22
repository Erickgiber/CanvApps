/**
 * Represents an attribute or binding on a .cvs template element.
 */
export interface ASTProp {
  name: string;
  value: string;
  isDynamic: boolean; // e.g. :width="200" or :text="counter.value"
  isEvent: boolean;   // e.g. @click="handleClick"
}

/**
 * Directive attributes on template elements (*if, *for).
 */
export interface ASTDirectives {
  ifCondition?: string;
  forLoop?: {
    item: string;
    index?: string;
    iterable: string;
  };
}

/**
 * Text node inside a template element.
 */
export interface ASTTextNode {
  type: 'text';
  content: string;
  isDynamic: boolean; // e.g. {{ counter.value }}
}

/**
 * Element node inside a template tree.
 */
export interface ASTElement {
  type: 'element';
  tag: string;
  props: ASTProp[];
  directives: ASTDirectives;
  children: ASTNode[];
}

export type ASTNode = ASTElement | ASTTextNode;

/**
 * Complete Abstract Syntax Tree for a .cvs Single File Component.
 */
export interface CVSComponentAST {
  script: string;
  template: ASTElement | null;
}
