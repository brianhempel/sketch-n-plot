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


html_chars_re = re.compile("[&<>\"']")
html_subs = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }
def escape_html(string):
  return html_chars_re.sub(lambda match: html_subs[match.group(0)], string)

def full_names_dict(type_node):
    names = dict()
    for superclass in type_node.direct_base_classes():
        names.update(full_names_dict(superclass))
    names.update(type_node.names)
    return names

# def object_type(obj, type_graph):
#     thing_type_node = type_graph[obj.__class__.__module__].tree
#     name_parts = obj.__class__.__qualname__.split(".") # Handle inner nested classes correctly.
#     for class_name in name_parts[:-1]:
#         if class_name in thing_type_node.names:
#             thing_type_node = thing_type_node.names[class_name].node
#         else:
#             print(obj.__class__.__module__, obj.__class__.__qualname__, "not found")
#             return None
#     last_part = name_parts[-1]
#     if last_part in thing_type_node.names:
#        return thing_type_node.names[last_part].type
#     else:
#        return None

def object_type_node(obj, type_graph):
    thing_type_node = type_graph[obj.__class__.__module__].tree
    # print(obj.__class__.__module__)
    for class_name in obj.__class__.__qualname__.split("."): # Handle inner nested classes correctly.
        if class_name in thing_type_node.names:
            thing_type_node = thing_type_node.names[class_name].node
        else:
            thing_type_node = None
            print(obj.__class__.__module__, obj.__class__.__qualname__, "not found")
            break

    return thing_type_node


def tag_with_paths_deep(artist, path_str, type_graph):
    if not hasattr(artist, "_method_types"):
        artist_type_node = object_type_node(artist, type_graph)

        if artist_type_node is not None:

        #   callable_type_json(callee_type)
        #   names = list(full_names_dict(artist_type_node).keys())
        #   try:
            artist._method_types = {name: callable_type_json(thing.type) for name, thing in full_names_dict(artist_type_node).items() if isinstance(thing.type, mypy.types.CallableType) and name not in trivial_names}
            # print(entry)
        #   except:
            # print(path_str)
            # pass # can't set new attrs on primitives

        # print(thing.names)

    if hasattr(artist, "_snp_names"):
        if path_str not in artist._snp_names:
            artist._snp_names.add(path_str)
        # print(entry)
    else:
        try:
            artist._snp_names = {path_str}
            # print(entry)
        except:
            print(path_str)
            pass # can't set new attrs on primitives

  # out += textbox("_suptitle", artist._suptitle)
    children = artist.get_children()

    with mpl._api.deprecation.suppress_matplotlib_deprecation_warning():
        for name in dir(artist):
          # print(path_str, name)
          # if not name.startswith("_"):
            if name not in trivial_names:
                value = getattr(artist, name)
                if not callable(value):
                    if isinstance(value, list):
                        for i, item in enumerate(value):
                            if item in children:
                                tag_with_paths_deep(item, path_str + "." + name + "[" + str(i) + "]", type_graph)
                    else:
                        if value in children:
                            tag_with_paths_deep(value, path_str + "." + name, type_graph)

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

# returns list of (obj_id, shapley.Geometry)
def flatten_regions2(objid_methods_geom_children):
    obj_id, methods, geom, children = objid_methods_geom_children
    return [(obj_id, geom)] + flatten([flatten_regions2(child) for child in children])

# Return list of (code to access artist on which to place the method UI, method name on the root artist, number of times method could be called)
def method_associations(artist):
    match artist:
        case mpl.axes.Axes():
            return [
               (".title",       "set_title",  1),
               (".xaxis.label", "set_xlabel", 1),
               (".yaxis.label", "set_ylabel", 1),
               ("",             "bar",        float("inf")),
               ("",             "barh",       float("inf")),
               ("",             "plot",       float("inf")),
            ]
        case mpl.axis.Axis():
            return [(".label", "set_label_text", 1)]
        case _:
            return []

