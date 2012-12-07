var spawn = require('child_process').spawn;
var proc = cmd();

var netutil = require("netutil");

/*
    /home/bmatusiak/nodeApps/cloud9Cur/bin/cloud9.sh -w ~/  & sleep 1 &&
    google-chrome --app="http://localhost:3131/" --user-data-dir=~/.config/cloud9
*/
var c9, gChrome;

process.on('exit', function () {
    if (gChrome && gChrome.pid && !gChrome.killed) {
        process.kill(gChrome.pid);
        console.log("chrome killed");
    }
    if (c9 && c9.pid && !c9.killed) {
        process.kill(c9.pid);
        console.log("c9 killed");
    }
});


getPort(function(err, port1) { //runPort
    getPort(function(err, port2) { //debugPort
        runC9(port1, port2);
    });
});

function getPort(callback) {
    netutil.findFreePort(20000, 64000, "localhost", function(err, port) {
        callback(err, port);
    });
}

function runC9(runPort, debugPort) {
    c9 = proc.run("/usr/local/bin/node " + __dirname+"/../server.js" + " -p " + runPort + " -b " + debugPort + " -w " + process.env.HOME, {
        env: process.env,
        cwd: process.env.HOME
    },

    function(stderr, stdout, code, signal) {
        console.log("c9 died with", code, signal);
        if (gChrome && gChrome.pid && !gChrome.killed) {
            process.kill(gChrome.pid);
            console.log("chrome killed");
        }
    });

    c9.stdout.on('data', function(data) {
        var stdout = data.toString();
        if (stdout.indexOf("IDE server initialized. Listening on ") !== -1) {
            var server = stdout.replace("IDE server initialized. Listening on ", "");
            server = server.replace(/(\r\n|\n|\r|\t| + )/gm, "");
            setTimeout(function() {
                runGoogleChrom(server,process.env.HOME);
            }, 1000);
        }
    });
}

function runGoogleChrom(url,wspath) {
    var chromeTmpAppDir = process.env.HOME + '/.config/cloud9-'+wspath.replace("/","_");
    var cliCMD = './google-chrome-app http://' + url + '/ ' + chromeTmpAppDir;
    gChrome = proc.run(cliCMD, {
        env: process.env,
        cwd: __dirname
    }, function(stderr, stdout, code, signal) {
        console.log("gChrome died with", code, signal);
        if (c9 && c9.pid && !c9.killed) {
            process.kill(c9.pid);
            console.log("c9 killed");
        }
    });
}

function cmd() {
    var command = {};
    command.run = function(commandLine, _options, callback) {
        var options, __undefined__;
        if (!callback && typeof _options === "function") {
            callback = _options;
            options = __undefined__;
        }
        else if (typeof _options === "object") {
            options = _options;
        }
        var args = commandLine.split(" ");
        var cmd = args[0];
        args.shift();
        var oneoff = spawn(cmd, args, options);
        var stderr, stdout;
        oneoff.stdout.on('data', function(data) {
            stdout = data.toString();
            console.log("stdout", data.toString());
        });
        oneoff.stderr.on('data', function(data) {
            stderr = data.toString();
            console.log("stderr", data.toString());
        });
        oneoff.on('exit', function(code, signal) {
            oneoff.killed = true;
            if (typeof callback === "function") callback(stderr, stdout, code, signal);
        });
        return oneoff;
    };
    return command;
}
function uid() {
    function getRandomNumber(range) {
        return Math.floor(Math.random() * range);
    }

    function getRandomChar() {
        var chars = "0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ";
        return chars.substr(getRandomNumber(62), 1);
    }

    function randomID(size) {
        var str = "";
        for (var i = 0; i < size; i++) {
            str += getRandomChar();
        }
        return str;
    }

    return randomID(5);
}