// These will already exist where we inject the JS in the notebook.
declare const IPython : any;
declare const Jupyter : any;

// Gobals
declare var ellipses_svg_html : string;
declare var dial_svg_counter : number;
declare var int_to_arg_kind : Array<string>;
declare var default_value_from_name : Array<[string, any, string]>;

declare var pre_cell_execute_handlers_to_first_unbind_when_this_file_is_rerun : Function[];
declare var select_lineno_after_execute : number | undefined
declare var open_artists_after_execute  : string[] | undefined

ellipses_svg_html = `<svg height="14pt" viewBox="0 0 14 14" width="14pt" xmlns="http://www.w3.org/2000/svg"><path d="m14 8c0 1.65685-1.3431 3-3 3h-8c-1.65685 0-2.99999935-1.34315-2.99999959-3 .00000047-1.65685 1.34314959-3 2.99999959-3h8c1.6569 0 3 1.34315 3 3z" fill="#fff"/><g fill-rule="evenodd"><path d="m3 7c.55229 0 1 .44772 1 1s-.44771 1-1 1c-.55228 0-1-.44772-1-1s.44772-1 1-1z"/><path d="m7 7c.55229 0 1 .44772 1 1s-.44771 1-1 1c-.55228 0-1-.44772-1-1s.44772-1 1-1z"/><path d="m11 7c.5523 0 1 .44772 1 1s-.4477 1-1 1-1-.44772-1-1 .4477-1 1-1z"/></g></svg>`

// This is used to make sure we don't have duplicate IDs in the SVGs
dial_svg_counter = 0

// for decoding the "arg_kind" numeric property
int_to_arg_kind = [
  "ARG_POS",       // Positional argument
  "ARG_OPT",       // Positional, optional argument (functions only, not calls)
  "ARG_STAR",      // *arg argument
  "ARG_NAMED",     // Keyword argument x=y in call, or keyword-only function arg
  "ARG_STAR2",     // **arg argument
  "ARG_NAMED_OPT", // In an argument list, keyword-only and also optional
]

// (name, type, default code)
default_value_from_name = [
  ["width",  "builtins.float", "1.0"],
  ["height", "builtins.float", "1.0"],
]

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

interface Array<T> {
  addAsSet(elem: T): Array<T>;
  removeAsSet(elem: T): Array<T>;
  dedup(): Array<T>;
  partition(predicate: (elem: T) => boolean): [Array<T>, Array<T>];
  intersperse<A>(sep: A): Array<T|A>;
  takeWhile(predicate: (elem: T) => boolean): Array<T>;
}

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

type SelectedItem = { name : string } | { func_code : string, call_num : number } | undefined

function selected_shapes(snp_state: { canvas_selection: SelectedItem, hover_regions_svg: () => any }) : any[] {
  const selected_shapes = []
  if (snp_state.canvas_selection === undefined) {
    return selected_shapes
  } else if ("name" in snp_state.canvas_selection) {
    const target_name = snp_state.canvas_selection.name
    snp_state.hover_regions_svg().querySelectorAll(`[data-artist-names]`).forEach(shape => {
      if (JSON.parse(shape.dataset.artistNames).includes(target_name)) {
        selected_shapes.push(shape)
      }
    })
  } else if ("func_code" in snp_state.canvas_selection) {
    const target = [snp_state.canvas_selection.func_code, snp_state.canvas_selection.call_num]
    snp_state.hover_regions_svg().querySelectorAll(`[data-func-code-and-num]`).forEach(shape => {
      if (equal_by_json(target, JSON.parse(shape.dataset.funcCodeAndNum))) {
        selected_shapes.push(shape)
      }
    })
  }
  return selected_shapes
}

function select(snp_state, key) {
  console.log("select", key)
  snp_state.canvas_selection = key
  if (key === undefined) {
    return
  }

  // window.last_selected_shape = shape
  // console.log(window.last_selected_shape)

  selected_shapes(snp_state).forEach(shape => {

    const drawable = shape.querySelector("[stroke-width]");
    if (!drawable) { return }

    drawable.setAttribute("stroke-width", "4.0")
  })


  Array.from(snp_state.sidebar.children as any[]).forEach(el => el.open = false)
  const selected_item = selected_sidebar_item(snp_state, key)
  selected_item && (selected_item.open = true)

  place_inspector(snp_state)
  // snp_state.snp_outer.querySelectorAll(".add_hint").forEach(hide)
}

function shape_selection_key(shape) : SelectedItem {
  if (shape.dataset.artistNames && JSON.parse(shape.dataset.artistNames).length > 0) {
    return { name: shortest_qualified_name(JSON.parse(shape.dataset.artistNames)) }
  } else if (shape.dataset.funcCodeAndNum) {
    const [ func_code, call_num ] = JSON.parse(shape.dataset.funcCodeAndNum)
    return { func_code, call_num }
  }
  return undefined
}

function selected_sidebar_item(snp_state, key : SelectedItem) {
  if (key === undefined) {
    return undefined
  } else if ("name" in key) {
    return Array.from(snp_state.sidebar.children as any[]).find(el => el.artistName === key.name)
  } else if ("func_code" in key) {
    const target = [key.func_code, key.call_num]
    return Array.from(snp_state.sidebar.children as any[]).find(el => Array.from(el.children as any[]).some(child => child.funcCodeAndNum && equal_by_json(child.funcCodeAndNum, target)))
  }
}


// function select(snp_state, selected_item) {
//   // window.last_selected_shape = shape
//   // console.log(window.last_selected_shape)
//   snp_state.selected_shape = shape
//   shape.dataset.origStrokeWidth = shape.getAttribute("stroke-width")
//   shape.setAttribute("stroke-width", "3.0")
//   place_inspector(snp_state)
//   snp_state.snp_outer.querySelectorAll(".add_hint").forEach(hide)
// }

function deselect_all(snp_state) {
  selected_shapes(snp_state).forEach(shape => {
    const drawable = shape.querySelector("[stroke-width]");
    if (!drawable) { return }
    drawable.setAttribute("stroke-width", drawable.dataset.origStrokeWidth || "0")
  })
  snp_state.canvas_selection = undefined
  snp_state.inspector.remove()
  snp_state.snp_outer.querySelectorAll(".add_hint").forEach(show)
}

function relativeTopLeft(el, container) {
  const {top, left} = relativeBoundingRect(el, container)
  return [top, left]
}

function relativeBoundingRect(el, container) {
  const elRect = el.getBoundingClientRect();
  const refRect = container.getBoundingClientRect();

  return DOMRect.fromRect({
    x:      elRect.x      - refRect.x,
    y:      elRect.y      - refRect.y,
    width:  elRect.width,
    height: elRect.height,
  })
}


