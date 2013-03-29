cat \
    ../webcl-kernelcontext/kernelcontext.js \
    crowdcl.js \
    crowdclient.js \
    problems/$1.js \
> problems/$1.min.js
java -jar yuicompressor-2.4.7.jar -o problems/$1.min.js problems/$1.min.js
