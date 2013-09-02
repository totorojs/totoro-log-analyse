'use strict';

var fs = require('fs')
var http = require('http')
var path = require('path')
var express = require('express')
var common = require('totoro-common')

var service = require('./log-service')


exports.create = function(launcher, opts, cb) {
    var app = express()
    var server = http.createServer(app)
    var staticPath = path.join(__dirname, '../app')

    // set .html as the default extension
    app.set('views', staticPath)
    app.set('view engine', 'jade')

    app.use(express.static(staticPath))
    app.use(express.bodyParser())


    app.get('/log/:date?', function(req, res) {
        var date = req.params.date
        var cfg = {}

        if (date) {
            cfg = {date: {$gte: date}}
        }

        service.getLogInfo(cfg, function(logs) {
            res.send(logs)
        })
    })

    app.get('/latest', function(req, res) {
        service.getLatestOrderInfo({}, function(logs) {
            res.send(logs)
        })
    })

    app.get('/errors', function(req, res) {
        service.getErrorList(function(logs) {
            res.send(logs)
        })
    })


    server.listen(8000, function() {
        console.info('start server ' + common.getExternalIpAddress() + ':8000')
    })

}

// exports.create()
