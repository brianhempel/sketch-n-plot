import IPython
import io
import base64
import pathlib
import re
import json
import ast
import matplotlib as mpl


IPython.get_ipython().kernel.shell.ast_transformers = []

trivial_names = set(dir(object()))

def tag_with_paths_deep(artist, path_str):
  if hasattr(artist, "_snp_names"):
    if path_str not in artist._snp_names:
      artist._snp_names.add(path_str)
    # print(entry)
  else:
    try:
      artist._snp_names = {path_str}
      # print(entry)
    except:
      pass # can't set new attrs on primitives

  # out += textbox("_suptitle", artist._suptitle)
  children = artist.get_children()

  for name in dir(artist):
    # if not name.startswith("_"):
    with mpl._api.deprecation.suppress_matplotlib_deprecation_warning():
      value = getattr(artist, name)
    if not callable(value) and name not in trivial_names:
      if isinstance(value, list):
        for i, item in enumerate(value):
          if item in children:
            tag_with_paths_deep(item, path_str + "." + name + "[" + str(i) + "]")
      else:
        if value in children:
          tag_with_paths_deep(value, path_str + "." + name)

def flatten(lists):
    return sum(lists, []) # https://stackoverflow.com/a/952946

def remove_nones(iter):
  return [x for x in iter if x is not None]

def all_artists(artist):
    if "get_children" in dir(artist):
        return [artist] + flatten([all_artists(artist) for artist in artist.get_children()])
    else:
        return [artist]

import shapely

# returns shapely.Polygon
def mpl_bbox_to_shapely(bbox):
  return shapely.box(*bbox.extents)

# returns numpy ndarray of [xmin, ymin, xmax, ymax]
def total_bounds(geometries):
  return shapely.total_bounds(shapely.GeometryCollection(geometries))

# returns shapely.Polygon
def total_bbox(geometries):
  return shapely.box(*total_bounds(geometries))

# returns list of (artist, shapley.Geometry)
def flatten_regions(artist_geom_children):
  artist, geom, children = artist_geom_children
  return [(artist, geom)] + flatten([flatten_regions(child) for child in children])

# Make sure to render before calling this.
# returns (artist, shapley.Geometry, children)
def regions(artist : mpl.artist.Artist):
  child_pad = 3

  if "get_children" in dir(artist):
    children = artist.get_children()
  else:
    children = []

  match artist:
    case mpl.axis.Tick():
      # Remove invisible tick text (i.e. the rarely used label2, which is mispositioned when not actively used.)
      children = [child for child in children if child.get_visible()]

  child_regions      = remove_nones([regions(child) for child in children])
  child_regions_flat = flatten([flatten_regions(child_region) for child_region in child_regions])
  child_geoms        = [geom for _, geom in child_regions_flat]

  # print(artist)
  match artist:
    case mpl.text.Text() as text:
      # based on mpl text.py contains
      bbox = mpl.text.Text.get_window_extent(text)
      my_geom = mpl_bbox_to_shapely(bbox)
    case mpl.patches.Rectangle() as rect:
      my_geom = mpl_bbox_to_shapely(rect.get_bbox())
    case mpl.lines.Line2D() as line:
      # based on mpl lines.py contains
      if line._xy is None or len(line._xy) == 0:
        # print("line has no path: " + str(line))
        my_geom = None
      else:
        transformed_path = line._get_transformed_path()
        path = transformed_path.get_fully_transformed_path()
        if len(path.vertices) >= 2:
          line_string = shapely.LineString(path.vertices)
          my_geom = shapely.buffer(line_string, child_pad + line.get_linewidth(), quad_segs=1, cap_style='square', join_style='mitre') # expand outward
        elif len(path.vertices) == 1:
          d = 10 + line.get_linewidth()
          my_geom = shapely.box(
            path.vertices[0,0] - d,
            path.vertices[0,1] - d,
            path.vertices[0,0] + d,
            path.vertices[0,1] + d,
          )
        else:
          print("a;sdkjf;laskdj;lsaknvad")
    case mpl.axes._subplots.SubplotBase():
      my_geom = None
    case _:
      # print("regions(): unknown artist: " + str(artist))
      my_geom = None

  if my_geom is None and len(child_geoms) == 0:
    return None
  elif my_geom is None:
    my_geom = total_bbox(child_geoms)
  else:
    my_geom = shapely.union_all([my_geom, total_bbox(child_geoms)])

  my_geom = shapely.buffer(my_geom, child_pad, quad_segs = 1, cap_style='square', join_style='mitre') # expand by 10px

  return (artist, my_geom, child_regions)


    # def contains(self, mouseevent):
    #     """
    #     Return whether the mouse event occurred inside the axis-aligned
    #     bounding-box of the text.
    #     """
    #     inside, info = self._default_contains(mouseevent)
    #     if inside is not None:
    #         return inside, info

    #     if not self.get_visible() or self._renderer is None:
    #         return False, {}

    #     # Explicitly use Text.get_window_extent(self) and not
    #     # self.get_window_extent() so that Annotation.contains does not
    #     # accidentally cover the entire annotation bounding box.
    #     bbox = Text.get_window_extent(self)
    #     inside = (bbox.x0 <= mouseevent.x <= bbox.x1
    #               and bbox.y0 <= mouseevent.y <= bbox.y1)

    #     cattr = {}
    #     # if the text has a surrounding patch, also check containment for it,
    #     # and merge the results with the results for the text.
    #     if self._bbox_patch:
    #         patch_inside, patch_cattr = self._bbox_patch.contains(mouseevent)
    #         inside = inside or patch_inside
    #         cattr["bbox_patch"] = patch_cattr

    #     return inside, cattr

