notebook:
	jupyter notebook

watch:
	npx tsc --watch

snp.js: snp.js
	npx tsc

clean_all:
	rm -rf python-type-stubs-main
	rm snp.js snp.js.map snp.d.ts

setup: clean_all
	# install npm first, then:
	npm install --save-dev typescript
	curl -L https://github.com/microsoft/python-type-stubs/archive/refs/heads/main.zip > python-type-stubs-main.zip
	unzip python-type-stubs-main.zip
	rm python-type-stubs-main.zip
