const debug = require("debug")("lint-staged-type");
const micromatch = require("micromatch");
const fs = require("fs");
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

const globalIgnore = ["yarn.lock", "package-lock.json"];

module.exports = function (stagedFiles, options) {
	assert(options.linters, "Linters missing");

	debug("Staged files %O", stagedFiles);
	debug("Options %O", options);

	const linting = new Map();

	for (const linter in options.linters) {
		linting.set(linter, []);
	}

	if (options.strict) {
		linting.set("_unknown", []);
	}

	const ignores = wrap(options.ignore).concat(globalIgnore);

	// First remove all ignored files
	const ignorePatterns = Object.values(options.linters).reduce(
		(patterns, config) => {
			debug("Checking %O for ignore patterns", config);

			if (config.ignore) {
				return patterns.concat(wrap(config.ignore));
			} else {
				return patterns;
			}
		},
		ignores
	);

	debug("Ignoring files matching %O", ignorePatterns);

	const files =
		ignorePatterns.length > 0
			? micromatch.not(stagedFiles, ignorePatterns, micromatchOptions)
			: stagedFiles;

	// Now find a matching linter for each files
	for (const file of files) {
		const linter = Object.entries(options.linters).find(([name, config]) => {
			debug("Checking %s against %s", file, name);

			if (config.match instanceof Function) {
				debug("Checking linter %s function", name);

				const functionMatch = config.match(file);

				debug("Linter %s match %O", name, functionMatch);

				return functionMatch;
			}

			if (config.match) {
				debug("Checking linter %s %s glob", name, config.match);

				const globMatch = micromatch.isMatch(
					file,
					wrap(config.match),
					micromatchOptions
				);

				debug("Linter %s match %O", name, globMatch);

				if (globMatch) {
					return true;
				}
			}

			if (config.shebang) {
				debug("Checking linter %s %s shebang", name, config.shebang);

				const shebang = extractShebang(file);

				debug("Found shebang %s", shebang);

				const shebangMatch = wrap(config.shebang).includes(shebang);

				debug("Linter %s match %O", name, shebangMatch);

				if (shebangMatch) {
					return true;
				}
			}
		});

		if (linter) {
			debug("File %s matched %s", file, linter[0]);
			linting.get(linter[0]).push(file);
		} else if (options.strict) {
			debug("No linter found for %s", file);
			linting.get("_unknown").push(file);
		} else {
			debug("Skipping %s", file);
		}
	}

	const commands = [];

	for (const [linter, files] of linting) {
		if (files.length > 0) {
			if (linter === "_unknown") {
				commands.push(`lint-staged-type-unknown-linter ${files.join(" ")}`);
			} else {
				commands.push(`${options.linters[linter].command} ${files.join(" ")}`);
			}
		}
	}

	return commands;
};