# text = ax.text(0.5, 0.5, "hi")

# tag_with_paths_deep(fig, "fig")
# tag_with_paths_deep(ax, "ax")

# regions(fig)


# fig.suptitle(None)

# def snp_inspector_html(self):
#   out = '<details style="padding-left: 1em; border: solid 1px black">'
#   out += "<summary>" + str(self._snp_names) + "</summary>"
#   out += str(self)
#   # out += textbox("_suptitle", self._suptitle)
#   children = self.get_children()

#   visited_children = []

#   for name in dir(self):
#     # if not name.startswith("_"):
#     with mpl._api.deprecation.suppress_matplotlib_deprecation_warning():
#       value = getattr(self, name)
#     if not callable(value) and name not in trivial_names:
#       if isinstance(value, list):
#         for i, item in enumerate(value):
#           if item in children:
#             if item not in visited_children:
#               out += item.snp_inspector_html()
#               visited_children.append(item)
#           else:
#             out += "<div>" + name  + "[" + str(i) + "]: " + str(item)[0:100] + "</div>"
#       else:
#         if value in children:
#           if value not in visited_children:
#             out += value.snp_inspector_html()
#             visited_children.append(value)
#         else:
#           out += "<div>" + name + ": " + str(value)[0:100] + "</div>"

#   out += "</details>"
#   return out

# setattr(mpl.artist.Artist, "snp_inspector_html", snp_inspector_html)
# setattr(matplotlib.figure.FigureBase, "snp_inspector_html", figure_snp_inspector_html)


# # Preserve heirarchical structure so that JS mouseenter events work as intended
def region_to_svg_g(artist_geom_children):
    artist, geom, children = artist_geom_children
    geom_svg = geom.svg()
    geom_svg = re.sub(r'fill="[^"]*"', 'fill="transparent"', geom_svg) # can't be "none", otherwise no mouse events are triggered inside the region
    geom_svg = re.sub(r'stroke-width="[^"]*"', 'stroke-width="0.25"', geom_svg)
    # geom_svg = re.sub(r'\A(<\w+)', f'\\1 data-object="{str(artist)}"', geom_svg)
    child_svgs_str = "\n".join([region_to_svg_g(child) for child in children])
    perhaps_data_names = f'data-names="{json.dumps(list(artist._snp_names))}"' if hasattr(artist, "_snp_names") else ""
    perhaps_code_loc = f'data-loc="{json.dumps(artist._snp_loc)}"' if hasattr(artist, "_snp_loc") else ""
    return f"""<g data-artist="{str(artist)}" {perhaps_data_names} {perhaps_code_loc}>
    {geom_svg}
    {child_svgs_str}
    </g>"""


class SNP():
    def __init__(self, figure):
        self.figure = figure
        self.cached_png = None;
        self.cached_svg_hover_regions = None;

    def _repr_png_(self):
        if (self.cached_png == None):
            buf = io.BytesIO()
