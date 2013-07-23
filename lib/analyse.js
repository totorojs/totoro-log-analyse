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

        this.coverage = 0
        this.duration = 0
        this.tc = 0
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
        var bInfo = this.browsers[bName] = JSON.parse(match[2])

        this.coverage = this.coverage + (bInfo.coverage && bInfo.coverage.coverage || 0)
        this.duration = this.duration + bInfo.duration
        this.tc = this.tc + bInfo.tests
    },

    addTotalTime: function(line) {
        var match = line.match(this.totalTimeReg)
        this.totalTime = parseInt(match[1])
    },

    endParse: function() {
        var bLen = Object.keys(this.browsers).length
        this.defer.resolve({
            orderId: this.orderId,
            repo: this.repo,
            browsers: this.browsers,
            succ: this.isSucc(),
            totalTime: this.totalTime,
            coverage: this.coverage / bLen,
            averageDuration: this.duration / bLen,
            tc: this.tc / bLen
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
        return /^\d{8}.log$/.test(file)
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
        // console.info(str)
        var allResult = {}
        Object.keys(LogResult.all).sort().forEach(function(date) {
            allResult[date] = parseDayResult(LogResult.all[date])
        })

        parseResult(allResult)
    })
    //console.info('logs', logs)
}

function parseDayResult(orders) {
    var overview = {
        succ: 0,
        failure: 0,
        averageCov: 0,
        averageTC: 0,
        averageDuration: 0,
        maxTC: [],
        minTC: [],
        maxCov: [],
        minCov: []
    }

    var result = {

    }

    var orderIds = Object.keys(orders)
    overview.totalTests = orderIds.length

    orderIds.forEach(function(orderId){
        var orderInfo = orders[orderId]
        var repo = orderInfo.repo
        var test = result[repo] || (result[repo] = {num: 0, succ: 0, failure: 0, time: 0, coverage: 0, tc: 0, duration: 0})
        test.num++
        if (orderInfo.succ) {
            test.succ++
        } else {
            test.failure++
        }

        test.time = test.time + parseInt(orderInfo.totalTime)
        test.coverage = test.coverage + orderInfo.coverage
        test.tc = test.tc + orderInfo.tc
        test.duration = test.duration + orderInfo.averageDuration
    })

    Object.keys(result).forEach(function(repo) {
        var info = result[repo]
        info.averageTime =  info.time / info.num
        info.coverage = info.coverage / info.num 
        info.tc = info.tc / info.num 
        info.duration = info.duration / info.num 

        overview.succ = overview.succ + info.succ
        overview.failure = overview.failure + info.failure
        if (info.succ) {
            overview.averageCov = overview.averageCov + (info.coverage * info.succ)
            overview.averageTC = overview.averageTC + (info.tc * info.succ)
            overview.averageDuration = overview.averageDuration + (info.duration * info.succ)
        }

        overview.maxTC = compare(overview.maxTC, [repo, info.tc], true)
        overview.minTC = compare(overview.minTC, [repo, info.tc], false)
        overview.maxCov = compare(overview.maxCov, [repo, info.coverage], true)
        overview.minCov = compare(overview.minCov, [repo, info.coverage], false)
    })

    overview.averageCov = overview.averageCov / overview.succ
    overview.averageTC = overview.averageTC / overview.succ
    overview.averageDuration = overview.averageDuration / overview.succ
    overview.totalTests = overview.succ + overview.failure

    overview.children = result
    //console.info(pd.json(overview))
    return overview
}

function parseResult(data) {
   var overview = {
       totalTests: 0,
       succ: 0,
       failure: 0,
       averageTC: 0,
       averageCov: 0,
       averageDuration: 0,
       maxTC: [],
       minTC: [],
       maxCov: [],
       minCov: []
   }

   overview.children = data

   Object.keys(data).forEach(function(date) {
       var dayInfo = data[date]
       overview.succ = overview.succ + dayInfo.succ
       overview.failure = overview.failure + dayInfo.failure
       overview.averageTC = overview.averageTC + dayInfo.averageTC
       overview.averageCov = overview.averageCov + dayInfo.averageCov
       overview.averageDuration = overview.averageDuration + dayInfo.averageDuration

       overview.maxTC = compare(overview.maxTC, dayInfo.maxTC, true)
       overview.minTC = compare(overview.minTC, dayInfo.minTC, false)
       overview.maxCov = compare(overview.maxCov, dayInfo.maxCov, true)
       overview.minCov = compare(overview.minCov, dayInfo.minCov, false)
   })

   overview.totalTests = overview.succ + overview.failure

   console.info(pd.json(overview))
}

function compare(arr1, arr2, max) {
   if (!arr1.length) return arr2

   if (arr2[1] - arr1[1] === 0) {
       return [arr1[0].concat(arr2[0]), arr1[1]]
   }

   if (max) {
      return arr2[1] - arr1[1] > 0 ? arr2 : arr1
   } else {
      return arr2[1] - arr1[1] > 0 ? arr1 : arr2
   }
}

