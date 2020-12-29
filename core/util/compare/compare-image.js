const { call } = require("wasm-imagemagick");
// use https://github.com/cancerberoSgx/magica ?
const fs = require("fs");
const { result } = require("lodash");
const { resolve } = require("path");

function getMagickImageFromFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (err, content) => {
      if (err) {
        reject(err);
      } else {
        const splittedPath = path.replace(/\\/g, "/").split("/");
        const filename = splittedPath[splittedPath.length - 1];
        resolve({
          name: filename,
          content: new Uint8Array(content)
        });
      } 
    });
  });
}

module.exports = function (referencePath, testPath, misMatchThreshold, resembleOptions, requireSameDimensions) {
  return Promise.all([
    getMagickImageFromFile(referencePath),
    getMagickImageFromFile(testPath)
  ]).then((inputFiles) => {
    // requireSameDimension false => use normalized cross correlation metric
    return call(inputFiles, ["compare", "-metric", inputFiles[0].name, inputFiles[1].name, "diff.png" ])
      .then((result) => {
        if (result.exitCode >= 0 && result.exitCode <= 1) {
          if (result.exitCode <= misMatchThreshold) {
            resolve({
              rawMisMatchPercentage: result.exitCode,
              misMatchPercentage: Math.round((result.exitCode + Number.EPSILON) * 100) / 100,
              diffImage: result.outputFiles[0],
              getBuffer: () => {
                return new Buffer(result.outputFiles[0].blob, "binary")
              }
            });
          } else {
            reject({
              rawMisMatchPercentage: result.exitCode,
              misMatchPercentage: Math.round((result.exitCode + Number.EPSILON) * 100) / 100,
              diffImage: result.outputFiles[0],
              getBuffer: () => {
                return new Buffer(result.outputFiles[0].blob, "binary")
              }
            });
          }
        } else {
          reject({
            fatalError: true
          })
        }
      })
  });
};