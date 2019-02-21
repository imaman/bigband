#!/bin/bash

set -e
dir=`dirname $(readlink -f "$0")`

cd $dir

debugArgs=""
if [ "$1" == "--d" ]; then
    debugArgs="--inspect --inspect-brk"
    shift 1
fi

if [ "$#" == "0" ]; then
    commandArg="ship"
else 
    commandArg="$1"
    shift 1
fi

npm run build

cd ../example
node  ${debugArgs} ../core/lib/cli.js "${commandArg}" "$1" "$2" "$3" "$4" "$5" "$6" 
