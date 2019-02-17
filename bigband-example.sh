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

example/setup.sh  && tsc && node  build/src/cli.js  "${commandArg}" \
    --bigband-file example/bigband.config.ts  \
    --runtime-dir example/node_modules/@bigband "$1" "$2" "$3" "$4"

