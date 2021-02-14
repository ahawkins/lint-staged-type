const debug = require("debug")("lint-staged-type");
const { cosmiconfig } = require("cosmiconfig");
const pipeline = require("./pipeline");
const pkg = require("../package");

module.exports = async function (stagedFiles) {
	debug("Building pipeline");

	const explorer = cosmiconfig("lint-staged-type");

	const { config } = await explorer.search();

	if (!config) {
		return [
			`lint-staged-type-error no config found! Refer to ${pkg.repository} for docs.`,
		];
	}

	debug("Found config: %O", config);

	return pipeline(stagedFiles, config);
};
