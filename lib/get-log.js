'use strict';

var fs = require('fs')
var path = require('path')
var inherits = require('util').inherits
var os = require('os')
var EventEmitter = require('events').EventEmitter
var Tail = require('tail').Tail;

var common = require('totoro-common')

var util = require('./util')
var logger = require('./logger')

var recordStartReg = /^.+?\d{4}-\d{2}-\d{2}.+?\| /
var dateReg = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/
var orderBeginReg = /^.+?\| New order/
var orderEndReg = /^.+?\| Order destroys/
var orderInitCache = {}


module.exports = GetLog


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
function GetLog(p, isWatch) {
  logger.debug('Start get record.', {
    file: path.basename(p),
    isWatch: isWatch
  })

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

      // not accurate
      var labors = record.labors
      if (labors) {
        record.__laborCount = Object.keys(labors).length
      }

      that.emit('record', record)
    }
  }

  var obj = new GetRawLog(p)
  obj.on('record', handleRecord)
  obj.on('end', function() {
    if (!isWatch) {
      logger.debug('Finish get record.', {
        file: path.basename(p),
        isWatch: false
      })
      that.emit('end')
    }
  })

  if (isWatch) {
    var watchObj = this.watchObj = new GetIncreasedRawLog(p)
    watchObj.on('record', handleRecord)
  }
}

inherits(GetLog, EventEmitter)

GetLog.prototype.destroy = function() {
  if (this.watchObj) {
    this.watchObj.unwatch()
    logger.debug('Finish get record.', {
      file: path.basename(this.p),
      isWatch: true
    })
    this.emit('end')
  }
}


// extract raw log message from file p
function GetRawLog(p) {
  var that = this
  var record = ''
  var content = ''
  var lastIdx = 0
  var stream = fs.createReadStream(p)

  stream.on('data', function(chunk) {
    // console.log('REMAINED:', content)
    content += chunk.toString()
    // console.log('CHUNCK START:', content.substr(0, 20))
    // console.log('CHUNCK END:', content.substr(content.length - 20))


    var lineReg = /.+\r?\n/g
    var lineMatch

    while ((lineMatch = lineReg.exec(content)) != null) {
      var line = lineMatch[0]

      if (recordStartReg.test(line) && record) {
        that.emit('record', record)
        record = ''
      }
      record += line
      lastIdx = lineReg.lastIndex
    }
    content = content.substr(lastIdx)

  })

  stream.on('end', function() {
    that.emit('record', record)
    record = ''
    that.emit('end')
  })
}

inherits(GetRawLog, EventEmitter)


// extract increased raw record message from file p
function GetIncreasedRawLog(p) {

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

inherits(GetIncreasedRawLog, EventEmitter)

GetIncreasedRawLog.prototype.unwatch = function() {
  this.emit('record', this.record)
  this.record = ''

  this.tail.unwatch()
  this.isWatching = false
}

