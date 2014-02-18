'use strict';

var fs = require('fs')
var path = require('path')

var logger = require('./logger')
var GetRecord = require('./get-record')

var latestFname = getNow() + '.log'
var latestObj


module.exports = saveLogFiles


// save all log message of files in dir
function saveLogFiles(coll, dir, start) {
  start = start || latestFname

  // exclude log files not need process
  var files = fs.readdirSync(dir).filter(function(fname) {
    return fname >= start
  })
  logger.debug('Save log files already existed:', files)

  watch(dir)
  files.length && saveLogFile(coll, dir, files, 0)
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


// saveLogFile(coll, dir, logFiles, idx): save logs from logFiles list in order
// saveLogFile(coll, dir, fname): save logs from file fname
function saveLogFile(coll, dir, logFiles, idx) {
  var isBatch = arguments.length === 4
  var fname = isBatch ? logFiles[idx] : logFiles
  var isLatest = fname === latestFname  // if is today's log file

  var obj = new GetRecord(path.join(dir, fname), isLatest)

  obj.on('record', function(record) {
    encodeDotInKey(record)

    // if not exists, then insert
    coll.update(
      {orderId: record.orderId, __date: record.__date},
      record,
      {upsert: true},
      function(err, rt) {
        if (err) {
          logger.warn('Failed to save record.', {orderId: record.orderId})
        } else {
          logger.debug('Succeed to save record.', {orderId: record.orderId})
        }
      }
    )
  })

  obj.on('end', function() {
    logger.debug('Finish save log file.', {file: fname})
    if (isBatch && idx < logFiles.length - 1) {
      saveLogFile(coll, dir, logFiles, ++idx)
    }
  })

  if (isLatest) {
    latestObj = obj
  }
}


function encodeDotInKey(record) {
  var labors = record.labors
  var keys
  if (labors && (keys = Object.keys(labors)).length) {
    keys.forEach(function(key) {
      if (key.indexOf('.') > -1) {
        var newKey = key.replace(/\./g, '<dot>')
        labors[newKey] = labors[key]
        ;delete labors[key]
        logger.debug('Encode dot in key of record.labors.', {key: key, newKey: newKey})
      }
    })
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