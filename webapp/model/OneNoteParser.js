sap.ui.define([], function () {
	"use strict";

    function OneNoteParser(text){
        this.src = text
        this.notes = this.parseText(this.src)
    }

    OneNoteParser.prototype.parseText = function (src){

        var lines = (src||'').split("\n")
        var title, date, time, text

        function flush(items){
            var tags
            if (title) {
                tags = title.match(/#[^\x00-\x7Fa-zA-z0-9]+/g)
            }
            if(date && text) items.push({ 
                title : title,
                tags: tags,
                tagStr : tags?.join(", "),
                date: date, 
                text: text.join("\n")
            })
        }

        var items = lines.reduce(function(prev,cur, i){

            var newDate = new Date(cur) // we hope that date from OneNote is parsable
            var newTime = lines[i+1]?.match(/(\d{2}):(\d{2})/) // and time is HH:MM
            
            var foundNewDate = !isNaN(newDate) && newTime?.length == 3

            if (foundNewDate) {
                if (text) {
                    text.length-=2 // remove prev title
                    flush(prev)
                }
                time = newTime[0]
                newDate.setHours(newTime[1])
                newDate.setMinutes(newTime[2])
                date = newDate.toLocaleString(undefined, { 
                    year: "numeric", month: "numeric", day: "numeric",
                    hour12: false, hour: "numeric", minute: "numeric"
                })
                title = lines[i-2] || ''
                text = []
            } else {
                if (text && cur!=time) text.push(cur)
            }

            return prev;
        }, [])
        flush(items) // last dude
        return items
    }

    OneNoteParser.prototype.getNotes = function(){
        return this.notes
    }

    OneNoteParser.prototype.getSrc = function(){
        return this.src
    }

	return OneNoteParser;
});