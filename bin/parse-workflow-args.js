'use strict';

/**
 * parseWorkflowArgs — Slash-command argument splitter
 *
 * Parses a /mindforge:wf-<name> [args...] slash command string into a
 * structured object containing the bare workflow name and the trimmed argument
 * text.
 *
 * Format:  /mindforge:wf-<workflowName>[ <args>]
 * Example: /mindforge:wf-deep-research What is the future of AI?
 *          -> { workflowName: 'deep-research', args: 'What is the future of AI?' }
 */

/** Matches /mindforge:wf-<name> with an optional trailing argument block. */
const SLASH_COMMAND_PATTERN = /^\/mindforge:wf-([\w-]+)(?:\s+([\s\S]*))?$/;

/**
 * Split a /mindforge:wf-* slash command into workflowName and args.
 *
 * @param {string} input  Raw slash command string from user input.
 * @returns {{ workflowName: string, args: string }}
 * @throws {TypeError}   When input is not a string.
 * @throws {RangeError}  When input does not match the /mindforge:wf-* format.
 */
function parseWorkflowArgs(input) {
  if (typeof input !== 'string') {
    throw new TypeError(`parseWorkflowArgs: expected a string, received ${typeof input}`);
  }

  const match = SLASH_COMMAND_PATTERN.exec(input);

  if (match === null) {
    throw new RangeError(
      `parseWorkflowArgs: input does not match /mindforge:wf-<name> format — got: "${input}"`
    );
  }

  const [, workflowName, rawArgs = ''] = match;

  return {
    workflowName,
    args: rawArgs.trim(),
  };
}

module.exports = { parseWorkflowArgs };
