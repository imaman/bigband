import {LambdaInstrument} from 'bigband';

export function newErrorSink(packageName: string, name: string) {
    return new LambdaInstrument(packageName, name, 'lib/errorSinkController', {}).fromNpmPackage('bigband-kit');
}

