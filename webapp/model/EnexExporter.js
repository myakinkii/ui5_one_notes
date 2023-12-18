sap.ui.define([], function () {
	"use strict";

const app = "ui5_one_notes"
const version = "web"

return function(exportNotes, exportDate){

    const today = exportDate || (new Date()).toISOString()

    const notes = exportNotes.map( note=> {
        const { title, text, date, tags } = note
        return `<note>
            <title>${title}</title>
            <content>
                <![CDATA[<?xml version="1.0" encoding="UTF-8" standalone="no"?>
                    <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
                    <en-note><div>${ text.split("\n").join('<br />') }</div></en-note>
                ]]>
            </content>
            <created>${ (new Date(date)).toISOString() }</created>
            ${ tags ? tags.map( t => `<tag>${t}</tag>` ).join('\n') : '' }
        </note>`
    })

    return `<?xml version="1.0" encoding="UTF-8"?>
            <!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export3.dtd">
            <en-export export-date="${today}" application="${app}" version="${version}">
                ${notes.join('\n')}
            </en-export>`
}

})