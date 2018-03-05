# Ajax Module Loader

Analyzes page contents to determine what new javascript modules need
to be loaded and which old modules need to be unloaded.

## Javascript Native API's used:

(polyfill as needed)

- [CustomEvent()](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent#Browser_compatibility)
- [fetch()](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Browser_compatibility)
- [Promise()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#Browser_compatibility)
- [Symbol()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Browser_compatibility)

## Lifecycle

### `onInit()`
This is where you will want to attach any global event listeners to the `window` or
`document`. It is only called when the user navigates from a page that does not contain
this script to one that does.

### `onLoad(context)`
This is where you will want to interact with the DOM. This method is called immediately
after `onInit` with a `context` of the `document`.  If the user navigates from a page
that contains this script to another page that contains this script, `onLoad` will be
called again with a `context` of the new page's contents.

### `onUnload(context)`
This is where you will want to clean up after leaving a page. In this method, you should
remove any event listeners added the DOM elements in the `onLoad` method. If the new page
contains this script, `context` will be the old page's contents. If the new page does not
contain this script, `context` will be the `document`. In the latter case, `onUnload`
will be called before `onDestroy`.

### `onDestroy()`
This method is called when a user navigates from a page that contains this script to one
that doesn't. This is where you will want to clean up any global event listeners attached
in the `onInit` method.