function get_cells_up_through(cell) {
  const cells = Jupyter.notebook.get_cells();
  const i = cells.indexOf(cell);
  return cells.slice(0, i+1);
}

function default_code_and_code_type_for_type(type, name : string|undefined = undefined) : [string, any] {
  const [_, __, default_code] = default_value_from_name.find(([ default_name, default_type, default_code]) => name === default_name && type === default_type) || [undefined, undefined, undefined]

  if (default_code !== undefined) {
    return [default_code, type]
  }

  if (type === "builtins.str") {
    return ['""', type]
  } else if (type === "builtins.float") {
    return ["0.0", type]
  } else if (type[".class"] === "Instance" && type["type_ref"] === "builtins.dict") {
    return ["{}", type]
  } else if (type[".class"] === "UnionType") {
    return default_code_and_code_type_for_type(type.items[0], name)
  } else if (type[".class"] === "LiteralType" && type["fallback"] == "builtins.str") {
    return [JSON.stringify(type["value"]), type["fallback"]]
  } else if (type["type_ref"] === "matplotlib._typing.ArrayLike") {
    return ["[1,2,3]", type]
  } else {
    return ["None", {".class": "NoneType"}]
  }
}

// this is copy-pasted from dial.svg, but remove the newline between <?xml> and <svg>
// For some reason, Image Optim chokes on this. I don't think it likes linear gradients.
// Do our own ID mangling.
// We are using the "nub" title to find the nub (for now) so don't remove titles.
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

function make_el(tag, attrs, style, listeners, children) {
  const el = document.createElement(tag)

  for (const key in attrs) {
    el[key] = attrs[key]
  }

  for (const key in style) {
    el.style[key] = style[key]
  }

  for (const key in listeners) {
    el.addEventListener(key, listeners[key])
  }

  el.append(...children)

  return el
}

type Dropdown = HTMLDivElement & ToCodeAble & { selected_el: HTMLElement }

// options is { selected_el: el }
function make_dropdown(sync_editor_and_output, els, options= { selected_el: undefined }) {
  let dropdown = document.createElement("div") as Dropdown
  dropdown.style.display = "inline-block"
  dropdown.style.position = "relative" // so we can position the open dropdown

  function set_dropdown(el) {
    dropdown.innerHTML = ""
    dropdown.selected_el = el
    dropdown.append(dropdown.selected_el, select_button)
  }

  function open_dropdown(ev) {
    let opened_dropdown = make_el("div", {}, {position: "absolute", "z-index":10, border: "solid 1px gray", boxShadow: "1px 1px 6px black"}, {}, Array.from(els).map(el => {
      return make_el("div", {class: "option"}, {background: "white", cursor: "pointer"}, {
        click: ev => {
          ev.stopPropagation();
          opened_dropdown.remove();
          set_dropdown(el);
          sync_editor_and_output();
        },
      }, [to_code(el)]);
    }));

    dropdown.prepend(opened_dropdown)
  }

  let select_button = make_el("span", {}, {cursor: "pointer"}, { click: open_dropdown }, ["▾"]);

  set_dropdown(options?.selected_el || els[0])

  dropdown.to_code = () => to_code(dropdown.selected_el)

  return dropdown
}

function arg_to_widget(sync_editor_and_output, code : string, arg_type, code_type, type_compatible_local_names : string[]) {
  const possible_widgets = arg_to_widgets(sync_editor_and_output, code, arg_type, code_type);

  for (const name of type_compatible_local_names) {
    if (!possible_widgets.some(widget => to_code(widget) === name)) {
      possible_widgets.push(make_el("span", {}, {}, {}, [name]))
    }
  }

  if (possible_widgets.length === 1) {
    return possible_widgets[0]
  } else {
    return make_dropdown(sync_editor_and_output, possible_widgets, { selected_el: possible_widgets.find(widget => to_code(widget) === code) })
  }
}

function arg_to_widgets(sync_editor_and_output, code : string, arg_type, code_type) : Node[] {
  console.log(code, arg_type)
  if (arg_type[".class"] === "UnionType") {
    const items = arg_type["items"]
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
      // let select = document.createElement("select") as HTMLSelectElement & ToCodeAble
      // select.innerHTML = items.map(type2 => {
      //   let isSelected = JSON.stringify(type2["value"]) === code;
      //   return `<option${isSelected ? " selected": ""}>${JSON.stringify(type2["value"])}</option>`;
      // }).join("")
      // select.addEventListener("click", ev => { ev.stopPropagation() });
      // select.addEventListener("change", ev => { sync_editor_and_output() });
      // select.to_code = function() { return this.value; };
      // return select
      return items.map(type2 => make_el("span", {}, {}, {}, [JSON.stringify(type2["value"])]))
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
      return [make_dial_and_num(sync_editor_and_output, code, step_per_px)]
    } else {
      let could_determine_given_code_type = false
      const item_widgets = items.map(item_type => {
        // console.log("comparing", item_type, code_type)
        if (equal_by_json(item_type, code_type)) { // should do this on the Python side with is_subtype
          could_determine_given_code_type = true;
          return arg_to_widget(sync_editor_and_output, code, item_type, code_type, [])
        } else {
          const [default_code, default_code_type] = default_code_and_code_type_for_type(item_type)
          return arg_to_widget(sync_editor_and_output, default_code, item_type, default_code_type, [])
        }
      })
      if (!could_determine_given_code_type) {
        item_widgets.unshift(arg_to_widget(sync_editor_and_output, code, {}, {}, []))
      }
      return item_widgets
    // } else {
      // return document.createTextNode(code);
    }
  } else if (arg_type === "builtins.float") {
    return [make_dial_and_num(sync_editor_and_output, code, 0.01)]
  } else {
    return [document.createTextNode(code)]
  }
}

function make_dial_and_num(sync_editor_and_output, code, change_per_px) {
  let decimal_places = Math.max(0, -Math.log(change_per_px))
  let dial_and_num = document.createElement('span')
  dial_and_num.innerHTML = dial_svg_html();
  let dial = dial_and_num.firstElementChild as HTMLElement & ToCodeAble;
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
      sync_editor_and_output();
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
      sync_editor_and_output();
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

// arg is { name:, kind:, code:, type:, code_type: }
// options is optional, default is { positional: false }
function make_arg_el(sync_editor_and_output, arg: Arg, options = { positional: false }) {
  const arg_el = document.createElement('span');
  if (arg.kind !== "ARG_POS") {
    const remove_button = document.createElement('span') as HTMLSpanElement & ToCodeAble;
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
      sync_editor_and_output();
    });
    arg_el.append(remove_button)
  }
  if (options?.positional) {
    arg_el.append(arg_to_widget(sync_editor_and_output, arg.code, arg.type, arg.code_type, arg.type_compatible_local_names));
  } else {
    arg_el.append(arg.name, "=", arg_to_widget(sync_editor_and_output, arg.code, arg.type, arg.code_type, arg.type_compatible_local_names));
  }
  return arg_el;
}

