
// Keep track of event listeners so we can remove them
// Based on Ivan Castellanos & alex, https://stackoverflow.com/a/6434924
// Element.prototype.origAddEventListener = Element.prototype.addEventListener;
// Element.prototype.addEventListener = function (eventName, f, opts) {
//   this.origAddEventListener(eventName, f, opts);
//   this.listeners = this.listeners || [];
//   this.listeners.push({ eventName: eventName, f: f , opts: opts });
// };
// Element.prototype.removeEventListeners = function() {
//   for (const { eventName, f, opts } of (this.listeners || [])) {
//     this.removeEventListener(eventName, f, opts)
//   }
//   this.listeners = [];
// };

Array.prototype.addAsSet = function(elem) { // pretend array is a set and add something to it
  if (!this.includes(elem)) {
    this.push(elem);
  }
  // console.log(this);
  return this;
};

Array.prototype.removeAsSet = function(elem) {
  // https://love2dev.com/blog/javascript-remove-from-array/#remove-from-array-splice-value
  for (var i = 0; i < this.length; i += 1) {
    if (this[i] === elem) {
      this.splice(i, 1);
      i -= 1;
    }
  }
  // console.log(this);
  return this;
};

Array.prototype.dedup = function() {
  // https://stackoverflow.com/a/9229821
  return this.filter((item, pos) => this.indexOf(item) == pos );
}

Array.prototype.partition = function(predicate) {
  const trues  = [];
  const falses = [];
  this.forEach(x => {
    if (predicate(x)) {
      trues.push(x);
    } else {
      falses.push(x);
    }
  });
  return [trues, falses]
}

// Array.prototype.takeWhile = function(predicate) {
//   const out = [];
//   for (const x of this) {
//     if (predicate(x)) {
//       out.push(x);
//     } else {
//       return out;
//     }
//   }
//   return out;
// }

// Prefers first match in case of ties.
// String.prototype.indexOfMatchClosestToIndex = function(targetStr, idealI) {
//   let closestI = -1;
//   let i = -1;
//   while (true) {
//     i = this.indexOf(targetStr, i + 1);
//     if (i == -1) {
//       return closestI;
//     } else if (closestI == -1 || Math.abs(i - idealI) < Math.abs(closestI - idealI)) {
//       closestI = i;
//     }
//   }
// }

function vectorAdd({x, y}, vec2) {
  return { x: x + vec2.x, y: y + vec2.y };
}


// global, for debugging only
window.last_selected_shape = undefined

function select(snp_state, shape) {
  window.last_selected_shape = shape
  console.log(window.last_selected_shape)
  snp_state.selected_shape = shape
  shape.dataset.oldStrokeWidth = shape.getAttribute("stroke-width")
  shape.setAttribute("stroke-width", "3.0")
}

function deselect_all(snp_state) {
  const selected = snp_state.selected_shape
  if (selected) {
    selected.setAttribute("stroke-width", selected.dataset.oldStrokeWidth)
    snp_state.selected_shape = undefined
  }
  const code_mirror_popup = snp_state.code_mirror_popup;
  if (code_mirror_popup) {
    code_mirror_popup.getWrapperElement().remove(); // delete editor "Remove getWrapperElement() from your tree to delete an editor instance"
    snp_state.code_mirror_popup = undefined
  }
}

function relativeTopLeft(el, container) {
  const {top,        left,      } = el.getBoundingClientRect();
  const {top: top0,  left: left0} = container.getBoundingClientRect();

  // console.log(el.getBoundingClientRect());
  // console.log(container.getBoundingClientRect());

  return [
    top - top0,
    left - left0
  ]
}


function get_cells_up_through(cell) {
  const cells = Jupyter.notebook.get_cells();
  const i = cells.indexOf(cell);
  return cells.slice(0, i+1);
}

