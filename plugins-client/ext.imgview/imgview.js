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

    setDocument : function(doc, actiontracker){
        doc.session = doc.getNode().getAttribute("path");
        
        this.loadCanvas(doc);
        
        if (!doc.isInited) {
            doc.isInited = true;
            doc.dispatchEvent("init");
        }
    },
    loadCanvas:function(doc){
        var img = this.img = window.imgEditor.$ext.getElementsByTagName("img")[0];
        var canvas = this.canvas = window.imgEditor.$ext.getElementsByTagName("canvas")[0];
        var ctx = this.ctx = canvas.getContext("2d");
        
        if(doc){
            img.src =  apf.escapeXML(doc.session);
            img.onload = function(){
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.style.display = "block";
                img.style.display = "none";
                ctx.drawImage(img, 0, 0);
            };
        }else{
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.style.display = "block";
            img.style.display = "none";
            ctx.drawImage(img, 0, 0);
        }
    },

    hook : function() {},

    init : function(amlPage) {
        var editor = window.imgEditor;
        var __self = this;
        
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
