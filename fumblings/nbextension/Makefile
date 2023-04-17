backend_run:
	npm run backend_run

notebook:
	jupyter notebook

backend_repl:
	npm run backend_repl

enable_notebook_widgets:
	jupyter nbextension enable --debug persistant_autocomplete_extension/main

disable_notebook_widgets:
	jupyter nbextension disable persistant_autocomplete_extension/main

clean_all:
	rm -rf pyright-1.1.298 python-type-stubs-main node_modules build

setup: clean_all
	# install npm first, then:
	curl -L https://github.com/microsoft/pyright/archive/refs/tags/1.1.298.tar.gz | tar -zxf -
	cd pyright-1.1.298/packages/pyright-internal && npm install && npx tsc --declaration --preserveConstEnums
	npm install
	curl -L https://github.com/microsoft/python-type-stubs/archive/refs/heads/main.zip > python-type-stubs-main.zip
	unzip python-type-stubs-main.zip
	rm python-type-stubs-main.zip
	jupyter nbextension install --debug --overwrite --symlink $(CURDIR)/persistant_autocomplete_extension
	# If you are ever tempted to run "jupyter nbextension uninstall", know that it will follow the symlink and will delete the persistant_autocomplete_extension folder in this project. Not what you want.
	# Run "make disable_notebook_widgets" instead.
	make enable_notebook_widgets
