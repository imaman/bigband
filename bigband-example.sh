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
    echo "no args"
    commandArg="ship"
else 
    commandArg="$1"
    echo "commandArg=$commandArg"
    shift 1
    echo "all args=$*"
fi

npm run build
cd example
node -r ts-node/register ${debugArgs} ../src/cli.ts "${commandArg}" "$1" "$2" "$3" "$4" "$5" "$6" 
