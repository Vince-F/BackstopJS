const path = require('path');
const fs = require('fs');

var Reporter = require('./../Reporter');
const logger = require('./../logger')('compare');
var storeFailedDiffStub = require('./store-failed-diff-stub.js');
const WorkerPool = require("../workerPool");

const ASYNC_COMPARE_LIMIT = 20;

function comparePair (pair, report, config, compareConfig, workerPool) {
  var Test = report.addTest(pair);

  var referencePath = pair.reference ? path.resolve(config.projectPath, pair.reference) : '';
  var testPath = pair.test ? path.resolve(config.projectPath, pair.test) : '';

  // TEST RUN ERROR/EXCEPTION
  if (!referencePath || !testPath) {
    var MSG = `${pair.msg}: ${pair.error}. See scenario – ${pair.scenario.label} (${pair.viewport.label})`;
    Test.status = 'fail';
    logger.error(MSG);
    pair.error = MSG;
    return Promise.resolve(pair);
  }

  // REFERENCE NOT FOUND ERROR
  if (!fs.existsSync(referencePath)) {
    // save a failed image stub
    storeFailedDiffStub(testPath);

    Test.status = 'fail';
    logger.error('Reference image not found ' + pair.fileName);
    pair.error = 'Reference file not found ' + referencePath;
    return Promise.resolve(pair);
  }

  if (!fs.existsSync(testPath)) {
    Test.status = 'fail';
    logger.error('Test image not found ' + pair.fileName);
    pair.error = 'Test file not found ' + testPath;
    return Promise.resolve(pair);
  }

  if (pair.expect) {
    const scenarioCount = compareConfig.testPairs.filter(p => p.label === pair.label && p.viewportLabel === pair.viewportLabel).length;
    if (scenarioCount !== pair.expect) {
      Test.status = 'fail';
      const error = `Expect ${pair.expect} images for scenario "${pair.label} (${pair.viewportLabel})", but actually ${scenarioCount} images be found.`;
      logger.error(error);
      pair.error = error;
      return Promise.resolve(pair);
    }
  }

  var resembleOutputSettings = config.resembleOutputOptions;
  return compareImages(referencePath, testPath, pair, resembleOutputSettings, Test, workerPool);
}

function compareImages (referencePath, testPath, pair, resembleOutputSettings, Test, workerPool) {
  return workerPool.run({
    referencePath: referencePath,
    testPath: testPath,
    resembleOutputSettings: resembleOutputSettings,
    pair: pair
  })
    .then((data) => {
      Test.status = data.status;
      pair.diff = data.diff;

      if (data.status === 'fail') {
        pair.diffImage = data.diffImage;
        logger.error('ERROR { requireSameDimensions: ' + (data.requireSameDimensions ? 'true' : 'false') + ', size: ' + (data.isSameDimensions ? 'ok' : 'isDifferent') + ', content: ' + data.diff.misMatchPercentage + '%, threshold: ' + pair.misMatchThreshold + '% }: ' + pair.label + ' ' + pair.fileName);
      } else {
        logger.success('OK: ' + pair.label + ' ' + pair.fileName);
      }

      return data;
    });
}

module.exports = function (config) {
  var compareConfig = require(config.tempCompareConfigFileName).compareConfig;

  var report = new Reporter(config.ciReport.testSuiteName);
  var asyncCompareLimit = config.asyncCompareLimit || ASYNC_COMPARE_LIMIT;
  const workerPool = new WorkerPool(require.resolve('./compare'), asyncCompareLimit);
  report.id = config.id;

  return Promise.all(compareConfig.testPairs.map((pair) => {
    return comparePair(pair, report, config, compareConfig, workerPool);
  }))
    .then(() => report)
    .catch((e) => logger.error('The comparison failed with error: ' + e))
    .finally(() => { workerPool.killAllWorkers(); });
};