type ToCodeAble = { to_code: () => string }

type EllipsesEl = HTMLSpanElement & ToCodeAble & { hidden_arg_els: HTMLElement[] }

function make_ellipses_el(sync_editor_and_output, hidden_arg_els) {
  const ellipses_el = document.createElement('span') as EllipsesEl;
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
    sync_editor_and_output()
  })
  ellipses_el.title = "Show optional args: " + hidden_arg_els.map(to_code).join(", ")
  if (hidden_arg_els.length === 0) {
    ellipses_el.style.display = "none"
  }
  return ellipses_el;
}

// Sort by number of dots, then by total length.
function compare_qualified_names(name1, name2) {
  return name1.length + 100*name1.split(".").length - (name2.length +  + 100*name2.split(".").length);
}

function hide(elem) {
  elem.classList.add("hidden");
}

function show(elem) {
  elem.classList.remove("hidden");
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
// 2. Set `notebook_code_through_cell` variable in the kernel
// 3. Typecheck it in the kernel
//
// function infer_types_and_attach_widgets(snp_state) {
//   const { cell, snp_outer, inspector } = snp_state
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

//   let cell_lineno = notebook_code_before_cell.split("\n").length + 1

//   console.log({cell_lineno: cell_lineno})

//   snp_outer.addEventListener("mouseenter", () => {
//     snp_outer.querySelectorAll(".add_hint").forEach(show)
//   });

//   snp_outer.addEventListener("mouseleave", () => {
//     snp_outer.querySelectorAll(".add_hint").forEach(hide)
//   });

//   const callbacks = cell.get_callbacks();
//   const just_log  = { shell: { reply: console.log }, iopub: { output: console.log }};
//   let old_callback = callbacks.shell.reply;
//   callbacks.shell.reply = (msg) => {
//     if (msg.msg_type == "execute_reply" && msg.content.status == "ok" && msg.content.user_expressions.inferred.status == "ok") {
//       // console.log(msg.content.user_expressions.inferred)
//       const items = msg.content.user_expressions.inferred.data["application/json"];
//       const cell_items = items.filter(call_info => call_info.callee.pos.line >= cell_lineno);
//       console.log("cell items", cell_items);
//       // console.log(JSON.stringify(cell_items));

//       let loced_widgets = loced_widgets_from_code(cell_items, cell_lineno, cell.code_mirror, snp_state);

//       // console.log("loced_widgets", loced_widgets)

//       snp_state.hover_regions_svg().querySelectorAll('[data-loc]').forEach(hover_region => {
//         const [lineno, col_offset, end_lineno, end_col_offset] = JSON.parse(hover_region.dataset.pos);
//         const [shape_start_pos, shape_end_pos] = [ // CodeMirror locs
//           {line: lineno-1,     ch: col_offset},
//           {line: end_lineno-1, ch: end_col_offset}
//         ];

//         const { widget } = loced_widgets.find(({ start_pos, end_pos }) => equal_by_json([start_pos, end_pos], [shape_start_pos, shape_end_pos]))

//         if (widget) {
//           hover_region.addEventListener("click", ev => {
//             const first_shape = hover_region.querySelector("[stroke-width]")
//             if (snp_state.selected_shape == first_shape) {
//               deselect_all(snp_state);
//             } else {
//               deselect_all(snp_state);
//               select(snp_state, first_shape);
//               inspector.innerHTML = "";
//               snp_outer.appendChild(inspector);
//               inspector.appendChild(widget);
//             }
//             ev.stopPropagation();
//           });
//         }
//       });

//       snp_state.hover_regions_svg().querySelectorAll('[data-add-hint]:not([data-loc])').forEach(hover_region => {
//         let hint = document.createElement("div")
//         hint.style.display = "inline-block"
//         hint.style.borderRadius = "3px"
//         hint.style.fontSize = "10px"
//         hint.style.background = "#f4f4f4"
//         hint.style.border = "solid 1px #ddd"
//         hint.style.lineHeight = "normal"
//         hint.style.padding = "1px"
//         hint.style.cursor = "pointer"
//         hint.innerHTML = hover_region.dataset.addHint
//         hint.classList.add("add_hint")
//         hint.classList.add("remove_on_new_hover_regions")
//         snp_outer.appendChild(hint)
//         place_over_shape(snp_state, hover_region, hint)
//         hint.addEventListener("click", ev => {
//           // https://www.growingwiththeweb.com/2016/07/redirecting-dom-events.html
//           hover_region.dispatchEvent(new MouseEvent("click", ev))
//           ev.preventDefault()
//           ev.stopImmediatePropagation()
//         });
//         hide(hint)
//         // console.log(hint)
//       })

//       snp_state.hover_regions_svg().querySelectorAll('[data-new-methods]').forEach(hover_region => {
//         if (hover_region.dataset.pos) {
//           return;
//         }
//         const methods = JSON.parse(hover_region.dataset.newMethods)
//         if (methods.length === 0) {
//           return;
//         }

//         hover_region.addEventListener("click", ev => {
//           const first_shape = hover_region.querySelector("[stroke-width]")
//           if (snp_state.selected_shape == first_shape) {
//             deselect_all(snp_state);
//           } else {
//             deselect_all(snp_state);
//             select(snp_state, first_shape);
//             inspector.innerHTML = "";
//             snp_outer.appendChild(inspector);
//             // const method_types = JSON.parse(hover_region.dataset.methodTypes);
//             // let inspector_html = `<div>${hover_region.dataset.artistNames}</div>`
//             let cm = cell.code_mirror
//             let new_code_buttons = []
//             for (const method of methods) {
//               let method_type = method.method_type
//               // let arg_defaults = arg_defaults_from_callee_type(method_type);
//               // let str = method.method_name + "(" + arg_defaults.map(({ name, kind, code, type }) => kind === "ARG_POS" ? code : name + "=" + code).join(", ") + ")"
//               let line_count = cm.getValue().split("\n").length
//               let mark = cm.markText({ line: line_count - 2, ch: 0 }, { line: line_count - 2, ch: 0 }, { inclusiveRight: true, inclusiveLeft: true, clearWhenEmpty: false }); // insert at end, for now...
//               let shortest_name = Array.from(method.receiver_names).sort(compare_qualified_names)[0]
//               let arg_defaults = arg_defaults_from_callee_type(method_type);
//               let [required_positional_arg, required_keyword_args] = arg_defaults.filter(arg => arg.kind === "ARG_POS" || arg.kind === "ARG_NAMED" ).partition(arg => arg.kind === "ARG_POS");
//               let required_positional_arg_codes = required_positional_arg.map(arg => arg.code);
//               let required_keyword_arg_codes    = required_keyword_args.map(arg => `${arg.name}=${arg.code}`);
//               let new_code = `${shortest_name}.${method.method_name}(${required_positional_arg_codes.concat(required_keyword_arg_codes).join(",")})\n`;
//               // let widget = make_call_widget(method_type, [], [], `${shortest_name}.${method.method_name}`, cm, mark, snp_state)
//               // inspector_html += `<div>${method.receiver_names[0]}.${str}</div>`
//               let new_code_button = make_el("div", {}, {}, {
//                 click: ev => {
//                   const { from, to } = mark.find();
//                   // console.log(code)
//                   cm.replaceRange(new_code, from, to);
//                   hard_rerun(snp_state)
//                 }
//               }, [new_code])
//               new_code_buttons.push(new_code_button)
//             }
//             // Order by shortest method call first.
//             inspector.append(...new_code_buttons.sort((code1, code2) => compare_qualified_names(code1.innerText.match(/^[^\(]*/)[0], code2.innerText.match(/^[^\(]*/)[0])))
//             // inspector.innerHTML = inspector_html
//           }
//           // console.log(hovered_elems)
//           ev.stopPropagation();
//         });
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

function place_inspector(snp_state) {
  const shape = selected_shapes(snp_state).at(-1);
  const [max_width, max_height] = [snp_state.img.getBoundingClientRect().width, snp_state.img.getBoundingClientRect().height];
  const [top, left] = relativeTopLeft(shape, snp_state.snp_outer);
  snp_state.inspector.style = `
                position: absolute;
                top: ${Math.max(0, Math.min(top, max_height))}px;
                left: ${Math.max(0, Math.min(left + shape.getBoundingClientRect().width, max_width))}px;
                background: #eee;
                border: solid 1px #aaa;
              `.replace(/\n\s*/g, " ");
}

function place_over_shape(snp_state, shape, el) {
  const [plot_width, plot_height]   = [snp_state.img.getBoundingClientRect().width, snp_state.img.getBoundingClientRect().height];
  const shapeRect = relativeBoundingRect(shape, snp_state.snp_outer);
  const elRect = el.getBoundingClientRect();
  let top = shapeRect.top + shapeRect.height/2 - elRect.height/2
  let left = shapeRect.left + shapeRect.width/2 - elRect.width/2
  top = Math.max(0, Math.min(top, plot_height - elRect.height))
  left = Math.max(0, Math.min(left, plot_width - elRect.width))
  console.log("shapeRect", shapeRect)
  console.log("elRect", elRect)
  el.style.position = "absolute"
  el.style.top = `${top}px`
  el.style.left = `${left}px`
}

interface Arg {
  name: string;
  kind: string;
  code: string;
  type: any;
  code_type: any | undefined;
  type_compatible_local_names: string[];
}

function arg_defaults_from_callee_type(callee) : Arg[] {
  // console.log(callee)
  return callee.arg_names.map((arg_name, arg_i) => {
    const arg_kind = int_to_arg_kind[callee.arg_kinds[arg_i]];
    const arg_type = callee.arg_types[arg_i];
    // Since the function parameter could be a union type, we need to indicate which of the types the actual code is.
    let arg_default_code : string;
    let arg_default_type;
    if (callee.definition_arguments_default_code[arg_i]) {
      arg_default_code = callee.definition_arguments_default_code[arg_i];
      arg_default_type = undefined; // We don't know.
    } else {
      [arg_default_code, arg_default_type] = default_code_and_code_type_for_type(arg_type, arg_name);
    }

    return {
      name:                        arg_name,
      kind:                        arg_kind,
      code:                        arg_default_code,
      type:                        arg_type,
      code_type:                   arg_default_type,
      type_compatible_local_names: callee.arg_type_compatible_local_names[arg_i]
    };
  }).slice(callee.def_extras.first_arg !== undefined ? 1 : 0) // ignore first arg (self) if def_extras.first_arg is defined
}

function catalog_open_artists(snp_state) {
  open_artists_after_execute = (Array.from(snp_state.sidebar.children) as any[]).filter(el => el.open).map(el => el.artistName)
}

function hard_rerun(snp_state) {
  snp_state.busy = false;
  snp_state.cell.code_mirror.getAllMarks().forEach(mark => mark.clear());
  catalog_open_artists(snp_state)
  snp_state.cell.execute();
}

function make_call_widget(callee, given_positional_args : Arg[], given_keyword_args : Arg[], callee_code : string, code_mirror, mark, snp_state) {
  const widget = document.createElement("div");
  // widget.style.display = "inline-block";
  // widget.style.border = "solid gray 1px";

  let arg_defaults = arg_defaults_from_callee_type(callee);

  // const missing_positional_args = []
  const missing_positional_args = arg_defaults.
    slice(given_positional_args.length).
    takeWhile(arg => arg.kind === "ARG_POS"); // we could also look for arg.kind === "ARG_OPT" here, but optional positional args look nicer when given as keyword args

  const missing_keyword_args = arg_defaults.
    slice(given_positional_args.length).
    slice(missing_positional_args.length).
    filter(arg => !given_keyword_args.some(given_arg => given_arg.name === arg.name)).
    filter(arg => arg.kind !== "ARG_STAR2"); // ignore **kwargs

  let callee_el = document.createElement('span');
  callee_el.innerText = callee_code;
  widget.appendChild(callee_el);

  const sync_editor_and_output = function () {
    let { from, to } = mark.find();
    const code = to_code(widget);
    // console.log(code)
    code_mirror.replaceRange(code, from, to);
    ({ from, to } = mark.find());
    code_mirror.setSelection(from, to);
    snp_state && redraw_cell(snp_state);
  };

  let args_el = document.createElement('span');
  try {
    args_el.contentEditable = "plaintext-only";
  } catch (_) {
    args_el.contentEditable = "true"; // Firefox
  }

  let arg_els = [];

  arg_els.push(...given_positional_args.map(arg => make_arg_el(sync_editor_and_output, arg, { positional: true })));

  // if used for a new call, required args need to be generated
  let needed_positional_args = missing_positional_args.takeWhile(arg => arg.kind === "ARG_POS").map(arg => make_arg_el(sync_editor_and_output, arg, { positional: true }));

  arg_els.push(...needed_positional_args);

  let missing_optional_positional_arg_els = missing_positional_args.slice(needed_positional_args.length).map(arg => make_arg_el(sync_editor_and_output, arg, { positional: true }));

  arg_els.push(make_ellipses_el(sync_editor_and_output, missing_optional_positional_arg_els));

  arg_els.push(...given_keyword_args.map(arg => make_arg_el(sync_editor_and_output, arg)));

  let missing_keyword_arg_els = missing_keyword_args.map(arg => make_arg_el(sync_editor_and_output, arg));

  arg_els.push(make_ellipses_el(sync_editor_and_output, missing_keyword_arg_els));

  arg_els.forEach((arg_el, i) => {
    if (i !== 0 && typeof arg_el.hidden_arg_els === "undefined") { // no comma before first arg or ellipses
      args_el.append(", ");
    }
    args_el.appendChild(arg_el);
  });

  widget.append("(", args_el, ")");


  widget.addEventListener("keydown", ev => {
    ev.stopPropagation();
    if (/*ev.ctrlKey && */ev.code === "Enter") {
      deselect_all(snp_state);
      hard_rerun(snp_state);
    }
  });

  widget.addEventListener("keyup", ev => {
    ev.stopPropagation();
    sync_editor_and_output(); // Live update is one keypress behind if we attach this to keydown :/
  });

  widget.addEventListener("mousedown", ev => {
    ev.stopPropagation();
  });

  widget.addEventListener("click", ev => {
    ev.preventDefault();
    ev.stopImmediatePropagation();
  });

  return widget;
}

function loced_widget_from_code(call_info, cell_lineno, cm, snp_state) {
  const { call, callee, given_args } = call_info;

  function item_to_start_pos(item) {
    return { line: item.pos.line - cell_lineno, ch: item.pos.column };
  }
  function item_to_end_pos(item) {
    return { line: item.pos.end_line - cell_lineno, ch: item.pos.end_column };
  }

  const start_pos = item_to_start_pos(call);
  const end_pos = item_to_end_pos(call);
  const mark = cm.markText(start_pos, end_pos, {
    // replacedWith: widget,
    inclusiveRight: true,
    inclusiveLeft: true,
  });
  let callee_code = cm.getRange(item_to_start_pos(callee), item_to_end_pos(callee));

  let callee_has_self_arg = callee.def_extras.first_arg !== undefined

  let given_args2 : Arg[] = [];
  given_args.forEach((given_arg, arg_i) => {
    const arg_kind = int_to_arg_kind[given_arg.kind];
    const arg_i_at_func_def = given_arg["name"] ? callee.arg_names.indexOf(given_arg.name) : (callee_has_self_arg ? arg_i + 1 : arg_i);
    const arg_val_code = cm.getRange(item_to_start_pos(given_arg), item_to_end_pos(given_arg));
    given_args2.push({
      name: given_arg.name,
      kind: arg_kind,
      code: arg_val_code,
      type: callee.arg_types[arg_i_at_func_def],
      code_type: undefined,
      type_compatible_local_names: callee.arg_type_compatible_local_names[arg_i_at_func_def]
    });
  });

  // console.log("given_args2", given_args2)
  // console.log("callee.arg_names", callee.arg_names)

  const [given_positional_args, given_keyword_args] = given_args2.partition(arg => !arg.name);

  // console.log(arg_defaults.map(({name, code}) => `${name}=${code}`).join(", "))

  const widget = make_call_widget(callee, given_positional_args, given_keyword_args, callee_code, cm, mark, snp_state);

  return {
    start_pos: start_pos,
    end_pos: end_pos,
    mark: mark,
    method_name: (callee.name || "").split(" ")[0] || "", // "set_ylabel of _AxesBase" => "set_ylabel"
    call_info: call_info,
    widget: widget
  }
}

function loced_widgets_from_code(cell_items, cell_lineno, cm, snp_state) {
  return cell_items.map(call_info => loced_widget_from_code(call_info, cell_lineno, cm, snp_state))
}

// returns undefined or an array
// function tree_path(root, target) {
//   if (root === target) {
//     return []
//   }
//   for (let i = 0; i < root.children.length; i++) {
//     let deeper_path = tree_path(root.children[i], target);
//     if (deeper_path !== undefined) {
//       return [i].concat(deeper_path)
//     }
//   }
//   return undefined;
// }

// function el_by_path(root, path) {
//   if (path.length === 0) {
//     return root
//   }
//   const child = root.children[path[0]]
//   return child && el_by_path(child, path.slice(1))
// }

function replace_hover_regions(snp_state, new_svg_str) {
  let temp_el = document.createElement("div")
  temp_el.innerHTML = new_svg_str
  snp_state.hover_regions_svg().remove()
  snp_state.img.after(temp_el.children[0])

  // Now, transfer the selection and move the inspector.
  //
  // Selection preservation is non-trivial when the number of items changes.
  // In Sketch-n-Sketch, we simply used the linear shape number in the output.
  snp_state.canvas_selection && select(snp_state, snp_state.canvas_selection)

  snp_state.snp_outer.querySelectorAll(".remove_on_new_hover_regions").forEach(el => el.remove())
}

function redraw_cell(snp_state) {
  const { cell, img } = snp_state
  const codeExecuting = cell.get_text();
  if (snp_state.busy || codeExecuting === snp_state.last_cell_code_executed) { return; }
  snp_state.busy = true;
  snp_state.last_cell_code_executed = codeExecuting;
  snp_state.stdout_stderr.innerHTML = ""
  // console.log(`Executing: ${codeExecuting}`)
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
        // Display the error, but adjust line number for the lines we added to the top of the cell.
        snp_state.stdout_stderr.innerText += msg.content.evalue.replaceAll(/\b(line +)(\d+)/gi, (_, line_space, n_str) => `${line_space}${parseInt(n_str) - snp_state.provenance_is_off_by_n_lines}` );
        // console.log(msg.content.evalue)
      } else if (msg.header.msg_type === "stream") {
        snp_state.stdout_stderr.innerText += msg.content.text;
        // console.log(msg.content.text)
      } else {
        console.log(arguments)
      }
    }
    if (codeExecuting != cell.get_text()) {
      snp_state.busy = false;
      redraw_cell(snp_state);
    } else {
      snp_state.busy = false;
      // console.log(msg.content.data["image/svg+xml"])
      // Replace hover regions
      if (msg.header.msg_type === "execute_result" && msg.content.data["image/svg+xml"] && msg.content.data["application/json"]) {
        replace_hover_regions(snp_state, msg.content.data["image/svg+xml"])
        const json = msg.content.data["application/json"];
        snp_state.cell_lineno = json.cell_lineno
        snp_state.provenance_is_off_by_n_lines = json.provenance_is_off_by_n_lines
        attach_events_to_hover_regions(snp_state)
      }
      // infer_types_and_attach_widgets(snp_state);
    }
  };
  cell.kernel.execute(codeExecuting, callbacks, {silent: false, store_history: true, stop_on_error: true});
}


