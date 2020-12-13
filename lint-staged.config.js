const lintStagedType = require("./lib");
const micromatch = require("micromatch");

module.exports = async (stagedFiles) => {
	// Run linters for all matching file types
	const commands = await lintStagedType(stagedFiles);

	// Run modified tests
	const tests = micromatch(stagedFiles, ["**/*.test.js"]);

	if (tests.length) {
		commands.push(`yarn test ${tests.join(" ")}`);
	}

	// Test files covered by editorconfig
	commands.push(`script/lint-editorconfig ${stagedFiles.join(" ")}`);

	// Prettify everything
	commands.push(`prettier --write ${stagedFiles.join(" ")}`);

	return commands;
};
