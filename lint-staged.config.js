const lintStagedPipeline = require("./lib");

module.exports = (stagedFiles) => {
	const commands = lintStagedPipeline(stagedFiles, {
		linters: {
			shell: {
				command: "shellcheck",
				match: "*.sh",
				shebangs: ["!#/usr/bin/env bash"],
			},
		},
	});

	// Test files covered by editorconfig
	commands.push(`script/lint-editorconfig ${stagedFiles.join(" ")}`);

	// Prettify everything
	commands.push(`prettier --write ${stagedFiles.join(" ")}`);

	return commands;
};