// <div class="snp_outer">
// <img src='...'> <!-- the plot -->
// <svg></svg> <!-- hover regions -->
// <style onload="attach_snp(this.closest('.snp_outer'))"></style> <!-- Just a way to run this code once the elements exist. -->
// </div>
function attach_snp(snp_outer, cell_lineno, provenance_is_off_by_n_lines, user_call_info, sidebar_stuff) {
  const cell_el = snp_outer.closest(".code_cell");
  const cell = Jupyter.notebook.get_cells().filter(cell => cell.element[0] === cell_el)[0];
  snp_outer.cell = cell

  // console.log("reattaching")
  // console.log(snp_outer);
  // console.log(cell_el);
  // console.log(cell);
  const hovered_elems = [];


  const snp_state = {
    hovered_elems: [],
    canvas_selection: undefined,
    cell: cell,
    busy: false,
    last_cell_code_executed: cell.get_text(),
    cell_lineno: cell_lineno,
    provenance_is_off_by_n_lines: provenance_is_off_by_n_lines,
    snp_outer: snp_outer,
    img: snp_outer.querySelector("img"),
    hover_regions_svg: () => snp_outer.querySelector("svg"),
    stdout_stderr: snp_outer.querySelector(".stdout_stderr"),
    inspector: document.createElement("div"),
    sidebar: document.createElement("div"),
    selectable_artists: sidebar_stuff.selectable_artists,
    methods: sidebar_stuff.methods,
    calls: sidebar_stuff.calls,
  }

  snp_outer.addEventListener("mouseenter", () => {
    snp_outer.querySelectorAll(".add_hint").forEach(show)
  });

  snp_outer.addEventListener("mouseleave", () => {
    snp_outer.querySelectorAll(".add_hint").forEach(hide)
  });

  const methods_to_place_on_canvas = build_sidebar(snp_state)

  attach_events_to_hover_regions(snp_state)


  function replace_to_avoid_overlap(el, avoid) {
    const el_rect = relativeBoundingRect(el, snp_outer);
    const avoid_el = avoid.find(avoid_el => {
      const avoid_rect = relativeBoundingRect(avoid_el, snp_outer);;
      return el_rect.left < avoid_rect.right && avoid_rect.left < el_rect.right && el_rect.top < avoid_rect.bottom && avoid_rect.top < el_rect.bottom
    })
    if (avoid_el) {
      el.style.top = relativeBoundingRect(avoid_el, snp_outer).bottom + 3 + "px"
      replace_to_avoid_overlap(el, avoid)
    }
  }

  const possible_targets = Array.from(snp_state.hover_regions_svg().querySelectorAll('[data-artist-names]') as any[]).filter(el => JSON.parse(el.dataset.artistNames).length > 0)
  const placed_methods = []
  methods_to_place_on_canvas.forEach(el => {
    const shape = possible_targets.find(shape => JSON.parse(shape.dataset.artistNames).includes(el.artistName))

    el.style.display = "inline-block";
    el.style.borderRadius = "3px";
    el.style.fontSize = "10px";
    el.style.background = "#f4f4f4";
    el.style.border = "solid 1px #ddd";
    el.style.lineHeight = "normal";
    el.style.padding = "1px";
    el.style.cursor = "pointer";
    el.classList.add("add_hint");
    el.classList.add("remove_on_new_hover_regions");

    snp_outer.appendChild(el)
    place_over_shape(snp_state, shape, el)

    replace_to_avoid_overlap(el, placed_methods)

    placed_methods.push(el)
  })

  // snp_state.hover_regions_svg().querySelectorAll('[data-add-hint]:not([data-loc])').forEach(hover_region => {
  //   let hint = document.createElement("div");
  //   hint.style.display = "inline-block";
  //   hint.style.borderRadius = "3px";
  //   hint.style.fontSize = "10px";
  //   hint.style.background = "#f4f4f4";
  //   hint.style.border = "solid 1px #ddd";
  //   hint.style.lineHeight = "normal";
  //   hint.style.padding = "1px";
  //   hint.style.cursor = "pointer";
  //   hint.innerHTML = hover_region.dataset.addHint;
  //   hint.classList.add("add_hint");
  //   hint.classList.add("remove_on_new_hover_regions");
  //   snp_outer.appendChild(hint);
  //   place_over_shape(snp_state, hover_region, hint);
  //   hint.addEventListener("click", ev => {
  //     // https://www.growingwiththeweb.com/2016/07/redirecting-dom-events.html
  //     hover_region.dispatchEvent(new MouseEvent("click", ev));
  //     ev.preventDefault();
  //     ev.stopImmediatePropagation();
  //   });
  //   hide(hint);
  //   // console.log(hint)
  // });


  if ("open_artists_after_execute" in window && open_artists_after_execute !== undefined) {
    (Array.from(snp_state.sidebar.children) as any[]).filter(el => open_artists_after_execute.includes(el.artistName)).forEach(el => el.open = true)
    delete window.open_artists_after_execute
  }
  if ("select_lineno_after_execute" in window) {
    snp_state.hover_regions_svg().querySelectorAll('[data-pos][data-func-code-and-num]').forEach(hover_region => {
      const [lineno, col_offset, end_lineno, end_col_offset] = JSON.parse(hover_region.dataset.pos);
      if (lineno-1-snp_state.provenance_is_off_by_n_lines === select_lineno_after_execute) {
        hover_region.dispatchEvent(new MouseEvent("click"))
      }
    })
    delete window.select_lineno_after_execute
  }

  // infer_types_and_attach_widgets(snp_state)
}

