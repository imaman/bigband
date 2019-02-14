#!/bin/bash

set -e
dir=`dirname $(readlink -f "$0")`

cd $dir

example/setup.sh  && tsc && node build/src/cli.js ship --bigband-file example/bigband.config.ts  --runtime-dir example/node_modules/@bigband --rig  prod-major

