/**
 * Terminal for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */

define(function(require, exports, module) {

var ide = require("core/ide");
var ext = require("core/ext");
var util = require("core/util");
var markup = require("text!ext/terminal/terminal.xml");
var editors = require("ext/editors/editors");
var Terminal = require("ext/terminal/libterm");
var commands = require("ext/commands/commands");
var menus = require("ext/menus/menus");
var settings = require("ext/settings/settings");
var cssString = require("text!ext/terminal/style.css");
var markupSettings = require("text!ext/terminal/settings.xml");
//require console since we use the a:hbox(cliBox) to append the terminal button
require("ext/console/console");

/* globals barTerminal,tabEditors,cliBox,btnCollapseConsole */
Terminal.bindKeys = function() {
    if (Terminal.keysAreBound) return;
    Terminal.keysAreBound = true;

    // We could put an "if (Terminal.focus)" check
    // here, but it shouldn't be necessary.

    apf.addListener(document, 'keydown', function(ev) {
        if (barTerminal.hasFocus() && Terminal.focus)
            Terminal.focus.keyDown(ev);
    }, true);

    apf.addListener(document, 'keypress', function(ev) {
        if (barTerminal.hasFocus() && Terminal.focus)
            Terminal.focus.keyPress(ev);
    }, true);

    apf.addListener(document, 'paste', function(ev) {
        if (barTerminal.hasFocus() && Terminal.focus)
            Terminal.focus.paste(ev);
    }, true);
};

Terminal.prototype.onResize = function(width, height) {
    if (this.preventResize)
        return;

    var container = module.exports.container;

    var x = (width || container.clientWidth) / this.element.offsetWidth;
    var y = (height || container.clientHeight) / this.element.offsetHeight;
    x = (x * this.cols) | 0;
    y = (y * this.rows) | 0;

    this.resize(x, y);

    ide.send({
        command: "ttyResize",
        fd: this.fd,
        cols: x,
        rows: y
    });
};

/**
 * TODO:
 * - bug: paste doesn't work
 * - bug: server crashes when reinstating terminal
 *
 * LATER:
 * - popout feature
 */
module.exports = ext.register("ext/terminal/terminal", {
    name    : "Terminal",
    dev     : "Ajax.org",
    type    : ext.EDITOR,
    markup  : markup,
    offline : false,
    deps    : [editors],
    fileExtensions : ["#!terminal"],

    nodes : [],
    terminals : {},
    requests : {},

    counter : 0,

    focus : function(){
        barTerminal.focus();
        var page = tabEditors.getPage();
        if (!page) return;

        var doc = page.$doc;
        Terminal.focus = doc.terminal;
    },

    getState : function(doc){
        if (!doc.terminal)
            return;

        return {
            // Temporarily disabled to avoid saving and requesting bash history
            // back and forth.
            /*
            "ydisp": doc.terminal.ydisp,
            "y": doc.terminal.y,
            "x": doc.terminal.x,
            "ybase": doc.terminal.ybase,
            "scrollBottom": doc.terminal.scrollBottom,
            "scrollTop": doc.terminal.scrollTop,
            "lines": doc.terminal.lines,
            */
            "fd": doc.terminal.fd,
            "width": barTerminal.lastWidth || barTerminal.getWidth(),
            "height": barTerminal.lastHeight || barTerminal.getHeight(),
            "type": "nofile"
        };
    },

    setState : function(doc, state, terminal){
        for (var prop in state) {
            terminal[prop] = state[prop];
        }

        var lines = terminal.element.childNodes;
        Array.prototype.forEach.call(lines, function(item){
            item.innerHTML = "";
        });

        terminal.scrollDisp(0);
    },

    setDocument : function(doc, actiontracker){
        var _self = this;

        //Remove the previously visible terminal
        if (this.container.firstChild)
            this.container.removeChild(this.container.firstChild);

        if (!doc.terminal && !doc.starting) {
            doc.starting = true;
            doc.editor   = this;

            var node = doc.getNode();
            node.setAttribute("name", node.getAttribute("name").split(".")[0]);

            _self.newTab(function(err, terminal) {
                if (err) {
                    util.alert(
                        "Error opening Terminal",
                        "Error opening Terminal",
                        "Could not open terminal with the following reason:"
                            + err);

                    return;
                }

                // Create a container and initialize the terminal in it.
                terminal.open();
                terminal.container = this.container;
                _self.container.appendChild(terminal.element);
                terminal.onResize();
                
                var cb = function(){
                    if (doc.state) {
                        barTerminal.lastWidth = barTerminal.getWidth();
                        barTerminal.lastHeight = barTerminal.getHeight();

                        terminal.onResize(doc.state.width, doc.state.height);
                        terminal.preventResize = true;
                        terminal.restoringState = true;

                        var timer;
                        terminal.onafterresize = function(){
                            clearTimeout(timer);

                            _self.setState(doc, doc.state, terminal);
                            terminal.preventResize = false;
                            terminal.restoringState = false;

                            terminal.onResize(
                                barTerminal.lastWidth,
                                barTerminal.lastHeight);

                            delete terminal.onafterresize;
                        };

                        timer = setTimeout(function(){
                            terminal.onafterresize();
                        }, 5000);
                        
                        ide.send({
                            command: "ttyPing",
                            fd: doc.state.fd
                        });
                        _self.terminals[doc.state.fd] = terminal;
                    }
                    else {
                        terminal.onResize();
                    }
                };

                //Check if barTerminal is visible or wait for it
                if (apf.window.vManager.check(barTerminal, "term" + terminal.fd, cb))
                    cb();

                apf.addListener(terminal.element, "mousedown", function(){
                    barTerminal.focus();
                });

                menus.addItemByPath("View/Terminals/"
                  + doc.getNode().getAttribute("name"),
                  doc.mnuItem = new apf.item({
                    onclick : function(){
                        tabEditors.set(doc.getNode().getAttribute("path"));
                    }
                }), 300);

                terminal.on("title", function(title){
                    apf.xmldb.setAttribute(doc.getNode(), "name", title);
                    //apf.xmldb.setAttribute(doc.getNode(), "path", title);

                    doc.mnuItem.setAttribute("caption", title);
                });

                doc.terminal = terminal;
                doc.starting = false;
                doc.dispatchEvent("init");
            }, doc.state && doc.state.fd);

            doc.addEventListener("close", function(e){
                if (this.editor != _self || !doc.terminal)
                    return;

                if (doc.mnuItem && doc.mnuItem.parentNode)
                    doc.mnuItem.parentNode.removeChild(doc.mnuItem);

                var el = doc.terminal.element;
                if (el.parentNode)
                    el.parentNode.removeChild(el);

                var fd = doc.terminal.fd;
                if (!fd)
                    return;

                doc.terminal.fd = null;

                ide.send({
                    command: "ttyKill",
                    fd: fd
                });

                doc.terminal.onResize();

                delete _self.terminals[fd];
            });
        }
        else if (doc.terminal){
            this.container.appendChild(doc.terminal.element);

            this.focus();
        }
    },

    hook : function() {
        var _self = this;

        menus.addItemByPath("View/Terminals", null, 195),
        menus.addItemByPath("View/Terminals/New Terminal",
          this.mnuItem = new apf.item({
              command  : "openterminal"
          }), 100),
        menus.addItemByPath("View/Terminals/~", new apf.divider(), 200)

        commands.addCommand({
            name: "openterminal",
            hint: "Opens a new terminal window",
            msg: "opening terminal.",
            bindKey: {mac: "Option-T", win: "Alt-T"},
            exec: function (editor) {
                _self.openNewTerminal();
            }
        });

        ide.addEventListener("settings.load", function(e) {
            settings.setDefaults("auto/terminal", [
                ["fontfamily", "Monaco, Ubuntu Mono, Menlo, Consolas, monospace"],
                ["fontsize", "12"],
                ["blinking", "true"],
                ["scrollback", "1000"]
            ]);
        });

        settings.addSettings("Terminal", markupSettings);
        
        cliBox.appendChild(new apf.button(
            {
                "skin":"c9-simple-btn", 
                "class":"btn-terminal", 
                "margin": "6 0 0 4", 
                "caption":"Open a Terminal",
                "icon" : "terminal_tab_icon.png",
                "onclick": "require('ext/terminal/terminal').openNewTerminal();"
            }), btnCollapseConsole);
        cliBox.appendChild(new apf.divider(
            {
                "skin":"divider_console",  
                "margin": "2 0 2 7"
            }), btnCollapseConsole);
        
        
    },

    init : function() {
        var _self = this;
        var editor = barTerminal;

        apf.importCssString(cssString);

        barTerminal.$focussable = true;
        this.container = barTerminal.firstChild.$ext;
        barTerminal.firstChild.$isTextInput = function(){return true};
        barTerminal.firstChild.disabled = false;

        //Nothing to save
        ide.addEventListener("beforefilesave", function(e) {
            var page = tabEditors.getPage();
            return !(page && page.$doc && (page.$doc.terminal || page.$doc.starting));
        });

        editor.show();

        /* Initialize the Terminal */

        ide.addEventListener("socketMessage", function (evt) {
            var message = evt.message;
            if (message.command === "ttyCallback"
              || message.command === "ttyData"
              || message.command === "ttyGone"
              || message.command === "ttyResize") {
                _self[message.command](message);
                //console.log(message.command,message);
                settings.save();
            }
        });

        barTerminal.addEventListener("blur", function(){
            Terminal.focus = null;
            var cursor = document.querySelector(".terminal .reverse-video");
            if (cursor && apf.isTrue(settings.model.queryValue("auto/terminal/blinking")))
                cursor.parentNode.removeChild(cursor);
            barTerminal.setAttribute("class", "c9terminal");
        });

        barTerminal.addEventListener("focus", function(e){
            barTerminal.setAttribute("class", "c9terminal c9terminalFocus");
        });

        // Keep the terminal resized
        barTerminal.addEventListener("resize", function() {
            if (!this.$ext.offsetWidth && !this.$ext.offsetHeight)
                return;

            this.lastWidth = this.getWidth();
            this.lastHeight = this.getHeight();

            for (var fd in _self.terminals) {
                var el = _self.terminals[fd].element;
                if (el.parentNode && el.offsetHeight)
                    _self.terminals[fd].onResize();
            }
        });

        barTerminal.addEventListener("prop.blinking", function(e){
            Terminal.cursorBlink = apf.isTrue(e.value);
        });
        barTerminal.addEventListener("prop.fontfamily", function(e){
            apf.setStyleRule(".c9terminal .c9terminalcontainer .terminal",
                "font-family",
                e.value || "Ubuntu Mono, Monaco, Menlo, Consolas, monospace");
        });
        barTerminal.addEventListener("prop.fontsize", function(e){
            apf.setStyleRule(".c9terminal .c9terminalcontainer .terminal",
                "font-size",
                e.value ? e.value + "px" : "10px");
        });
        barTerminal.addEventListener("prop.scrollback", function(e){
            Terminal.scrollback = parseInt(e.value) || 1000;
        });

        // Check if all terminals are still active
        ide.addEventListener("afteronline", function(){
            for (var fd in _self.terminals) {
                ide.send({
                    command: "ttyPing",
                    fd: fd
                });
            }
        });
        
        if(ide.connected){
            for (var fd in _self.terminals) {
                ide.send({
                    command: "ttyPing",
                    fd: fd
                });
            }
        }
        
    },
    
    openNewTerminal: function(){
        editors.gotoDocument({
            path: "Terminal" + (++this.counter) + ".#!terminal",
            type: "nofile"
        });
    },
    
    // Serialize a callback
    request : function (callback) {
        var reqId;
        while (this.requests.hasOwnProperty(reqId = Math.random() * 0x100000000));
        this.requests[reqId] = callback;
        return reqId;
    },

    // [reqId, fd]
    ttyCallback: function(message) {
        var reqId = message.reqId;
        var request = this.requests[reqId];
        delete this.requests[reqId];

        request(message.error, message);
    },

    // [fd, data]
    ttyData: function(message) {
        var term = this.terminals[message.fd];
        if (term) {
            term.write(message.data);
        }
    },

    // []
    ttyResize : function(message){
        var term = this.terminals[message.fd];
        if (term && term.onafterresize) {
            term.onafterresize();
            delete term.onafterresize;
        }
    },

    // []
    ttyGone : function(message){
        var term = this.terminals[message.fd];
        if (term)
            this.restart(term);
    },

    newTab: function (callback, fd) {
        var _self = this;
        var terminal = new Terminal(80, 24, function(data) {
            if (!terminal.fd || terminal.reconnecting || terminal.terminated) {
                console.warn("Dropping input", data);
                return;
            }
            ide.send({
                command: "ttyData",
                fd: terminal.fd,
                data: data
            });
        });

        var cb = function(err, message) {
            if (err)
                return callback(err, terminal);

            terminal.fd = message.fd;
            _self.terminals[message.fd] = terminal;
            callback(null, terminal);
        };

        if (!fd) {
            var reqId = this.request(cb);

            ide.send({
                command: "ttyCreate",
                reqId: reqId
            });
        }
        else {
            cb(null, {fd: fd});
        }
    },

    restart : function(terminal){
        var _self = this;

        if (terminal.reconnecting || terminal.restoringState)
            return;

        terminal.writeln("");
        terminal.write("Connection Terminated. Reconnecting...");
        terminal.reconnecting = true;

        var cb = function(err, message) {
            terminal.reconnecting = false;

            if (err) {
                terminal.writeln(" Failed.");
                terminal.terminated = true;
                return;
            }

            terminal.writeln(" Done.");

            if (terminal.fd)
                delete _self.terminals[terminal.fd];

            terminal.fd = message.fd;
            _self.terminals[message.fd] = terminal;
        };

        var reqId = this.request(cb);

        ide.send({
            command: "ttyCreate",
            reqId: reqId
        });
    }
});

});
