var when = require('when')
var pd = require('pretty-data').pd
var getLog = require('./get-log')({})
var fs = require('fs')

/**
getLog.get = function(cfg, cb) {
    var logResult = JSON.parse(fs.readFileSync('./test/log.json'))

    cb(null, logResult)
}
**/

var Cache = {

}


exports.getLogInfo = function(cfg, callback) {
    exports.analyse(cfg, callback)
}


exports.analyse = function(cfg, callback) {
    var allResult = getLog.get(cfg, function(err, logResult) {
        var allResult = {}
        var dateResult = {}
        var dates = []

        logResult.forEach(function(log) {
            var date = log.date
            if (dateResult[date]) {
                dateResult[date].push(log)
            } else {
                dates.push(date)
                dateResult[date] = [log]
            }
        })

        dates.forEach(function(date) {
            allResult[date] = parseDayResult(dateResult[date])
        })
        process.exit(0)
        callback(parseResult(allResult))
    })
}

function getOverview() {
    return {
        totalTests: 0,
        totalBrowsersTests: 0,
        succTests: 0,
        failure: 0,

        totalCov: 0,
        totalTc: 0,
        totoalTime: 0,
        totalDuration:0,

        averageCov: 0,
        averageTC: 0,
        averageTime: 0,
        averageDuration: 0,

        maxTC: [],
        minTC: [],
        maxCov: [],
        minCov: []
    }
}


function getOrderOverview(order) {
    var bsInfo = {}
    var browsers = order.browsers
    var bIds = Object.keys(browsers)

    var succ = true

    //TODO distinguish cancel or error ?
    if (!order.totalTime) {
        succ = false
    } else {
        bIds.forEach(function(bId) {
            var testResult = browsers[bId]
            succ = succ && !testResult.failure
        })
    }

    bsInfo.succ = succ
    bsInfo.browsersNum = bIds.length
    bsInfo.tc = order.tc
    bsInfo.time = order.totalTime
    bsInfo.cov = order.coverage

    bsInfo.duration = order.averageDuration

    return bsInfo
}

function parseDayResult(orders) {
    var result = {}
    var dayOverview = getOverview()
    var orderIds = Object.keys(orders)
    dayOverview.totalTests = orderIds.length

    var maxTC = []
    var minTC = []
    var maxCov = []
    var minCov = []

    orderIds.forEach(function(orderId){
        var orderInfo = orders[orderId]
        var repo = orderInfo.repo
        if (!repo) return

        var allRepoTest = result[repo] || (result[repo] = {})

        var orderOverview = getOrderOverview(orderInfo)

        allRepoTest[orderId] = orderOverview

        dayOverview.totalBrowsersTests += orderOverview.browsersNum

        if (orderOverview.succ) {
            dayOverview.succTests++
            dayOverview.totalCov += orderOverview.cov
            dayOverview.totalTc += orderOverview.tc
            dayOverview.totoalTime += orderOverview.time
            dayOverview.totalDuration += orderOverview.duration

            maxTC = compare(maxTC, [repo, orderOverview.tc], true)
            minTC = compare(minTC, [repo, orderOverview.tc], false)

            maxCov = compare(maxCov, [repo, orderOverview.cov], true)
            minCov = compare(minCov, [repo, orderOverview.cov], false)

        } else {
            dayOverview.failure++
        }
    })

    dayOverview.maxTC = maxTC
    dayOverview.minTC = minTC
    dayOverview.maxCov = maxCov
    dayOverview.minCov = minCov
console.info('=================')
    console.info(pd.json(dayOverview))

}

function parseResult(data) {
   var overview = getOverview()
   overview.children = data

   Object.keys(data).forEach(function(date) {
       var dayInfo = data[date]

       sumValue(overview, dayInfo, 'succ', 'failure', 'averageTime', 'averageTC', 'averageCov', 'averageDuration')

       compareValues(overview, dayInfo, 'maxTC', 'minTC', 'maxCov', 'minCov')
   })

   overview.totalTests = overview.succ + overview.failure

   averageValue(overview, Object.keys(data).length, 'averageTime', 'averageTC', 'averageCov', 'averageDuration')
   console.info(pd.json(overview))
   return overview

}

var sumValue = _expandFn(function(target, source, key) {
    target[key] = target[key] + source[key]
})

var averageValue = _expandFn(function(target, size, key) {
    target[key] = target[key] / size
})

var compareValues = _expandFn(function(target, source, key) {
    if (/max/.test(key)) {
        target[key] = compare(target[key], source[key], true)
    } else {
        target[key] = compare(target[key], source[key], false)
    }
})

function _expandFn(fn) {
    return function(target, source, keys) {
        if (typeof keys === 'string') {
            keys = [].slice.call(arguments, 2)
        }
        keys.forEach(function(key) {
            fn.call(null, target, source, key)
        })
    }
}

function compare(arr1, arr2, isMax) {
   if (!arr1.length) return arr2

   if (arr2[1] - arr1[1] === 0) {
       //console.info('------>', arr1)
       if (arr1[0] !== arr2[0] && (Array.isArray(arr1[0]) && arr1[0].indexOf(arr2[0]) < 0)) {
           return [arr1[0].concat(arr2[0]), arr1[1]]
       } else {
           return arr1
       }
   }

   if (isMax) {
      return arr2[1] - arr1[1] > 0 ? arr2 : arr1
   } else {
      return arr2[1] - arr1[1] > 0 ? arr1 : arr2
   }
}

//exports.analyse()
