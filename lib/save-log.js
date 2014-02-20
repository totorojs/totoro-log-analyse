'use strict';

var fs = require('fs')
var path = require('path')

var logger = require('./logger')
var util = require('./util')
var GetLog = require('./get-log')

var watchFname = util.getDate() + '.log'
var watchLogObj


module.exports = saveLog


// save all log message of files in dir
function saveLog(coll, dir, start) {
  start = start || watchFname

  // exclude log files not need process
  var files = fs.readdirSync(dir).filter(function(fname) {
    return fname >= start
  })
  logger.debug('Save log files already existed:', files)

  watch(coll, dir)
  files.length && _saveLog(coll, dir, files, 0)
}


// watch if new log file be created
function watch(coll, dir) {
  var files = fs.readdirSync(dir)
  fs.watch(dir, function(ev, fname) {
    var p = path.join(dir, fname)

    // a new file created
    if (files.indexOf(fname) === -1) {
      files.push(fname)
      watchFname = fname
      watchLogObj && watchLogObj.destroy()
      _saveLog(coll, dir, fname)
    }
  })
}


// _saveLog(coll, dir, logFiles, idx): save logs from logFiles list in order
// _saveLog(coll, dir, fname): save logs from file fname
function _saveLog(coll, dir, logFiles, idx) {
  var isBatch = arguments.length === 4
  var fname = isBatch ? logFiles[idx] : logFiles
  var isWatch = fname === watchFname  // if is today's log file

  var obj = new GetLog(path.join(dir, fname), isWatch)

  obj.on('record', function(record) {
    util.mapLaborsKey(record)

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
      _saveLog(coll, dir, logFiles, ++idx)
    }
  })

  if (isWatch) {
    watchLogObj = obj
  }
}

