const tmp = require("tmp");
const fs = require("fs");
const path = require("path");
const os = require("os");
const pipeline = require(".");

function fixture(name, shebang) {
	if (shebang) {
		const scratch = fs.mkdtempSync(
			path.join(
				os.tmpdir(),
				`lint-staged-pipeline-${process.env.JEST_WORKER_ID}`
			)
		);
		const fd = fs.openSync(path.join(scratch, name), "w", 0o777);
		fs.writeSync(fd, shebang);
		fs.close(fd);

		return path.join(scratch, name);
	} else {
		const file = tmp.fileSync({
			postfix: name,
		});

		return file.name;
	}
}

describe("empty case", () => {
	it("handles empty file list", () => {
		const commands = pipeline([], {
			linters: {
				javascript: {
					command: "lint-js",
					match: ["*.js"],
				},
				shell: {
					command: "lint-sh",
					match: ["*.sh"],
				},
			},
		});

		expect(commands).toHaveLength(0);
	});

	it("handles no matches", () => {
		const commands = pipeline(["foo.rb"], {
			linters: {
				javascript: {
					command: "lint-js",
					match: ["*.js"],
				},
				shell: {
					command: "lint-sh",
					match: ["*.sh"],
				},
			},
		});

		expect(commands).toHaveLength(0);
	});
});

describe("glob matching", () => {
	it("*.ext matches anywhere in the file", () => {
		const jsA = fixture("foo.js");
		const jsB = fixture("bar.js");
		const sh = fixture("foo.sh");

		const commands = pipeline([jsA, jsB, sh], {
			linters: {
				javascript: {
					command: "lint-js",
					match: ["*.js"],
				},
				shell: {
					command: "lint-sh",
					match: ["*.sh"],
				},
			},
		});

		expect(commands).toHaveLength(2);
		expect(commands[0]).toBe(`lint-js ${jsA} ${jsB}`);
		expect(commands[1]).toBe(`lint-sh ${sh}`);
	});

	it("matches dotfiles", () => {
		const dotfile = fixture(".foo.js");

		const commands = pipeline([dotfile], {
			linters: {
				javascript: {
					command: "lint-js",
					match: ["*.js"],
				},
			},
		});

		expect(commands).toHaveLength(1);
		expect(commands[0]).toBe(`lint-js ${dotfile}`);
	});

	it("ignores files that match *.EXT", () => {
		const lint = fixture("foo.js");
		const ignore = fixture("foo.ignore.js");

		const commands = pipeline([lint, ignore], {
			linters: {
				javascript: {
					command: "lint-js",
					match: ["*.js"],
					ignore: ["*ignore.js"],
				},
			},
		});

		expect(commands).toHaveLength(1);
		expect(commands[0]).toBe(`lint-js ${lint}`);
	});
});

describe("shebang matching", () => {
	it("matches files by shebang", () => {
		const js = fixture("js-bin", "#!/usr/bin/env node");
		const sh = fixture("sh-bin", "#!/usr/bin/env bash");

		const commands = pipeline([js, sh], {
			linters: {
				javascript: {
					command: "lint-js",
					match: ["*.js"],
					shebangs: ["#!/usr/bin/env node"],
				},
				shell: {
					command: "lint-sh",
					match: ["*.sh"],
					shebangs: ["#!/usr/bin/env bash"],
				},
			},
		});

		expect(commands).toHaveLength(2);
		expect(commands[0]).toBe(`lint-js ${js}`);
		expect(commands[1]).toBe(`lint-sh ${sh}`);
	});

	it("ignores files that match a pattern", () => {
		const lint = fixture("js-bin", "#!/usr/bin/env node");
		const ignore = fixture("ignore-bin", "#!/usr/bin/env node");

		const commands = pipeline([lint, ignore], {
			linters: {
				javascript: {
					command: "lint-js",
					match: ["*.js"],
					shebangs: ["#!/usr/bin/env node"],
					ignore: ["*ignore*"],
				},
			},
		});

		expect(commands).toHaveLength(1);
		expect(commands[0]).toBe(`lint-js ${lint}`);
	});
});