// 1. gather all the code cells togther into one long code string, with comments delimiting the cells, e.g.:
//
// ### Cell 0 ###
// import numpy as np
// import matplotlib as mpl
// import matplotlib.pyplot as plt
// ### Cell 1 ###
// fig, ax = plt.subplots()
// text = ax.set_title("My Plot", pad=10)
// plt.show(fig)
//
// 2. Set `notebook_code_up_through_current_cell` variable in the kernel
// 3. Typecheck it in the kernel
//

function default_code_for_type(type) {
  if (type === "builtins.str") {
    return '""'
  } else if (type === "builtins.float") {
    return "0.0"
  } else if (type[".class"] === "Instance" && type["type_ref"] === "builtins.dict") {
    return "{}"
  } else if (type[".class"] === "UnionType") {
    return default_code_for_type(type.items[0])
  } else if (type[".class"] === "LiteralType" && type["fallback"] == "builtins.str") {
    return JSON.stringify(type["value"])
  } else {
    return "None"
  }
}

ellipses_svg_html =
  `<svg style="vertical-align: middle" x="0pt" y="0pt" width="14pt" height="14pt" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g id="1">
    <title>Layer 1</title>
    <defs>
      <title>Smart Rectangle1</title>
      <g id="2">
        <defs>
          <path id="3" d="M14,8 C14,9.65685,12.6569,11,11,11 C11,11,3,11,3,11 C1.34315,11,6.45542e-07,9.65685,4.07123e-07,8 C8.8396e-07,6.34315,1.34315,5,3,5 C3,5,11,5,11,5 C12.6569,5,14,6.34315,14,8 z"/>
        </defs>
        <use xlink:href="#3" style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;opacity:1;stroke:none;"/>
      </g>
    </defs>
    <use xlink:href="#2"/>
    <defs>
      <title>Path</title>
      <g id="4">
        <defs>
          <path id="5" d="M3,7 C3.55229,7,4,7.44772,4,8 C4,8.55228,3.55229,9,3,9 C2.44772,9,2,8.55228,2,8 C2,7.44772,2.44772,7,3,7 z"/>
        </defs>
        <use xlink:href="#5" style="fill:#000000;fill-opacity:1;fill-rule:evenodd;opacity:1;stroke:none;"/>
      </g>
    </defs>
    <use xlink:href="#4"/>
    <defs>
      <title>Path Copy</title>
      <g id="6">
        <defs>
          <path id="7" d="M7,7 C7.55229,7,8,7.44772,8,8 C8,8.55228,7.55229,9,7,9 C6.44772,9,6,8.55228,6,8 C6,7.44772,6.44772,7,7,7 z"/>
        </defs>
        <use xlink:href="#7" style="fill:#000000;fill-opacity:1;fill-rule:evenodd;opacity:1;stroke:none;"/>
      </g>
    </defs>
    <use xlink:href="#6"/>
    <defs>
      <title>Path Copy 1</title>
      <g id="8">
        <defs>
          <path id="9" d="M11,7 C11.5523,7,12,7.44772,12,8 C12,8.55228,11.5523,9,11,9 C10.4477,9,10,8.55228,10,8 C10,7.44772,10.4477,7,11,7 z"/>
        </defs>
        <use xlink:href="#9" style="fill:#000000;fill-opacity:1;fill-rule:evenodd;opacity:1;stroke:none;"/>
      </g>
    </defs>
    <use xlink:href="#8"/>
  </g>
  </svg>`;


