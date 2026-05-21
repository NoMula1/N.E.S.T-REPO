"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YamlMarkdown = void 0;
const yaml_1 = require("yaml");
const logging_1 = require("./logging");
function* readLines(lines) {
    let i = 0, j;
    while (i < lines.length) {
        j = lines.indexOf('\n', i);
        if (j == -1)
            j = lines.length - 1;
        yield lines.substring(i, j);
        i = j + 1;
    }
}
class YamlMarkdown {
    constructor(contents) {
        const markdown = [];
        const yaml = new Map();
        let inYaml = false;
        let yamlBuffer = [];
        for (const line of readLines(contents)) {
            if (inYaml) {
                if (line === '---') {
                    // End of yaml, parse and clear buffer
                    const doc = (0, yaml_1.parse)(yamlBuffer.join('\n'));
                    if (doc instanceof Object) {
                        for (const [key, value] of Object.entries(doc))
                            yaml.set(key, value);
                    }
                    else
                        logging_1.Log.warn('Non-object yaml in simple command: ' + doc);
                    yamlBuffer = [];
                    inYaml = false;
                }
                else {
                    // Buffer yaml line
                    yamlBuffer.push(line);
                }
            }
            else if (line === '---') {
                // Start of yaml
                inYaml = true;
            }
            else {
                // Not yaml, treat as markdown
                markdown.push(line);
            }
        }
        this.yaml = yaml;
        this.markdown = markdown.join('\n').trim();
    }
}
exports.YamlMarkdown = YamlMarkdown;
