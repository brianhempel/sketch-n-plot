// For now, this is just the stuff that needs to happen on page load.
//
// The bulk of SNP's functionality is in snp.ts and snp.py a the project root.






// For development: Auto-reload test notebook when this file changes.
IS_DEVELOPMENT = true
function enable_autoreload() {
  if(!IS_DEVELOPMENT) { return; }

  // URLs relative to notebook webserver root.
  let paths_to_watch = [
    "/nbextensions/snp_nbextension/ext.js"
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
  IPython,
  Kernel
) {

  // returns [cell_lineno, notebook_code_through_cell]
  //
  // Finds the cell by the cell_code. If there are duplicate cells, goes up through the duplicate.
  function get_notebook_code_through(cell_code) {
    const code_cells = Jupyter.notebook.get_cells().filter(cell => cell.cell_type === "code")

    const code_cells_through_cell = code_cells.slice(0, 1 + code_cells.findLastIndex(cell => cell.get_text() === cell_code));
    const code_cells_before_cell  = code_cells_through_cell.slice(0,-1)

    function is_not_magic(code) {
      return !code.startsWith("%%");
    }

    const notebook_code_before_cell =
      code_cells_before_cell.
          map(cell => cell.get_text()).
          filter(is_not_magic).
          join("\n");

    const notebook_code_through_cell = `${notebook_code_before_cell}\n${cell_code}`;

    const cell_lineno = notebook_code_before_cell.split("\n").length + 1

    return [cell_lineno, notebook_code_through_cell]
  }

  function load_ipython_extension() {
    enable_autoreload();
    console.log('Jupyter.notebook:', Jupyter.notebook);
    console.log('Jupyter.notebook.kernel:', Jupyter.notebook.kernel);

    // Add provenance_is_off_by_n_lines, cell_lineno, cell_code, and notebook_code_through_cell to the Python env before each cell is executed.
    IPython.notebook.kernel.events.on("execution_request.Kernel", function (ev, {kernel, content}) {
      const cell_code = content.code;

      const [cell_lineno, notebook_code_through_cell] = get_notebook_code_through(cell_code)

      // console.log({cell_lineno: cell_lineno})

      content.code = `provenance_is_off_by_n_lines = 4\ncell_lineno = ${cell_lineno}\ncell_code = ${JSON.stringify(cell_code)}\nnotebook_code_through_cell = ${JSON.stringify(notebook_code_through_cell)}\n${content.code}`

      // console.log("execution_request.Kernel", content);
    });

  }

  return {
      load_ipython_extension: load_ipython_extension
  };
});