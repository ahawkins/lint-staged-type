# Lint Staged Type

Build a pipeline for [lint-staged][] based on globs and shebangs with
easier ignore support.

## Quick Start

### Step 1: Install

```
yarn add -D lint-staged-type
```

### Step 2: Add lint-staged-type to lint-staged

```
cat <<EOF > lint-staged.config.js
const lintStagedType = require("lint-staged-type");

module.exports = async (stagedFiles) => {
  // Run linters for all matching file types
  const commands = await lintStagedType(stagedFiles);

  // Add custom linters using a match
  //
  // const tests = micromatch(stagedFiles, ["**/*.test.js"]);
  //
  // if (tests.length) {
  //   commands.push(`yarn test ${tests.join(" ")}`);
  // }
  //
  // More info using the JavaScript format for lint-staged here:
  // https://github.com/okonet/lint-staged#example-export-a-function-to-build-your-own-matchers

  return commands;
};
EOF
```

**IMPORTANT**: You must remove existing `lint-staged` configuration
from `package.json` for this to work. Rewrite existing rules in
Javascript as seen above.

### Step 3: Configure lint-staged-type

`lint-staged-type` uses [cosmiconfig][]. Add a `lint-staged-type` to
`package.json` to start:

```
{
  "lint-staged-type": {
    "linters": {
      "shell": {
        "command": "shellcheck",
        "match": "*.sh",
        "shebang": [
          "#!/usr/bin/env bash",
          "#!/bin/bash
        ]
      }
    }
  }
}
```

This example runs `shellcheck` for any file matching `*.sh` or with a
`#!/usr/bin/env bash` or `#!/bin/bash` shebang.

:checkered_flag::checkered_flag: You're done with the basic setup!

Add more linters for file types in your project. You may add more
commands after `lint-staged-type` by writing JavaScript in
`lint-staged.config.js` like in these [examples][].

## Why this project?

I use [lint-staged] on all my projects. It works best for matching
files using globs, such as `*.js`. This catch all rule hits
any `*.js` file in the project, so all files will be linted before
they're commited. All good.

My projects typically include shell programs which don't have
extension or executables written in $lang that also don't have an
extension. So you can't use glob matchers for these. The workaround is
specifying a glob rule that matches these files expliclity. As a
result, people working on the project must remember to add new files
to the linting rules. This does not happen in practice.

I use [prettier][] for my projects too. So I'd have a rule like:

```
{
  "*": "prettier --write"
}
```

in the `lint-staged` config. This rule ensured that _every_ file in
the commit would be properly formatted. If a file was not supported,
then `prettier` fails. That forces configuring prettier to support new
files or explicitly ignore them (by adding them to `.prettierignore`).
This workflow ensures every file in SCM go through prettier, thus
ensuring consistency across the codebase.

So I want something similar for linting that was globally configured
then opt-out as opposed to opt-in.

## Configuration

`lint-staged-type` is configurable by:

- `lint-staged-type` object in your `package.json`
- `.lintstagedtyperc` file in JSON or YML format, or you can be explicit with the file extension:
  - `.lintstagedtypec.json`
  - `.lintstagedtypec.yaml`
  - `.lintstagedtypec.yml`
- `lint-staged-type.config.js`, `.lintstagedtyperc.js`, or `.lintstagedtyperc.cjs` file in JS format

See [cosmiconfig][] for more details on what formats are supported.

Configuration is an object with a `linters` object. Each property must
have a `command` then either a `match` or `shebang` property. `match`
is is [micromatch][] glob similar to `lint-staged`. A `match` glob may
be paired with an `ignore` glob. Also, `match` may be a function. See
the examples below.

### Example: Match files with a glob

Using `package.json`:

```
{
  "lint-staged-type": {
    "linters": {
      "shell": {
        "command": "shellcheck",
        "match": "*.sh"
      },
      "ruby": {
        "command": "bundle exec rubocop",
        "match": "*.rb"
      }
    }
  }
}
```

This config runs `shellcheck` on all `*.sh` files and `bundle exec rubocop` on all `*.rb` files.

NOTE: `lint-staged-type` uses [micromatch][] in the same way
[lint-staged[] does. The `*.EXT` syntax will match _anywhere_ in the
file. This is the same behavior as `lint-stage`.

### Example: Ignoring files

Using `package.json`:

```
{
  "lint-staged-type": {
    "ignore": [
      "vendor/*
    ],
    "linters": {
      "ruby": {
        "command": "bundle exec rubocop",
        "match": "*.rb"
      }
    }
  }
}
```

### Example: Fail on unlinted files

`lint-staged-type` includes `strict` mode. This will causing a failure
is any staged files _do not_ match a linter.

Using `package.json`:

```
{
  "lint-staged-type": {
    "strict": true,
    "linters": {
      "ruby": {
        "command": "bundle exec rubocop",
        "match": "*.rb"
      }
    }
  }
}
```

Now files that don't match `*.rb` will cause an error.

### Example: Using multiple globs

Using `package.json`:

```
{
  "lint-staged-type": {
    "linters": {
      "shell": {
        "command": "shellcheck",
        "match": [
          "*.sh"
          "script/*"
        ]
      }
    }
  }
}
```

### Example: Matching files with a shebang

Using `package.json`:

```
{
  "lint-staged-type": {
    "linters": {
      "ruby": {
        "command": "bundle exec rubocop",
        "shegbang": "#!/usr/bin/env/ruby"
      }
    }
  }
}
```

### Example: Matching multiple shebangs

Using `package.json`:

```
{
  "lint-staged-type": {
    "linters": {
      "ruby": {
        "command": "bundle exec rubocop",
        "shegbang": [
          "#!/usr/bin/env/ruby"
          "#!/bin/ruby"
        ]
      }
    }
  }
}
```

### Example: Specifying a match function

You can use this if you'd like to programmatically decide the linter.
This could as simple as checking the file name, or reading the file to
determine heuristics.

Using `lint-stated-type.config.js`:

```
module.exports = {
  linters: {
    custom: {
      command: "my-lint-command",
      // Match function runs once for every staged file
      // This function may be async as well.
      match(file) {
        return file.endsWith("foo.txt");
      }
    }
  }
}
```

[lint-staged]: https://github.com/okonet/lint-staged
[examples]: https://github.com/okonet/lint-staged#example-export-a-function-to-build-your-own-matchers
[prettier]: https://prettier.io
[micromatch]: https://github.com/micromatch/micromatch
[cosmiconfig]: https://github.com/davidtheclark/cosmiconfig
