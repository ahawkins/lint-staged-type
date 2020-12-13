const lintStagedType = require(".");

test("it is properly configured for this repo", async () => {
	const commands = await lintStagedType([]);

	expect(commands).toHaveLength(0);
});
