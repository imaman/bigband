#!/bin/bash

set -e
dir=`dirname $(readlink -f "$0")`

cd $dir

example/setup.sh  && tsc && node build/src/cli.js ship --mix-file example/bigband.spec.ts  --runtime-dir example/node_modules/@servicemix --rig  prod-major