# Make sure to render before calling this.
# returns (artist, list of (artist, method_name), shapley.Geometry, children)
def regions2(artist):
    child_pad = 3

    if "get_children" in dir(artist):
        children = artist.get_children()
        # Axes get_children() flattens its container children. Unflatten.
        if isinstance(artist, mpl.axes.Axes):
            containers = artist.containers
            container_children = flatten([container.get_children() for container in containers])
            children = [child for child in children if child not in container_children] # remove items in containers
            children += containers # add the containers instead
    else:
        children = []

    match artist:
        case mpl.axis.Tick():
            # Remove invisible tick text (i.e. the rarely used label2, which is mispositioned when not actively used.)
            children = [child for child in children if child.get_visible()]

    child_regions      = remove_nones([regions2(child) for child in children])
    child_regions_flat = flatten([flatten_regions2(child_region) for child_region in child_regions])
    child_geoms        = [geom for _, geom in child_regions_flat]

    # print(artist)
    match artist:
        case mpl.text.Text() as text:
            # based on mpl text.py contains
            bbox = mpl.text.Text.get_window_extent(text)
            my_geom = mpl_bbox_to_shapely(bbox)
        case mpl.patches.Rectangle() as rect:
            bbox = rect.get_window_extent()
            my_geom = mpl_bbox_to_shapely(bbox)
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
        case mpl.axes.Axes():
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

    # my_methods_to_place_on_children = method_associations(artist)

    my_region = (artist, [], my_geom, child_regions)

    # mutates the array on the appropriate descendant
    def put_method_on_child(method, target, region, max_search_depth):
        artist, artist_methods, geom, child_regions = region

        if artist == target:
            artist_methods.append(method)
        elif max_search_depth > 0:
            for child_region in child_regions:
                put_method_on_child(method, target, child_region, max_search_depth - 1)

    for code_to_access_target, my_method_name, max_calls in method_associations(artist):
        target = eval("artist" + code_to_access_target)
        max_search_depth = len(code_to_access_target.split(".")) + 1
        put_method_on_child((artist, my_method_name), target, my_region, max_search_depth)


    # # mutates the array on the appropriate descendant
    # def put_method_on_child(method_for_child, target_child, child_regions, max_search_depth):
    #   if max_search_depth <= 0:
    #      return

    #   for child_artist, methods_to_show_on_child, child_geom, grandchild_regions in child_regions:
    #     if child_artist == target_child:
    #       methods_to_show_on_child.append(method_for_child)
    #     put_method_on_child(method_for_child, target_child, grandchild_regions, max_search_depth-1)

    #   return

    # for code_to_access_child, my_method_name in method_associations(artist):
    #   target_child = eval("artist" + code_to_access_child)
    #   max_search_depth = len(code_to_access_child.split("."))
    #   put_method_on_child((artist, my_method_name), target_child, child_regions, max_search_depth)

#     def put_methods_on_child(child_region):
#       child_artist, methods_to_show_on_child, child_geom, grandchild_regions = child_region
#       methods_for_child = [(artist, method_name) for desired_graphical_target, method_name in my_methods_to_place_on_children if desired_graphical_target == child_artist]
#       return (child_artist, methods_to_show_on_child + methods_for_child, child_geom, grandchild_regions)

#     child_regions = [put_methods_on_child(child_region) for child_region in child_regions]

    return my_region

# Make sure to render before calling this.
# returns (artist, shapley.Geometry, children)
def regions(artist):
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

def method_type(receiver, method_name, type_graph):
    receiver_type_node = object_type_node(receiver, type_graph)

    if receiver_type_node is not None:
        node = full_names_dict(receiver_type_node).get(method_name)
        if node is not None:
           return node.type

    return None

def method_type_json(receiver, method_name, type_graph):
    typ = method_type(receiver, method_name, type_graph)
    return typ and callable_type_json(typ, {})

