sap.ui.define([
    "ui5_one_notes/model/OneNoteParser",
    "ui5_one_notes/model/GraphBuilder",
    "ui5_one_notes/model/EnexExporter",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter","sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment", "sap/m/Token"
], function (OneNoteParser, buildGraph, exportEnex, Controller, JSONModel, Filter, FilterOperator, Fragment, Token) {
    "use strict";

    var TAGS = {
        "": "Indication01",
        "2": "Indication02",
        "3": "Indication03",
        "foo": "Indication04",
        "bar": "Indication05",
        "baz": "Indication06",
        "asd": "Indication07",
        "qwe": "Indication08",
    }

    var customTags = JSON.parse(window.localStorage.getItem("tags") || "null" )
    if (customTags) TAGS = customTags

    function swapReduce(obj){
        return Object.entries(obj).reduce(function(prev, cur){
            prev[cur[1]] = cur[0]
            return prev;
        },{})
    }

    return Controller.extend("ui5_one_notes.Main", {

        onInit: function () {
            var view = this.getView();

            this.highLightDialog = Fragment.load({
                id: view.getId(),
                name: "ui5_one_notes.Highlight",
                controller: this
            }).then(function(dlg) {
                view.addDependent(dlg);

                dlg.setModel(new JSONModel(swapReduce(TAGS)));

                dlg.getEndButton().attachPress(function(e){
                    TAGS = swapReduce(dlg.getModel().getData())
                    window.localStorage.setItem("tags",JSON.stringify(TAGS))
                    dlg.close()
                })

                return dlg
            })

            this.tagsVHDialog = Fragment.load({
                id: view.getId(),
                name: "ui5_one_notes.TagsVHDialog",
                controller: this
            }).then(function(dlg) {
                view.addDependent(dlg);
                var searcher = function(e){
                    e.getSource().getBinding("items").filter([new Filter("tag", FilterOperator.Contains, e.getParameter("value"))]);
                }
                dlg.attachLiveChange(searcher)
                dlg.attachSearch(searcher)
                return dlg;
            })

            this.noteDialog = Fragment.load({
                id: view.getId(),
                name: "ui5_one_notes.NoteDialog",
                controller: this
            }).then(function(dlg) {
                view.addDependent(dlg);

                dlg.getEndButton().attachPress(function(e){
                    dlg.close()
                })

                var input = view.byId("tagsInput");

                input.addValidator(function(args){
                    var text = args.text;
                    return new Token({key: "#"+text, text: "#"+text});
                });

                input.attachTokenUpdate(function (e) {
                    var src = e.getSource()
                    var model = src.getModel()
                    var ctx = src.getBindingContext()
                    var tags = ctx.getProperty("tags") || []
    
                    switch (e.getParameter("type")) {
                        case "added" :
                            e.getParameter("addedTokens").forEach(function (token) {
                                // tags.push({key: token.getKey(), text: token.getText() });
                                tags.push(token.getText());
                            });
                            break;
                        case "removed" :
                            e.getParameter("removedTokens").forEach(function (token) {
                                tags = tags.filter(function (tag) {
                                    // return oContext.key !== token.getKey();
                                    return tag != token.getText();
                                });
                            });
                            break;
                        default: break;
                    }
    
                    model.setProperty("tags", tags, ctx);
                    model.setProperty("tagStr", tags.join(", "), ctx);
                    model.setProperty("/graph", buildGraph(model.getProperty("/items")) )
                });
                return dlg;
            });

            this.graphPopover = Fragment.load({
                id: view.getId(),
                name: "ui5_one_notes.GraphPopover",
                controller: this
            }).then(function(p) {
                view.addDependent(p);
                return p;
            });
            
            var mdl = new JSONModel({
                deleteMode: false,
                items: [{
                    dummy: true,
                    tags:[],
                    title: "Press paste button",
                    date: "To import notes",
                    text: "Select notes in OneNote and press Ctrl+C (or Cmd+C on mac) to get imported text"
                }]
            });
            mdl.setSizeLimit(1000);
            view.setModel(mdl)
        },

        onSearch:function(e){
			var filter = [];
			var q = e.getSource().getValue();
			if (q && q.length > 0) {
                filter.push(new Filter([
                    new Filter("title", FilterOperator.Contains, q),
                    new Filter("text", FilterOperator.Contains, q),
                    new Filter("tagStr", FilterOperator.Contains, q)
                ],false));
            }

            var listBinding = this.byId("gridList").getBinding("items")
			listBinding.filter(filter, "Application")

            var mdl=this.getView().getModel()
            var items = filter.length ? listBinding.getCurrentContexts().map( ctx => ctx.getObject() ) : mdl.getProperty("/items")
            mdl.setProperty("/graph", buildGraph(items) )
            mdl.setProperty("/filteredItems", filter.length ? items.length || '0' : null)

        },

        exportJSON:function(){
			function copyToClipboard(val){
				var dummy = document.createElement("textarea");
				document.body.appendChild(dummy);
				dummy.value = val;
				dummy.select();
				document.execCommand("copy");
				document.body.removeChild(dummy);
			}
            var notes = this.getView().getModel().getProperty("/items")
            copyToClipboard(JSON.stringify(notes));
        },

        importJson:function(){
            var mdl=this.getView().getModel()
            navigator.clipboard.readText().then(function(result){
                try {
                    var items = JSON.parse(result)
                    mdl.setProperty("/items", items )
                    mdl.setProperty("/graph", buildGraph(items) )
                } catch (e){
                    console.log(e)
                }
            })
        },

        exportNotes:function(){

            function downloadBlob(enex){
                const link = document.createElement('a');
                link.setAttribute('download', "export.enex");
                const href = URL.createObjectURL(new Blob([ enex ], {type : "application/xml"}));
                link.href = href;
                link.setAttribute('target', '_blank');
                link.click();
                URL.revokeObjectURL(href);
            }

            var notes = this.getView().getModel().getProperty("/items")
            downloadBlob(exportEnex(notes))

        },

        importNotes:function(){
            var mdl=this.getView().getModel()
            var current = mdl.getProperty("/items")
            if (current.every( i => i.dummy )) current = []
            navigator.clipboard.readText().then(function(result){
                var parser = new OneNoteParser(result)
                var notes = current.concat(parser.getNotes())
                mdl.setProperty("/items", notes )
                mdl.setProperty("/graph", buildGraph(notes) )
            })
        },

        highlightTags:function(){
            this.highLightDialog.then(function(dlg) { dlg.open() })
        },

        formatHighlight:function(tags){
            var highlight = tags ? tags.find(t => TAGS[t.slice(1)]) : "#"
            return highlight ? TAGS[highlight.slice(1)] : 'None'
        },

        showTagsVHDialog:function(e){
            var mdl = this.getView().getModel()
            var src = e.getSource()
            var ctx = src.getBindingContext()
            var tags = ctx.getProperty("tags") || []
            var allTags = mdl.getProperty("/items").reduce(function(prev,cur){ // this is kinda expensive... but..
                cur.tags.filter(function(t){
                    return tags.indexOf(t) < 0 // filter out existing
                }).forEach(function(t){
                    if (!prev[t]) prev[t] = { tag: t }
                })
                return prev
            },{})
            this.tagsVHDialog.then(function(dlg) {
                dlg.setModel(new JSONModel(Object.values(allTags).sort(function(a,b){ 
                    return a.tag > b.tag ? 1 : -1
                })));
                dlg.setTitle("assigned: " + tags.length + ", available: " + Object.keys(allTags).length )
                return new Promise(function(resolve,reject){
                    var resolver = function(e){
                        console.log(e.getParameters())
                        dlg.detachEvent("cancel",rejecter)
                        resolve(e.getParameter("selectedItem").getBindingContext().getProperty("tag"))
                    }
                    var rejecter = function(){
                        dlg.detachEvent("confirm",resolver)
                        reject()
                    }
                    dlg.attachEventOnce("cancel", rejecter)
                    dlg.attachEventOnce("confirm", resolver)
                    dlg.open()
                })
            }.bind(this)).then(function(tag){
                src.addToken(new Token({key: tag, text: tag}))
                tags.push(tag)
                mdl.setProperty("tags", tags, ctx);
                mdl.setProperty("tagStr", tags.join(", "), ctx);
                mdl.setProperty("/graph", buildGraph(mdl.getProperty("/items")) )
            }).catch(function(){
                //do nothing
            })
        },

        bindNoteAndTags:function(ctx){
            this.noteDialog.then(function(dlg) {
                var tags = ctx.getProperty("tags") || []
                this.getView().byId("tagsInput").setTokens(tags.map(function(tag){
                    return new Token({key: tag, text: tag});
                }))
                dlg.bindElement(ctx.getPath())
                dlg.open()
            }.bind(this))
        },

        pressNote:function(e){
            this.bindNoteAndTags(e.getSource().getBindingContext())
        },

        navNote:function(e){
            var currentCtxs = this.byId("gridList").getBinding("items").getCurrentContexts()
            var selectedCtx = e.getSource().getBindingContext()
            var index = currentCtxs.reduce(function(prev, cur, i){
                return cur.getPath() == selectedCtx.getPath() ? i : prev
            }, 0)

            var direction = e.getSource().data("direction")
            var newIndex = direction == "L" ? index-1 : index+1
            if ( newIndex < 0 || newIndex >= currentCtxs.length ) return

            this.bindNoteAndTags(currentCtxs[newIndex])
        },

        toggleDeleteMode:function(e){
            this.byId("gridList").setMode(  e.getParameter("pressed") ? "Delete" : "None" )
        },

        deleteNote:function(e){
            var mdl=this.getView().getModel()
            var note = e.getParameter("listItem").getBindingContext().getObject()
            mdl.setProperty("/items", mdl.getProperty("/items").filter(item => item !== note))
        },

        addNote:function(e){
            var mdl=this.getView().getModel()
            var current = mdl.getProperty("/items")
            var path = "/items/"+current.length
            mdl.setProperty(path, OneNoteParser.prototype.makeNote())
            this.noteDialog.then(function(dlg) {
                this.getView().byId("tagsInput").setTokens([]);
                dlg.bindElement(path)
                dlg.open()
            }.bind(this))
        },

        searchNode:function(e){
            e.preventDefault();
            var key = e.getSource().getBindingContext().getProperty("key")
            var search = this.getView().byId("search")
            search.setValue(key == "#" ? '' : key)
            search.fireSearch()
        },

        showPopover:function(e){
            e.preventDefault();
            
            var src = e.getSource()
            this.graphPopover.then(function(p) {
                p.bindElement(src.getBindingContext().getPath())
                p.openBy(e.getSource())
            })
        }

    });
});