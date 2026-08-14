export default new CommandExecutor()
	.setName("mute")
	.setDescription("Issue a mute to a user.")
	.addUserOption(opt =>
		opt
			.setName("user")
			.setDescription("Select the user you would like to mute.")
			.setRequired(true)
	)
	.addStringOption(opt =>
		opt
			.setName("length")
			.setDescription("Length for the mute.")
			.setRequired(true)
	)
	.addStringOption(opt =>
		opt
			.setName("reason")
			.setDescription("Enter the reason for the mute.")
			.setRequired(true)
	)
	.setBasePermission({
		Level: PermissionLevel.Helper,
		HasRole: ['1480437092361175163', '1474515140841046231', '1474515390418780330', '1474514887609680124']
		/**
		 * 1480437092361175163 = Trial Help Forums Moderator
		 * 1474515140841046231 = Scam Investigator
		 * 1474515390418780330 = Trial Scam Investigator
		 * 1474514887609680124 = Scam Investigations Manager
	*/
	})
	.setExecutor(async (interaction) => {
		if (!interaction.inCachedGuild()) { interaction.reply({ content: "You must be inside a cached guild to use this command!", ephemeral: true }); return }

		const moderationDisabled = await FastFlag.findOne({ refName: "DisableModerationCommands", enabled: true })
		if (moderationDisabled) {
			await interaction.reply({ content: "Moderation commands are currently disabled. Please try again later.", ephemeral: true })
			return
		}

		const user = interaction.options.getUser("user")
		const member = interaction.options.getMember("user")
		const reason = interaction.options.getString("reason")
		const timeOpt = interaction.options.getString("length") || "5m"
		const length = await getLengthFromString(timeOpt)
		if (!length[0]) {
			interaction.reply(errorEmbed("Invalid mute length! Ex. `1h, 7d`"))
			return
		}
		if (!user || !reason) return

		if (!member) {
			interaction.reply(errorEmbed("This user is not in the server!"))
			return
		}

		if (interaction.member.roles.highest.position <= member.roles.highest.position || interaction.user.id == member.id) {
			interaction.reply(errorEmbed("You are unable to issue a warning to this user."))
			return
		}

		await member.timeout(length[0] * 1000, `Mod: ${interaction.user.username}\nReason: ${reason}`).then(async () => {

			const caseNumber = await incrimentCase(interaction.guild)

			const newCase = new Case({
				guildID: interaction.guild.id,
				userID: user.id,
				modID: interaction.user.id,
				caseNumber: caseNumber,
				caseType: "MUTE",
				reason: reason,
				duration: length[1],
				durationUnix: (Math.floor(Date.now() / 1000) + length[0]),
				active: true,
				dateIssued: Date.now()
			})
			newCase.save().catch((err: Error) => {
				handleError(err)
			})

			const warns = await Case.countDocuments({
				guildID: interaction.guild.id,
				userID: user.id,
				caseType: "WARN",
				active: true,
			})

			const mutedEmbed = new EmbedBuilder()
			