sap.ui.define([], function () {
	"use strict";

    function OneNoteParser(text){
        this.src = text
        this.notes = this.parseText(this.src)
    }

    OneNoteParser.prototype.makeNote = function (title, text, tags, date){
        if (!date) date = new Date()
        return { 
            title : title || "",
            tags: tags || [],
            tagStr : tags?.join(", ") || "",
            date: date.toLocaleString(undefined, { 
                year: "numeric", month: "numeric", day: "numeric",
                hour12: false, hour: "numeric", minute: "numeric"
            }),
            dateISO: date.toISOString(),
            text: text ? text.join("\n") : ""
        }
    }

    OneNoteParser.prototype.parseText = function (src){

        var makeNote = this.makeNote.bind(this)
        var lines = (src||'').split("\n")
        var title, date, time, text

        function flush(items){
            var tags
            if (title) {
                tags = title.match(/#[\p{L}\p{N}]+/gu) // unicode modifier was supported for a while..
            }
            if(date && text) items.push(makeNote(title, text, tags, date))
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
                date = newDate
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