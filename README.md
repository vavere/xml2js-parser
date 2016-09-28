xml-2js
=======

`xml-2js` is a fork of [xml2js](https://www.npmjs.com/package/xml2js). 

It aims to keep backwards compatibility with `xml2js`, 
while no longer use `coffee-script` and target `nodejs` _v6.x_ and up.

Description
-----------

Simple XML to JavaScript object converter and uses [sax-js](https://github.com/isaacs/sax-js/).

Note: If you're looking for a full DOM parser, you probably want
[JSDom](https://github.com/tmpvar/jsdom) or other.

Installation
-----------

Simplest way to install `xml-2js` is to use [npm](http://npmjs.org), just `npm
install xml-2js` which will download xml-2js and all dependencies.

Usage
-----

No extensive tutorials required because you are a smart developer! The task of
parsing XML should be an easy one, so let's make it so! Here's some examples.

Shoot-and-forget usage
----------------------

You want to parse XML as simple and easy as possible? It's dangerous to go
alone, take this:

```javascript
var parseString = require('xml-2js').parseString;
const xml = "<root>Hello xml2js!</root>"
parseString(xml, (err, result) => {
    console.dir(result);
});
```

If you need some special options, fear not, `xml-2js` supports a number of
options (see below), you can specify these as second argument:

```javascript
parseString(xml, {trim: true}, function (err, result) {
});
```

Simple as pie usage
-------------------

That's right, if you have been using xml-simple or a home-grown wrapper:

```javascript
var fs = require('fs'),
    xml2js = require('xml-2js');

var parser = new xml2js.Parser();
fs.readFile(__dirname + '/foo.xml', (err, data) => {
    parser.parseString(data, (err, result) => {
        console.dir(result);
        console.log('Done');
    });
});
```

Parsing multiple files
----------------------

If you want to parse multiple files, you can call `reset()` on your parser object.

Processing attribute, tag names and values
------------------------------------------

You can optionally provide the parser with attribute name and tag name processors as well 
as element value processors:

```javascript

function nameToUpperCase(name){
  return name.toUpperCase();
}

// transform all attribute and tag names and values to uppercase
parseString(xml, {
  tagNameProcessors: [nameToUpperCase],
  attrNameProcessors: [nameToUpperCase],
  valueProcessors: [nameToUpperCase],
  attrValueProcessors: [nameToUpperCase]},
  (err, result) => {
    // processed data
});
```

The `tagNameProcessors`, `attrNameProcessors`, `attrValueProcessors` and `valueProcessors` options
accept an `Array` of functions with the following signature:

```javascript
function (name){
  //do something with `name`
  return name
}
```

Some processors are provided out-of-the-box and can be found in code:

- `normalize`: transforms the name to lowercase.
(Automatically used when `options.normalize` is set to `true`)

- `firstCharLowerCase`: transforms the first character to lower case.
E.g. 'MyTagName' becomes 'myTagName'

- `stripPrefix`: strips the xml namespace prefix. E.g `<foo:Bar/>` will become 'Bar'.
(N.B.: the `xmlns` prefix is NOT stripped.)

- `parseNumbers`: parses integer-like strings as integers and float-like strings as floats
E.g. "0" becomes 0 and "15.56" becomes 15.56

- `parseBooleans`: parses boolean-like strings to booleans
E.g. "true" becomes true and "False" becomes false

Options
=======

Apart from the default settings, there are a number of options that can be
specified for the parser. Options are specified by ``new Parser({optionName:
value})``. Possible options are:

  * `attrkey` (default: `$`): Prefix that is used to access the attributes.
    Version 0.1 default was `@`.
  * `charkey` (default: `_`): Prefix that is used to access the character
    content. Version 0.1 default was `#`.
  * `explicitCharkey` (default: `false`)
  * `trim` (default: `false`): Trim the whitespace at the beginning and end of
    text nodes.
  * `normalizeTags` (default: `false`): Normalize all tag names to lowercase.
  * `normalize` (default: `false`): Trim whitespaces inside text nodes.
  * `explicitRoot` (default: `true`): Set this if you want to get the root
    node in the resulting object.
  * `emptyTag` (default: `''`): what will the value of empty nodes be.
  * `explicitArray` (default: `true`): Always put child nodes in an array if
    true; otherwise an array is created only if there is more than one.
  * `ignoreAttrs` (default: `false`): Ignore all XML attributes and only create
    text nodes.
  * `mergeAttrs` (default: `false`): Merge attributes and child elements as
    properties of the parent, instead of keying attributes off a child
    attribute object. This option is ignored if `ignoreAttrs` is `false`.
  * `validator` (default `null`): You can specify a callable that validates
    the resulting structure somehow, however you want. See unit tests
    for an example.
  * `xmlns` (default `false`): Give each element a field usually called '$ns'
    (the first character is the same as attrkey) that contains its local name
    and namespace URI.
  * `explicitChildren` (default `false`): Put child elements to separate
    property. Doesn't work with `mergeAttrs = true`. If element has no children
    then "children" won't be created. 
  * `childkey` (default `$$`): Prefix that is used to access child elements if
    `explicitChildren` is set to `true`. 
  * `preserveChildrenOrder` (default `false`): Modifies the behavior of
    `explicitChildren` so that the value of the "children" property becomes an
    ordered array. When this is `true`, every node will also get a `#name` field
    whose value will correspond to the XML nodeName, so that you may iterate
    the "children" array and still be able to determine node names. The named
    (and potentially unordered) properties are also retained in this
    configuration at the same level as the ordered "children" array. 
  * `charsAsChildren` (default `false`): Determines whether chars should be
    considered children if `explicitChildren` is on.
  * `includeWhiteChars` (default `false`): Determines whether whitespace-only
     text nodes should be included. 
  * `async` (default `false`): Should the callbacks be async? This *might* be
    an incompatible change if your code depends on sync execution of callbacks.
    Future versions of `xml-2js` might change this default, so the recommendation
    is to not depend on sync execution anyway. 
  * `strict` (default `true`): Set sax-js to strict or non-strict parsing mode.
    Defaults to `true` which is *highly* recommended, since parsing HTML which
    is not well-formed XML might yield just about anything. 
  * `attrNameProcessors` (default: `null`): Allows the addition of attribute
    name processing functions. Accepts an `Array` of functions with following
    signature:
    ```javascript
    function (name){
        //do something with `name`
        return name
    }
  * `attrValueProcessors` (default: `null`): Allows the addition of attribute
    value processing functions. Accepts an `Array` of functions with following
    signature:
    ```javascript
    function (name){
      //do something with `name`
      return name
    }
    ```
  * `tagNameProcessors` (default: `null`): Allows the addition of tag name
    processing functions. Accepts an `Array` of functions with following
    signature:
    ```javascript
    function (name){
      //do something with `name`
      return name
    }
    ```
  * `valueProcessors` (default: `null`): Allows the addition of element value
    processing functions. Accepts an `Array` of functions with following
    signature:
    ```javascript
    function (name){
      //do something with `name`
      return name
    }
    ```

Running tests, development
==========================

The development requirements are handled by npm, you just need to install them.
We also have a number of unit tests, they can be run using `npm test` directly
from the project root. This runs zap to discover all the tests and execute
them.

Getting support
===============

Please, if you have a problem with the library, first make sure you read this
README. If you read this far, thanks, you're good. Then, please make sure your
problem really is with `xml-2js`. It is? Okay, then I'll look at it. Send me a
mail and we can talk. Please don't open issues, as I don't think that is the
proper forum for support problems. Some problems might as well really be bugs
in `xml-2js`, if so I'll let you know to open an issue instead :)

But if you know you really found a bug, feel free to open an issue instead.
