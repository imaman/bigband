#!/bin/bash

set -e
dir=`dirname $(readlink -f "$0")`

rm -rf "$dir/node_modules/@servicemix"
tsc --rootDir "$dir/../src/runtime" --outDir "$dir/node_modules/@servicemix/runtime" "$dir/../src/runtime/Instrument.ts"