#             self.figure.savefig(buf, format='png', dpi='figure') # not tight version
            self.figure.canvas.print_figure(buf, format='png', dpi='figure', bbox_inches='tight', pad_inches=mpl.rcParams['savefig.pad_inches']) # tight version
            self.cached_png = buf.getvalue()

        return self.cached_png

    # Note this is the hover regions only.
    def _repr_svg_(self):
        if (self.cached_svg_hover_regions == None):
            self._repr_png_() # Ensure elements are laid out.

            #         width_px  = self.figure.get_figwidth() * self.figure.get_dpi()
    #         height_px = self.figure.get_figheight() * self.figure.get_dpi()

            fig = self.figure
            bbox_inches = fig.get_tightbbox(fig.canvas.renderer).padded(mpl.rcParams['savefig.pad_inches'])
            x0_px       = bbox_inches.x0 * fig.get_dpi()
            y0_px       = bbox_inches.y0 * fig.get_dpi()
            width_px    = bbox_inches.width * fig.get_dpi()
            height_px   = bbox_inches.height * fig.get_dpi()

            # fig_regions = flatten_regions(regions(fig))
            fig_regions = regions(self.figure)

            svg_body = region_to_svg_g(fig_regions)

            # for artist, shape in fig_regions:
            #   shape_svg = shape.svg()
            #   # shape_svg = re.sub(r'fill="[^"]*"', 'fill="transparent"', shape_svg)
            #   shape_svg = re.sub(r'stroke-width="[^"]*"', 'stroke-width="1.0"', shape_svg)
            #   shape_svg = re.sub(r'\A(<\w+)', f'\\1 data-object="{str(artist)}"', shape_svg)
            #   svg_body += shape_svg

            self.cached_svg_hover_regions = f"""<svg style="margin: 0; border: solid 1px black; position: absolute; top: 0; left: 0;" transform="scale(1,-1)" width={width_px} height={height_px} viewBox="{x0_px} {y0_px} {width_px} {height_px}">
                {svg_body}
            </svg>"""

        return self.cached_svg_hover_regions

    def _repr_html_(self):
        # ripped the below from ipympl/backend_nbagg.py
        base64_image = base64.b64encode(self._repr_png_()).decode('utf-8')
        data_url = f'data:image/png;base64,{base64_image}'

        return f"""
            <div class="snp_outer" style="position:relative;">
            <script>
            {pathlib.Path("snp.js").read_text()}
            </script>
            <style>
            .snp_outer > svg g.hovered > path {{
              stroke-width: 3.0;
            }}
            </style>
            <img style="margin: 0; border: solid 1px black;" src='{data_url}' onload="attach_snp(this)">
            {self._repr_svg_()}
            </div>
        """
        # return "<b id='asdf'>bold</b><script>console.log(IPython.notebook.notebook_name); console.log(Jupyter.notebook.get_cells()); document.querySelector('#asdf').innerHTML = '' + Jupyter.notebook.get_cells();</script>"
        # return { "text/html": "<b><script>alert('hi');</script>bold</b>" }

# import astor
# Thanks GPT-4, this works, apparently.

class LocedTuple(tuple):
    def __new__(cls, iterable, loc):
        out = tuple.__new__(cls, iterable)
        out._snp_loc = loc
        return out

class LocedStr(str):
    def __new__(cls, string, loc):
        out = str.__new__(cls, string)
        out._snp_loc = loc
        return out

class LocedList(list):
    def __init__(self, iterable, loc):
        self._snp_loc = loc
        super().__init__(iterable)

class LocedDict(dict):
    def __init__(self, dictionary, loc):
        self._snp_loc = loc
        super().__init__(dictionary)

class LocedInt(int):
    def __new__(cls, x, loc):
        out = int.__new__(cls, x)
        out._snp_loc = loc
        return out

class LocedFloat(float):
    def __new__(cls, x, loc):
        out = float.__new__(cls, x)
        out._snp_loc = loc
        return out

# code = \
# """
# fig, ax = plt.subplots()
# # ax.set_title(label, fontdict=None, loc='center', pad=None, **kwargs)
# ax.set_title("My Plot")
# # xs = np.linspace(0, 2 * np.pi, 20)
# # ys = np.sin(xs)
# # lines = ax.plot(xs, ys)
# """

# print(code)
# tree = ast.parse(code)

def tag_with_provenance(obj, lineno, col_offset, end_lineno, end_col_offset):
    if hasattr(obj, "_snp_loc"):
        return obj # Don't rewrite oldest loc.

    loc = (lineno, col_offset, end_lineno, end_col_offset)

    if isinstance(obj, tuple):
        return LocedTuple(obj, loc)
    elif isinstance(obj, str):
        return LocedStr(obj, loc)
    elif isinstance(obj, list):
        return LocedList([tag_with_provenance(child, lineno, col_offset, end_lineno, end_col_offset) for child in obj], loc)
    elif isinstance(obj, dict):
        return LocedDict(obj, loc)
    elif isinstance(obj, int):
        return LocedInt(obj, loc)
    elif isinstance(obj, float):
        return LocedFloat(obj, loc)

    try:
        obj._snp_loc = loc
        return obj
    except:
        return obj

class ProvenanceTagger(ast.NodeTransformer):
    def visit_Call(self, node):
        loc = (node.lineno, node.col_offset, node.end_lineno, node.end_col_offset)
#         print(loc)
        wrapped = ast.Call(ast.Name("tag_with_provenance", ast.Load()), [
            node,
            ast.Constant(node.lineno),
            ast.Constant(node.col_offset),
            ast.Constant(node.end_lineno),
            ast.Constant(node.end_col_offset)
        ], [])
#         print(ast.unparse(wrapped))
        return wrapped

# print(astor.dump_tree(ast.parse(tree)))

# print(ast.unparse(ProvenanceTagger().visit(tree)))

IPython.get_ipython().kernel.shell.ast_transformers = [ProvenanceTagger()]


### Type Inference ##############################

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


import json
class JsonDict():
    def __init__(self, dict):
        self.dict = dict

    def _repr_json_(self):
       return self.dict
