/**
 * Code Editor for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */


define(function(require, exports, module) {

var ide = require("core/ide");
var ext = require("core/ext");
var fs = require("ext/filesystem/filesystem");
var markup = require("text!ext/imgview/imgview.xml");
var editors = require("ext/editors/editors");
var Pixastic = require("ext/imgview/pixastic/pixastic");

module.exports = ext.register("ext/imgview/imgview", {
    name    : "Image Viewer",
    dev     : "Ajax.org",
    fileExtensions : [
        "bmp",
        "djv",
        "djvu",
        "gif",
        "ico",
        "jpg",
        "jpeg",
        "pbm",
        "pgm",
        "png",
        "pnm",
        "ppm",
        "psd",//doest not work in browser with out a plugin
        "tiff",
        "xbm",
        "xpm"
    ],
    type    : ext.EDITOR,
    markup  : markup,
    deps    : [editors],

    nodes : [],
    
    loadedFiles:{},
    
    setDocument : function(doc, actiontracker){
        doc.session = doc.getNode().getAttribute("path");
        
        var path = apf.escapeXML(doc.session);
        this.loadCanvas(path);
        
        if (!doc.isInited) {
            doc.isInited = true;
            doc.dispatchEvent("init");
        }
    },
    loadCanvas:function(path){
        var _self = this;
        var ctx = this.canvas.getContext("2d");
        
        if(path && !_self.loadedFiles[path]){
            _self.img.onload = function(){
                _self.canvas.width = _self.img.width;
                _self.canvas.height = _self.img.height;
                _self.canvas.style.display = "block";
                _self.img.style.display = "none";
                ctx.drawImage(_self.img, 0, 0);
                _self.loadedFiles[path] = _self.canvas.toDataURL();
            };
            _self.img.src =  path;
        }else{
            _self.img.onload = function(){
                _self.canvas.width = _self.img.width;
                _self.canvas.height = _self.img.height;
                _self.canvas.style.display = "block";
                _self.img.style.display = "none";
                ctx.drawImage(_self.img, 0, 0);
            };
            _self.img.src =  _self.loadedFiles[path];
        }
    },
    currentTool:null,
    
    toolActions:function(apfButton,action,group){
        
        var __self = this;
        
        var selected = apfButton.parentNode.$ext.getElementsByClassName('ui-btn-blue3');
        if(selected.length)
        for(var i in selected){
            var ele = selected[i];
            __self.cssClass(ele).remove('ui-btn-blue3');
        }
        
        switch( action ){
            case "toolSelectRect":
                __self.cssClass(apfButton.$ext).add('ui-btn-blue3');
                __self.selectedTool = action;
                break;
            case "toolSelectWond":
                __self.cssClass(apfButton.$ext).add('ui-btn-blue3');
                __self.selectedTool = action;
                break;
            default:
                __self.cssClass(apfButton.$ext).add('ui-btn-blue3');
                break;
        }
    },
    
    cssClass: function(el) {
        return {
            has: function(name) {
                return new RegExp('(\\s|^)' + name + '(\\s|$)').test(el.className);
            },
            add: function(name) {
                if (!this.has(name)) {
                    el.className += (el.className ? ' ' : '') + name;
                }
            },
            remove: function(name) {
                if (this.has(name)) {
                    el.className = el.className.replace(new RegExp('(\\s|^)' + name + '(\\s|$)'), ' ').replace(/^\s+|\s+$/g, '');
                }
            },
            toggel: function(name) {
                if (this.has(name)) {
                    this.remove(name);
                }else{
                    this.add(name);
                }
            }
        };
    },
    
    hook : function() {
        
    },

    init : function(amlPage) {
        var editor = window.imgEditor;
        window.imgEditor.$editor = {};
        var __self = this;
        this.img = window.imgEditor.$ext.getElementsByTagName("img")[0];
        this.canvas = window.imgEditor.$ext.getElementsByTagName("canvas")[0];
        
        var isMoueDown = false;
        this.canvas.onmousemove=function(e){
            if(isMoueDown){
                console.log(e.layerX , e.layerY);
            }
        };
        this.canvas.onmousedown=function(e){
            isMoueDown = true;
            console.log(e.layerX , e.layerY);
            //start selection
        };
        window.onmouseup=function(e){
            
            if(isMoueDown){
                console.log(e.layerX , e.layerY);
            }
            isMoueDown = false;
            //stop selection
        };
        
        function saveCanvas(path,dataURL){
            var binary = atob(dataURL.split(',')[1]);
                
            if (!fs.webdav)
            return false;
            
            //sPath, sContent, bLock, oBinary, callback
            fs.webdav.write(path, binary, null, {filename:path.replace(ide.davPrefix,"")}, function(data, state, extra) {
                if ((state == apf.ERROR && extra.status == 400 && extra.retries < 3) || state == apf.TIMEOUT)
                    return extra.tpModule.retry(extra.id);
    
                console.log(data, state, extra);
                return false;
            });
        }
        
        ide.addEventListener("beforefilesave",function(e) {
            
            var path = e.node && e.node.getAttribute("path");
            if (!path)
                return;
            
            if (editor.value == path){
            
                var dataURL = __self.canvas.toDataURL();
                saveCanvas(path,dataURL)
                
                return false;
            }
        } );
        ide.addEventListener("afterfilesave",function(e){
            console.log("afterfilesave");
            var path = e.node && e.node.getAttribute("path");
            if (!path)
                return;
            
            var newPath = e.doc && e.doc.getNode && e.doc.getNode().getAttribute("path");
                
            if (editor.value == e.oldpath && newPath !== e.oldpath){
                
                var dataURL = __self.canvas.toDataURL();
                
                saveCanvas(newPath,dataURL);
                
                return false;
            }
        } );

        //amlPage.appendChild(editor);
        editor.show();

        this.imgEditor = this.amlEditor = editor;
        editor.$self = this;
        //this.nodes.push();
        if(!this.imgEditor.focus)
            this.imgEditor.focus = function(){ return false;};
    },
    Rotate90CW : function() {
            //copyCanvas
        var newcanvas = document.createElement("canvas");
        newcanvas.width = this.canvas.width;
        newcanvas.height = this.canvas.height;
        newcanvas.getContext("2d").drawImage(this.canvas, 0, 0);
        this.canvas.width = newcanvas.height;
        this.canvas.height = newcanvas.width;
        
        var ctx = this.canvas.getContext("2d");
        ctx.save();
        ctx.rotate(90 * Math.PI / 180);
        ctx.drawImage(newcanvas, 0, - newcanvas.height);
        ctx.restore();
        
        return true;
    
    },
    Rotate90CCW : function() {
        //copyCanvas
        var newcanvas = document.createElement("canvas");
        newcanvas.width = this.canvas.width;
        newcanvas.height = this.canvas.height;
        newcanvas.getContext("2d").drawImage(this.canvas, 0, 0);
        this.canvas.width = newcanvas.height;
        this.canvas.height = newcanvas.width;
        
        var ctx = this.canvas.getContext("2d");
        ctx.save();
        ctx.translate(0, this.canvas.height);
        ctx.rotate(-90 * Math.PI / 180);
        ctx.drawImage(newcanvas, 0, 0);
        ctx.restore();
        return true;
    },
    pixastic: function() {
        var _self = this;
        
        var P = new Pixastic(_self.canvas.getContext("2d"));
        P[arguments[0]](arguments[1] || {} ).done(function() {
            //_self.canvas.style.display = "block";
        });
    }
});

});
