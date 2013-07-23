var shelljs = require('shelljs/global')
var when = require('when')
var lineReader = require('line-reader')
var pd = require('pretty-data').pd
/**
"20130720.log": {
    "lMfGrWA4ejYcdiAkfdub": {
        "repo": "arale/base",
        "succ": true,
        "labors": {
            "chrome": {"suites":2,"tests":31,"passes":31,"pending":0,"failures":0,"duration":179,"coverage":{"sloc":220,"hits":208,"misses":12,"coverage":94.54545454545455}}
            "firefox": {"suites":2,"tests":31,"passes":31,"pending":0,"failures":0,"duration":179,"coverage":{"sloc":220,"hits":208,"misses":12,"coverage":94.54545454545455}}
        }
        "totalTime": 221
    }
}
**/


var LogResult = function(date) {
    this.date = date
    // record log info obj
    this.results = {}
    this.orders = []
    this.defer = when.defer()
}

LogResult.all = {

}

LogResult.get = function(date) {
    return LogResult.all[date] || (LogResult.all[date] = new LogResult(date))
}


LogResult.prototype = {
    end: function() {
        this.defer.resolve()
    },
    parse: function(line) {
        var that = this
        if (OrderBeginReg.test(line)) {
            var order = new OrderResult(line)
            order.end(function(orderInfo) {
                var orderId = orderInfo.orderId
                delete orderInfo.orderId
                that.results[orderId] = orderInfo
                that.delOrderr(orderId)
            })

            this.orders.push(order)
        } else if (LaborReg.test(line)) {
            addLabor(line)
        } else {
            this.orders.some(function(order) {
                return order.parse(line)
            })
        }
    },

    delOrder: function(orderId) {
        var orders = this.orders
        for (var i = 0, len = orders.length; i < len; i++) {
            if (orders[i].orderId == orderId) {
                this.orders.splice(i, 1)
                return
            }
        }
    }
}

var LaborMapping = {

}

function addLabor(line) {
    var match = line.match(LaborReg)
    LaborMapping[match[1]] = {
        name: match[2].split(' ')[0],
        source: match[2]
    }
}


var OrderBeginReg = /New order<([\w_-]+)>[^<]+<([^>]+)>$/
var LaborReg = /New labor<([\w_-]+)>, UA<([^>]+)>$/

// TODO dynamic adding reg rules?
function OrderResult(line) {
    this.initOrder(line)
    this.defer = when.defer()
}

OrderResult.prototype = {
    initOrder: function(line) {

        var that = this
        var match = line.match(OrderBeginReg)
        var orderInfo = JSON.parse(match[2])

        var orderId = this.orderId = match[1]
        this.repo = orderInfo.repo

        if (orderInfo.browsers) {
            this.browsers = {}
            orderInfo.browsers.forEach(function(b) {
                that.browsers[b] = {}
            })
        }

        this.orderReg = new RegExp(orderId)
        this.laborReg = new RegExp('Labor<([\\w-]+)> finished order<' + orderId + '>, result<([^>]+)>$')
        this.totalTimeReg = new RegExp('All labors finished order<' + orderId + '>, total time<(\\d+)>')
        this.endReg = new RegExp('Order<' + orderId + '> destroy.$')
    },

    parse: function(line) {
        if (!this.orderReg.test(line)) {
            return false
        }

        // subsequent processing
        if (this.laborReg.test(line)) {
            this.addLabor(line)
        } else if (this.totalTimeReg.test(line)) {
            this.addTotalTime(line)
        } else if (this.endReg.test(line)) {
            // end parse
            this.endParse()
        }

        return true
    },

    addLabor: function(line) {
        var match = line.match(this.laborReg)
        var bName = LaborMapping[match[1]].name
        this.browsers[bName] = JSON.parse(match[2])
    },

    addTotalTime: function(line) {
        var match = line.match(this.totalTimeReg)
        this.totalTime = (match[1] + 'ms')
    },

    endParse: function() {
        this.defer.resolve({
            orderId: this.orderId,
            browsers: this.browsers,
            succ: this.isSucc(),
            totalTime: this.totalTime,
            repo: this.repo
        })
    },

    isSucc: function() {
        var browsers = this.browsers
        return Object.keys(browsers).every(function(name) {
            var b = browsers[name]
            return b && (b.failures === 0)
        })
    },

    end: function(callback) {
        this.defer.promise.then(callback)
    }
}


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
                logResult.end()
                LogResult.all[log] = logResult.results
            }
        })
    })

    when.all(promises, function() {
        console.info('parse sucess!')
        var str = pd.json(LogResult.all)
        console.info(str)
    })

    //console.info('logs', logs)

}
