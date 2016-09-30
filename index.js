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

module.exports = class Parser extends events.EventEmitter {
  
  static get defaults() { return DEFAULTS; }
  static get processors() { return PROCESSORS; }
  static get ValidationError() { return ValidationError; }

  static parseString(str, a, b) {
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

  constructor(options) {
    super();
    Object.assign(this, DEFAULTS, options);
    if (this.xmlns) this.xmlnskey = this.attrkey + 'ns';
    if (this.normalizeTags) {
      this.tagNameProcessors = this.tagNameProcessors || [];
      this.tagNameProcessors.unshift(PROCESSORS.normalize);
    }
    this.reset();
  }
  
  processAsync() {
    try {
      if (this.remaining.length <= this.chunkSize) {
        const chunk = this.remaining;
        this.remaining = '';
        this.saxParser = this.saxParser.write(chunk);
        this.saxParser.close();
      } else {
        const chunk = this.remaining.substr(0, this.chunkSize);
        this.remaining = this.remaining.substr(this.chunkSize, this.remaining.length);
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

  reset() {
    this.removeAllListeners();
    this.stack = [];
    this.saxParser = sax.parser(this.strict, {
      trim: false,
      normalize: false,
      xmlns: this.xmlns
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
      if (this.async) {
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
    const obj = {[this.charkey]: ''};
    if (!this.ignoreAttrs) {
      for (let key of Object.keys(node.attributes)) {
        if (!(this.attrkey in obj) && !this.mergeAttrs) {
          obj[this.attrkey] = {};
        }
        const processedValue = preprocess(this.attrValueProcessors, node.attributes[key]);
        const processedKey = preprocess(this.attrNameProcessors, key);
        if (this.mergeAttrs) {
          assignOrPush(obj, processedKey, processedValue, this.explicitArray);
        } else {
          obj[this.attrkey][processedKey] = processedValue;
        }
      }
    }
    obj['#name'] = preprocess(this.tagNameProcessors, node.name);
    if (this.xmlns) {
      obj[this.xmlnskey] = {
        uri: node.uri,
        local: node.local
      };
    }
    this.stack.push(obj);
  }

  _closeTag() {
    let obj = this.stack.pop();

    const nodeName = obj['#name'];
    if (!this.explicitChildren || !this.preserveChildrenOrder) {
      delete obj['#name'];
    }

    const cdata = obj.cdata === true;
    if (cdata) {
      delete obj.cdata;
    }
    
    let emptyStr = '';
    const s = this.stack[this.stack.length - 1];
    if (obj[this.charkey].match(/^\s*$/) && !cdata) {
      emptyStr = obj[this.charkey];
      delete obj[this.charkey];
    } else {
      if (this.trim) {
        obj[this.charkey] = obj[this.charkey].trim();
      }
      if (this.normalize) {
        obj[this.charkey] = obj[this.charkey].replace(/\s{2,}/g, ' ').trim();
      }
      obj[this.charkey] = preprocess(this.valueProcessors, obj[this.charkey]);
      if (Object.keys(obj).length === 1 && this.charkey in obj && !this.explicitCharkey) {
        obj = obj[this.charkey];
      }
    }
    if (!Object.keys(obj).length) {
      obj = this.emptyTag !== '' ? this.emptyTag : emptyStr;
    }

    if (this.validator != null) {
      const xpath = '/' + this.stack.map(n => n['#name']).concat(nodeName).join('/');
      try {
        obj = this.validator(xpath, s && s[nodeName], obj);
      } catch (err) {
        this.emit('error', err);
      }
    }

    if (this.explicitChildren && !this.mergeAttrs && typeof obj === 'object') {
      if (!this.preserveChildrenOrder) {
        const node = {};
        if (this.attrkey in obj) {
          node[this.attrkey] = obj[this.attrkey];
          delete obj[this.attrkey];
        }
        if (!this.charsAsChildren && this.charkey in obj) {
          node[this.charkey] = obj[this.charkey];
          delete obj[this.charkey];
        }
        if (Object.keys(obj).length) {
          node[this.childkey] = obj;
        }
        obj = node;
      } else if (s) {
        s[this.childkey] = s[this.childkey] || [];
        s[this.childkey].push(Object.assign({}, obj));
        delete obj['#name'];
        if (Object.keys(obj).length === 1 && this.charkey in obj && !this.explicitCharkey) {
          obj = obj[this.charkey];
        }
      }
    }

    if (this.stack.length > 0) {
      assignOrPush(s, nodeName, obj, this.explicitArray);
    } else {
      if (this.explicitRoot) {
        obj = {[nodeName]: obj};
      }
      this.saxParser.ended = true;
      this.emit('end', obj);
    }
  }
  
  _onText(text) {
    const s = this.stack[this.stack.length - 1];
    if (s) {
      s[this.charkey] += text;
      if (this.explicitChildren && this.preserveChildrenOrder && 
          this.charsAsChildren && (this.includeWhiteChars || text.replace(/\\n/g, '').trim() !== '')) {
        s[this.childkey] = s[this.childkey] || [];
        const charChild = {'#name': '__text__'};
        charChild[this.charkey] = text;
        if (this.normalize) {
          charChild[this.charkey] = charChild[this.charkey].replace(/\s{2,}/g, " ").trim();
        }
        s[this.childkey].push(charChild);
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
      this.emit('end', null);
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

function assignOrPush(obj, key, value, explicit) {
  if (!(key in obj)) {
    obj[key] = explicit ? [value] : value;
  } else {
    if (!(obj[key] instanceof Array)) obj[key] = [obj[key]];
    obj[key].push(value);
  }
} 

function preprocess(processors, value) {
  if (!processors) return value;
  for (let i = 0, len = processors.length; i < len; i++) {
    value = processors[i](value);
  }
  return value;
}

function stripBOM(str) {
  return str[0] === '\uFEFF' ? str.substring(1) : str;
}

module.exports.Parser = function(opts) { return new module.exports(opts); }