# # Preserve heirarchical structure so that JS mouseenter events work as intended
def region2_to_svg_g(artist_methods_geom_children, object_names, type_graph):
    artist, methods, geom, children = artist_methods_geom_children
    geom_svg = geom.svg()
    geom_svg = re.sub(r'fill="[^"]*"', 'fill="transparent"', geom_svg) # can't be "none", otherwise no mouse events are triggered inside the region
    geom_svg = re.sub(r'stroke-width="[^"]*"', 'stroke-width="0.25"', geom_svg)
    # geom_svg = re.sub(r'\A(<\w+)', f'\\1 data-object="{str(artist)}"', geom_svg)
    child_svgs_str = "\n".join([region2_to_svg_g(child, object_names, type_graph) for child in children])
    # if hasattr(artist, "_snp_names"):
    #   names_str = ",".join(artist._snp_names).replace('"', "'")
    #   perhaps_data_names = f'data-names="{names_str}"'
    # else:
    #   perhaps_data_names = ""
    # if hasattr(artist, "_method_types"):
    #   perhaps_data_type = f'data-method-types="{escape_html(json.dumps(artist._method_types))}"'
    # #   method_names_str = ",".join(artist._method_types).replace('"', "'")
    # #   perhaps_data_type = f'data-type="{method_names_str}"'
    # else:
    #   perhaps_data_type = ""
    # perhaps_code_loc = f'data-loc="{json.dumps(artist._snp_loc)}"' if hasattr(artist, "_snp_loc") else ""
    data_methods = json.dumps([{"receiver_id": id(receiver), "receiver_names": list(object_names.get(id(receiver), {})), "method_name": method_name, "method_type": method_type_json(receiver, method_name, type_graph)} for receiver, method_name in methods])
    perhaps_code_loc = f'data-loc="{json.dumps(artist._snp_loc)}"' if hasattr(artist, "_snp_loc") else ""
    perhaps_add_hint = f'data-add-hint="+ {",".join([method_name for _, method_name in methods])}"' if len(methods) > 0 else ""
    return f"""<g data-artist="{str(artist)}" data-artist-id="{id(artist)}" data-artist-names="{",".join(object_names.get(id(artist), {}))}" data-new-methods="{escape_html(data_methods)}" {perhaps_code_loc} {perhaps_add_hint}>
    {geom_svg}
    {child_svgs_str}
    </g>"""

# # Preserve heirarchical structure so that JS mouseenter events work as intended
def region_to_svg_g(artist_geom_children):
    artist, geom, children = artist_geom_children
    geom_svg = geom.svg()
    geom_svg = re.sub(r'fill="[^"]*"', 'fill="transparent"', geom_svg) # can't be "none", otherwise no mouse events are triggered inside the region
    geom_svg = re.sub(r'stroke-width="[^"]*"', 'stroke-width="0.25"', geom_svg)
    # geom_svg = re.sub(r'\A(<\w+)', f'\\1 data-object="{str(artist)}"', geom_svg)
    child_svgs_str = "\n".join([region_to_svg_g(child) for child in children])
    if hasattr(artist, "_snp_names"):
        names_str = ",".join(artist._snp_names).replace('"', "'")
        perhaps_data_names = f'data-names="{names_str}"'
    else:
        perhaps_data_names = ""
    if hasattr(artist, "_method_types"):
        perhaps_data_type = f'data-method-types="{escape_html(json.dumps(artist._method_types))}"'
    #   method_names_str = ",".join(artist._method_types).replace('"', "'")
    #   perhaps_data_type = f'data-type="{method_names_str}"'
    else:
        perhaps_data_type = ""
    perhaps_code_loc = f'data-loc="{json.dumps(artist._snp_loc)}"' if hasattr(artist, "_snp_loc") else ""
    return f"""<g data-artist="{str(artist)}" {perhaps_data_names} {perhaps_data_type} {perhaps_code_loc}>
    {geom_svg}
    {child_svgs_str}
    </g>"""

