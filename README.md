# Sketch-n-Plot

A in-notebook bidirectional GUI for Matplotlib. Edit your plot with mouse or code or both!

## Todo

- [ ] make a trivial notebook widget
  easy, define `__repr_html__`:
  
  ```python
  class Obj():
    def _repr_html_(self):
      return "<b id='asdf'>bold</b><script>console.log('hi'); console.log(document.body.innerText); document.querySelector('#asdf').innerHTML = 'new';</script>"
      # return { "text/html": "<b><script>alert('hi');</script>bold</b>" }
  
  Obj()
  ```
  
  
  
  - [ ] read/write cell contents
    okay, so this isn't so hard in Jupyter w/ Javascript (the JS could be part of the HTML response above):
  
    ```
    %%javascript
    console.log(IPython.notebook.notebook_name)
    console.log(Jupyter.notebook.get_cells())
    ```
  
    but in VS Code we are stuck. *If* we have the file name, we can get its contents with:
  
    ```python
    import IPython
    IPython.get_ipython().find_user_code("Test.ipynb")
    ```
  
    BUT obtaining the file name is non-trivial. The output is in an iframe—the filename is inaccessible in the DOM. Need an extension or some hacktastic solution (could look for a unique random token in the file on disk). For an extension, start here:
    https://github.com/microsoft/vscode/blob/59010bb41b044c0efcbba15fe862a6d7777cddb7/src/vs/workbench/contrib/notebook/browser/contrib/cellCommands/cellCommands.ts
    "Nbextensions also have a mechanism for running your code on page load. This can be set using the install-nbextension command." maybe this is also a hook we can exploit? https://ipywidgets.readthedocs.io/en/stable/examples/Widget%20Low%20Level.html#Static-assets
  
    
  
- [ ] make a trivial matplotlib backend

- [ ] make a trivial matplotlib backend that makes a trivial notebook widget

 