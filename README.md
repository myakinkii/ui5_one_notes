# What it is about
It is a small tool I created when I faced an issue exporting multiple notes from my OneNote (on mac)

The goal of this app was to allow me to see notes and relations between them (based on tags) and also to export it to any more or less open format

https://evernote.com/blog/how-evernotes-xml-export-format-works

https://joplinapp.org/help/apps/import_export/

## How to run:
* obviously, make sure you have node/npm installed
* ``npm i``
* ``npm start``

## How to use
* Start app with ``npm start`` and open http://localhost:8080/index.html (was tested to work at least in chrome)
* Select and Copy notes in OneNote (clipboard ctrl/cmd + C)
* Press paste button (clipboard icon + "text" caption) to read stuff from clipboard (chrome will ask permission)
* Press export button (save icon + "enex" caption) to export into ENEX format (file download must be triggered)

### JSON import/export
* For now cloud up/down icons with "json" caption are there to import/export raw json that app uses

## Features supported
* export to json/xml(enex evernote, joplin)
* tags graph vizualization

## If it did not work for you (or stopped working at all)
If you need some help with your notes, please follow instructions in [Discussions](https://github.com/myakinkii/ui5_one_notes/discussions)