def object_names(locals, user_names=None):
    if user_names is None:
        user_names = set(locals.keys())
    out = {}
    def add(obj, name):
        key = id(obj)
        out[key] = out.get(key, set()).union({name})

    with mpl._api.deprecation.suppress_matplotlib_deprecation_warning():
        for name, value in [(name, value) for name, value in locals.items() if name in user_names and name not in trivial_names and not callable(value)]:
            # Only depth 1 for now
            for prop_name in [prop_name for prop_name in dir(value) if prop_name not in trivial_names and not callable(getattr(value, prop_name))]:
                add(getattr(value, prop_name), f'{name}.{prop_name}')
            add(value, name)

    return out

class SNP():
    def __init__(self, figure, locals, cell_lineno, provenance_is_off_by_n_lines, notebook_code_through_cell, user_names=None):
        self.figure = figure

        # Perform type inference
        self.cell_lineno = cell_lineno
        self.provenance_is_off_by_n_lines = provenance_is_off_by_n_lines
        self.mypy_result = do_inference(notebook_code_through_cell)
        self.type_graph = self.mypy_result.graph
        tree = self.type_graph[module_name].tree

        # Make a map of object id to object name (e.g. "fig.axes")
        # print(user_names)
        self.object_names = object_names(locals, user_names=user_names)

        # Make a map of user local names to types, things we could use for autocompleting arguments.
        self.user_typed_locals = {}
        for name, value in locals.items():
            if name in user_names and name not in trivial_names and not callable(value) and name in tree.names:
                name_type = tree.names[name].type
                if name_type is not None:
                    self.user_typed_locals[name] = name_type

        print(self.user_typed_locals)

        # Gather all the type information for function calls in the notebook
        # print(json.dumps(tree.serialize()))
        self.user_call_info = None
        if tree is not None:
            # print(tree)
            # print(mypy_result.types)
            visitor = MyVisitor(self.mypy_result.types, self.user_typed_locals)
            visitor.visit_mypy_file(tree)
            self.user_call_info = visitor.out

        self.cached_png = None
        self.cached_svg_hover_regions = None

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
            fig_regions2 = regions2(self.figure)

            svg_body = region2_to_svg_g(fig_regions2, self.object_names, self.type_graph)

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

    # This is only the technical info for the front end.
    def _repr_json_(self):
        return {
            "cell_lineno": self.cell_lineno,
            "provenance_is_off_by_n_lines": self.provenance_is_off_by_n_lines,
            "user_call_info": self.user_call_info,
        }

    def _repr_html_(self):
        # ripped the below from ipympl/backend_nbagg.py
        base64_image = base64.b64encode(self._repr_png_()).decode('utf-8')
        data_url = f'data:image/png;base64,{base64_image}'

        sidebar_stuff = []

        # for obj_id, name in self.object_names.items():

        #    sidebar_stuff.append({
        #       "name": name,
        #       "object_id": obj_id,
        #    })

        return f"""
            <div class="snp_outer" style="position:relative;">
            <script>{pathlib.Path("snp.js").read_text()}</script>
            <style>{pathlib.Path("snp.css").read_text()}</style>
            <img style="margin: 0; border: solid 1px black;" src='{data_url}'> <!-- the plot -->
            {self._repr_svg_()} <!-- hover regions -->
            <div class="stdout_stderr"></div>
            <style onload="attach_snp(this.closest('.snp_outer'), {self.cell_lineno}, {self.provenance_is_off_by_n_lines}, {escape_html(json.dumps(self.user_call_info))})"></style> <!-- Just a way to run this code once the elements exist. -->
            </div>
        """
        # return "<b id='asdf'>bold</b><script>console.log(IPython.notebook.notebook_name); console.log(Jupyter.notebook.get_cells()); document.querySelector('#asdf').innerHTML = '' + Jupyter.notebook.get_cells();</script>"
        # return { "text/html": "<b><script>alert('hi');</script>bold</b>" }



### Provenance Tagging ##############################

# Input:
# fig, ax = plt.subplots()
# ax.set_title("My Plot")
# xs = np.linspace(0, 2 * np.pi, 20)
# ys = np.sin(xs)
# lines = ax.plot(xs, ys)

