const debug = require("debug")("lint-staged-type");
const { cosmiconfig } = require("cosmiconfig");
const pipeline = require("./pipeline");
const pkg = require("../package");

module.exports = async function (stagedFiles) {
	debug("Building pipeline");

	const explorer = cosmiconfig("lint-staged-type");

	const { config } = await explorer.search();

	if (!config) {
		const error = new Error(
			`lint-staged-type config not found! Refer to ${pkg.repository} for docs.`
		);
		console.error(error.message);
		throw error;
	}

	debug("Found config: %O", config);

	return pipeline(stagedFiles, config);
};
