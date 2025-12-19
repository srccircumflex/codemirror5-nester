← [Home](../../README.md)

# Addon Migration

The Nester extension has basically nothing to do with legacy addons, but replaces multiplex.
Modes that have been migrated with Nester might have a compatibility problem with mode-dependent 
legacy addons or behave unpredictably.
The Nester extension has high potential to migrate legacy addons to 
`extension/nesting/addon` accordingly (development currently discontinued). 

# Extensions

- [extension/nesting/addon/autoclose.js](../../extension/nester/addon/autoclose.js)

  This optional module enables the processing of the sub mode 
  parameter `autoClose` for an automatic closing mechanism.

  - **autoClose**: string | { configure: (pos, stackEntry, nesterState, cm) → this{\[text]} \[, text: string] \[, type: string] } | { configure: string }

  If a string is passed, it is automatically appended to the open delimiter when it is created. 
  An object can be passed for more complex requirements.
  In the object, configure must be set to a configuration function or factor key.
  A configuration function receives the parameters `pos, stackEntry, nesterState, cm` and must return an 
  object in which text is set for execution.
  Type can be `"block"` to generate a code block automatically.



