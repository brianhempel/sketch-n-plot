# $ python3 scratch/typecheck2.py

# based on https://github.com/Instagram/LibCST/pull/831/files
# and GPT-4
# and reading source
# and guessing

import os

import mypy
import mypy.nodes
import mypy.build
import mypy.main
import mypy.options
from mypy.traverser import TraverserVisitor


class MyVisitor(TraverserVisitor):
    def __init__(self, types_dict):
       self.types_dict = types_dict

    def visit_call_expr(self, node: mypy.nodes.CallExpr):
        super().visit_call_expr(node)
        print(node)
        print((node.line, node.column, node.end_line, node.end_column))
        # print(node.analyzed)
        print(self.types_dict.get(node))
        # if node.analyzed is not None:
        #   print(node.analyzed.type)

    def visit_member_expr(self, node: mypy.nodes.MemberExpr) -> None:
        super().visit_member_expr(node)
        print(node)
        print((node.line, node.column, node.end_line, node.end_column))
        print(self.types_dict.get(node))
        # if node.def_var is not None:
        #   print(node.def_var.type)

    def visit_name_expr(self, node: mypy.nodes.NameExpr) -> None:
        super().visit_name_expr(node)
        print(node)
        print((node.line, node.column, node.end_line, node.end_column))
        print(self.types_dict.get(node))
        # if node.node is not None:
        #   print(node.node.type)


# targets, options = mypy.main.process_options(paths)
file_path = "test.py"

# options = mypy.options.Options()
sources, options = mypy.main.process_options([file_path])

options.incremental = False
# options.show_traceback = True
options.preserve_asts = True
options.strict_optional = True
options.warn_unused_configs = True
options.fine_grained_incremental = True
options.use_fine_grained_cache = True
options.mypy_path = ["python-type-stubs-main"]
options.follow_imports = "silent"
options.follow_imports_for_stubs = True
options.export_types = True

module_name = os.path.splitext(os.path.basename(file_path))[0]

# sources = [mypy.build.BuildSource(file_path, module_name, None)]

# print(options)
mypy_result = mypy.build.build(sources, options=options)

for error in mypy_result.errors:
    print(error)

# print(mypy_result.graph[module_name].tree)

tree = mypy_result.graph[module_name].tree

if tree is not None:
    print(tree)
    # print(mypy_result.types)
    MyVisitor(mypy_result.types).visit_mypy_file(tree)
