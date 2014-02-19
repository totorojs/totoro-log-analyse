'use strict';

// average([1, 3, 8]) -> 4
exports.average = function(arr) {
  if (!arr.length) return 0

  var total = arr.reduce(function(a, b) {
    return a + b
  })
  return total / arr.length
}


// return yyyymmdd
// offset -1, return yestoday's date
// offset 1 , return tomorrow's date
exports.getDate = function(offset, delimiter){
  offset = (offset || 0) * 24 * 60 * 60 * 1000
  delimiter = delimiter || ''
  var date = new Date()
  var time = date.getTime() + offset
      date.setTime(time)
  var y = date.getFullYear()
  var m = date.getMonth() + 1
  var d = date.getDate()
  return y + delimiter +
        (m < 10 ? '0' : '') + m + delimiter +
        (d < 10 ? '0' : '') + d
}