var compareImages = require('resemblejs/compareImages');
const fs = require("fs");

module.exports = function (referencePath, testPath, misMatchThreshold, resembleOptions, requireSameDimensions) {
  return new Promise(async function (resolve, reject) {
    const data = await compareImages(
      fs.readFileSync(referencePath),
      fs.readFileSync(testPath),
      resembleOptions
    );

    if ((requireSameDimensions === false || data.isSameDimensions === true) && 
      data.misMatchPercentage <= misMatchThreshold) {
      return resolve(data);
    }
    reject(data);
  });
};
