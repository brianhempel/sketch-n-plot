// For development: Auto-reload test notebook when this file changes.
IS_DEVELOPMENT = true
function enable_autoreload() {
  if(!IS_DEVELOPMENT) { return; }

  // URLs relative to notebook webserver root.
  let paths_to_watch = [
    "/nbextensions/persistant_autocomplete_extension/main.js"
  ];

  let last_seen_versions = {};

  function handle_possible_change (path, latest_version) {
    if (!last_seen_versions[path]) {
      // console.log(path + "\n" + latest_version);
      last_seen_versions[path] = latest_version;
    } else if (last_seen_versions[path] != latest_version) {
      document.location.reload();
      return;
    }
    wait_and_check_for_changes(path);
  }

  function check_for_changes(path) {
    let request = new XMLHttpRequest();
    request.addEventListener("load", function () { handle_possible_change(path, this.responseText) });
    request.addEventListener("error", () => wait_and_check_for_changes(path));
    request.addEventListener("timeout", () => wait_and_check_for_changes(path));
    request.open("GET", path);
    request.send();
  }

  function wait_and_check_for_changes(path) {
    window.setTimeout(() => check_for_changes(path), 900);
  }

  paths_to_watch.forEach(check_for_changes);
}


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


define([
  'base/js/namespace',
  'services/kernels/kernel',
], function(
  Jupyter,
  Kernel
) {
  function load_ipython_extension() {
    enable_autoreload();
    console.log('Jupyter.notebook:', Jupyter.notebook);
    console.log('Jupyter.notebook.kernel:', Jupyter.notebook.kernel);

    const numeric_regex = /-?\d+/g;

    Jupyter.notebook.get_cells().filter(cell => cell.cell_type === "code").forEach(cell => {
      console.log(cell);
      let code_mirror = cell.code_mirror;
      let code = code_mirror.getValue()
      console.log(code);

      code_mirror.eachLine(line => {
        Array.from(line.text.matchAll(numeric_regex)).forEach(match => {
          // console.log(line.lineNo(), line.text, match.index)
          // console.log(match)

          let dial = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          // this is copy-pasted from dial.svg
          dial.innerHTML = `
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
          `;
          dial.setAttribute("viewBox", "0 0 14 14");
          dial.setAttribute("x", "0");
          dial.setAttribute("y", "0");
          dial.setAttribute("width", "14");
          dial.setAttribute("height", "14");
          dial.setAttribute("style", "vertical-align: middle; cursor: ns-resize");
          let angle = 3.14159 / 2;
          let r = 3;
          let changed = false;

          let nub = Array.from(dial.querySelectorAll("g")).find(elem => elem.querySelector("title")?.textContent === "nub")
          console.log(nub)
          console.log(nub.parentElement);

          const pos = {line: line.lineNo(), ch: match.index};
          const dialMark = cell.code_mirror.setBookmark(pos, {widget: dial});

          dial.addEventListener("mousedown", event => {
            let lastY  = event.screenY;
            let busy = false;

            let redraw = () => {
              const valueBeingExecuted = getNum();
              if (busy) { return; }
              busy = true;
              // Hacktastic way to get live feedback
              const callbacks = cell.get_callbacks();
              callbacks.iopub.output = function() {
                cell.clear_output();
                const ret = cell.output_area.handle_output.apply(cell.output_area, arguments);
                busy = false;
                if (valueBeingExecuted !== getNum()) { redraw(getNum()); }
                return ret;
              };
              cell.kernel.execute(cell.get_text(), callbacks, {silent: true, store_history: false, stop_on_error: true});
            }

            console.log(event)
            let stopDrag = event => {
              document.body.removeEventListener("mousemove", moveDial);
              document.body.removeEventListener("mouseup", stopDrag);
              redraw();
            };
            let moveDial = event => {
              event.preventDefault();

              const num = getNum();

              const delta = -(event.screenY - lastY);
              lastY = event.screenY;

              code_mirror.replaceSelection("" + (num + delta), "around")

              angle += delta * 0.1;
              nub.setAttribute("transform", `translate(${Math.cos(angle)*r} ${-Math.sin(angle)*r + r})`)
              // console.log(nub)

              redraw();
            };

            let startPos = dialMark.find();
            let line_str = code_mirror.getLine(startPos.line);
            let match = Array.from(line_str.matchAll(numeric_regex)).find(match => match.index === startPos.ch)
            let endPos  = {line: startPos.line, ch: match.index + match[0].length}

            code_mirror.setSelection(startPos, endPos);
            document.body.addEventListener("mousemove", moveDial);
            document.body.addEventListener("mouseup", stopDrag);

            let getNum = () => parseFloat(code_mirror.getSelection())
          })

        })
      });
    });

//     Jupyter.notebook.kernel.execute(`
// import ast
// import astor
// import json
// `,  {
//       shell : {
//           reply : function(msg) {
//               // console.log(msg);
//               if (msg.content.status === 'error') {
//                   // handle error
//                   console.error('asdfasdf', code);
//               } else {
//                   // status is OK
//                   console.log(msg.content.user_expressions.hi);
//               }
//           } //execute_reply_callback,
//         }
//     }, {
//       silent : true,
//       user_expressions : { hi : 'json.dumps(astor.dump_tree(ast.parse("ax.set_title()")))'},
//       allow_stdin : false
//     });
  }

  return {
      load_ipython_extension: load_ipython_extension
  };
});