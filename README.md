# CodeMirror 5 \[ Nesting ]

<details><summary>Original README</summary>

\# CodeMirror 5

**NOTE:** [CodeMirror 6](https://codemirror.net/) exists, and is more mobile-friendly, more accessible, better designed, and much more actively maintained.

[![Build Status](https://github.com/codemirror/codemirror5/workflows/main/badge.svg)](https://github.com/codemirror/codemirror5/actions)

CodeMirror is a versatile text editor implemented in JavaScript for
the browser. It is specialized for editing code, and comes with over
100 language modes and various addons that implement more advanced
editing functionality. Every language comes with fully-featured code
and syntax highlighting to help with reading and editing complex code.

A rich programming API and a CSS theming system are available for
customizing CodeMirror to fit your application, and extending it with
new functionality.

You can find more information (and the
[manual](https://codemirror.net/5/doc/manual.html)) on the [project
page](https://codemirror.net/5/). For questions and discussion, use the
[discussion forum](https://discuss.codemirror.net/).

See
[CONTRIBUTING.md](https://github.com/codemirror/CodeMirror/blob/master/CONTRIBUTING.md)
for contributing guidelines.

The CodeMirror community aims to be welcoming to everybody. We use the
[Contributor Covenant
(1.1)](http://contributor-covenant.org/version/1/1/0/) as our code of
conduct.

\### Installation

Either get the [zip file](https://codemirror.net/5/codemirror.zip) with
the latest version, or make sure you have [Node](https://nodejs.org/)
installed and run:

    npm install codemirror@5

**NOTE**: This is the source repository for the library, and not the
distribution channel. Cloning it is not the recommended way to install
the library, and will in fact not work unless you also run the build
step.

\### Quickstart

To build the project, make sure you have Node.js installed (at least version 6)
and then `npm install`. To run, just open `index.html` in your
browser (you don't need to run a webserver). Run the tests with `npm test`.

----

</details>

**_EXPERIMENTAL_**

This fork arose from a problem concerning the multiplex addon of CM5 and the 
processing of lexical nesting.

The main extensions are integrated in the main module and do not require any additional imports.
The core feature is the additional mode constructor `CodeMirror.Nester`, 
which works similar to the `CodeMirror.multiplexingMode` from the 
[mode/multiplex.js](https://codemirror.net/5/doc/manual.html#addon_multiplex) addon but 
handles nesting more stable and allows a more complex configuration.
Some functionalities based on the main feature are outsourced or partially integrated 
into existing modes.

- [Nester Extensions / Addon Migration](./doc/nester/extensions.md)
- [Nester Mode Migrations](./doc/nester/mode_migrations.md)
- [Nester Demo](./extension/nesting/_demo/index.html)

### Key Features:

- MULTI-LEVEL NESTING

  Nester recognizes active Nests in subordinate area
  configurations recursively and always handles the currently active mode
  at the lowest level.

- DYNAMIC SUB MODE CONFIGURATION

  The start of a sub mode can be defined as a character string
  or as a regular expression. All further configurations can be
  queried dynamically via a defined callback at runtime,
  which receives a regex match that represents the start delimiter.

- MODE RECURSIONS

  In the sub mode configuration, the mode for the area can be
  defined as a string (Mode MIME or Name) which is only queried
  internally when activated by CodeMirror.getMode.

- MASKS

  Special definitions of sub modes as masks or within non-mask sub
  modes that prevent a mode from being exited.

- SUFFIXES

  Suffixes can be defined in sub mode configurations that are
  queried once after this sub mode has ended.

### Configuration:

A main **mode object** must be passed as the **first argument**, and any number of
sub-mode configuration objects as the following arguments.
A **sub mode configuration** object can be configured according to the
following patterns:

- Standard:

```
{
     open,
     mode
     [, modeConfig]
     [, start]
     [, indent]
     [, indentClose]
     [, close]
     [, masks]
     [, suffixes]
     [, innerStyle]
     [, delimToken]
     [, comp]
}
```

- Mode from Callback:
```
{*Standard, start: (startMatch) → {*Standard, mode}}
```

- Mask:
```
{mask: true, open, [, start] [, close] [, masks] [, comp]}
```

- Suffix:
```
{*Standard [, inline]}
```

#### Standard Options for the Sub Mode Configurations:

The following options define the basic concept of a sub mode.

open/close pattern configurations support regular expressions as
well as simple string literals whose character string is safely
converted internally into a regular expression.
A possible start callback therefore always receives a regex match.
Open patterns must advance the parsing process, so the match must
consume characters. An exception is possible through the configuration
with parseDelimiters. Close patterns do not have to consume.
Line break characters (\n) are not present in the data to be parsed.
However, an explicit newline character (\n) is passed to the open or
close regex to represent an empty line. The delimiter parser step
is skipped in that case.

- **open**: string | regexp | { exec: (data, stream, cur) → match | null }

  Specifies the beginning of a sub-mode's scope using a string or regular expression, 
  a requirement for all sub-mode configurations.
  For more complex requirements, an object can be passed that imitates a `regexp`. 
  `exec` receives the trimmed unparsed data area of the line, 
  the current string stream, and the cursor of the line's primary parser process.

- **start**: (startMatch, cm.options) → SubConf Object

  (optional)
  Callback for a dynamic update of the configuration at runtime.
  Is executed at the start of the defined area with the regex match of
  the start delimiter. The returned object updates this configuration.

- **indent**: (outer, startMatch, nesterState) → indent|undefined|CodeMirror.Pass

  (optional)
  Callback for an indentation request at sub mode start.
  `outer` is the current indentation of the main mode and can be
  undefined, CodeMirror.Pass or an integer. `startMatch` is the
  match of the start delimiter. `state` is the `Nest` state.
  If `undefined` or `CodeMirror.Pass` is returned,
  the indentation is set to `0`.

- **mode**: spec | CodeMirror mode

  (must be set after start at the latest)
  The mode for the defined area. Can be passed as an CodeMirror mode
  object or as MIME or register name for creation at runtime.
  In this case, the optional modeConfig option is used in
  `CodeMirror.getMode(cm.options, {name: mode, ...modeConfig})`.

- **close**: string | regexp | { exec: (data, stream, cur) → match | null }

  (optional)
  Defines the end of the area of a sub mode as a string or regular
  expression. If not set, it is automatically ended at the end of
  the line.
  For more complex requirements, an object can be passed that imitates a `regexp`. 
  `exec` receives the trimmed unparsed data area of the line, 
  the current string stream, and the cursor of the line's primary parser process.

#### Advanced Tokenization Options:

These options can be used to define a general scope-related styling
of tokens of a sub area and to control the behavior of the parser in
relation to the area delimiters.
(these options are ignored in mask configurations)

- **innerStyle**: string

  (optional)
  A CSS class list that additionally precedes the class list of each
  token within the area.

- **delimToken**: string | true | (stream, state, type) → string

  (optional)
  Defines the tokenization of the delimiter.
  Possible values:
  - A CSS class list for a static assignment.
    (Internally `${delimToken} ${delimToken}-open ` and `${delimToken} ${delimToken}-close ` are created)
  - `true` for a transfer of the areas to the mode parser.
  - A separate parser.

#### Special Parser Behavior Configuration:

- **mask**: true

  (optional)

- **masks**: MaskConfig[]

  (optional)
  Mask configurations enable a context-related definition of areas in
  which exiting a mode is prevented. An application example would be
  string literals that can potentially contain an open or close pattern.
  
  Mask configurations can in themselves contain mask
  configurations (masks) for nesting. In the example, this can also
  ensure that the mask area is not terminated at a quote that is
  actually escaped with a backslash.
  
  At the root level of the configurations, the mask flag must be set
  to true in order to define a mask configuration that can prevent
  leaving the main mode respectively at the start of a sub mode.
  
  In sub modes (also mask modes), an array of mask configurations
  can be defined that can prevent leaving the area.
  
  Mask configurations evaluate the following options as described
  above: open, start, close, masks, comp.

- **suffixes**: SuffixConfig[]

  (optional)
  Suffix configurations can be assigned to a sub mode configuration,
  which are queried once after the sub mode area is closed.
  The configuration of suffixes supports each described option as a
  sub mode (for concatenations also the suffixes option).
  By default, the parser searches across blank lines and only discards
  all suffixes if they do not match even in a line with content.
  With `inline: true` it can be specified whether a suffix should also
  be discarded in blank lines if it does not match.

- **comp**: (thisMatch, otherMatch) → boolean

  (optional)
  For a modified delimiter comparison function to control
  the delimiter priorities.
  
  By default, the first match that occurs is preferred that
  - has the smallest index;
  - or has an empty content;
  - or has the longest content.
  
  This callback must return whether `thisMatch` has still a higher
  priority than `otherMatch`.
  
  `thisMatch` is always a "startMatch". `otherMatch` can also be a
  "startMatch" when comparing with each other, or is an "endMatch".
  
  The order in which delimiters are potentially compared with each other
  is determined by the order in the configurations.

#### Advanced Editing Configuration:

- **indent**: (outerIndent, startMatch) → indent|Pass

  (optional)
  Query an indent for the inner area. The result is passed as the
  first argument to startState of the sub mode.
  `outerIndent` is the return value of `indent()` from `mainMode` or
  is `undefined` if not available.

- **indentClose**: false | \[ undefined | true | "smart" ] | "force" | { how: (Token, docLine, sel) → false | *indent }
     *indent: state | number | "smart" | "add" | "subtract" | "prev" | "not"
     (/src/input/indent.js)

  (optional) electric indention of close delimiters.