# Output:
# (fig, ax) = tag_with_provenance(plt.subplots(), 2, 10, 2, 24)
# tag_with_provenance(ax.set_title('My Plot'), 3, 0, 3, 23)
# xs = tag_with_provenance(np.linspace(0, 2 * np.pi, 20), 4, 5, 4, 34)
# ys = tag_with_provenance(np.sin(xs), 5, 5, 5, 15)
# lines = tag_with_provenance(ax.plot(xs, ys), 6, 8, 6, 23)

# tag_with_provenance() gives the returned object an `_snp_loc` attribute, which is a tuple of (lineno, col_offset, end_lineno, end_col_offset)

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
# ax.set_title("My Plot")
# xs = np.linspace(0, 2 * np.pi, 20)
# ys = np.sin(xs)
# lines = ax.plot(xs, ys)
# """

# print(code)
# tree = ast.parse(code)

def tag_with_provenance(obj, lineno, col_offset, end_lineno, end_col_offset):
    if hasattr(obj, "_snp_loc"):
        return obj # Don't rewrite oldest loc.

    loc = (lineno, col_offset, end_lineno, end_col_offset)

    try:
        obj._snp_loc = loc
        return obj
    except:
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

# print(ast.unparse(ProvenanceTagger().visit(ast.parse(code))))

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


def add_loc_json(type_json_dict, node):
    type_json_dict["loc"] = {
        "line":       node.line,
        "column":     node.column,
        "end_line":   node.end_line,
        "end_column": node.end_column,
    }
    return type_json_dict

def to_json_dict(node, type):
    # print(type)
    # print(type.serialize())
    type_json_dict = type.serialize()
    if not isinstance(type_json_dict, dict): # IDK why we sometimes get a string
        type_json_dict = dict()
    return add_loc_json(type_json_dict, node)

# callable_type_ex = None
def callable_type_json(callable_type, user_typed_locals):
    # global callable_type_ex
    type_json_dict = callable_type.serialize()
    if not isinstance(type_json_dict, dict): # IDK why we sometimes get a string
        type_json_dict = dict()

    if hasattr(callable_type, "definition") and callable_type.definition and callable_type.definition.arguments:
        type_json_dict["definition_arguments_default_code"] = [unparse_mypy_expr(arg.initializer) for arg in callable_type.definition.arguments]

    type_json_dict["arg_type_compatible_local_names"] = []
    for arg_type in callable_type.arg_types:
        arg_names = [name for name, local_type in user_typed_locals.items() if mypy.subtypes.is_subtype(local_type, arg_type)]
        type_json_dict["arg_type_compatible_local_names"].append(arg_names)
        # if callable_type.def_extras.get("first_arg") is not None:
        #     # remove "self"
        #     # print("removing self from", callable_type)
        #     callable_type_ex = callable_type
        #     type_json_dict["definition_arguments_default_code"] = type_json_dict["definition_arguments_default_code"][1:]

    return type_json_dict


class MyVisitor(TraverserVisitor):
    def __init__(self, types_dict, user_typed_locals):
        self.types_dict = types_dict
        self.user_typed_locals = user_typed_locals
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

            # The callee_type here is partially applied (self is already removed from the argument list).
            # For consistency with places where where that is not the case, let us unapply it
            callee_type_unapplied = callee_type.definition.type
            callee = callable_type_json(callee_type_unapplied, self.user_typed_locals)
            add_loc_json(callee, node.callee)

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

if "import_lineset" not in globals():
    import_lineset = set()
    fine_grained_build_manager = None
    mypy_result = None # The FineGrainedBuildManager mutates this, apparently.
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

    return mypy_result


if sys.argv[0] == "type_inference.py":
    for file_path in sys.argv[1:]:
        print(do_inference(open(file_path,'r').read()))


class JsonDict():
    def __init__(self, dict):
        self.dict = dict

    def _repr_json_(self):
       return self.dict
