const core = require('@actions/core');
const minimatch = require('minimatch');
const parse = require('lcov-parse');

function run() {
  const lcovPath = core.getInput('path');
  const minCoverage = core.getInput('min_coverage');
  const excluded = core.getInput('exclude');
  const excludedFiles = excluded.split(' ');

  parse(lcovPath, (_, data) => {
    if (typeof data === 'undefined') {
      core.setFailed('parsing error!');
      return;
    }

    const linesMissingCoverage = [];

    let totalFinds = 0;
    let totalHits = 0;
    data.forEach((element) => {
      if (shouldCalculateCoverageForFile(element['file'], excludedFiles)) {
        totalFinds += element['lines']['found'];
        totalHits += element['lines']['hit'];

        for (const lineDetails of element['lines']['details']) {
          const hits = lineDetails['hit'];

          if (hits === 0) {
            const fileName = element['file'];
            const lineNumber = lineDetails['line'];
            linesMissingCoverage[fileName] =
              linesMissingCoverage[fileName] || [];
            linesMissingCoverage[fileName].push(lineNumber);
          }
        }
      }
    });
    const coverage = (totalHits / totalFinds) * 100;
    const isValidBuild = coverage >= minCoverage;
    if (!isValidBuild) {
      const linesMissingCoverageByFile = Object.entries(
        linesMissingCoverage
      ).map(([file, lines]) => {
        return `${file}: ${lines.join(', ')}`;
      });

      core.setFailed(
        `${coverage} is less than min_coverage ${minCoverage}\n\n` +
          'Lines not covered:\n' +
          linesMissingCoverageByFile.map((line) => `  ${line}`).join('\n')
      );

      core.setOutput(
        'coverage_msg',
        `Coverage of ${coverage}% is less than expected ${minCoverage}%`
      );
    } else {
      core.setOutput(
        'coverage_msg',
        `Coverage of ${coverage}% is greater than or equal to expected ${minCoverage}%`
      );
    }
  });
}

function shouldCalculateCoverageForFile(fileName, excludedFiles) {
  for (let i = 0; i < excludedFiles.length; i++) {
    const isExcluded = minimatch(fileName, excludedFiles[i]);
    if (isExcluded) {
      core.debug(`Excluding ${fileName} from coverage`);
      return false;
    }
  }
  return true;
}

run();
