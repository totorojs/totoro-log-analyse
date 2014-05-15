'use strict';

var logger = require('./logger')

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


// WHY? mongodb not allow dot in key
// mapLaborsKey(record)
//   {'firefox 29.0': ...} -> {'firefox 29<dot>0': ...}
// mapLaborsKey(record, '<dot>', '.')
//   {'firefox 29<dot>0': ...} -> {'firefox 29.0': ...}
exports.mapLaborsKey = function(record, search, repl){
  search = search || /\./g
  repl = repl || '<dot>'
  var labors = record.labors
  var keys
  if (labors && (keys = Object.keys(labors)).length) {
    keys.forEach(function(key) {
      if (search.test(key)) {
        var newKey = key.replace(search, repl)
        labors[newKey] = labors[key]
        ;delete labors[key]
        logger.debug('Map labors key.', {key: key, newKey: newKey})
      }
    })
  }
}
