import Case from "../../../schemas/Case"

export async function checkCases() {
	const cases = await Case.find({
		durationUnix: { $lt: Date.now() / 1000 },
		active: true
	})

	if (!cases || cases.length <= 0) return

	cases.forEach(async (singleCase) => {
		if (singleCase.durationUnix == 0) return

		await singleCase.updateOne({
			active: false
		})

	})
}

setInterval(checkCases, 10 * 1000) 