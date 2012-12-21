/**
 * Terminal Module for the Cloud9 IDE
 *
 * @copyright 2012, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {
"use strict";

function Monitor (terminal) {
    this.$terminal = terminal;
    var prompt = window.cloud9config.workspaceId.split("/").slice(1).join("@");
    this.$promptRegex = new RegExp(".*" + prompt + ".*\\$\\s?");
    this.acc = "";
}

var portHostMsg = "Error: you may be using the wrong PORT & HOST for your server app\r\n";

Monitor.errors = [
    {
        // Sudo not supported
        pattern: new RegExp("bash: /usr/bin/sudo: Permission denied"),
        message: "Sorry, you don't have sudo access on the gear"
    },
    {
        // Rails or Sinatra
        pattern: new RegExp("WARN  TCPServer Error: (?:Address already in use|Permission denied) - bind\\(2\\)"),
        message: portHostMsg + "For rails, use: 'rails s -p $PORT -b $IP'\r\n" +
            "For Sinatra, use: ruby app.rb -p $PORT -o $IP'"
    },
    {
        // Node app
        pattern: new RegExp("Error: listen (?:EADDRINUSE|EACCES)"),
        message: portHostMsg + "Node: use 'process.env.PORT' as the port and 'process.env.IP' as the host in your app scripts"
    },
    {
        // Django app
        pattern: new RegExp("Error: You don't have permission to access that port."),
        message: portHostMsg + "use './manage.py runserver $IP:$PORT' to run your Django app"
    }
];

Monitor.servers = [
    new RegExp("Express server listening on port"),
    new RegExp("INFO  WEBrick::HTTPServer#start: pid=\\d+ port=\\d+"),
    new RegExp("Django (?:.|\\s)*Development server is running at ")
];

(function () {

    this.onData = function  (data) {
        var _self = this;
        this.acc += data;

        // remove ESC characters
        function strip (str) {
            return str.replace(/\u001B/g, "");
        }
        var r = this.$promptRegex.exec(this.acc);
        var acc = strip(this.acc);
        if (r) {
            // this.originalPs1 = r[0];
            this.checkErrors(acc);
            this.acc = "";
        }
        else if (this.checkRunningApp(acc)) {
            this.acc = "";
        }
    };

    this.checkErrors = function (str) {
        for (var i = 0; i < Monitor.errors.length; i++) {
            var err = Monitor.errors[i];
            if (err.pattern.test(str))
                this.formatMsg(err.message);
        }
    };

    this.checkRunningApp = function (str) {
        var _self = this;
        for (var i = 0; i < Monitor.servers.length; i++) {
            if (Monitor.servers[i].test(str)) {
                // TODO maybe better way to construct app url ?
                var workspace = window.cloud9config.workspaceId.split("/");
                var appUrl = "https://" + workspace[2] + "." + workspace[1] + ".c9.io";
                setTimeout(function() {
                    _self.formatMsg("Your application is running at \u001B[04;36m" + appUrl);
                }, 0);
                return true;
            }
        }
    };

    this.formatMsg = function (msg) {
        var lines = msg.split("\r\n");
        var cloudyMsg = [" \u001B[30;47m\u001B[01;38;7;32m      \u001B[00m  ",
        "\u001B[00m\u001B[30;47m\u001B[01;38;7;32m Cloud9 \u001B[00m ",
        "\u001B[00m \u001B[30;47m\u001B[01;38;7;32m      \u001B[00m  "];
        this.$terminal.writeln("");
        var startLine = lines.length < cloudyMsg.length ? 1 : 0;
        for (var i = 0, n = Math.max(cloudyMsg.length, lines.length); i < n; i++) {
            this.$terminal.writeln((cloudyMsg[i] || new Array(7).join(" ")) +
                "\u001B[36m" + (lines[i-startLine] || ""));
        }
        this.$terminal.write("\u001B[00m");
    };

}).call(Monitor.prototype);

module.exports = Monitor;

});