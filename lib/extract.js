var path = require('path')
var fs = require('fs')

var util = require('util')
var os = require('os')
var EventEmitter = require('events').EventEmitter

var recordStartReg = /^.+?\d{4}-\d{2}-\d{2}.+?\| /
var orderBeginReg = /^.+?\| New order/
var orderEndReg = /^.+?\| Order destroys/


module.exports = function(dir) {
  var today = getNow()
  var todayLogFile = today + '.log'

  fs.readdirSync(dir).forEach(function(name) {
    parse(path.join(dir, name))
  })
}


function parse(p) {
  getRecord(p).on('record', function(record) {
    if (orderBeginReg.test(record)) {
      record = record.replace(orderBeginReg, '')
      record = eval('(' + record + ')')
      console.log('order begin:', JSON.stringify(record))
    } else if (orderEndReg.test(record)) {
      record = record.replace(orderEndReg, '')
      record = eval('(' + record + ')')
      console.log('order end:', JSON.stringify(record))
    }
  })
}


function getRecord(p, opt) {
  if (!(this instanceof getRecord)) return new getRecord(p, opt)

  var that = this
  var record = ''
  var stream = fs.createReadStream(p, opt)

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

util.inherits(getRecord, EventEmitter)


function getNow(){
  var now = new Date()
  var y = now.getFullYear()
  var m = now.getMonth() + 1
  var d = now.getDate()
  return y + (m < 10 ? '0' : '') + m + (d < 10 ? '0' : '') + d
}
