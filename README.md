# USG

Universal Starter Generator (USG) is a simple command-line utility.
The purpose of this package is easier navigation and searching among many popular starter projects.

## Features
- browsing popular starters for vite, webpack and esbuild
- copying chosen template
- ability to the automatic installation of npm dependencies
- ability to automatic git repository reinitialization

## Usage

With USG, you can quickly bootstrap your next project in a moment. Enter the terminal and type:

`npx usg`

Then you will be prompted to answer a few questions to generate the project.

The CLI comes with only the `create` command. It could be invoked by calling `usg` or `usg create`. Then the wizard allows the user to follow the instructions.

Available options:
- `-a, --auto-install` - decide whether the npm dependencies should be automatically installed. The default value is set to `true`
- `-r, --reinitialize-git` - decide whether the git repository should be reinitialized. The default value is set to `true`

## Roadmap
- create the backend for scheduled collecting templates metadata from source GitHub repositories

## Acknowledgment

If you found it useful somehow, I would be grateful if you could leave a star in the project's GitHub repository.

Thank you.
