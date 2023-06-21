notebook:
	jupyter notebook

watch:
	npx tsc --watch

snp.js: snp.ts
	npx tsc

install_notebook_extension:
  # you may need to add --user
	jupyter nbextension install --debug --overwrite --symlink $(CURDIR)/snp_nbextension
	make enable_notebook_extension

enable_notebook_extension:
  # you may need to add --user
	jupyter nbextension enable --debug snp_nbextension/ext

disable_notebook_extension:
	# USE THIS DISABLE COMMAND, NOT UNINSTALL
	# UNINSTALL WILL DELETE THE LOCAL FILES HERE BECAUSE THEY ARE SYMLINKED
  # you may need to add --user
	jupyter nbextension disable snp_nbextension/ext

clean_all:
	rm -rf python-type-stubs-main
	rm snp.js snp.js.map snp.d.ts

setup: clean_all
	# install npm first, then:
	npm install --save-dev typescript
	curl -L https://github.com/microsoft/python-type-stubs/archive/refs/heads/main.zip > python-type-stubs-main.zip
	unzip python-type-stubs-main.zip
	rm python-type-stubs-main.zip
	make install_notebook_extension

