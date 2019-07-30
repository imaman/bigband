# Bigband

This mono-repo is organizaed as follows:
- [packages/cli](packages/cli): defines [npm/bigband](https://www.npmjs.com/package/bigband) which is the user-facing component (that is: the CLI) of the Bigband system
- [packages/core](packages/core): defines [npm/bigband-core](https://www.npmjs.com/package/bigband-core) which offers APIs for configuring a bigband and for developing labmda functions using Bigband
- [packages/lambda](packages/lambda): defines [npm/bigband-lambda](https://www.npmjs.com/package/bigband-lambda) which offers APIs, available at runtime, for bigband-driven lambda functions
- [packages/kit](packages/core): defines [npm/bigband-kit](https://www.npmjs.com/package/bigband-kit). A standard library of Bigband instruments
- [packages/example](packages/core): a mini Bigband app, for dev. purposes


