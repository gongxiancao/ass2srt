var fs = require('fs'),
    util = require('util'),
    argv = require('optimist')
        .string('src', 'dst')
        .usage('Usage: $0 --src [string] --dst [string]')
        .describe('src', 'source ass file')
        .describe('dest', 'destination srt file')
        .argv;

console.log(argv.src, argv.dst);

var pattern = /Dialogue: 0,([\d.:]+),([\d.:]+),\*Default,,0000,0000,0000,,({[^}]+})?([^{}]+)({\\r}\\N{[^}]+})?([^{}]+)?({\\r})?/;

function parseTime(timeStr, format) {
    var i = 0, len = format.length, part;
    var parts = {};
    for(i = 0; i < len; ++ i) {
        part = format[i];

        if(timeStr[i] !== format[i]) {
            if(!parts[part]) {
                parts[part] = timeStr[i];
            }
            else {
                parts[part] += timeStr[i];
            }
        }
    }
    for(i in parts) {
        parts[i] = parseInt(parts[i], 10);
    }
    return parts;
}

function formatTime(time, format) {
    var i = 0, len = format.length, part, parts = {};
    for(i = 0; i < len; ++ i) {
        part = format[i];
        if(!parts[part]) {
            parts[part] = 1;
        }
        else {
            parts[part] ++;
        }
    }

    var resultArray = [];
    resultArray.length = format.length;
    var indices = {};
    for(i in parts) {
        part = time[i];
        if(typeof part !== 'undefined') {
            part = part.toString(10);
            for(len = parts[i] - part.length; len > 0; -- len) {
                part = '0' + part;
            }
            parts[i] = part;
            indices[i] = 0;
        }
        else {
            delete parts[i];
        }
    }

    var ch;
    for(i = 0, len = format.length; i < len; ++ i) {
        ch = format[i];
        part = parts[ch];

        if(part) {
            resultArray[i] = part[indices[ch] ++];
        }
        else {
            resultArray[i] = ch;
        }
    }

    var res = resultArray.join('');
    return res;
}

function parseEvent(line) {
    var match, eve;
    var timeFormat = 'h:mm:ss.ss';
    if(line) {
        match = line.match(pattern);
        if(match) {
            eve = {start: parseTime(match[1], timeFormat), end: parseTime(match[2], timeFormat), main: match[4], sub: match[6]};
            eve.start.s *= 10;
            eve.end.s *= 10;
            return eve;
        }
    }
}


function formatEveToSrt(eve) {
    var timeFormat = 'hh:mm:ss,sss';
    return util.format('%s --> %s\r\n%s',
        formatTime(eve.start, timeFormat),
        formatTime(eve.end, timeFormat),
        eve.main);
}

fs.readFile(argv.src, 'utf8', function (err, data) {
    if(err) {
        throw err;
    }
    var srtSeq = 0;
    function handleEvent(eve) {
        var srtStr = formatEveToSrt(eve);
        srtStr = (++ srtSeq) + '\r\n' + srtStr + '\r\n\r\n';
        fs.appendFile(argv.dst, srtStr,'utf8');
    }

    var lines = data.split('\r\n');
    var i, len = lines.length, line, eve;
    for(var i = 0, len = lines.length; i < len; ++ i) {
        line = lines[i];
        eve = parseEvent(line);
        if(eve) {
            handleEvent(eve);
        }
    }
});