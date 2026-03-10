import { ChatInputCommandInteraction, Message, MessageMentions, RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandBuilder, TextBasedChannel, TextChannel, userMention } from "discord.js"
import { Scope, fromString as scopeFromString } from "../bootstrap/GlobalScope"
import { YamlMarkdown } from "../utils/yamlMarkdown"

const mentionsTag = '%mentions%'

export class SimpleCommand extends SlashCommandBuilder {
	/** The raw command text. */
	#text: string
	/** If the user should be replied to. */
	reply: boolean
	/** The bot scope the command will be available in. */
	scope: Scope

	constructor(name: string, contents: string) {
		super()
		const parser = new YamlMarkdown(contents)
		this.setName(name)
		if (parser.yaml.has('description'))
			this.setDescription(parser.yaml.get('description') as string)
		this.#text = parser.markdown
		this.reply = (parser.yaml.get('reply') as boolean | undefined) ?? true
		this.scope = scopeFromString((parser.yaml.get('scope') as string | undefined) ?? '')
		if (this.hasMentions)
			this.addUserOption(opt =>
				opt.setName('user')
					.setDescription('User to mention'))
	}

	/** The formatted command text. */
	getText(mentions: string = ''): string {
		return this.#text
			.replace(mentionsTag, mentions)
	}

	get hasMentions(): boolean {
		return this.#text.includes(mentionsTag)
	}

	async executeInteraction(interaction: ChatInputCommandInteraction) {
		const user = interaction.options.getUser('user')
		const output = this.getText(
			user !== null ? userMention(user.id) : '')
		await this.execute(interaction, output)
	}

	async executeMessage(message: Message, args: string[]) {
		let mentions = ''
		if (this.hasMentions)
			mentions = this.toMention(args[1])
		const output = this.getText(
			mentions)
		await this.execute(message, output)
	}

	private async execute(interaction: SimpleCommandInteraction, output: string) {
		if (this.reply)
			await interaction.reply(output)
		else
			await (interaction.channel as TextChannel|null)?.send(output)
	}

	/**
	 * Detects and formats a user mention.
	 * @param arg A raw user argument.
	 * @returns A formatted user mention or an empty string.
	 */
	private toMention(arg: string|undefined): string {
		if (!arg)
			return ''
		else if (arg.match(/^[0-9]+$/) !== null)
			return `<@${arg}>`
		else if (arg.match(MessageMentions.UsersPattern) !== null)
			return arg
		else
			return ''
	}

	override toJSON() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const json = super.toJSON() as any
		delete json.text
		delete json.reply
		delete json.scope
		return json
	}
}

interface SimpleCommandInteraction {
	reply(options: string): Promise<unknown>;
	channel: TextBasedChannel|null;
}