function shortest_qualified_name(names) {
  return names.sort(compare_qualified_names)[0];
}

function build_sidebar(snp_state) {
  const { sidebar, cell_lineno, cell : { code_mirror }, snp_outer, selectable_artists, methods, calls } = snp_state

  // console.log("sidebar stuff", {selectable_artists, methods, calls})
  // console.log("sidebar stuff", JSON.stringify({selectable_artists, methods, calls}))
  let methods_to_place_on_canvas = []

  selectable_artists.forEach(({id, names}) => {
    const artist_name = shortest_qualified_name(names)

    const artist_methods = methods.filter(method => method.show_on.includes(id))
    const artist_calls   = calls.filter(call => call.show_on.includes(id))

    const methods_called = []
    const call_widgets = artist_calls.map(call_info => {
      const { name, receiver, max_calls, func_code_and_num } = call_info
      const { widget, mark } = loced_widget_from_code(call_info, cell_lineno, code_mirror, snp_state)

      methods_called.push([receiver, name])

      const is_single_call = max_calls === 1

      const delete_code = ev => {
        const { from, to } = mark.find();
        // console.log(mark.find())
        code_mirror.replaceRange("", from, to);
        ev.stopImmediatePropagation();
        hard_rerun(snp_state);
      }

      widget.style.display = "inline-block"
      if (is_single_call) {
        return make_el("span", { funcCodeAndNum: func_code_and_num }, { display: "grid", gridTemplateColumns: "min-content 333px" }, {}, [ // span, not label, to force you to click the box itself to remove the element
          make_el("input", { type: "checkbox", checked: "true" }, { alignSelf: "start" }, { click: delete_code }, []),
          widget
        ])
      } else {
        return make_el("div", { funcCodeAndNum: func_code_and_num }, { display: "grid", gridTemplateColumns: "min-content 333px" }, {}, [
          make_el("span", { alignSelf: "start" }, {}, { click: delete_code }, ["❌"]),
          widget
        ])
      }
    })

    // names.includes("ax.yaxis.label") && console.log(methods_called)
    // names.includes("ax.yaxis.label") && console.log(artist_methods)

    const new_methods = []
    artist_methods.forEach(({ name, receiver, type, max_calls }) => {
      let receiver_name = shortest_qualified_name(selectable_artists.find(({ id }) => id === receiver).names || [""])

      let line_count = code_mirror.getValue().split("\n").length;
      let mark = code_mirror.markText({ line: line_count - 2, ch: 0 }, { line: line_count - 2, ch: 0 }, { inclusiveRight: true, inclusiveLeft: true, clearWhenEmpty: false }); // insert at end, for now...
      let arg_defaults = arg_defaults_from_callee_type(type);
      let [required_positional_arg, required_keyword_args] = arg_defaults.filter(arg => arg.kind === "ARG_POS" || arg.kind === "ARG_NAMED").partition(arg => arg.kind === "ARG_POS");
      let required_positional_arg_codes = required_positional_arg.map(arg => arg.code);
      let required_keyword_arg_codes = required_keyword_args.map(arg => `${arg.name}=${arg.code}`);
      let new_code = `${receiver_name}.${name}(${required_positional_arg_codes.concat(required_keyword_arg_codes).join(",")})\n`;
      let add_code = ev => {
        const { from, to } = mark.find();
        // console.log(code)
        code_mirror.replaceRange(new_code, from, to);
        select_lineno_after_execute = from.line;
        hard_rerun(snp_state);
      }
      let new_code_button = make_el("div", {}, { display: "inline-block" }, {}, [new_code]);

      let kids = []
      if (max_calls === 1) {
        if (methods_called.some(called => equal_by_json(called, [receiver, name]))) {
          return
        }
        kids = [
          make_el("label", {}, {}, {}, [
            make_el("input", { type: "checkbox" }, {}, {}, []),
            " ",
            new_code_button
          ])
        ]
      } else {
        kids = ["➕ add ", new_code_button]
      }

      // Hide receiver and args
      let method_canvas_text = kids.map(el => el.textContent).join("").trim().replace(/\([\S\s]*/, "").replace(/^.*\./, "")
      if (!method_canvas_text.startsWith("set_")) {
        method_canvas_text = "new " + method_canvas_text
      }

      // Heuristic for now: only keep the last button with the given name
      methods_to_place_on_canvas = methods_to_place_on_canvas.filter(method => method.innerText !== method_canvas_text)

      methods_to_place_on_canvas.push(make_el("div", { artistName: artist_name }, {}, { click: add_code }, [method_canvas_text]))

      new_methods.push(make_el("div", {}, { cursor: "pointer" }, { click: add_code }, kids))
    })
    // console.log(methods_to_place_on_canvas)

    sidebar.append(make_el("details", { artistName: artist_name }, {}, { toggle: ev => catalog_open_artists(snp_state) }, [
      make_el("summary", {}, { display: "list-item" }, {}, [artist_name]),
      ...call_widgets,
      ...new_methods
    ]))
  })

  sidebar.style.position = "absolute"
  sidebar.style.top      = "0"
  sidebar.style.left     =  `${snp_state.hover_regions_svg().getBoundingClientRect().width + 15}px`

  snp_state.hover_regions_svg().after(sidebar)

  return methods_to_place_on_canvas
}


function attach_events_to_hover_regions(snp_state) {
  // const { inspector, cell_lineno, cell, snp_outer } = snp_state
  // console.log(msg.content.user_expressions.inferred)
  // const cell_items = user_call_info.filter(call_info => call_info.callee.pos.line >= cell_lineno)
  // console.log("cell items", cell_items);
  // console.log(JSON.stringify(cell_items));
  // const loced_widgets = loced_widgets_from_code(cell_items, cell_lineno, cell.code_mirror, snp_state)

  // console.log("loced_widgets", loced_widgets);

  // Set origStrokeWidth on all elements
  snp_state.hover_regions_svg().querySelectorAll("[stroke-width]").forEach(drawable => drawable.dataset.origStrokeWidth = drawable.getAttribute("stroke-width"))

  snp_state.hover_regions_svg().querySelectorAll('[data-artist-names],[data-func-code-and-num]').forEach(hover_region => {
    const selection_key = shape_selection_key(hover_region)
    // console.log(selection_key)
    const sidebar_item = selected_sidebar_item(snp_state, selection_key)
    // console.log(sidebar_item)
    if (sidebar_item !== undefined) {
      hover_region.addEventListener("click", ev => {
        if (selected_shapes(snp_state).includes(hover_region)) {
          deselect_all(snp_state)
        } else {
          deselect_all(snp_state)
          select(snp_state, shape_selection_key(hover_region))
          // inspector.innerHTML = ""
          // snp_outer.appendChild(inspector)
          // inspector.appendChild(widget)
          // const { from, to } = mark.find()
          // cell.code_mirror.setSelection(from, to)
        }
        ev.stopPropagation()
      })

      hover_region.addEventListener("mouseleave", ev => {
        if (snp_state.canvas_selection !== undefined && equal_by_json(shape_selection_key(hover_region), snp_state.canvas_selection)) { return }
        const drawable = hover_region.querySelector("[stroke-width]");
        if (!drawable) { return }
        drawable.setAttribute("stroke-width", drawable.dataset.origStrokeWidth || "0")
      })

      hover_region.addEventListener("mouseenter", ev => {
        if (snp_state.canvas_selection !== undefined && equal_by_json(shape_selection_key(hover_region), snp_state.canvas_selection)) { return }
        hover_region.querySelector("[stroke-width]")?.setAttribute("stroke-width", "2.0")
      })
    }
  })

  // snp_state.hover_regions_svg().querySelectorAll('[data-pos]').forEach(hover_region => {
  //   const [lineno, col_offset, end_lineno, end_col_offset] = JSON.parse(hover_region.dataset.pos)
  //   const [shape_start_pos, shape_end_pos] = [
  //     { line: lineno - 1 - snp_state.provenance_is_off_by_n_lines, ch: col_offset },
  //     { line: end_lineno - 1 - snp_state.provenance_is_off_by_n_lines, ch: end_col_offset }
  //   ]

  //   // console.log("shape_loc", [shape_start_pos, shape_end_pos])
  //   const { widget, mark } = loced_widgets.find(({ start_pos, end_pos }) => equal_by_json([start_pos, end_pos], [shape_start_pos, shape_end_pos])) || { widget: undefined, mark: undefined }

  //   if (widget) {
  //     hover_region.addEventListener("click", ev => {
  //       if (selected_shapes(snp_state).includes(hover_region)) {
  //         deselect_all(snp_state)
  //       } else {
  //         deselect_all(snp_state)
  //         select(snp_state, shape_selection_key(hover_region))
  //         inspector.innerHTML = ""
  //         snp_outer.appendChild(inspector)
  //         inspector.appendChild(widget)
  //         const { from, to } = mark.find()
  //         cell.code_mirror.setSelection(from, to)
  //       }
  //       ev.stopPropagation()
  //     })
  //   }
  // })

  // snp_state.hover_regions_svg().querySelectorAll('[data-add-hint]:not([data-loc])').forEach(hover_region => {
  //   let hint = document.createElement("div");
  //   hint.style.display = "inline-block";
  //   hint.style.borderRadius = "3px";
  //   hint.style.fontSize = "10px";
  //   hint.style.background = "#f4f4f4";
  //   hint.style.border = "solid 1px #ddd";
  //   hint.style.lineHeight = "normal";
  //   hint.style.padding = "1px";
  //   hint.style.cursor = "pointer";
  //   hint.innerHTML = hover_region.dataset.addHint;
  //   hint.classList.add("add_hint");
  //   hint.classList.add("remove_on_new_hover_regions");
  //   snp_outer.appendChild(hint);
  //   place_over_shape(snp_state, hover_region, hint);
  //   hint.addEventListener("click", ev => {
  //     // https://www.growingwiththeweb.com/2016/07/redirecting-dom-events.html
  //     hover_region.dispatchEvent(new MouseEvent("click", ev));
  //     ev.preventDefault();
  //     ev.stopImmediatePropagation();
  //   });
  //   hide(hint);
  //   // console.log(hint)
  // });

  // snp_state.hover_regions_svg().querySelectorAll('[data-new-methods]').forEach(hover_region => {
  //   if (hover_region.dataset.pos) {
  //     return;
  //   }
  //   const methods = JSON.parse(hover_region.dataset.newMethods);
  //   if (methods.length === 0) {
  //     return;
  //   }

  //   hover_region.addEventListener("click", ev => {
  //     const first_shape = hover_region.querySelector("[stroke-width]");
  //     if (snp_state.selected_shape == first_shape) {
  //       deselect_all(snp_state);
  //     } else {
  //       deselect_all(snp_state);
  //       select(snp_state, first_shape);
  //       inspector.innerHTML = "";
  //       snp_outer.appendChild(inspector);
  //       // const method_types = JSON.parse(hover_region.dataset.methodTypes);
  //       // let inspector_html = `<div>${hover_region.dataset.artistNames}</div>`
  //       let cm = cell.code_mirror;
  //       let new_code_buttons = [];
  //       for (const method of methods) {
  //         let method_type = method.method_type;
  //         // let arg_defaults = arg_defaults_from_callee_type(method_type);
  //         // let str = method.method_name + "(" + arg_defaults.map(({ name, kind, code, type }) => kind === "ARG_POS" ? code : name + "=" + code).join(", ") + ")"

  //         let receiver_name = Array.from(method.receiver_names as string[]).sort(compare_qualified_names)[0];
  //         let new_code_button = make_new_code_button(cm, receiver_name, method.method_name, method_type, snp_state);
  //         new_code_buttons.push(new_code_button);
  //       }
  //       // Order by shortest method call first.
  //       inspector.append(...new_code_buttons.sort((code1, code2) => compare_qualified_names(code1.innerText.match(/^[^\(]*/)[0], code2.innerText.match(/^[^\(]*/)[0])));
  //       // inspector.innerHTML = inspector_html
  //     }
  //     // console.log(hovered_elems)
  //     ev.stopPropagation();
  //   });
  // });
}

// function make_new_code_button(cm, receiver_name: string, method_name: string, method_type, snp_state) {
//   let line_count = cm.getValue().split("\n").length;
//   let mark = cm.markText({ line: line_count - 2, ch: 0 }, { line: line_count - 2, ch: 0 }, { inclusiveRight: true, inclusiveLeft: true, clearWhenEmpty: false }); // insert at end, for now...
//   let arg_defaults = arg_defaults_from_callee_type(method_type);
//   let [required_positional_arg, required_keyword_args] = arg_defaults.filter(arg => arg.kind === "ARG_POS" || arg.kind === "ARG_NAMED").partition(arg => arg.kind === "ARG_POS");
//   let required_positional_arg_codes = required_positional_arg.map(arg => arg.code);
//   let required_keyword_arg_codes = required_keyword_args.map(arg => `${arg.name}=${arg.code}`);
//   let new_code = `${receiver_name}.${method_name}(${required_positional_arg_codes.concat(required_keyword_arg_codes).join(",")})\n`;
//   // let widget = make_call_widget(method_type, [], [], `${shortest_name}.${method.method_name}`, cm, mark, snp_state)
//   // inspector_html += `<div>${method.receiver_names[0]}.${str}</div>`
//   let new_code_button = make_el("div", {}, {}, {
//     click: ev => {
//       const { from, to } = mark.find();
//       // console.log(code)
//       cm.replaceRange(new_code, from, to);
//       select_lineno_after_execute = from.line;
//       hard_rerun(snp_state);
//     }
//   }, [new_code]);
//   return new_code_button;
// }

