import {LambdaInstrument} from 'bigband';

export function newErrorSink(packageName: string, name: string) {
    const props = {
        Description: "Track error reports",
        MemorySize: 1024,
        Timeout: 17,
        ReservedConcurrentExecutions: 1
    };
    return new LambdaInstrument(packageName, name, 'lib/errorSinkController', props).fromNpmPackage('bigband-kit');
}

