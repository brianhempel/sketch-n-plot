
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
      const cell_items = items.filter(item => item.loc.line >= cell_lineno);
      console.log(cell_items);

      // START HERE
      // start widgetizing the call

      // decoding enum for the "arg_kind" numeric property
      const arg_kinds = [
        "ARG_POS",       // Positional argument
        "ARG_OPT",       // Positional, optional argument (functions only, not calls)
        "ARG_STAR",      // *arg argument
        "ARG_NAMED",     // Keyword argument x=y in call, or keyword-only function arg
        "ARG_STAR2",     // **arg argument
        "ARG_NAMED_OPT", // In an argument list, keyword-only and also optional
      ]



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


// <div class="snp_outer">
// <img src='{}' onload="attach_snp(this)">
// </div>
function attach_snp(img) {
  let snp_outer = img.closest(".snp_outer");
  let cell_el = snp_outer.closest(".code_cell");
  let cell = Jupyter.notebook.get_cells().filter(cell => cell.element[0] === cell_el)[0];
  let svg_hover_regions = snp_outer.querySelector("svg")
  let busy = false;
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
              busy = false;
              cell.execute();
            } else {
              function redraw() {
                const codeExecuting = cell.get_text();
                if (busy) { return; }
                busy = true;
                // Hacktastic way to get live feedback
                const callbacks = cell.get_callbacks();
                // console.log(cell.get_callbacks())
                callbacks.iopub.output = function(msg) {
                  if (msg.header.msg_type === "execute_result" && msg.content.data["image/png"]) {
                    // cell.clear_output();
                    // The hover regions:

                    // console.log(msg.content.data["image/svg+xml"])
                    let temp_el = document.createElement("div")
                    temp_el.innerHTML = msg.content.data["image/svg+xml"]
                    svg_hover_regions.remove()
                    svg_hover_regions = temp_el.children[0]
                    snp_outer.appendChild(svg_hover_regions)
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
                  busy = false;
                  if (codeExecuting !== cell.get_text()) { redraw(); }
                };
                cell.kernel.execute(codeExecuting, callbacks, {silent: false, store_history: true, stop_on_error: true});
              }
              redraw();
            }
          });
        }
      }
      // console.log(hovered_elems)
      ev.stopPropagation();
    });
  });
}
