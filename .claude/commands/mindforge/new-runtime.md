# /mindforge:new-runtime

Scaffold support for a new AI coding runtime.

## Usage

/mindforge:new-runtime [name]

## Action

1.  Identify target runtime's entry file format (e.g. .myrules, instructions.md)
2.  Scaffold the required directories in both global and local scopes
3.  Add a new entry to the RUNTIMES configuration in `bin/installer-core.js`
4.  Generate first-run instructions for the new runtime

## Examples

/mindforge:new-runtime void-editor
/mindforge:new-runtime zed-ai
