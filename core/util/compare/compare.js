var compareHashes = require('./compare-hash');
var compareResemble = require('./compare-resemble');
var storeFailedDiff = require('./store-failed-diff.js');

process.on('message', compare);

function compare (data) {
  var { referencePath, testPath, resembleOutputSettings, pair } = data;
  const resembleOptions = {
    ignore: 'nothing',
    output: resembleOutputSettings
  }
  var promise = compareHashes(referencePath, testPath)
    .catch(() => compareResemble(referencePath, testPath, pair.misMatchThreshold, resembleOptions, pair.requireSameDimensions));
  promise
    .then(function (data) {
      pair.diff = data;
      pair.status = 'pass';
      return sendMessage(pair);
    })
    .catch(function (data) {
      pair.diff = data;
      pair.status = 'fail';

      return storeFailedDiff(testPath, data).then(function (compare) {
        pair.diffImage = compare;
        return sendMessage(pair);
      });
    });
}

function sendMessage (data) {
  process.send(data);
}
