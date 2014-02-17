'use strict';

var fs = require('fs')
var path = require('path')
var util = require('util')
var os = require('os')
var EventEmitter = require('events').EventEmitter
var Tail = require('tail').Tail;

var common = require('totoro-common')
var logger = require('./logger')

var recordStartReg = /^.+?\d{4}-\d{2}-\d{2}.+?\| /
var dateReg = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/
var orderBeginReg = /^.+?\| New order/
var orderEndReg = /^.+?\| Order destroys/
var orderInitCache = {}


module.exports = GetRecord


/**
 * extract log message from file p and parse to JSON
 * all log messages belong to one order be combined to one record
 *
 * @param {String}  p         log file path
 * @param {Boolean} isWatch   watch file change
 *
 * @event record(record)
 * @event end()
 */
function GetRecord(p, isWatch) {
  this.p = p

  var that = this

  var handleRecord = function(record) {
    if (orderBeginReg.test(record)) {
      record = record.replace(orderBeginReg, '')
      record = eval('(' + record + ')')
      orderInitCache[record.orderId] = record

    } else if (orderEndReg.test(record)) {
      var date = dateReg.exec(record)[0]
      record = record.replace(orderEndReg, '')
      record = eval('(' + record + ')')
      record.__date = date

      // merge order init info to order destroy info
      record = common.mix(record, orderInitCache[record.orderId])
      ;delete orderInitCache[record.orderId]

      setOverview(record)
      that.emit('record', record)
    }
  }

  var obj = new GetRawRecord(p)
  obj.on('record', handleRecord)
  obj.on('end', function() {
    if (!that.watchObj) {
      logger.debug('Finish get record.', {
        file: path.basename(p),
        isWatch: false
      })
      that.emit('end')
    }
  })

  if (isWatch) {
    var watchObj = this.watchObj = new GetIncreasedRawRecord(p)
    watchObj.on('record', handleRecord)
  }
}

util.inherits(GetRecord, EventEmitter)

GetRecord.prototype.destroy = function() {
  if (this.watchObj) {
    this.watchObj.unwatch()
    logger.debug('Finish get record.', {
      file: path.basename(this.p),
      isWatch: true
    })
    this.emit('end')
  }
}


function setOverview(record) {
  var labors = record.labors
  record.__statsCode = getStatsCode(labors)
  if (record.__statsCode === 1) {
    var covs = []
    var maxTestDuration = 0

    Object.keys(labors).forEach(function(key) {
      var stats = labors[key].stats
      var duration = stats.duration || 0
      maxTestDuration = Math.max(maxTestDuration, duration)
      var cov = stats.coverage
      if (cov) {
        delete cov.missesDetail
        cov.coverage && covs.push(cov.coverage)
      }
    })

    if (covs.length) record.__coverage = average(covs)
    record.__maxTestDuration = maxTestDuration
  }
}


// average([1, 3, 8]) -> 4
function average(arr) {
  var total = arr.reduce(function(a, b) {
    return a + b
  })
  return (total / arr.length).toFixed(2)
}


// get stats code from all labors
function getStatsCode(labors) {
  if (!labors) return 2;

  for (var key in labors) {
    var code = getSingleStatsCode(labors[key])
    if (code !== 1) {
      return code;
    }
  }
  return 1;
}


// 0: code execution, 1: success, 2 failure
// negative numbers are preserved for function test
function getSingleStatsCode(labor) {
  if (labor) {
    if (labor.stats) {
      if (labor.stats.error) {
        // syntax error
      } else if (Object.keys(labor.stats).length) {
        var stats = labor.stats
        if (stats.failures) {
          // assert failure
        } else {
          // success
          return 1
        }
      } else {
        // code execution (--code)
        return 0
      }
    } else {
      // timeout
    }
  } else {
    // not found required labor
  }
  return 2
}


// extract raw record message from file p
function GetRawRecord(p) {
  var that = this
  var record = ''
  var stream = fs.createReadStream(p)

  stream.on('data', function(chunk) {
    var content = chunk.toString()
    var lineReg = /^.*$/gm
    var lineMatch

    while ((lineMatch = lineReg.exec(content)) != null) {
      var line = lineMatch[0]
      if (line === '') lineReg.lastIndex++

      if (recordStartReg.test(line) && record) {
        that.emit('record', record)
        record = ''
      }
      record += line + os.EOL
    }
  })

  stream.on('end', function() {
    that.emit('record', record)
    record = ''
    that.emit('end')
  })
}

util.inherits(GetRawRecord, EventEmitter)


// extract increased raw record message from file p
function GetIncreasedRawRecord(p) {

  var that = this
  this.record = ''

  this.tail = new Tail(p);
  this.tail.on('line', function(line) {
    if (recordStartReg.test(line) && that.record) {
      that.emit('record', that.record)
      that.record = ''
    }
    that.record += line
  });
  that.tail.on('error', function() {
    logger.warn('An error occured on tail object.', {file: path.basename(p)})
  })

  this.isWatching = true
}

util.inherits(GetIncreasedRawRecord, EventEmitter)

GetIncreasedRawRecord.prototype.unwatch = function() {
  this.emit('record', this.record)
  this.record = ''

  this.tail.unwatch()
  this.isWatching = false
}

