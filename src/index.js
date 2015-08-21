var path = require("path");

var objectAssign = require("object-assign");

var toTitleCase = require("titlecase");
var splitFrontMatter = require("front-matter");
var markdownIt = require("markdown-it");
var excerptHtml = require("excerpt-html");

var md2html = markdownIt(); // default

var log = require("sigh-core").log;

export function ensureTitleInfo(event) {
    // TODO: compute from docInfo.[title|slug] if available
    var logicalFileName = path.basename(event.projectPath)
        .replace(/\[(\w+)]/, "") // strip [<id>] TODO: extract constant
        .replace(/\..*$/, ""); // strip anything after a period
    var slug = logicalFileName.replace(/ _/, "-").toLowerCase();
    var title = toTitleCase(logicalFileName.replace(/[\-_]/g, " "));
    eventDocInfo(event).slug = slug;
    eventDocInfo(event).title = title;
    return event;
}

export function ensureExcerpt(event, fileExists) {
    if (fileExists) {
        const excerpt = excerptHtml(event.data);
        eventDocInfo(event).excerpt = (excerpt !== "false") ? excerpt : undefined;
    }
    return event;
}

export var docsInfoByIDReduce = {
    reduceCallback: function documentInfoByIdIndex(memo, event) {
        var docId = event.docInfo.id;
        if (!docId) {
            log.important("No id on file. Not indexing.", event.path);
            return memo;
        }
        if (memo[docId]) {
            log.important("Duplicate file ID?", event.id);
        }
        memo[docId] = objectAssign({contentPath: event.projectPath}, event.docInfo);
        return memo;
    },
    getInitialValue: function () {
        return {};
    },
    filePath: "docsInfoByID.json"
};

export var contentTreeReduce = {
    reduceCallback: function contentTreeIndex(memo, event) {
        function addFileToTree(parentNode, dirElements, docId) {
            if (dirElements.length == 0) {
                // add the docId
                parentNode.docIds.push(docId);
            } else {
                // add the folder
                var currentFolderName = dirElements.shift(); // no dirElements is shortened
                if (!parentNode.folders[currentFolderName]) {
                    parentNode.folders[currentFolderName] = {
                        name: currentFolderName,
                        folders: {},
                        docIds: [] // TODO: sorting?
                    }
                }
                addFileToTree(parentNode.folders[currentFolderName], dirElements, docId);
            }
        }

        var docId = event.docInfo.id;
        if (!docId) {
            log.important("No id on file. Not indexing.", event.path);
            return memo;
        }
        var dirName = path.dirname(event.projectPath).replace(/^content\//, "");
        var dirElements = dirName.split("/");
        addFileToTree(memo, dirElements, docId);
        return memo;
    },
    getInitialValue: function () {
        return {name: "", folders: {}, docIds: []};
    },
    filePath: "contentTree.json"
};

export function eventDocInfo(event) {
    if (!event.docInfo) {
        event.docInfo = {};
    }
    return event.docInfo;
}

export function extractId(event) {
    function idFromFile(event) {
        var match = /\[(\w+)]/.exec(event.path);
        return (match) ? match[1] : undefined;
    }

    eventDocInfo(event).id = idFromFile(event);
    return event;
}

export function transformToJson(event) {
    event.changeFileSuffix("json");
    event.data = JSON.stringify({
        docInfo: event.docInfo,
        content: event.data
    });
    return event;
}

export function extractFrontMatterToDocInfo(event, fileExists) {
    // FIXME: assumes markdown
    if (fileExists) {
        var splitDoc = splitFrontMatter(event.data);
        event.docInfo = splitDoc.attributes;
        event.content = splitDoc.body;
    }
    return event;
}

export function markdownToHtml(event, fileExists) {
    //log(event.path, event.type, fileExists);
    if (fileExists) {
        event.data = md2html.render(event.data);
    }
    return event;
}