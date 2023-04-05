notebook:
	jupyter notebook

clean_all:
	rm -rf python-type-stubs-main

setup: clean_all
	# install npm first, then:
	curl -L https://github.com/microsoft/python-type-stubs/archive/refs/heads/main.zip > python-type-stubs-main.zip
	unzip python-type-stubs-main.zip
	rm python-type-stubs-main.zip
