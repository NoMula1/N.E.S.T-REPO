import { parse as parseYAML } from 'yaml'
import { Log } from './logging'

function* readLines(lines: string) {
	let i = 0, j
	while (i < lines.length) {
		j = lines.indexOf('\n', i)
		if (j == -1)
			j = lines.length - 1
		yield lines.substring(i, j)
		i = j + 1
	}
}

export class YamlMarkdown {
	markdown: string
	yaml: Map<string, unknown>

	constructor(contents: string) {
		const markdown: Array<string> = []
		const yaml = new Map<string, unknown>()
		let inYaml = false
		let yamlBuffer: Array<string> = []
		for (const line of readLines(contents)) {
			if (inYaml) {
				if (line === '---') {
					// End of yaml, parse and clear buffer
					const doc = parseYAML(yamlBuffer.join('\n'))
					if (doc instanceof Object) {
						for (const [key, value] of Object.entries(doc))
							yaml.set(key, value)
					} else
						Log.warn('Non-object yaml in simple command: ' + doc)
					yamlBuffer = []
					inYaml = false
				} else {
					// Buffer yaml line
					yamlBuffer.push(line)
				}
			} else if (line === '---') {
				// Start of yaml
				inYaml = true
			} else {
				// Not yaml, treat as markdown
				markdown.push(line)
			}
		}
		this.yaml = yaml
		this.markdown = markdown.join('\n').trim()
	}
}
