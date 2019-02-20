#!/bin/bash

set -e
dir=`dirname $(readlink -f "$0")`

cd $dir

if [ "$#" == "0" ]; then
    commandArg="ship"
else 
    commandArg="$1"
    shift 1
fi

npm run build
cd build
tar cf bigband.tar src

cd ../example
npm update bigband

node node_modules/.bin/bigband "${commandArg}" "$1" "$2" "$3" "$4"


