'use strict';

// average([1, 3, 8]) -> 4
exports.average = function(arr) {
  var total = arr.reduce(function(a, b) {
    return a + b
  })
  return (total / arr.length).toFixed(2)
}