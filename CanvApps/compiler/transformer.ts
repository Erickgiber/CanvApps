import { CVSParser } from './parser';
import { CVSCodeGenerator } from './codegen';
import { CVSComponentAST } from './types';

export interface CompileResult {
  code: string;
  ast: CVSComponentAST;
}

export function compileCVS(source: string): CompileResult {
  const ast = CVSParser.parse(source);
  const generator = new CVSCodeGenerator();
  const code = generator.generate(ast);

  return {
    code,
    ast,
  };
}
