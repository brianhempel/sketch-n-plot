
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

// [1,2,3].intersperse("&") => [1, '&', 2, '&', 3]
Array.prototype.intersperse = function(sep) {
  return this.flatMap((el, i) => i == 0 ? [el] : [sep, el]);
}

// lol javascript can't compare arrays
function equal_by_json(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Array.prototype.count = function(predicate) {
//   let count = 0;
//   this.forEach(x => {
//     if (predicate(x)) {
//       count += 1;
//     }
//   });
//   return count
// }

Array.prototype.takeWhile = function(predicate) {
  const out = [];
  for (const x of this) {
    if (predicate(x)) {
      out.push(x);
    } else {
      return out;
    }
  }
  return out;
}

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

// function vectorAdd({x, y}, vec2) {
//   return { x: x + vec2.x, y: y + vec2.y };
// }


// global, for debugging only
// window.last_selected_shape = undefined

function select(snp_state, shape) {
  // window.last_selected_shape = shape
  // console.log(window.last_selected_shape)
  snp_state.selected_shape = shape
  shape.dataset.oldStrokeWidth = shape.getAttribute("stroke-width")
  shape.setAttribute("stroke-width", "3.0")
  place_inspector(snp_state)
}

function deselect_all(snp_state) {
  const selected = snp_state.selected_shape
  if (selected) {
    selected.setAttribute("stroke-width", selected.dataset.oldStrokeWidth)
    snp_state.selected_shape = undefined
  }
  snp_state.inspector.remove()
  // const code_mirror_popup = snp_state.code_mirror_popup;
  // if (code_mirror_popup) {
  //   code_mirror_popup.getWrapperElement().remove(); // delete editor "Remove getWrapperElement() from your tree to delete an editor instance"
  //   snp_state.code_mirror_popup = undefined
  // }
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

// this is copy-pasted from ellipses.svg
// Have to run the SVG through Image Optim first, to (a) remove title elements that create undesired tooltips and (b) remove the ID elements that unhelpfully collide across ALL svgs on the page and cause DOM manipulation bugs.
ellipses_svg_html = `<svg height="14pt" viewBox="0 0 14 14" width="14pt" xmlns="http://www.w3.org/2000/svg"><path d="m14 8c0 1.65685-1.3431 3-3 3h-8c-1.65685 0-2.99999935-1.34315-2.99999959-3 .00000047-1.65685 1.34314959-3 2.99999959-3h8c1.6569 0 3 1.34315 3 3z" fill="#fff"/><g fill-rule="evenodd"><path d="m3 7c.55229 0 1 .44772 1 1s-.44771 1-1 1c-.55228 0-1-.44772-1-1s.44772-1 1-1z"/><path d="m7 7c.55229 0 1 .44772 1 1s-.44771 1-1 1c-.55228 0-1-.44772-1-1s.44772-1 1-1z"/><path d="m11 7c.5523 0 1 .44772 1 1s-.4477 1-1 1-1-.44772-1-1 .4477-1 1-1z"/></g></svg>`;

// this is copy-pasted from dial.svg, but remove the newline between <?xml> and <svg>
// For some reason, Image Optim chokes on this. I don't think it likes linear gradients.
// Do our own ID mangling.
// We are using the "nub" title to find the nub (for now) so don't remove titles.
dial_svg_counter = 0
function dial_svg_html() {
  dial_svg_counter += 1
  const unique_id = dial_svg_counter;

  return `<?xml version="1.0" encoding="utf-8"?><svg x="0pt" y="0pt" width="14pt" height="14pt" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g id="1">
      <title>Layer 1</title>
      <linearGradient x1="7" y1="14" x2="7" y2="-5.00679e-06" gradientUnits="userSpaceOnUse" id="4">
        <stop style="stop-color:#505050;stop-opacity:1;"/>
        <stop offset="1" style="stop-color:#f7f7f7;stop-opacity:1;"/>
      </linearGradient>
      <defs>
        <title>Path</title>
        <g id="2">
          <defs>
            <path id="3" d="M7,0 C10.866,0,14,3.13401,14,7 C14,10.866,10.866,14,7,14 C3.13401,14,0,10.866,0,7 C0,3.13401,3.13401,0,7,0 z"/>
          </defs>
          <use xlink:href="#3" style="fill:url(#4);fill-opacity:1;fill-rule:evenodd;opacity:1;stroke:none;"/>
        </g>
      </defs>
      <use xlink:href="#2"/>
      <defs>
        <title>Path</title>
        <g id="5">
          <defs>
            <path id="6" d="M7,1 C10.3137,1,13,3.68629,13,7 C13,10.3137,10.3137,13,7,13 C3.68629,13,1,10.3137,1,7 C1,3.68629,3.68629,1,7,1 z"/>
          </defs>
          <use xlink:href="#6" style="fill:#d0d0d0;fill-opacity:1;fill-rule:evenodd;opacity:1;stroke:none;"/>
        </g>
      </defs>
      <use xlink:href="#5"/>
    </g>
    <g id="7">
      <title>nub</title>
      <linearGradient x1="7" y1="6" x2="7" y2="2" gradientUnits="userSpaceOnUse" id="10">
        <stop style="stop-color:#ffffff;stop-opacity:1;"/>
        <stop offset="1" style="stop-color:#4e4e4e;stop-opacity:1;"/>
      </linearGradient>
      <defs>
        <title>Path</title>
        <g id="8">
          <defs>
            <path id="9" d="M7,2 C8.10457,2,9,2.89543,9,4 C9,5.10457,8.10457,6,7,6 C5.89543,6,5,5.10457,5,4 C5,2.89543,5.89543,2,7,2 z"/>
          </defs>
          <use xlink:href="#9" style="fill:url(#10);fill-opacity:1;fill-rule:evenodd;opacity:1;stroke:none;"/>
        </g>
      </defs>
      <use xlink:href="#8"/>
    </g>
  </svg>`.replaceAll(/id="(\d+)"/g, `id="dial${unique_id}_$1"`).replaceAll(/xlink:href="#(\d+)"/g, `xlink:href="#dial${unique_id}_$1"`).replaceAll(/\burl\(#(\d+)\)/g, `url(#dial${unique_id}_$1)`);
}

// https://stackoverflow.com/a/6234804
// function escapeHtml(str) {
//   return str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
// }

// Walk the widget tree and convert to code
// If node has a to_code property, call it. Otherwise use the text of text nodes.
function to_code(node) {
  if (node.hasOwnProperty("to_code")) {
    return node.to_code()
  } else if (node.nodeType === 3) { // text node
    return node.data.replaceAll("\u00A0"," "); /* Remove non-breaking spaces...which are produced by space bar, at least when the element is ordinary content-editable (perhaps not for contenteditable="plaintext-only") */
  } else {
    return Array.from(node.childNodes).map(to_code).join("")
  }
}

function arg_to_widget(root_widget, code, type) {
  console.log(code, type)
  if (type[".class"] === "UnionType") {
    const items = type["items"]
    const literals = items.filter(type2 => type2[".class"] === "LiteralType")
    // If all string literals...
    if (items.length === literals.length && items.every(type2 => type2["fallback"] === "builtins.str")) {
      // {
      //   ".class": "UnionType",
      //   "items": [
      //     {
      //       ".class": "LiteralType",
      //       "value": "center",
      //       "fallback": "builtins.str"
      //     },
      //     {
      //       ".class": "LiteralType",
      //       "value": "left",
      //       "fallback": "builtins.str"
      //     },
      //     {
      //       ".class": "LiteralType",
      //       "value": "right",
      //       "fallback": "builtins.str"
      //     }
      //   ]
      // },
      let select = document.createElement("select")
      select.innerHTML = items.map(type2 => {
        let isSelected = JSON.stringify(type2["value"]) === code;
        return `<option${isSelected ? " selected": ""}>${JSON.stringify(type2["value"])}</option>`;
      }).join("")
      select.addEventListener("click", ev => { ev.stopPropagation() });
      select.addEventListener("change", ev => { root_widget.sync_editor_and_output() });
      select.to_code = function() { return this.value; };
      return select
    } else if (items.length === 3 && items.includes("builtins.float") && literals.length === 2 && literals.every(type2 => typeof type2.value === "number")) {
      // {
      //   ".class": "UnionType",
      //   "items": [
      //     "builtins.float",
      //     {
      //       ".class": "LiteralType",
      //       "value": 0,
      //       "fallback": "builtins.int"
      //     },
      //     {
      //       ".class": "LiteralType",
      //       "value": 50,
      //       "fallback": "builtins.int"
      //     }
      //   ]
      // },
      const [lo, hi] = literals.map(type2 => type2.value).sort()
      const step_per_px = [10000000000, 1000000000, 100000000, 10000000, 1000000, 100000, 10000, 1000, 100, 10, 1, 0.1, 0.01, 0.001, 0.0001, 1.0e-05, 1.0e-06, 1.0e-07, 1.0e-08, 1.0e-09, 1.0e-10].find(n => (hi - lo) / n >= 30) || 0.01
      return make_dial_and_num(root_widget, code, step_per_px)
    } else {
      return document.createTextNode(code);
    }
  } else if (type === "builtins.float") {
    return make_dial_and_num(root_widget, code, 0.01)
  } else {
    return document.createTextNode(code);
  }
}

function make_dial_and_num(root_widget, code, change_per_px) {
  let decimal_places = Math.max(0, -Math.log(change_per_px))
  let dial_and_num = document.createElement('span');
  dial_and_num.innerHTML = dial_svg_html();
  let dial = dial_and_num.firstElementChild;
  let num_text = document.createTextNode(code);
  dial_and_num.append(num_text);

  dial.to_code = () => "";
  dial.setAttribute("style", "vertical-align: text-bottom; cursor: ns-resize");
  let angle = 3.14159 / 2;
  let r = 3;

  let nub = Array.from(dial.querySelectorAll("g")).find(elem => elem.querySelector("title")?.textContent === "nub");
  // console.log(nub)
  // console.log(nub.parentElement);
  dial.addEventListener("mousedown", ev => {
    ev.stopPropagation();

    let lastY = ev.screenY;

    // console.log(ev)
    let stopDrag = ev => {
      document.body.removeEventListener("mousemove", moveDial);
      document.body.removeEventListener("mouseup", stopDrag);
      root_widget.sync_editor_and_output();
    };
    let moveDial = ev => {
      ev.preventDefault();

      const num = getNum();

      const mouseDelta = -(ev.screenY - lastY);
      const delta = mouseDelta * change_per_px;
      lastY = ev.screenY;

      // Wonky to avoid the JS weirdness of how it displays IEEE floats
      num_text.textContent = "" + parseFloat((num + delta).toFixed(decimal_places));

      angle += mouseDelta * 0.1;
      nub.setAttribute("transform", `translate(${Math.cos(angle) * r} ${-Math.sin(angle) * r + r})`);
      // console.log(nub)
      root_widget.sync_editor_and_output();
    };

    document.body.addEventListener("mousemove", moveDial);
    document.body.addEventListener("mouseup", stopDrag);

    let getNum = () => parseFloat(num_text.textContent);
  });

  return dial_and_num;
}

function siblingsAfter(node) {
  const siblings = []
  while (node = node.nextSibling) {
    siblings.push(node)
  }
  return siblings
}

// In right-to-left (reversed) order
function siblingsBefore(node) {
  const siblings = []
  while (node = node.previousSibling) {
    siblings.push(node)
  }
  return siblings
}

// arg is { name:, kind:, code:, type: }
// options is optional, default is { positional: false }
function make_arg_el(root_widget, arg, options) {
  const arg_el = document.createElement('span');
  if (arg.kind !== "ARG_POS") {
    const remove_button = document.createElement('span');
    remove_button.innerText = "❌";
    remove_button.style.fontSize = "0.5em";
    remove_button.style.verticalAlign = "super";
    remove_button.style.cursor = "pointer";
    remove_button.title = `Remove argument \`${arg.name}\``;
    remove_button.to_code = () => "";
    remove_button.addEventListener("click", ev => {
      const ellipses_el = siblingsAfter(arg_el).find(node => node.hidden_arg_els !== undefined)
      // Try to remove the extra comma.
      // Need to skip any ellipses elements.
      const node_before = siblingsBefore(arg_el).find(node => to_code(node) !== "" && !node.textContent.match(/^\s*$/))
      const node_after  = siblingsAfter(arg_el) .find(node => to_code(node) !== "" && !node.textContent.match(/^\s*$/))
      if (node_before?.textContent?.match(/\s*,\s*$/)) {
        node_before.textContent = node_before.textContent.replace(/\s*,\s*$/, "");
      } else if (node_after?.textContent?.match(/^\s*,\s*/)) {
        node_after.textContent = node_before.textContent.replace(/^\s*,\s*/, "");
      }
      // console.log(arg_el)
      arg_el.remove();
      // console.log(ellipses_el);
      if (ellipses_el) {
        ellipses_el.hidden_arg_els.push(arg_el)
        ellipses_el.style.display = "inline"
      }
      root_widget.sync_editor_and_output();
    });
    arg_el.append(remove_button)
  }
  if (options?.positional) {
    arg_el.append(arg_to_widget(root_widget, arg.code, arg.type));
  } else {
    arg_el.append(arg.name, "=", arg_to_widget(root_widget, arg.code, arg.type));
  }
  return arg_el;
}

function make_ellipses_el(root_widget, hidden_arg_els) {
  const ellipses_el = document.createElement('span')
  ellipses_el.hidden_arg_els = hidden_arg_els
  ellipses_el.style.cursor = "pointer";
  ellipses_el.to_code = () => "";
  ellipses_el.innerHTML = " " + ellipses_svg_html;
  ellipses_el.querySelector("svg").style.verticalAlign = "middle";
  ellipses_el.addEventListener("click", ev => {
    ev.stopPropagation();
    ellipses_el.before(", ", ...ellipses_el.hidden_arg_els.intersperse(", "));
    ellipses_el.hidden_arg_els = []
    ellipses_el.style.display = "none"
    root_widget.sync_editor_and_output()
  })
  ellipses_el.title = "Show optional args: " + hidden_arg_els.map(to_code).join(", ")
  if (hidden_arg_els.length === 0) {
    ellipses_el.style.display = "none"
  }
  return ellipses_el;
}

// function infer_types_up_through_old(cell) {
//   let code_cells = Jupyter.notebook.get_cells().filter(cell => cell.cell_type === "code");

//   // limit to cells up through the given cell
//   let code_cells_before_cell = code_cells.slice(0, code_cells.indexOf(cell));
//   // code_cells             = code_cells.slice(0, code_cells.indexOf(cell)+1);

//   function is_not_magic(code) {
//     return !code.startsWith("%%");
//   }

//   let notebook_code_before_cell =
//     code_cells_before_cell.
//         // takeWhile(cell => cell.input_prompt_number !== "*").
//         map(cell => cell.get_text()).
//         filter(is_not_magic).
//         // map((code, i) => `### Cell ${i} ###\n${code}`).
//         join("\n");

//   let notebook_code_through_cell = `${notebook_code_before_cell}\n${cell.get_text()}`;

//   // console.log(notebook_code_through_cell);

//   let cell_lineno = notebook_code_before_cell.split("\n").length + 1

//   console.log({cell_lineno: cell_lineno})

//   // console.log(cells);
//   // console.log(cells.map(cell => cell.input_prompt_number));
//   // console.log(notebook_code_up_through_current_cell)
//   const callbacks = cell.get_callbacks();
//   const just_log  = { shell: { reply: console.log }, iopub: { output: console.log }};
//   let old_callback = callbacks.shell.reply;
//   callbacks.shell.reply = (msg) => {
//     if (msg.msg_type == "execute_reply" && msg.content.status == "ok" &&msg.content.user_expressions.inferred.status == "ok") {
//       console.log(msg.content.user_expressions.inferred)
//       const items = msg.content.user_expressions.inferred.data["application/json"];
//       const cell_items = items.filter(call_info => call_info.callee.loc.line >= cell_lineno);
//       console.log(cell_items);
//       // console.log(JSON.stringify(cell_items));
//       let cm = cell.code_mirror;

//       let snp_outer = cell.element[0].querySelector(".snp_outer");

//       // for decoding the "arg_kind" numeric property
//       const int_to_arg_kind = [
//         "ARG_POS",       // Positional argument
//         "ARG_OPT",       // Positional, optional argument (functions only, not calls)
//         "ARG_STAR",      // *arg argument
//         "ARG_NAMED",     // Keyword argument x=y in call, or keyword-only function arg
//         "ARG_STAR2",     // **arg argument
//         "ARG_NAMED_OPT", // In an argument list, keyword-only and also optional
//       ]

//       cm.getAllMarks().forEach(mark => mark.clear())

//       cell_items.forEach(({call, callee, given_args}) => {

//         function item_to_start_pos(item) {
//           return { line: item.loc.line     - cell_lineno, ch: item.loc.column     }
//         }
//         function item_to_end_pos(item) {
//           return { line: item.loc.end_line - cell_lineno, ch: item.loc.end_column }
//         }

//         const start_pos = item_to_start_pos(call)
//         const end_pos   = item_to_end_pos(call)

//         let arg_defaults = []

//         callee.arg_names.forEach((arg_name, arg_i) => {
//           const arg_kind = int_to_arg_kind[callee.arg_kinds[arg_i]];
//           const arg_type = callee.arg_types[arg_i];
//           const arg_default_code = (callee["definition_arguments_default_code"] || [])[arg_i] || default_code_for_type(arg_type)

//           arg_defaults.push({ name: arg_name, kind: arg_kind, code: arg_default_code, type: arg_type })
//         });

//         let given_args2 = []
//         given_args.forEach((given_arg, arg_i) => {
//           const arg_kind = int_to_arg_kind[given_arg.kind];
//           const arg_i_at_func_def = given_arg["name"] ? callee.arg_names.indexOf(given_arg.name) : arg_i
//           const arg_val_code = cm.getRange(item_to_start_pos(given_arg), item_to_end_pos(given_arg))
//           given_args2.push({ name: given_arg.name, kind: arg_kind, code: arg_val_code, type: callee.arg_types[arg_i_at_func_def] })
//         })

//         // console.log(arg_defaults.map(({name, code}) => `${name}=${code}`).join(", "))

//         let callee_code = cm.getRange(item_to_start_pos(callee), item_to_end_pos(callee))

//         const widget = document.createElement("div")
//         widget.style.display = "inline-block"
//         widget.style.border = "solid gray 1px"

//         const [given_positional_args, given_keyword_args] = given_args2.partition(arg => !arg.name)

//         const missing_positional_args =
//           arg_defaults.
//             slice(given_positional_args.length).
//             takeWhile(arg => arg.kind === "ARG_POS")

//         const missing_keyword_args =
//           arg_defaults.
//             slice(given_positional_args.length).
//             slice(missing_positional_args.length).
//             filter(arg => !given_keyword_args.some(given_arg => given_arg.name === arg.name)).
//             filter(arg => arg.kind !== "ARG_STAR2") // ignore **kwargs

//         let callee_el = document.createElement('span')
//         callee_el.innerText = callee_code
//         widget.appendChild(callee_el)

//         let args_el = document.createElement('span')
//         try {
//           args_el.contentEditable = "plaintext-only"
//         } catch (_) {
//           args_el.contentEditable = true // Firefox
//         }

//         let arg_els = []

//         arg_els.push(...given_positional_args.map(arg => make_arg_el(widget, arg, { positional: true })));

//         let missing_positional_arg_els = missing_positional_args.map(arg => make_arg_el(widget, arg, { positional: true }));

//         arg_els.push(make_ellipses_el(widget, missing_positional_arg_els))

//         arg_els.push(...given_keyword_args.map(arg => make_arg_el(widget, arg)));

//         let missing_keyword_arg_els = missing_keyword_args.map(arg => make_arg_el(widget, arg));

//         arg_els.push(make_ellipses_el(widget, missing_keyword_arg_els))

//         arg_els.forEach((arg_el, i) => {
//           if (i !== 0 && typeof arg_el.hidden_arg_els === "undefined") { // no comma before first arg or ellipses
//             args_el.append(", ")
//           }
//           args_el.appendChild(arg_el)
//         })

//         widget.append("(", args_el, ")")

//         const mark = cm.markText(start_pos, end_pos, {
//           replacedWith: widget,
//           inclusiveRight: true,
//           inclusiveLeft: true,
//         });

//         widget.sync_editor_and_output = function () {
//           const {from, to} = mark.find()
//           const code = to_code(widget)
//           // console.log(code)
//           cm.replaceRange(code, from, to)
//           snp_outer && redraw_cell(snp_outer);
//         }

//         widget.addEventListener("keydown", ev => {
//           ev.stopPropagation();
//         });

//         widget.addEventListener("keyup", ev => {
//           ev.stopPropagation();
//           widget.sync_editor_and_output() // Live update is one keypress behind if we attach this to keydown :/
//         });

//         widget.addEventListener("mousedown", ev => {
//           ev.stopPropagation();
//         });

//         // Need to let mouseup propogate so that dial drag release works even when released on the widget
//         // widget.addEventListener("mouseup", ev => {
//         //   ev.stopPropagation();
//         // });
//       });
//     } else {
//       console.error(msg);
//       old_callback(msg);
//     }
//   };
//   IPython.notebook.kernel.execute(
//     `notebook_code_through_cell = ${JSON.stringify(notebook_code_through_cell)}`,
//     callbacks, {
//       silent: false,
//       user_expressions: { "inferred": "JsonDict(do_inference(notebook_code_through_cell))" }
//     }
//   );
// }

// for decoding the "arg_kind" numeric property
int_to_arg_kind = [
  "ARG_POS",       // Positional argument
  "ARG_OPT",       // Positional, optional argument (functions only, not calls)
  "ARG_STAR",      // *arg argument
  "ARG_NAMED",     // Keyword argument x=y in call, or keyword-only function arg
  "ARG_STAR2",     // **arg argument
  "ARG_NAMED_OPT", // In an argument list, keyword-only and also optional
]

function infer_types_and_attach_widgets(snp_state) {
  const { cell, snp_outer, inspector } = snp_state
  let code_cells = Jupyter.notebook.get_cells().filter(cell => cell.cell_type === "code");

  // limit to cells up through the given cell
  let code_cells_before_cell = code_cells.slice(0, code_cells.indexOf(cell));
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

  let cell_lineno = notebook_code_before_cell.split("\n").length + 1

  console.log({cell_lineno: cell_lineno})

  // console.log(cells);
  // console.log(cells.map(cell => cell.input_prompt_number));
  // console.log(notebook_code_up_through_current_cell)
  const callbacks = cell.get_callbacks();
  const just_log  = { shell: { reply: console.log }, iopub: { output: console.log }};
  let old_callback = callbacks.shell.reply;
  callbacks.shell.reply = (msg) => {
    if (msg.msg_type == "execute_reply" && msg.content.status == "ok" &&msg.content.user_expressions.inferred.status == "ok") {
      console.log(msg.content.user_expressions.inferred)
      const items = msg.content.user_expressions.inferred.data["application/json"];
      const cell_items = items.filter(call_info => call_info.callee.loc.line >= cell_lineno);
      console.log(cell_items);
      // console.log(JSON.stringify(cell_items));

      let widgets = widgets_from_code(cell_items, cell_lineno, cell.code_mirror, snp_state);

      console.log(widgets)

      snp_state.hover_regions_svg().querySelectorAll('[data-loc]').forEach(hover_region => {
        const [lineno, col_offset, end_lineno, end_col_offset] = JSON.parse(hover_region.dataset.loc);
        const [start_pos, end_pos] = [ // CodeMirror locs
          {line: lineno-1,     ch: col_offset},
          {line: end_lineno-1, ch: end_col_offset}
        ];

        const widget = widgets.find(w => equal_by_json([start_pos, end_pos], [w.start_pos, w.end_pos]))

        if (widget) {
          hover_region.addEventListener("click", ev => {
            const first_shape = hover_region.querySelector("[stroke-width]")
            if (snp_state.selected_shape == first_shape) {
              deselect_all(snp_state);
            } else {
              deselect_all(snp_state);
              select(snp_state, first_shape);
              inspector.innerHTML = "";
              snp_outer.appendChild(inspector);
              inspector.appendChild(widget);
            }
            // console.log(hovered_elems)
            ev.stopPropagation();
          });
        }
      })

    } else {
      console.error(msg);
      old_callback(msg);
    }

    // hover_regions_svg.querySelectorAll('[data-artist]').forEach(el => {
    //   let title = el.dataset.artist + el.dataset.names
    //   // el.addEventListener("mouseenter", ev => {
    //   //   el.classList.add("hovered")
    //   //   hovered_elems.addAsSet(title)
    //   //   console.log("mouseenter")
    //   //   console.log(hovered_elems)
    //   // });
    //   // el.addEventListener("mouseleave", ev => {
    //   //   hovered_elems.removeAsSet(title)
    //   //   el.classList.remove("hovered")
    //   //   console.log("mouseleave")
    //   //   console.log(hovered_elems)
    //   // });
    //   el.addEventListener("click", ev => {
    //     const first_shape = el.querySelector("[stroke-width]")
    //     if (snp_state.selected_shape == first_shape) {
    //       deselect_all(snp_state);
    //     } else {
    //       deselect_all(snp_state);
    //       select(snp_state, first_shape);
    //       const [top, left] = relativeTopLeft(first_shape, snp_outer);
    //       inspector.style = `
    //         position: absolute;
    //         top: ${top}px;
    //         left: ${left + first_shape.getBoundingClientRect().width}px;
    //         background: #eee;
    //         border: solid 1px #aaa;
    //       `.replace(/\n\s*/g, " ")
    //       inspector.innerHTML = "";
    //       snp_outer.appendChild(inspector);
    //       // console.log(el.dataset);
    //       if (el.dataset.loc) {
    //         const [lineno, col_offset, end_lineno, end_col_offset] = JSON.parse(el.dataset.loc);
    //         const [from, to] = [ // CodeMirror locs
    //           {line: lineno-1,     ch: col_offset},
    //           {line: end_lineno-1, ch: end_col_offset}
    //         ];
    //         const code_mirror = cell.code_mirror;
    //         // editor.innerText = code_mirror.getRange(from, to);
    //         // const markedCodeChunk = code_mirror.markText(from, to, {css: "border: solid red 1px"});
    //         const linked = code_mirror.linkedDoc({from: from.line, to: to.line+1});
    //         // console.log(linked);
    //         const code_mirror_popup = CodeMirror(inspector);
    //         code_mirror_popup.swapDoc(linked);
    //         snp_state.code_mirror_popup = code_mirror_popup;
    //         linked.setSelection(from, to);
    //         code_mirror_popup.focus();
    //         // console.log(code_mirror_popup);

    //         inspector.addEventListener("keydown", ev => {
    //           if (ev.ctrlKey && ev.code === "Enter") {
    //             deselect_all(snp_state);
    //             cell.busy = false;
    //             cell.execute();
    //           } else {
    //             redraw_cell(snp_outer);
    //           }
    //         });
    //       }
    //     }
    //     // console.log(hovered_elems)
    //     ev.stopPropagation();
    //   });
    // });
  };
  IPython.notebook.kernel.execute(
    `notebook_code_through_cell = ${JSON.stringify(notebook_code_through_cell)}`,
    callbacks, {
      silent: false,
      user_expressions: { "inferred": "JsonDict(do_inference(notebook_code_through_cell))" }
    }
  );
}

function place_inspector(snp_state) {
  const shape = snp_state.selected_shape;
  const [max_width, max_height] = [snp_state.img.getBoundingClientRect().width, snp_state.img.getBoundingClientRect().height];
  const [top, left] = relativeTopLeft(shape, snp_state.snp_outer);
  snp_state.inspector.style = `
                position: absolute;
                top: ${Math.min(top, max_height)}px;
                left: ${Math.min(left + shape.getBoundingClientRect().width, max_width)}px;
                background: #eee;
                border: solid 1px #aaa;
              `.replace(/\n\s*/g, " ");
}

function widgets_from_code(cell_items, cell_lineno, cm, snp_state) {
  let widgets = []

  cell_items.forEach(({ call, callee, given_args }) => {

    function item_to_start_pos(item) {
      return { line: item.loc.line - cell_lineno, ch: item.loc.column };
    }
    function item_to_end_pos(item) {
      return { line: item.loc.end_line - cell_lineno, ch: item.loc.end_column };
    }

    const start_pos = item_to_start_pos(call);
    const end_pos = item_to_end_pos(call);

    let arg_defaults = [];

    callee.arg_names.forEach((arg_name, arg_i) => {
      const arg_kind = int_to_arg_kind[callee.arg_kinds[arg_i]];
      const arg_type = callee.arg_types[arg_i];
      const arg_default_code = (callee["definition_arguments_default_code"] || [])[arg_i] || default_code_for_type(arg_type);

      arg_defaults.push({ name: arg_name, kind: arg_kind, code: arg_default_code, type: arg_type });
    });

    let given_args2 = [];
    given_args.forEach((given_arg, arg_i) => {
      const arg_kind = int_to_arg_kind[given_arg.kind];
      const arg_i_at_func_def = given_arg["name"] ? callee.arg_names.indexOf(given_arg.name) : arg_i;
      const arg_val_code = cm.getRange(item_to_start_pos(given_arg), item_to_end_pos(given_arg));
      given_args2.push({ name: given_arg.name, kind: arg_kind, code: arg_val_code, type: callee.arg_types[arg_i_at_func_def] });
    });

    // console.log(arg_defaults.map(({name, code}) => `${name}=${code}`).join(", "))
    let callee_code = cm.getRange(item_to_start_pos(callee), item_to_end_pos(callee));

    const widget = document.createElement("div");
    widget.style.display = "inline-block";
    widget.style.border = "solid gray 1px";
    widget.start_pos = start_pos
    widget.end_pos   = end_pos

    const [given_positional_args, given_keyword_args] = given_args2.partition(arg => !arg.name);

    // const missing_positional_args = []
    const missing_positional_args = arg_defaults.
      slice(given_positional_args.length).
      takeWhile(arg => arg.kind === "ARG_POS");

    const missing_keyword_args = arg_defaults.
      slice(given_positional_args.length).
      slice(missing_positional_args.length).
      filter(arg => !given_keyword_args.some(given_arg => given_arg.name === arg.name)).
      filter(arg => arg.kind !== "ARG_STAR2"); // ignore **kwargs

    let callee_el = document.createElement('span');
    callee_el.innerText = callee_code;
    widget.appendChild(callee_el);

    let args_el = document.createElement('span');
    try {
      args_el.contentEditable = "plaintext-only";
    } catch (_) {
      args_el.contentEditable = true; // Firefox
    }

    let arg_els = [];

    arg_els.push(...given_positional_args.map(arg => make_arg_el(widget, arg, { positional: true })));

    let missing_positional_arg_els = missing_positional_args.map(arg => make_arg_el(widget, arg, { positional: true }));

    arg_els.push(make_ellipses_el(widget, missing_positional_arg_els));

    arg_els.push(...given_keyword_args.map(arg => make_arg_el(widget, arg)));

    let missing_keyword_arg_els = missing_keyword_args.map(arg => make_arg_el(widget, arg));

    arg_els.push(make_ellipses_el(widget, missing_keyword_arg_els));

    arg_els.forEach((arg_el, i) => {
      if (i !== 0 && typeof arg_el.hidden_arg_els === "undefined") { // no comma before first arg or ellipses
        args_el.append(", ");
      }
      args_el.appendChild(arg_el);
    });

    widget.append("(", args_el, ")");

    const mark = cm.markText(start_pos, end_pos, {
      // replacedWith: widget,
      inclusiveRight: true,
      inclusiveLeft: true,
    });

    widget.sync_editor_and_output = function () {
      const { from, to } = mark.find();
      const code = to_code(widget);
      // console.log(code)
      cm.replaceRange(code, from, to);
      snp_state && redraw_cell(snp_state);
    };

    widget.addEventListener("keydown", ev => {
      ev.stopPropagation();
      if (ev.ctrlKey && ev.code === "Enter") {
        deselect_all(snp_state);
        snp_state.cell.busy = false;
        snp_state.cell.execute();
        cm.getAllMarks().forEach(mark => mark.clear());
      }
    });

    widget.addEventListener("keyup", ev => {
      ev.stopPropagation();
      widget.sync_editor_and_output(); // Live update is one keypress behind if we attach this to keydown :/
    });

    widget.addEventListener("mousedown", ev => {
      ev.stopPropagation();
    });

    widgets.push(widget)
  });

  return widgets
}

// returns undefined or an array
function tree_path(root, target) {
  if (root === target) {
    return []
  }
  for (let i = 0; i < root.children.length; i++) {
    let deeper_path = tree_path(root.children[i], target);
    if (deeper_path !== undefined) {
      return [i].concat(deeper_path)
    }
  }
  return undefined;
}

function el_by_path(root, path) {
  if (path.length === 0) {
    return root
  }
  const child = root.children[path[0]]
  return child && el_by_path(child, path.slice(1))
}

function replace_hover_regions(snp_state, new_svg_str) {
  const old_path = snp_state.selected_shape && tree_path(snp_state.hover_regions_svg(), snp_state.selected_shape)

  let temp_el = document.createElement("div")
  temp_el.innerHTML = new_svg_str
  snp_state.hover_regions_svg().remove()
  snp_state.img.after(temp_el.children[0])

  // Now, transfer the selection and move the inspector.
  //
  // Selection preservation is non-trivial when the number of items changes.
  // In Sketch-n-Sketch, we simply used the linear shape number in the output.
  // Let's use the tree path, for now, which should be slightly more robust.
  if (old_path) {
    const new_selected_shape = el_by_path(snp_state.hover_regions_svg(), old_path)
    new_selected_shape && select(snp_state, new_selected_shape)
  }
}

function redraw_cell(snp_state) {
  const { cell, img } = snp_state
  if (cell.busy) { return; }
  cell.busy = true;
  const codeExecuting = cell.get_text();
  console.log(`Executing: ${codeExecuting}`)
  // Hacktastic way to get live feedback
  const callbacks = cell.get_callbacks();
  // console.log(cell.get_callbacks())
  callbacks.iopub.output = function(msg) {
    if (msg.header.msg_type === "execute_result" && msg.content.data["image/png"]) {
      // cell.clear_output();
      // Replace background image
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
    if (codeExecuting != cell.get_text()) {
      cell.busy = false;
      redraw_cell(snp_state);
    } else {
      cell.busy = false;
      // START HERE: need to intelligently re-attach events to the SVG somehow
      // Replace hover regions:
      // console.log(msg.content.data["image/svg+xml"])
      // Replace hover regions
      if (msg.header.msg_type === "execute_result" && msg.content.data["image/svg+xml"]) {
        replace_hover_regions(snp_state, msg.content.data["image/svg+xml"])
      }
      infer_types_and_attach_widgets(snp_state);
    }
  };
  cell.kernel.execute(codeExecuting, callbacks, {silent: false, store_history: true, stop_on_error: true});
}


// <div class="snp_outer">
// <img src='...'> <!-- the plot -->
// <svg></svg> <!-- hover regions -->
// <style onload="attach_snp(this.closest('.snp_outer'))"></style> <!-- Just a way to run this code once the elements exist. -->
// </div>
function attach_snp(snp_outer) {
  let cell_el = snp_outer.closest(".code_cell");
  let cell = Jupyter.notebook.get_cells().filter(cell => cell.element[0] === cell_el)[0];
  snp_outer.cell = cell

  if (!cell.hasOwnProperty("busy")) { // We might be re-attaching, in which case busy is already defined and we don't want to clobber it.
    cell.busy = false;
  }
  // console.log("reattaching")
  // console.log(snp_outer);
  // console.log(cell_el);
  // console.log(cell);
  let hovered_elems = [];

  let snp_state = {
    hovered_elems: [],
    selected_shape: undefined,
    cell: cell,
    snp_outer: snp_outer,
    img: snp_outer.querySelector("img"),
    hover_regions_svg: () => snp_outer.querySelector("svg"),
    inspector: document.createElement("div"),
    code_mirror_popup: undefined
  }

  infer_types_and_attach_widgets(snp_state)
}
