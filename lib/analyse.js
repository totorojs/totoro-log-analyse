var shelljs = require('shelljs/global')
var when = require('when')
var lineReader = require('line-reader')
/**
 * [{
 *     id: orderId,
 *     result: {
 *         success:xx,
 *         fail:xx,
 *         coverage:xx
 *      },
 *      totalTime:xx
 * }]
 **/


var LogResult = function(date) {
    this.date = date
    this.results = []
    this.defer = when.defer()
}

LogResult.prototype = {
    resolve: function() {
        this.defer.resolve()
    },
    parse: function(line) {


    }
}

LogResult.all = {

}

LogResult.get = function(date) {
    return LogResult.all[date] || (LogResult.all[date] = new LogResult(date))
}

function OrderResult(orderId) {
    this.orderId = orderId
}

OrderResult.prototype = {
   parse: function(line) {
       if (OrderResult.BeginReg.test(line)) {

       }

       if (OrderResult.End.test(line)) {

       }
   }
}

OrderResult.BeginReg = /New order<(\w+)>/
OrderResult.EndReg = /Order<(\w+)> destroy/

module.exports = function(log_dir) {
    cd(log_dir)

    var logs = find('.').filter(function(file) {
        return /\d{8}.log/.test(file)
    })

    var promises = []
    logs.forEach(function(log) {
        var logResult = LogResult.get(log)
        promises.push(logResult.defer.promise)

        lineReader.eachLine(log, function(line, last){
            logResult.parse(line)

            if (last) {
                logResult.resolve()
            }
        })
    })

    when.all(promises, function() {
        console.info('parse sucess!')
        console.info(LogResult.all)
    })

    //console.info('logs', logs)

}
