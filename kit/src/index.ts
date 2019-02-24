import {LambdaInstrument} from 'bigband-core';

export function newErrorSink(packageName: string, name: string) {
    const props = {
        Description: "Track error reports",
        MemorySize: 1024,
        Timeout: 15,
        ReservedConcurrentExecutions: 1
    };
    return new LambdaInstrument(packageName, name, 'lib/errorSinkController', props)
        .fromNpmPackage('bigband-kit');
}

export function newLogSampler(packageName: string, name: string) {
    const props = {
        Description: "Track logs messages by buckets",
        MemorySize: 1024,
        Timeout: 15,
        ReservedConcurrentExecutions: 1
    };
    return new LambdaInstrument(packageName, name, 'lib/logSamplerController', props)
        .fromNpmPackage('bigband-kit')
        .invokeEveryMinutes(5);
}

export {LogSamplerFetchRequest, LogSamplerStoreRequest} from './logSamplerController';