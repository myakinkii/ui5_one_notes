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
                items: [{
                    dummy: true,
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

        pressNote:function(e){
            var src = e.getSource()
            var ctx = src.getBindingContext()
            this.noteDialog.then(function(dlg) {
                var tags = ctx.getProperty("tags") || []
                this.getView().byId("tagsInput").setTokens(tags.map(function(tag){
                    return new Token({key: tag, text: tag});
                }))
                dlg.bindElement(ctx.getPath())
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
        },

        onDrop: function (oInfo) {
            var oDragged = oInfo.getParameter("draggedControl"),
                oDropped = oInfo.getParameter("droppedControl"),
                sInsertPosition = oInfo.getParameter("dropPosition"),
                oGrid = oDragged.getParent(),
                oModel = this.getView().getModel(),
                aItems = oModel.getProperty("/items"),
                iDragPosition = oGrid.indexOfItem(oDragged),
                iDropPosition = oGrid.indexOfItem(oDropped);

            // remove the item
            var oItem = aItems[iDragPosition];
            aItems.splice(iDragPosition, 1);

            if (iDragPosition < iDropPosition) {
                iDropPosition--;
            }

            // insert the control in target aggregation
            if (sInsertPosition === "Before") {
                aItems.splice(iDropPosition, 0, oItem);
            } else {
                aItems.splice(iDropPosition + 1, 0, oItem);
            }

            oModel.setProperty("/items", aItems);
        }

    });
});