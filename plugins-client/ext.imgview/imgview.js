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
        
        //P = new Pixastic(ctx);
        
        if (!doc.isInited) {
            doc.isInited = true;
            doc.dispatchEvent("init");
        }
    },
    loadCanvas:function(doc){
        var img = this.img = imgEditor.$ext.getElementsByTagName("img")[0];
        var canvas = this.canvas = imgEditor.$ext.getElementsByTagName("canvas")[0];
        var ctx = this.ctx = canvas.getContext("2d");
        
        if(doc){
            img.src =  apf.escapeXML(doc.session);
            img.onload = function(){
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.style.display = "block";
                img.style.display = "none";
                ctx.drawImage(img, 0, 0);
            }
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
        var editor = imgEditor;
        var __self = this;
        
        var saveCanvas=function(e) {
            
            var path = e.node && e.node.getAttribute("path");
            if (!path)
                return;
            
            if (editor.value == path){
            
                var dataURL = __self.canvas.toDataURL();
                
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
                
                return false;
            }
        };
        ide.addEventListener("beforefilesave",saveCanvas );
        ide.addEventListener("afterfilesave",function(e){
            console.log("afterfilesave");
            var path = e.node && e.node.getAttribute("path");
            if (!path)
                return;
            
            var newPath = e.doc && e.doc.getNode && e.doc.getNode().getAttribute("path");
                
            if (editor.value == e.oldpath && newPath !== e.oldpath){
                
                var dataURL = __self.canvas.toDataURL();
                
                var binary = atob(dataURL.split(',')[1]);
                
                if (!fs.webdav)
                return false;
                
                //sPath, sContent, bLock, oBinary, callback
                fs.webdav.write(newPath, binary, null, {filename:path.replace(ide.davPrefix,"")}, function(data, state, extra) {
                    if ((state == apf.ERROR && extra.status == 400 && extra.retries < 3) || state == apf.TIMEOUT)
                        return extra.tpModule.retry(extra.id);
        
                    console.log(data, state, extra);
                    return false;
                });
                
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
    isEditing: false,
    save : function(button) {
        
        if(button.caption == "Edit"){
            this.loadCanvas();
            button.setCaption("Save");
        }else{
            this.img.onload = function(){};
            this.canvas.style.display = "none";
            this.img.style.display = "block";
            this.img.src = this.canvas.toDataURL();
            button.setCaption("Edit");
        };
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
    }
});

});
