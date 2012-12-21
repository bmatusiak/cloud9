"use strict";

var util = require("util");

var Plugin = require("../cloud9.core/plugin");

var pty = require("pty.js");

var name = "terminal";
var ProcessManager;
var EventBus;

module.exports = function setup(options, imports, register) {
    ProcessManager = imports["process-manager"];
    EventBus = imports.eventbus;
    imports.ide.register(name, TerminalPlugin, register);
};

var TerminalPlugin = function(ide, workspace) {
    Plugin.call(this, ide, workspace);

    this.pm = ProcessManager;
    this.eventbus = EventBus;
    this.workspaceId = workspace.workspaceId;
    this.channel = this.workspaceId + "::terminal";

    this.hooks = ["command"];
    this.name = "terminal";

    this.gitEnv = {
        GIT_ASKPASS: "/bin/echo",
        EDITOR: "",
        GIT_EDITOR: ""
    };

    this.processCount = 0;
};

util.inherits(TerminalPlugin, Plugin);

(function() {
    
    this.init = function() {
        var self = this;
        this.eventbus.on(this.channel, function(msg) {
            self.ide.broadcast(JSON.stringify(msg), self.name);
        });
    };
    
    this.command = function (user, message, client) {
        var self = this;
        function sendCmd(cmd,data){
            client.send({
                command: cmd,
                message: data
            });
        }
        var cmd = message.command ? message.command : "";
        /*
            "ttyCallback"
            "ttyData"
            "ttyGone"
            "ttyResize"
        */
        
        switch(cmd){
            case "ttyCreate":
                break;
            case "ttyResize":
                break;
            case "ttyKill":
                break;
            case "ttyPing":
                break;
            case "ttyData":
                break;
            default://not one of our commands!!!
                return false;
        }

        console.log(message);
        //doo stuff
        
        if(cmd == "ttyCreate"){
            var term = pty.spawn("ssh", ["bmatusiak@dev.shcdn.biz"], {
                name: 'xterm-color',
                cols: 80,
                rows: 24
            });
            
            sendCmd("ttyCallback",{reqId:message.reqId, fd:term.fd})
            
            term.on("data", function(data) {
              sendCmd("ttyData",{fd:term.fd,data:data})
            });
        }

        return true;
    };

    this.canShutdown = function() {
        return true;
    };

}).call(TerminalPlugin.prototype);