// https://stackoverflow.com/a/6234804
function escapeHtml(str) {
  return str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function arg_to_widget(code, type) {
  if (type[".class"] === "UnionType") {
    const items = type["items"]
    // If all string literals...
    if (items.every(type2 => type2[".class"] === "LiteralType") && items.every(type2 => type2["fallback"] === "builtins.str")) {
      let select = document.createElement("select")
      select.innerHTML = items.map(type2 => "<option>" + JSON.stringify(type2["value"]) + "</option>").join("")
      select.addEventListener("click", ev => { ev.stopPropagation() });
      select.toCode = function() { return  this.value; };
      // START HERE: make it live update when the selection changes, not just on keyup
      return select
    } else {
      return document.createTextNode(code);
    }
  } else {
    return document.createTextNode(code);
  }
}

// Walk the widget tree and convert bits to code
function elToCode(el) {
  if (el.hasOwnProperty("toCode")) {
    return el.toCode()
  } else {
    let code = "";
    for (child of el.childNodes) {
      if (child.nodeType === 3) {
        // Text node
        code += child.data.replaceAll("\u00A0"," "); /* Remove non-breaking spaces...which are produced by space bar, at least when the element is ordinary content-editable (perhaps not for contenteditable="plaintext-only") */
      } else if (child.tagName === "BR") { // needed this in Maniposynth
        code += "\n"
      } else {
        code += elToCode(child);
      }
    }
    return code;
  }
}

function infer_types_up_through(cell) {
  let code_cells = Jupyter.notebook.get_cells().filter(cell => cell.cell_type === "code");

  // limit to cells up through the given cell
  code_cells_before_cell = code_cells.slice(0, code_cells.indexOf(cell));
  // code_cells             = code_cells.slice(0, code_cells.indexOf(cell)+1);

  function is_not_magic(code) {
    return !code.startsWith("%%");
  }

  let notebook_code_before_cell =
    code_cells_before_cell.
        // takeWhile(cell => cell.input_prompt_number !== "*").
        map(cell => cell.get_text()).
        filter(is_not_magic).
        // map((code, i) => `### Cell ${i} ###\n${code}`).
        join("\n");

  let notebook_code_through_cell = `${notebook_code_before_cell}\n${cell.get_text()}`;

  // console.log(notebook_code_through_cell);

  cell_lineno = notebook_code_before_cell.split("\n").length + 1

  console.log({cell_lineno: cell_lineno})

  // console.log(cells);
  // console.log(cells.map(cell => cell.input_prompt_number));
  // console.log(notebook_code_up_through_current_cell)
  const callbacks = cell.get_callbacks();
  const just_log  = { shell: { reply: console.log }, iopub: { output: console.log }};
  old_callback = callbacks.shell.reply;
  callbacks.shell.reply = (msg) => {
    if (msg.msg_type == "execute_reply" && msg.content.status == "ok" &&msg.content.user_expressions.inferred.status == "ok") {
      console.log(msg.content.user_expressions.inferred)
      const items = msg.content.user_expressions.inferred.data["application/json"];
      const cell_items = items.filter(call_info => call_info.callee.loc.line >= cell_lineno);
      console.log(cell_items);
      // console.log(JSON.stringify(cell_items));
      let cm = cell.code_mirror;

      let snp_outer = cell.element[0].querySelector(".snp_outer");

      // START HERE
      // start widgetizing the call

      // for decoding the "arg_kind" numeric property
      const int_to_arg_kind = [
        "ARG_POS",       // Positional argument
        "ARG_OPT",       // Positional, optional argument (functions only, not calls)
        "ARG_STAR",      // *arg argument
        "ARG_NAMED",     // Keyword argument x=y in call, or keyword-only function arg
        "ARG_STAR2",     // **arg argument
        "ARG_NAMED_OPT", // In an argument list, keyword-only and also optional
      ]

      cm.getAllMarks().forEach(mark => mark.clear())

      cell_items.forEach(({call, callee, given_args}) => {

        function item_to_start_pos(item) {
          return { line: item.loc.line     - cell_lineno, ch: item.loc.column     }
        }
        function item_to_end_pos(item) {
          return { line: item.loc.end_line - cell_lineno, ch: item.loc.end_column }
        }

        const start_pos = item_to_start_pos(call)
        const end_pos   = item_to_end_pos(call)

        let arg_defaults = []

        callee.arg_names.forEach((arg_name, arg_i) => {
          const arg_kind = int_to_arg_kind[callee.arg_kinds[arg_i]];
          const arg_type = callee.arg_types[arg_i];
          const arg_default_code = (callee["definition_arguments_default_code"] || [])[arg_i] || default_code_for_type(arg_type)

          arg_defaults.push({ name: arg_name, kind: arg_kind, code: arg_default_code, type: arg_type })
        });

        given_args.forEach((given_arg, arg_i) => {
          let arg_i_at_func_def = given_arg["name"] ? callee.arg_names.indexOf(given_arg.name) : arg_i
          given_arg["type_at_func_def"] = callee.arg_types[arg_i_at_func_def]
        })

        // console.log(arg_defaults.map(({name, code}) => `${name}=${code}`).join(", "))

        let call_code   = cm.getRange(start_pos, end_pos)
        let callee_code = cm.getRange(item_to_start_pos(callee), item_to_end_pos(callee))
        // let args_code   = cm.getRange(item_to_end_pos(callee), end_pos).replace(/^\s*\(/, "").replace(/\)\s*$/, "")

        // let defaults_code = arg_defaults.map(({name, kind, code}) => kind === "ARG_POS" ? code : `${name}=${code}`).join(", ")

        const widget = document.createElement("div")
        widget.style.display = "inline-block"
        widget.style.border = "solid gray 1px"

        const [given_positional_args, given_keyword_args] = given_args.partition(arg => !arg.name)

        const missing_positional_args =
          arg_defaults.
            slice(given_positional_args.length).
            takeWhile(arg => arg.kind === "ARG_POS")

        const missing_keyword_args =
          arg_defaults.
            slice(given_positional_args.length).
            slice(missing_positional_args.length).
            filter(arg => !given_keyword_args.some(given_arg => given_arg.name === arg.name)).
            filter(arg => arg.kind !== "ARG_STAR2") // ignore **kwargs

        // const missing_positional_args_code = missing_positional_args.map(({name, kind, code}) => kind === "ARG_POS" ? code : `${name}=${code}`).join(", ")
        // const missing_keyword_args_code    = missing_keyword_args.   map(({name, kind, code}) => kind === "ARG_POS" ? code : `${name}=${code}`).join(", ")

        // console.log(missing_positional_args_code)
        // console.log(missing_keyword_args_code)

        let callee_el = document.createElement('span')
        callee_el.innerText = callee_code
        widget.appendChild(callee_el)

        let args_el = document.createElement('span')
        args_el.contentEditable = "plaintext-only"

        let arg_els = []

        given_positional_args.forEach(arg => {
          let stuff_before = cm.getRange(start_pos, item_to_start_pos(arg));
          const before_arg = stuff_before.match(/[\s\w=]*$/)[0];

          const arg_val_code = cm.getRange(item_to_start_pos(arg), item_to_end_pos(arg))

          arg_el = document.createElement('span')
          arg_el.append(before_arg, arg_to_widget(arg_val_code, arg.type_at_func_def))
          arg_els.push(arg_el)
        });

        // missing_positional_args.forEach(arg => {
          // .map(arg => arg.name + "=" + arg_to_widget(arg.code, arg.type)).join(", ")

          // arg_els.push(arg_to_widget(arg.code, arg.type))
          // document.createTextNode(arg_code)
        // })
        //   throw "boom";
        //   replacement_str = `${needs_comma_after_positional_args ? ", " : ""}${escapeHtml(missing_positional_args)}`
        //   widget_html += `<span style="cursor: pointer" title="${replacement_str}" data-replace-with="${replacement_str}">`
        //   if (needs_comma_after_positional_args) {
        //     widget_html += ", "
        //     needs_comma_after_positional_args = false
        //   }
        //   widget_html += `${ellipses_svg_html}</span> `
        // }

        given_keyword_args.forEach(arg => {
          let stuff_before = cm.getRange(start_pos, item_to_start_pos(arg));
          const before_arg = stuff_before.match(/[\s\w=]*$/)[0];

          const arg_val_code = cm.getRange(item_to_start_pos(arg), item_to_end_pos(arg))

          arg_el = document.createElement('span')
          arg_el.append(before_arg, arg_to_widget(arg_val_code, arg.type_at_func_def))
          arg_els.push(arg_el)
        });

        // let needs_comma_after_keyword_args = given_positional_args.length !== 0 || given_keyword_args.length !== 0
        // if (missing_keyword_args.length > 0) {
        //   let missing_keyword_args_code = missing_keyword_args.map(arg => arg.name + "=" + arg_to_widget(arg.code, arg.type)).join(", ")
        //   replacement_str = `${needs_comma_after_keyword_args ? ", " : ""}${escapeHtml(missing_keyword_args_code)}`
        //   widget_html += `<span style="cursor: pointer" title="${replacement_str}" data-replace-with="${replacement_str}">${needs_comma_after_keyword_args ? ", " : ""}${ellipses_svg_html}</span>`
        // }

        arg_els.forEach((arg_el, i) => {
          if (i !== 0) {
            args_el.append(",")
          }
          args_el.appendChild(arg_el)
        })

        widget.append("(", args_el, ")")

        const mark = cm.markText(start_pos,end_pos, {
          replacedWith: widget,
          inclusiveRight: true,
          inclusiveLeft: true,
        });

        // widget.contentEditable = true
        // widget.contentEditable = "plaintext-only"
        // widget.innerText = item_code

        // widget.querySelectorAll("[data-replace-with").forEach(elem => {
        //   elem.addEventListener("click", ev => {
        //     ev.stopPropagation();
        //     elem.after(document.createTextNode(elem.dataset.replaceWith));
        //     elem.remove();
        //     const {from, to} = mark.find()
        //     cm.replaceRange(widget.innerText, from, to)
        //   });
        // })

        widget.addEventListener("keydown", ev => {
          ev.stopPropagation();
          snp_outer && redraw_cell(snp_outer);
        });

        widget.addEventListener("keyup", ev => {
          ev.stopPropagation();
          const {from, to} = mark.find()
          const code = elToCode(widget)
          console.log(code)
          cm.replaceRange(code, from, to)
        });

        widget.addEventListener("mousedown", ev => {
          ev.stopPropagation();
        });

        widget.addEventListener("mouseup", ev => {
          ev.stopPropagation();
        });
      });
    } else {
      console.error(msg);
      old_callback(msg);
    }
  };
  IPython.notebook.kernel.execute(`
notebook_code_through_cell = ${JSON.stringify(notebook_code_through_cell)}
execfile("type_inference.py")
import json
class JsonDict():
    def __init__(self, dict):
        self.dict = dict

    def _repr_json_(self):
       return self.dict
`,  callbacks, { silent: false, user_expressions: { "inferred": "JsonDict(do_inference(notebook_code_through_cell))" } });

}

function redraw_cell(snp_outer) {
  const cell = snp_outer.cell;
  const img = snp_outer.img;
  const codeExecuting = cell.get_text();
  if (cell.busy) { return; }
  cell.busy = true;
  // Hacktastic way to get live feedback
  const callbacks = cell.get_callbacks();
  // console.log(cell.get_callbacks())
  callbacks.iopub.output = function(msg) {
    if (msg.header.msg_type === "execute_result" && msg.content.data["image/png"]) {
      // cell.clear_output();
      // The hover regions:

      // console.log(msg.content.data["image/svg+xml"])
      // Replace hover regions
      let temp_el = document.createElement("div")
      temp_el.innerHTML = msg.content.data["image/svg+xml"]
      snp_outer.querySelector("svg").remove()
      snp_outer.appendChild(temp_el.children[0])
      img.src = "data:image/png;base64," + msg.content.data["image/png"]; // This also triggers img.onload which calls attach_snp and reattaches all of our events!
    } else {
      // console.log(arguments);
      // cell.output_area.handle_output.apply(cell.output_area, [msg]);
      if (msg.header.msg_type === "error") {
        console.log(msg.content.evalue)
      } else {
        console.log(arguments)
      }
    }
    cell.busy = false;
    if (codeExecuting !== cell.get_text()) { redraw_cell(snp_outer); }
  };
  cell.kernel.execute(codeExecuting, callbacks, {silent: false, store_history: true, stop_on_error: true});
}


// <div class="snp_outer">
// <img src='{}' onload="attach_snp(this)">
// </div>
function attach_snp(img) {
  let snp_outer = img.closest(".snp_outer");
  snp_outer.img = img
  let cell_el = snp_outer.closest(".code_cell");
  let cell = Jupyter.notebook.get_cells().filter(cell => cell.element[0] === cell_el)[0];
  snp_outer.cell = cell

  cell.busy = false;
  // console.log("reattaching")
  // console.log(snp_outer);
  // console.log(cell_el);
  // console.log(cell);
  let hovered_elems = [];

  const inspector = document.createElement("div");
  let snp_state = {
    hovered_elems: [],
    selected_shape: undefined,
    inspector: inspector,
    code_mirror_popup: undefined
  }
  snp_outer.snp_state = snp_state

  snp_outer.querySelectorAll('[data-artist]').forEach(el => {
    let title = el.dataset.artist + el.dataset.names
    // el.addEventListener("mouseenter", ev => {
    //   el.classList.add("hovered")
    //   hovered_elems.addAsSet(title)
    //   console.log("mouseenter")
    //   console.log(hovered_elems)
    // });
    // el.addEventListener("mouseleave", ev => {
    //   hovered_elems.removeAsSet(title)
    //   el.classList.remove("hovered")
    //   console.log("mouseleave")
    //   console.log(hovered_elems)
    // });
    el.addEventListener("click", ev => {
      const first_shape = el.querySelector("[stroke-width]")
      if (snp_state.selected_shape == first_shape) {
        deselect_all(snp_state);
      } else {
        deselect_all(snp_state);
        select(snp_state, first_shape);
        const [top, left] = relativeTopLeft(first_shape, snp_outer);
        inspector.style = `
          position: absolute;
          top: ${top}px;
          left: ${left + first_shape.getBoundingClientRect().width}px;
          background: #eee;
          border: solid 1px #aaa;
        `.replace(/\n\s*/g, " ")
        inspector.innerHTML = "";
        snp_outer.appendChild(inspector);
        // console.log(el.dataset);
        if (el.dataset.loc) {
          const [lineno, col_offset, end_lineno, end_col_offset] = JSON.parse(el.dataset.loc);
          const [from, to] = [ // CodeMirror locs
            {line: lineno-1,     ch: col_offset},
            {line: end_lineno-1, ch: end_col_offset}
          ];
          const code_mirror = cell.code_mirror;
          // editor.innerText = code_mirror.getRange(from, to);
          // const markedCodeChunk = code_mirror.markText(from, to, {css: "border: solid red 1px"});
          const linked = code_mirror.linkedDoc({from: from.line, to: to.line+1});
          // console.log(linked);
          const code_mirror_popup = CodeMirror(inspector);
          code_mirror_popup.swapDoc(linked);
          snp_state.code_mirror_popup = code_mirror_popup;
          linked.setSelection(from, to);
          code_mirror_popup.focus();
          // console.log(code_mirror_popup);

          // infer_types_up_through(cell);

          inspector.addEventListener("keydown", ev => {
            if (ev.ctrlKey && ev.code === "Enter") {
              deselect_all(snp_state);
              cell.busy = false;
              cell.execute();
            } else {
              redraw_cell(snp_outer);
            }
          });
        }
      }
      // console.log(hovered_elems)
      ev.stopPropagation();
    });
  });
}
