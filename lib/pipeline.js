const debug = require("debug")("lint-staged-type");
const micromatch = require("micromatch");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const chalk = require("chalk");
const normalize = require("normalize-path");
const pkg = require("../package");

class UnlintedFileError extends Error {
	constructor(file) {
		super(
			`No linter found for: ${file}. Fix by adding a matching rule or adding an ignore rule. See ${pkg.repository} for more information.`
		);
		this.name = "UnlintedFileError";
	}
}

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

function isMatch(file, pattern, options) {
	return micromatch.isMatch(
		file,
		pattern,
		Object.assign({}, options, {
			// XXX: Maintain similar behavior as lint-staged
			// If pattern doesn't look like a path, enable `matchBase` to
			// match against filenames in every directory. This makes `*.js`
			// match both `test.js` and `subdirectory/test.js`.
			basename: !pattern.includes("/"),
		})
	);
}

const globalIgnore = ["yarn.lock", "package-lock.json"];

module.exports = function (stagedFiles, options) {
	assert(options.linters, "Linters missing");

	debug("Staged files %O", stagedFiles);
	debug("Options %O", options);

	const logger = options.logger || console;
	const cwd = options.cwd || process.cwd();

	const linting = new Map();

	for (const linter in options.linters) {
		linting.set(linter, []);
	}

	const micromatchOptions = {
		dot: true,
		cwd,
	};

	// Convert absolute path stagedFiles to relative paths.  This matches
	// behavior inside lint-staged. lint-staged uses relative paths for all
	// matching, which are then optionally (the --relative option) converted back
	// to absolute paths for command arguments.
	const relativeFiles = stagedFiles.map((file) =>
		normalize(path.relative(cwd, file))
	);

	const ignorePatterns = wrap(options.ignore).concat(globalIgnore);

	debug("Relative files %O", relativeFiles);
	debug("Ignoring files matching %O", ignorePatterns);

	const files = relativeFiles.filter((f) => {
		return !ignorePatterns.some((pattern) => {
			debug("Checking %s against %s", f, pattern);

			return isMatch(f, pattern, micromatchOptions);
		});
	});

	// const files =
	// 	ignorePatterns.length > 0
	// 		? micromatch.not(stagedFiles, ignorePatterns, micromatchOptions)
	// 		: stagedFiles;

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

				const globMatch = wrap(config.match).some((pattern) => {
					return isMatch(file, pattern, micromatchOptions);
				});

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
			const error = new UnlintedFileError(file);
			logger.error(chalk.red(error.message));
			throw error;
		} else {
			debug("Skipping %s", file);
		}
	}

	const commands = [];

	for (const [linter, files] of linting) {
		if (files.length > 0) {
			const fileArgs = files.map((file) => path.resolve(cwd, file));

			commands.push(`${options.linters[linter].command} ${fileArgs.join(" ")}`);
		}
	}

	return commands;
};
