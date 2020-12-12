const micromatch = require("micromatch");
const fs = require("fs");
const { cosmiconfig, cosmiconfigSync } = require("cosmiconfig");
const explorer = cosmiconfig("lint-staged-pipeline");
const assert = require("assert");

function extractShebang(file) {
	try {
		fs.accessSync(file, fs.constants.X_OK);

		const contents = fs.readFileSync(file).toString();
		const index = contents.indexOf("\n");
		return index === -1 ? contents : contents.slice(0, index);
	} catch (error) {
		if (error.code === "EACCES") {
			return null;
		} else {
			throw error;
		}
	}
}

function wrap(value) {
	if (value) {
		return Array.isArray(value) ? value : [value];
	} else {
		return [];
	}
}

const micromatchOptions = {
	dot: true,
	basename: true,
};

function glob(files, linter) {
	const matchPatterns = wrap(linter.match);
	const ignorePatterns = wrap(linter.ignore);

	const matches = micromatch(files, matchPatterns, micromatchOptions);

	if (ignorePatterns.length == 0) {
		return matches;
	} else {
		return micromatch.not(matches, ignorePatterns, micromatchOptions);
	}
}

module.exports = function (stagedFiles, options) {
	assert(options.linters, "Linters missing");

	const linting = new Map();

	for (const linter in options.linters) {
		linting.set(linter, []);
	}

	for (const [linter, config] of Object.entries(options.linters)) {
		const globMatch = glob(stagedFiles, config);

		linting.set(linter, linting.get(linter).concat(globMatch));

		if (config.shebangs) {
			const shebangMatch = stagedFiles
				.filter((f) => {
					if (config.ignore) {
						return !micromatch.isMatch(
							f,
							wrap(config.ignore),
							micromatchOptions
						);
					} else {
						return true;
					}
				})
				.map((f) => [f, extractShebang(f)])
				.filter(([_, shebang]) => config.shebangs.includes(shebang))
				.map(([f, _]) => f);

			linting.set(linter, linting.get(linter).concat(shebangMatch));
		}
	}

	const commands = [];

	for (const [linter, files] of linting) {
		if (files.length > 0) {
			commands.push(`${options.linters[linter].command} ${files.join(" ")}`);
		}
	}

	return commands;
};
