"use strict";

var util = require("util");

var Plugin = require("../cloud9.core/plugin");

var pty = require("pty.js");

var name = "terminal";
var ProcessManager;
var EventBus;
var PluginOptions = {};
module.exports = function setup(options, imports, register) {
    PluginOptions = options;
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

    this.ptys= {};
    this.ptysCount = 0;
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
        var _self = this;
        var msg = message;
        var cmd = message.command ? message.command : "";
        /* sendable commands
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
        
        //doo stuff
        var term;
        if(msg && msg.fd && !_self.ptys[msg.fd]){
            client.send({
                command:"ttyGone",
                fd:msg.fd
            });
        }
        if(msg && msg.fd && _self.ptys[msg.fd]){
            term = _self.ptys[msg.fd];
            if(!term){
                client.send({
                    command:"ttyGone",
                    fd:msg.fd
                });
                return true;
            }
        }
        if(cmd == "ttyCreate"){
       
            if(PluginOptions.isSSH){
                term = pty.spawn("ssh", [PluginOptions.host], {
                    name: 'xterm-color',
                    cols: 80,
                    rows: 24
                });
            }else{
                term = pty.spawn("bash", [], {
                    name: 'xterm-color',
                    cols: 80,
                    rows: 24,
                    cwd: PluginOptions.cwd || process.env.HOME,
                    env: process.env
                });
            }
            _self.ptysCount++;
            
            _self.ptys[term.fd] = term;
            
            term.reqId = message.reqId;
            term.lastData = "";
            client.send({
                    command:"ttyCallback",
                    fd:term.fd,
                    reqId:term.reqId
                });
            
            term.on("data", function(data) {
                term.lastData = data;
                for(var i in user.clients){
                    var $client = user.clients[i];
                    $client.send({
                        command:"ttyData",
                        fd:term.fd,
                        data:data
                    });
                }
            });
        }
        
        if(cmd == "ttyData"){
            if(_self.ptys[msg.fd]){
                term.write(msg.data);
            }else{
                client.send({
                    command:"ttyGone",
                    fd:msg.fd
                });
            }
        }
        if(cmd == "ttyKill"){
            if(_self.ptys[msg.fd]){
                term.destroy();
                _self.ptysCount--;            
            }
        }
        if(cmd == "ttyResize"){
            if(_self.ptys[msg.fd]){
                try{
                    term.resize(msg.cols, msg.rows);
                }catch(e){}
                client.send({
                    command:"ttyResize",
                    fd:msg.fd
                });
            }
        }
        if(cmd == "ttyPing"){
            if(term)
                client.send({
                    command:"ttyData",
                    fd:term.fd,
                    data:term.lastData
                });
            else
                client.send({
                    command:"ttyGone",
                    fd:msg.fd
                });
        }
        return true;
    };

    this.canShutdown = function() {
        return true;
    };

}).call(TerminalPlugin.prototype);
