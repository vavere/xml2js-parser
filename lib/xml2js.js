'use strict'
const sax = require('sax');
const events = require('events');

const DEFAULTS = {
  explicitCharkey: false,
  trim: false,
  normalize: false,
  normalizeTags: false,
  attrkey: "$",
  charkey: "_",
  explicitArray: true,
  ignoreAttrs: false,
  mergeAttrs: false,
  explicitRoot: true,
  validator: null,
  xmlns: false,
  explicitChildren: false,
  preserveChildrenOrder: false,
  childkey: '$$',
  charsAsChildren: false,
  includeWhiteChars: false,
  async: false,
  strict: true,
  attrNameProcessors: null,
  attrValueProcessors: null,
  tagNameProcessors: null,
  valueProcessors: null,
  chunkSize: 10000,
  emptyTag: '',
};

const PRE_MATCH = /(?!xmlns)^.*:/;
const BOOL_MATCH = /^(?:true|false)$/i;

const PROCESSORS = {
  normalize(str) { return str.toLowerCase();  },
  firstCharLowerCase(str) { return str.charAt(0).toLowerCase() + str.slice(1); },
  stripPrefix(str) { return str.replace(PRE_MATCH, ''); },
  parseNumbers(str) { return isNaN(str) ? str : (str % 1 === 0 ? parseInt(str, 10) : parseFloat(str)); },
  parseBooleans(str) { return BOOL_MATCH.test(str) ? str.toLowerCase() === 'true' : str; }
};

class ValidationError extends Error {};

class Parser extends events.EventEmitter {
  
  static get defaults() { return DEFAULTS; }

  constructor(options) {
    super();
    this.options = Object.assign({}, DEFAULTS, options);
    if (this.options.xmlns) {
      this.options.xmlnskey = this.options.attrkey + "ns";
    }
    if (this.options.normalizeTags) {
      this.options.tagNameProcessors = this.options.tagNameProcessors || [];
      this.options.tagNameProcessors.unshift(PROCESSORS.normalize);
    }
    this.reset();
  }
  
  processAsync() {
    try {
      if (this.remaining.length <= this.options.chunkSize) {
        const chunk = this.remaining;
        this.remaining = '';
        this.saxParser = this.saxParser.write(chunk);
        this.saxParser.close();
      } else {
        const chunk = this.remaining.substr(0, this.options.chunkSize);
        this.remaining = this.remaining.substr(this.options.chunkSize, this.remaining.length);
        this.saxParser = this.saxParser.write(chunk);
        setImmediate(() => this.processAsync());
      }
    } catch (err) {
      if (!this.saxParser.errThrown) {
        this.saxParser.errThrown = true;
        this.emit(err);
      }
    }
  }

  assignOrPush(obj, key, newValue) {
    if (!(key in obj)) {
      obj[key] = this.options.explicitArray ? [newValue] : newValue;
    } else {
      if (!(obj[key] instanceof Array)) obj[key] = [obj[key]];
      obj[key].push(newValue);
    }
  }

  reset() {
    this.EXPLICIT_CHARKEY = this.options.explicitCharkey;
    this.resultObject = null;
    this.stack = [];
    this.removeAllListeners();
    this.saxParser = sax.parser(this.options.strict, {
      trim: false,
      normalize: false,
      xmlns: this.options.xmlns
    });
    this.saxParser.errThrown = false;
    this.saxParser.ended = false;
    this.saxParser.onopentag = (node) => this._openTag(node);
    this.saxParser.onclosetag = () =>   this._closeTag();
    this.saxParser.ontext =  (text) => this._onText(text);
    this.saxParser.oncdata = (text) => this._onCData(text);
    this.saxParser.onend = () => this._onEnd();
    this.saxParser.onerror = (err) => this._onError(err);
  }

  parseString(str, cb) {
    if (typeof cb === 'function') {
      this.on('end', (result) => {
        this.reset();
        cb(null, result);
      });
      this.on('error', (err) => {
        this.reset();
        cb(err);
      });
    }
    try {
      str = str.toString();
      if (str.trim() === '') return this.emit('end', null);
      str = stripBOM(str);
      if (this.options.async) {
        this.remaining = str;
        setImmediate(() => this.processAsync());
        return this.saxParser;
      }
      this.saxParser.write(str).close();
    } catch (err) {
      if (!(this.saxParser.errThrown || this.saxParser.ended)) {
        this.emit('error', err);
        this.saxParser.errThrown = true;
      } else if (this.saxParser.ended) {
        throw err;
      }
    }
  }
  
  _openTag(node) {
    const obj = {[this.options.charkey]: ''};
    if (!this.options.ignoreAttrs) {
      const ref = node.attributes;
      for (let key in ref) {
        if (!ref.hasOwnProperty(key)) continue;
        if (!(this.options.attrkey in obj) && !this.options.mergeAttrs) obj[this.options.attrkey] = {};
        const newValue = this.options.attrValueProcessors ? processName(this.options.attrValueProcessors, node.attributes[key]) : node.attributes[key];
        const processedKey = this.options.attrNameProcessors ? processName(this.options.attrNameProcessors, key) : key;
        if (this.options.mergeAttrs) {
          this.assignOrPush(obj, processedKey, newValue);
        } else {
          obj[this.options.attrkey][processedKey] = newValue;
        }
      }
    }
    obj['#name'] = this.options.tagNameProcessors ? processName(this.options.tagNameProcessors, node.name) : node.name;
    if (this.options.xmlns) {
      obj[this.options.xmlnskey] = {
        uri: node.uri,
        local: node.local
      };
    }
    this.stack.push(obj);
  }

