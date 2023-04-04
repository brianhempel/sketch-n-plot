import os
import re
import sys

import mypy
import mypy.nodes
import mypy.build
import mypy.main
import mypy.options
import mypy.types
from mypy.traverser import TraverserVisitor
import mypy.server.update
# import json

def unparse_mypy_expr(expr : mypy.nodes.Expression):
    match expr:
        case None | mypy.nodes.EllipsisExpr():
            return None
        case mypy.nodes.IntExpr() | mypy.nodes.FloatExpr():
            return str(expr.value)
        case _:
            return str(expr)


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
            given_args = []
            for arg, name, kind in zip(node.args, node.arg_names, node.arg_kinds):
                given_arg = to_json_dict(arg, self.types_dict.get(arg))
                given_arg["name"] = name
                given_arg["kind"] = kind.value
                given_args.append(given_arg)

            callee = to_json_dict(node.callee, callee_type)
            if callee_type.definition and callee_type.definition.arguments:
                callee["definition_arguments_default_code"] = [unparse_mypy_expr(arg.initializer) for arg in callee_type.definition.arguments]
                if len(callee_type.arg_kinds) + 1 == len(callee_type.definition.arguments):
                    # remove "self"
                    callee["definition_arguments_default_code"] = callee["definition_arguments_default_code"][1:]

            self.out.append({
                "call":       to_json_dict(node, self.types_dict.get(node)),
                "callee":     callee,
                "given_args": given_args,
            })
            # print(json.dumps(callee_type.serialize()))
            # print(callee_type.definition)
            # print(callee_type.arg_types)
            # for arg_name, arg_kind, arg_type in zip(callee_type.arg_names, callee_type.arg_kinds, callee_type.arg_types):
            #     print(arg_name, arg_kind, arg_type, json.dumps(arg_type.serialize()))

            # for arg, name in zip(node.args, node.arg_names):
            #     print(arg, name)
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

import_lineset = set()
fine_grained_build_manager = None
mypy_result = None
fscache = None

file_path = "current_notebook.py"
module_name = os.path.splitext(os.path.basename(file_path))[0]

import_lines_regex = re.compile(r'^[^#\n]*import .*', re.MULTILINE)
def import_lineset_in(code):
    return set(import_lines_regex.findall(code))

def do_inference(code):
    global import_lineset
    global fine_grained_build_manager
    global mypy_result
    global fscache
    # print(notebook_code_up_through_current_cell)

    with open(file_path, "w") as file:
        file.write(code)

    if fine_grained_build_manager is None or import_lineset != import_lineset_in(code):
        import_lineset = import_lineset_in(code)

        # options = mypy.options.Options()
        sources, options = mypy.main.process_options([file_path])

        # # options.incremental = True
        # options.incremental = False
        # # options.show_traceback = True
        # options.preserve_asts = True
        # options.strict_optional = True
        # options.warn_unused_configs = True
        # # options.fine_grained_incremental = True
        # # options.use_fine_grained_cache = True
        # options.mypy_path = ["python-type-stubs-main"]
        # options.follow_imports = "silent"
        # options.follow_imports_for_stubs = True
        # options.export_types = True

        options.incremental = True
        # options.incremental = False
        # options.show_traceback = True
        options.preserve_asts = True
        options.strict_optional = True
        options.warn_unused_configs = True
        options.fine_grained_incremental = True
        options.use_fine_grained_cache = True
        options.local_partial_types = True # https://github.com/python/mypy/issues/4492
        options.mypy_path = ["python-type-stubs-main"]
        options.follow_imports = "silent"
        options.follow_imports_for_stubs = True
        options.export_types = True

        # print(options)
        fscache = mypy.fscache.FileSystemCache() # IDK if this is needed
        mypy_result = mypy.build.build(sources, options=options, fscache=fscache)

        fine_grained_build_manager = mypy.server.update.FineGrainedBuildManager(mypy_result)

    fine_grained_build_manager.update([(module_name, file_path)], [])
    fine_grained_build_manager.flush_cache()
    fscache.flush()

    for error in mypy_result.errors:
        print(error)

    tree = mypy_result.graph[module_name].tree
    # print(json.dumps(tree.serialize()))

    if tree is not None:
        # print(tree)
        # print(mypy_result.types)
        visitor = MyVisitor(mypy_result.types)
        visitor.visit_mypy_file(tree)
        return visitor.out

if sys.argv[0] == "type_inference.py":
    for file_path in sys.argv[1:]:
        print(do_inference(open(file_path,'r').read()))