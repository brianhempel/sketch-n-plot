import os
import sys

import mypy
import mypy.nodes
import mypy.build
import mypy.main
import mypy.options
import mypy.types
from mypy.traverser import TraverserVisitor
# import json

def to_json_dict(node, type):
    # print(type)
    # print(type.serialize())
    type_json_dict = type.serialize()
    if not isinstance(type_json_dict, dict): # IDK why we sometimes get a string
        type_json_dict = dict()
    type_json_dict["loc"] = {
        "line":       node.line,
        "column":     node.column,
        "end_line":   node.end_line,
        "end_column": node.end_column,
    }
    return type_json_dict


class MyVisitor(TraverserVisitor):
    def __init__(self, types_dict):
       self.types_dict = types_dict
       self.out = []

    def visit_call_expr(self, node: mypy.nodes.CallExpr) -> None:
        super().visit_call_expr(node)
        # print(node)
        # print((node.line, node.column, node.end_line, node.end_column))
        # print(node.analyzed)
        # print(self.types_dict.get(node))
        # print(node.callee)
        callee_type = self.types_dict.get(node.callee)
        # print(callee_type)
        # print(callee_type.__class__)
        if isinstance(callee_type, mypy.types.CallableType):
            # loc = (node.line, node.column, node.end_line, node.end_column)
            type_dict = to_json_dict(node, callee_type)
            type_dict["given_args"] = [to_json_dict(arg, self.types_dict.get(arg)) for arg in node.args]
            self.out.append(type_dict)
            # print(json.dumps(callee_type.serialize()))
            # print(callee_type.definition)
            # print(callee_type.arg_types)
            # for arg_name, arg_kind, arg_type in zip(callee_type.arg_names, callee_type.arg_kinds, callee_type.arg_types):
                # print(arg_name, arg_kind, arg_type, json.dumps(arg_type.serialize()))

            # for arg in node.args:
            #     print(arg)
            #     print(self.types_dict.get(arg))

        # if node.analyzed is not None:
        #   print(node.analyzed.type)

    def visit_member_expr(self, node: mypy.nodes.MemberExpr) -> None:
        super().visit_member_expr(node)
        # print(node)
        # print((node.line, node.column, node.end_line, node.end_column))
        # print(self.types_dict.get(node))
        # if node.def_var is not None:
        #   print(node.def_var.type)

    def visit_name_expr(self, node: mypy.nodes.NameExpr) -> None:
        super().visit_name_expr(node)
        # print(node)
        # print((node.line, node.column, node.end_line, node.end_column))
        # print(self.types_dict.get(node))
        # if node.node is not None:
        #   print(node.node.type)


    # CallExpr:417(
    #   MemberExpr:417(
    #     NameExpr(ax [current_notebook.ax])
    #     set_title)
    #   Args(
    #     StrExpr(My Plot))
    #   KwArgs(
    #     pad
    #     IntExpr(10)))

def do_inference(code):
    # print(notebook_code_up_through_current_cell)

    file_path = "current_notebook.py"

    with open(file_path, "w") as file:
        file.write(code)

    # options = mypy.options.Options()
    sources, options = mypy.main.process_options([file_path])

    options.incremental = False
    # options.show_traceback = True
    options.preserve_asts = True
    options.strict_optional = True
    options.warn_unused_configs = True
    # options.fine_grained_incremental = True
    # options.use_fine_grained_cache = True
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

    tree = mypy_result.graph[module_name].tree

    # print(json.dumps(tree.serialize()))

    if tree is not None:
    #     print(tree)
        # print(mypy_result.types)
        visitor = MyVisitor(mypy_result.types)
        visitor.visit_mypy_file(tree)
        return visitor.out

if sys.argv[0] == "type_inference.py":
    for file_path in sys.argv[1:]:
        print(do_inference(open(file_path,'r').read()))