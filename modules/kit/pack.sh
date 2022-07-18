#!/bin/bash


mkdir -p pack/dist
cp -r dist/src pack/dist
cp package.json pack
cd pack
a=$(npm --quiet info bigband-kit version)
sed  -i 's/"version": "1.0.0"/"version": "'$a'"/' package.json 
npm version patch
cat package.json 
npm publish

