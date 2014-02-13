'use strict';

var tracer = require('tracer')
var colorful = require('colorful')

var levels = ['debug', 'info', 'warn', 'error']
var logLevel = 'info'

process.argv.forEach(function(item, idx, list) {
  if (item.match(/^(--debug|-[a-zA-Z]*d[a-zA-Z]*)$/)) {
    logLevel = 'debug'
  }
});

var normalFormat = '{{title}} {{file}}:{{line}} | {{message}}'
var errFormat = '{{title}} {{file}}:{{line}} | {{message}}\nCall Stack:\n{{stacklist}}'

module.exports = tracer.colorConsole({
    methods: levels,
    level: logLevel,

    format: getFormat(logLevel),

    preprocess: function(data) {
        if (data.title === 'error') {
            data.stacklist = data.stack.join('\n')
        }
    },

    filters: [{
        info: colorful.gray,
        warn: colorful.yellow,
        error: colorful.red
    }],

    transport: function(data) {
        var title = data.title
        if (levels.indexOf(title) >= levels.indexOf(logLevel)) {
            console.log(data.output)
        }
        if (title === 'error') {
            process.exit(1)
        }
    }
})

function getFormat(logLevel) {
  if (logLevel === 'debug') {
    return [normalFormat, {error: errFormat}]
  } else {
    return normalFormat
  }
}
