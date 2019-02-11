const semver = require('semver');
const { execFile } = require('child_process');


function runProgram(command, args) {
    // We do not use utils.Promisify() nor Bluebird.fromCallback() as we do want to retrain stdout even if the exit
    // code is 1. Specifically, "npm audit" exits with 1 whenever it detects a vulnurability regardless of its
    // seveirty. This does not work for our use case where we want to break the gulp invocation only if the severity is
    // above some configurable threshold. 
    //
    // It is possible to pass "--audit-level=<severity>" to "npm audit" but this complicates the code here as npm audit
    // will still output *all* vulnurabilities (where we want to display only the ones that are >= the threshold) so
    // output filtering on our side is still needed (and it will be fragile as the list of legal severity values will
    // have to be defined by means of copy-pasting).
    //
    // Believe, me I tried.

    return new Promise(resolve => execFile(command, args, {maxBuffer: 10 * 1024 * 1024}, (err, stdout, stderr) => {
        resolve({exitCode: err ? err.code : 0, stdout, stderr});
    }));
}

function analyse(ignoredSeverities, report) {
    const foundProblems = Object.keys(report.advisories)
        .map(k => report.advisories[k])
        .map(curr => ({severity: curr.severity, url: curr.url, title: curr.title, module_name: curr.module_name}))
        .filter(curr => ignoredSeverities.indexOf(curr.severity) < 0);

    if (foundProblems.length) {
        console.error(JSON.stringify(foundProblems, null, 2));
        throw new Error(`Your security audit came back negative (volnurabilities found: ${foundProblems.length}). For a full report run 'npm audit'.`);
    }
}

function audit(severityLevelsToIgnore) {
    return Promise.resolve()
        .then(() => runProgram('npm', ['--version']))
        .then(data => {
            if (data.exitCode !== 0) {
                throw new Error(`npm --version failed (exit code=${data.exitCode}):\n${data.stderr}`);
            }
            const minVersion = '6.0.0'
            if (semver.lte(data.stdout, minVersion)) {
                throw new Error(`You are using npm v${semver.clean(data.stdout)}, but npm >= v${minVersion} is required`);
            }
        })
        .then(() => runProgram('npm', ['audit', '--json']))
        .then(data => {
            if (data.stderr.length) {
                throw new Error(`npm audit failed (exit code=${data.exitCode}):\n${data.stderr}`);
            }

            return analyse(severityLevelsToIgnore, JSON.parse(data.stdout));
        });
}

if (require.main === module) {
    audit([]);
}