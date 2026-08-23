import { CVSParser } from './parser';
import { CVSCodeGenerator } from './codegen';
import { CVSComponentAST } from './types';

export interface CompileResult {
  code: string;
  ast: CVSComponentAST;
}

/**
 * Compiles a raw .cvs file string into executable TypeScript source code.
 *
 * @param source The raw string content of the .cvs component.
 * @returns Generated TypeScript code and AST.
 */
export function compileCVS(source: string): CompileResult {
  const ast = CVSParser.parse(source);
  const generator = new CVSCodeGenerator();
  const code = generator.generate(ast);

  return {
    code,
    ast,
  };
}
