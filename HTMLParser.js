
const fs = require("fs");
const path = require('path');
const { parse } = require('node-html-parser');
const htmlparser = parse;
const Story = require('./Story.js');
const Passage = require('./Passage.js');
/**
 * @class HTMLParser
 * @module HTMLParser
 */
class HTMLParser {
	/**
     * @method HTMLParser
     * @constructor
     */
    constructor (inputFile) {
        this.inputFile = inputFile;
        this.inputContents = "";
        this.outputContents = "";

        this.dom = null;
        this.story = null;

        this.readFile(this.inputFile);
        this.parse();
    }

    readFile(file) {

        // Attempt to find the file
        if(fs.existsSync(file) ) {

            this.inputContents = fs.readFileSync(file, 'utf8');

        } else {

            throw new Error("Error: File not found!");
        
        }

    }

    parse() {

        // Send to node-html-parser
        // Enable getting the content of 'script', 'style', and 'pre' elements
        // Get back a DOM
        this.dom = new htmlparser(
                        this.inputContents, 
                        {
                                  lowerCaseTagName: false,
                                  script: true,
                                  style: true,
                                  pre: true
                        });

        // Pull out the tw-storydata element
        let storyData = this.dom.querySelector('tw-storydata');

        if(storyData != null) {

            this.story = new Story();
            this.story.name = storyData.attributes["name"];
            this.story.creator = storyData.attributes["creator"];
            this.story.creatorVersion = storyData.attributes["creator-version"];

            this.story.metadata = {};
            this.story.metadata.ifid = storyData.attributes["ifid"];
            this.story.metadata.format = storyData.attributes["format"];
            this.story.metadata.formatVersion = storyData.attributes["format-version"];
            this.story.metadata.zoom = storyData.attributes["zoom"];
            this.story.metadata.start = storyData.attributes["startnode"];

        } else {

            throw new Error("Error: Not a Twine 2-style file!");

        }

        // Pull out the tw-passagedata elements
        let storyPassages = this.dom.querySelectorAll("tw-passagedata");

        // Create an empty array
        this.story.passages = new Array();

        // Add StoryTitle
        this.story.passages.push(
            new Passage(
                "StoryTitle", 
                "",
                {}, 
                this.story.name
            )
        );

        // Add StoryMetadata
        this.story.passages.push(
            new Passage(
                "StoryMetadata", 
                "",
                {}, 
                JSON.stringify(this.story.metadata, null, 4)
            )
        );

        // Move through the passages
        for(let passage in storyPassages) {

            // Get the passage attributes
            let attr = storyPassages[passage].attributes;
            // Get the passage text
            let text = storyPassages[passage].rawText;

            // Split the string into an array
            let position = attr.position;

            // Split the string into an array
            let size = attr.size;

            // Escape the name
            let name = this._escapeMetacharacters(attr.name);

            let tags = new String();

            // Escape any tags
            // (Attributes can, themselves, be emtpy strings.)
            if(attr.tags.length > 0 && attr.tags != '""') {

                tags = this._escapeMetacharacters(attr.tags);

            }
            
            // Check if "Start" is, in fact, the Start passage
            if(attr.pid == "1" && name != "Start") {

                this.story.metadata.start = name;

            } else {

                // Start exists, so remove this optional property
                delete this.story.metadata.start;

            }

            // Add a new Passage into an array
            this.story.passages.push(
                new Passage(
                        name, 
                        tags,
                        {
                            "position": position,
                            "size": size

                        }, 
                        text
                    )
            );

        }


        let styleElement = this.dom.querySelector('#twine-user-stylesheet');

        // Check if there is any content.
        // If not, we won't add empty passages
        if(styleElement.rawText.length > 0) {

            // Add UserStylesheet
            this.story.passages.push(
                new Passage(
                    "UserStylesheet", 
                    "style",
                    {}, 
                    styleElement.rawText
                )
            );
        }
        

        let scriptElement = this.dom.querySelector('#twine-user-script');

        // Check if there is any content.
        // If not, we won't add empty passages
        if(scriptElement.rawText.length > 0) {

            // Add UserScript
            this.story.passages.push(
                new Passage(
                    "UserScript", 
                    "script",
                    {}, 
                    scriptElement.rawText
                )
            );

        }
    }

    _escapeMetacharacters(text) {

        let result = text;

        let leftCurly = text.indexOf('\{');
       
        if(leftCurly != -1) {
           
            result = result.substring(0, leftCurly) + '\\' + result.substring(leftCurly);
        }

        let rightCurly = text.indexOf('\}');

        if(rightCurly != -1) {

            result = result.substring(0, rightCurly) + '\\' + result.substring(rightCurly);
        }

        let leftSquare = text.indexOf('\[');

        if(leftSquare != -1) {

            result = result.substring(0, leftSquare) + '\\' + result.substring(leftSquare);
        }

        let rightSquare = text.indexOf('\]');

        if(rightSquare != -1) {

            result = result.substring(0, rightSquare) + '\\' + result.substring(rightSquare);

        }

        // To avoid ambiguity, non-escape backslashes must also be escaped
        // (We need to check that we haven't already escaped metacharacters.)
        if(leftCurly == -1 &&
           rightCurly == -1 &&
           leftSquare == -1 && 
           rightSquare == -1) {

            let pos = text.indexOf("\\");

            if(pos != -1) {

                // Escape any single backslashes
                result = result.substring(0, pos-1) + '\\' + result.substring(pos);

            }

        }


        return result;

    }

}

module.exports = HTMLParser;
