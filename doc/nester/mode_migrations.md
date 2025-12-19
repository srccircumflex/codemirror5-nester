← [Home](../../README.md)

# Migrations

The following modes were migrated to 
[extension/nesting/mode](../../extension/nester/mode) 
or created for a more stable lexical nesting:
- handlebars
- html
- twig
- xml

> This can lead to complications or unexpected behavior when used with mode-dependent legacy add-ons. 
> See [addon migration](extensions.md#addon-migration).

# Compatibilization

Mask configurations for language-specific string literal definitions have been added to the 
following legacy modes (partly based on an AI-generated list, verification/confirmation by 
experienced coders welcome).

This allows the Nester parser to assign whether a range - which potentially contains a 
delimiter pattern - belongs to the nested mode.

Nester also evaluates the meta arguments 
`blockCommentStart`, `blockCommentEnd` and `lineComment` 
already present in legacy.

- apl
- asn.1
- asterisk
- clike
- clojure
- cmake
- cobol
- coffeescript
- commonlisp
- crystal
- css
- cypher
- d
- dart
- elm
- erlang
- gfm
- gherkin
- go
- groovy
- haskell
- javascript
- julia
- lua
- mathematica
- nginx
- octave
- pascal
- perl
- php
- powershell
- python
- r
- ruby
- rust
- scheme
- shell
- smalltalk
- sparql
- sql
- swift
- tcl
- toml
- turtle
- yaml
- z80
