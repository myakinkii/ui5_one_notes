sap.ui.define([], function () {
	"use strict";

    return function(notes){

        var calcPairs = (tag, tags) =>  tags.map( t => `${tag}_${t}`)
        
        var links = (notes||this.notes).reduce(function(prev,cur){

            var pairs=[]
            if ( !cur.tags || cur.tags.length==0 ) {
                pairs=["#_#"] // if no tags found, put to special graph node
            } else {
                var tags = [].concat(cur.tags) // clone
                
                if( tags.length>1 ){
                    tags.sort()
                    while (tags.length>0){
                        var t = tags.shift()
                        pairs = pairs.concat(calcPairs(t,tags))
                    }
                } else {
                    pairs=[`${tags[0]}_${tags[0]}`]
                }                    
            }
            
            pairs.forEach(function(key){
                if (!prev[key]) prev[key]={ notes:[], key: key }
                prev[key].notes.push(cur)
            })
            return prev
        },{})


        var graph = Object.values(links).reduce(function(prev,cur){
            var keys = cur.key.split("_")

            keys.forEach(function(k,i){
                if (!prev.groups[k]) prev.groups[k] = { key: k }
                if (!prev.nodes[k]) prev.nodes[k] = { key: k, notes:{} }
                cur.notes.forEach(function(n){
                    var key = btoa(encodeURIComponent(n.title+n.date))
                    if (!prev.nodes[k].notes[key]) prev.nodes[k].notes[key]=n 
                })
            })

            if (keys[0]!=keys[1]){ // lines
                prev.lines.push({ from: keys[0], to:keys[1], notes: cur.notes })
            }
            return prev
        }, { groups:{}, nodes:{}, lines:[] })

        return graph
    }
})