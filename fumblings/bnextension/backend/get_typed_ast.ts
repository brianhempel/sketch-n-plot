import { ImportResolver } from "pyright-internal/out/src/analyzer/importResolver";
import { printParseNodeType } from "pyright-internal/out/src/analyzer/parseTreeUtils";
import { ParseTreeWalker } from "pyright-internal/out/src/analyzer/parseTreeWalker";
import { Program } from "pyright-internal/out/src/analyzer/program";
import { CommandLineOptions } from 'pyright-internal/out/src/common/commandLineOptions';
import { ConfigOptions } from "pyright-internal/out/src/common/configOptions";
import {
  normalizeSlashes,
} from "pyright-internal/out/src/common/pathUtils";
import { isExpressionNode, ParseNode, ParseNodeType } from "pyright-internal/out/src/parser/parseNodes";
import { PyrightFileSystem } from "pyright-internal/out/src/pyrightFileSystem";
import { FullAccessHost } from 'pyright-internal/out/src/common/fullAccessHost';
import { createFromRealFileSystem } from 'pyright-internal/out/src/common/realFileSystem';
import { LogLevel, StandardConsoleWithLevel } from 'pyright-internal/out/src/common/console';

const options = new CommandLineOptions(process.cwd(), false);
console.log(options)

const configOptions = new ConfigOptions(process.cwd(), "strict");
configOptions.typeshedPath = normalizeSlashes(
  "node_modules/pyright-internal/typeshed-fallback"
);
configOptions.stubPath = normalizeSlashes(
  "python-type-stubs-main"
);
// configOptions.defaultPythonPlatform = options.pythonPlatform; // undefined
// configOptions.defaultPythonVersion = options.pythonVersion;

const outConsole = new StandardConsoleWithLevel(LogLevel.Log)
const realFs = new PyrightFileSystem(createFromRealFileSystem(outConsole));

const importResolver = new ImportResolver(
  realFs,
  configOptions,
  new FullAccessHost(realFs)
);

const program = new Program(importResolver, configOptions);
program.setTrackedFiles(["test.py"]);


while (program.analyze()) {
  // Continue to call analyze until it completes. Since we're not
  // specifying a timeout, it should complete the first time.
}

const sourceFile = program.getSourceFile("test.py")!;
const code       = sourceFile?.getFileContent() || "";
const parseTree  = sourceFile.getParseResults()!.parseTree
const evaluator  = program.evaluator;

console.log(configOptions)
// console.log(sourceFile)
// console.log(parseTree)
console.log(sourceFile.getDiagnostics(configOptions))

class PrintWalker extends ParseTreeWalker {
  override visitNode(node: ParseNode) {
    console.log(printParseNodeType(node.nodeType), code.substr(node.start, node.length));
    if (isExpressionNode(node)) {
      // const type = evaluator?.getType(node);
      const type = evaluator?.getTypeOfExpression(node);
      console.log(type);

      // if (type !== undefined) {
      //   console.log(evaluator?.printType(type));
      // }
      // console.log(evaluator?.getTypeResult(node));
      // console.log(evaluator?.getExpectedType(node));
    }
    // if (node.nodeType === ParseNodeType.Name) {
    //   const declaration = program.evaluator?.lookUpSymbolRecursive(
    //     node,
    //     node.value,
    //     false
    //   )?.symbol
    //   console.log(declaration);
    //   console.log(evaluator?.getDeclarationsForNameNode(node));
    // }
    return super.visitNode(node);
  }
}

new PrintWalker().walk(parseTree);