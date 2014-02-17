'use strict';

var fs = require('fs')
var path = require('path')

var logger = require('./logger')
var getRecord = require('./get-record')

var latestFname = getNow() + '.log'
var latestObj


module.exports = saveLogFiles


function saveLogFiles(db, dir, start) {
  start = start || latestFname

  // exclude log files not need process
  var files = fs.readdirSync(dir).filter(function(fname) {
    return fname >= start
  })
  logger.debug('Save log files already existed:', files)

  watch(dir)
  saveLogFile(dir, files, 0)
}


// watch if new log file be created
function watch(dir) {
  fs.watch(dir, function(ev, fname) {
    if (fname > latestFname) { // not a strict way
      latestFname = fname
      latestObj && latestObj.destroy()
      saveLogFile(dir, fname)
    }
  })
}


// saveLogFile(dir, logFiles, idx): save logs from logFiles list in order
// saveLogFile(dir, fname): save logs from file fname
function saveLogFile(dir, logFiles, idx) {
  var isBatch = arguments.length === 3
  var fname = isBatch ? logFiles[idx] : logFiles
  var isLatest = fname === latestFname  // if is today's log file

  var obj = getRecord(path.join(dir, fname), isLatest)
  obj.on('record', function(record) {
    console.log(record.orderId, ':', record.__statsCode)
  })
  obj.on('end', function() {
    logger.debug('Finish save log file.', {file: fname})
    if (isBatch && idx < logFiles.length - 1) {
      saveLogFile(dir, logFiles, ++idx)
    }
  })

  if (isLatest) {
    latestObj = obj
  }
}


// return yyyymmdd
function getNow(){
  var now = new Date()
  var y = now.getFullYear()
  var m = now.getMonth() + 1
  var d = now.getDate()
  return y + (m < 10 ? '0' : '') + m + (d < 10 ? '0' : '') + d
}