
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
}

function relativeTopLeft(el, container) {
  const {top,        left,      } = el.getBoundingClientRect();
  const {top: top0,  left: left0} = container.getBoundingClientRect();

  console.log(el.getBoundingClientRect());
  console.log(container.getBoundingClientRect());

  return [
    top - top0,
    left - left0
  ]
}

// <div class="snp_outer">
// <img src='{}' onload="attach_snp(this)">
// </div>
function attach_snp(img) {
  let snp_outer = img.closest(".snp_outer");
  let cell_el = snp_outer.closest(".code_cell");
  let cell = Jupyter.notebook.get_cells().filter(cell => cell.element[0] === cell_el)[0];
  console.log("hi")
  console.log(snp_outer);
  console.log(cell_el);
  console.log(cell);
  let hovered_elems = [];

  const inspector = document.createElement("div");
  let snp_state = {
    hovered_elems: [],
    selected_shape: undefined,
    inspector: inspector,
  }
  snp_outer.snp_state = snp_state

  snp_outer.querySelectorAll('[data-artist]').forEach(el => {
    let title = el.dataset.artist + el.dataset.names
    el.addEventListener("mouseenter", ev => {
      el.classList.add("hovered")
      hovered_elems.addAsSet(title)
      console.log("mouseenter")
      console.log(hovered_elems)
    });
    el.addEventListener("mouseleave", ev => {
      hovered_elems.removeAsSet(title)
      el.classList.remove("hovered")
      console.log("mouseleave")
      console.log(hovered_elems)
    });
    el.addEventListener("click", ev => {
      console.log("click");
      const first_shape = el.querySelector("[stroke-width]")
      if (snp_state.selected_shape == first_shape) {
        deselect_all(snp_state);
      } else {
        deselect_all(snp_state);
        select(snp_state, first_shape);
        // START HERE: pop open a code box that edits the data-loc code
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
          console.log(linked);
          const chunkCM = CodeMirror(inspector);
          chunkCM.swapDoc(linked);
          linked.setSelection(from, to);
          chunkCM.focus();
          // console.log(chunkCM);

          inspector.addEventListener("keydown", ev => {
            if (ev.ctrlKey && ev.code === "Enter") {
              cell.execute();
            } else {
              let busy = false;
              function redraw() {
                const codeExecuting = cell.get_text();
                if (busy) { return; }
                busy = true;
                // Hacktastic way to get live feedback
                const callbacks = cell.get_callbacks();
                callbacks.iopub.output = function(msg) {
                  if (msg.header.msg_type === "execute_result" && msg.content.data["image/png"]) {
                    // cell.clear_output();
                    img.src = "data:image/png;base64," + msg.content.data["image/png"];
                    busy = false;
                    if (codeExecuting !== cell.get_text()) { redraw(); }
                  } else {
                    // console.log(arguments);
                    // cell.output_area.handle_output.apply(cell.output_area, [msg]);
                    busy = false;
                  }
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