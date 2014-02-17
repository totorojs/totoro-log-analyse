'use strict';

var fs = require('fs')
var path = require('path')

var logger = require('./logger')
var getRecord = require('./get-record')


module.exports = saveRecord


function saveRecord(db, dir, start) {
  var curFile = getNow() + '.log'
  start = start || curFile

  var files = fs.readdirSync(dir).filter(function(name) {
    return name >= start
  })
  logger.debug('Process files:', files)

  function _saveRecord(idx) {
    if (idx >= files.length) return

    var name = files[idx]
    var obj = getRecord(path.join(dir, name))
    obj.on('record', function(record) {
      console.log(record)
    })
    obj.on('end', function() {
      logger.debug('Finish save record.', {file: name})
      _saveRecord(++idx)
    })
  }

  _saveRecord(0)
}


// return yyyymmdd
function getNow(){
  var now = new Date()
  var y = now.getFullYear()
  var m = now.getMonth() + 1
  var d = now.getDate()
  return y + (m < 10 ? '0' : '') + m + (d < 10 ? '0' : '') + d
}