  _closeTag() {
    let cdata, emptyStr, obj;
    obj = this.stack.pop();
    const nodeName = obj['#name'];
    if (!this.options.explicitChildren || !this.options.preserveChildrenOrder) {
      delete obj['#name'];
    }
    if (obj.cdata === true) {
      cdata = obj.cdata;
      delete obj.cdata;
    }
    const s = this.stack[this.stack.length - 1];
    if (obj[this.options.charkey].match(/^\s*$/) && !cdata) {
      emptyStr = obj[this.options.charkey];
      delete obj[this.options.charkey];
    } else {
      if (this.options.trim) {
        obj[this.options.charkey] = obj[this.options.charkey].trim();
      }
      if (this.options.normalize) {
        obj[this.options.charkey] = obj[this.options.charkey].replace(/\s{2,}/g, ' ').trim();
      }
      obj[this.options.charkey] = this.options.valueProcessors ? processName(this.options.valueProcessors, obj[this.options.charkey]) : obj[this.options.charkey];
      if (Object.keys(obj).length === 1 && this.options.charkey in obj && !this.EXPLICIT_CHARKEY) {
        obj = obj[this.options.charkey];
      }
    }
    if (!Object.keys(obj).length) {
      obj = this.options.emptyTag !== '' ? this.options.emptyTag : emptyStr;
    }
    if (this.options.validator != null) {
      const xpath = '/' + this.stack.map(n => n['#name']).concat(nodeName).join('/');
      try {
        obj = this.options.validator(xpath, s && s[nodeName], obj);
      } catch (err) {
        this.emit('error', err);
      }
    }
    if (this.options.explicitChildren && !this.options.mergeAttrs && typeof obj === 'object') {
      if (!this.options.preserveChildrenOrder) {
        const node = {};
        if (this.options.attrkey in obj) {
          node[this.options.attrkey] = obj[this.options.attrkey];
          delete obj[this.options.attrkey];
        }
        if (!this.options.charsAsChildren && this.options.charkey in obj) {
          node[this.options.charkey] = obj[this.options.charkey];
          delete obj[this.options.charkey];
        }
        if (Object.getOwnPropertyNames(obj).length) {
          node[this.options.childkey] = obj;
        }
        obj = node;
      } else if (s) {
        s[this.options.childkey] = s[this.options.childkey] || [];
        const objClone = Object.assign({}, obj);
        s[this.options.childkey].push(objClone);
        delete obj['#name'];
        if (Object.keys(obj).length === 1 && this.options.charkey in obj && !this.EXPLICIT_CHARKEY) {
          obj = obj[this.options.charkey];
        }
      }
    }
    if (this.stack.length > 0) {
      this.assignOrPush(s, nodeName, obj);
    } else {
      if (this.options.explicitRoot) {
        const old = obj;
        obj = {};
        obj[nodeName] = old;
      }
      this.resultObject = obj;
      this.saxParser.ended = true;
      this.emit('end', this.resultObject);
    }
  }
  
  _onText(text) {
    const s = this.stack[this.stack.length - 1];
    if (s) {
      s[this.options.charkey] += text;
      if (this.options.explicitChildren && this.options.preserveChildrenOrder && 
          this.options.charsAsChildren && (this.options.includeWhiteChars || text.replace(/\\n/g, '').trim() !== '')) {
        s[this.options.childkey] = s[this.options.childkey] || [];
        const charChild = {'#name': '__text__'};
        charChild[this.options.charkey] = text;
        if (this.options.normalize) {
          charChild[this.options.charkey] = charChild[this.options.charkey].replace(/\s{2,}/g, " ").trim();
        }
        s[this.options.childkey].push(charChild);
      }
    }
    return s;
  }

  _onCData(text) {
    const s = this._onText(text);
    if (s) s.cdata = true;
  }
  
  _onEnd() {
    if (!this.saxParser.ended) {
      this.saxParser.ended = true;
      this.emit('end', this.resultObject);
    }
  }
  
  _onError(err) {
    this.saxParser.resume();
    if (!this.saxParser.errThrown) {
      this.saxParser.errThrown = true;
      this.emit('error', err);
    }
  }

}

function processName(processors, processedName) {
  for (let i = 0, len = processors.length; i < len; i++) {
    processedName = processors[i](processedName);
  }
  return processedName;
};

function parseString(str, a, b) {
  let cb, options = {};
  if (b != null) {
    if (typeof b === 'function') cb = b;
    if (typeof a === 'object') options = a;
  } else {
    if (typeof a === 'function') cb = a;
  }
  const parser = new Parser(options);
  parser.parseString(str, cb);
}

function stripBOM(str) {
  return str[0] === '\uFEFF' ? str.substring(1) : str;
}

module.exports.Parser = Parser;
module.exports.processors = PROCESSORS;
module.exports.ValidationError = ValidationError;
module.exports.parseString = parseString;

