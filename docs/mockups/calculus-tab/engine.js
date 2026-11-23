"use strict";
var CalcEngine = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod2) => function __require() {
    return mod2 || (0, cb[__getOwnPropNames(cb)[0]])((mod2 = { exports: {} }).exports, mod2), mod2.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod2, isNodeMode, target) => (target = mod2 != null ? __create(__getProtoOf(mod2)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod2 || !mod2.__esModule ? __defProp(target, "default", { value: mod2, enumerable: true }) : target,
    mod2
  ));
  var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

  // node_modules/moo/moo.js
  var require_moo = __commonJS({
    "node_modules/moo/moo.js"(exports, module) {
      (function(root2, factory) {
        if (typeof define === "function" && define.amd) {
          define([], factory);
        } else if (typeof module === "object" && module.exports) {
          module.exports = factory();
        } else {
          root2.moo = factory();
        }
      })(exports, function() {
        "use strict";
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var toString = Object.prototype.toString;
        var hasSticky = typeof new RegExp().sticky === "boolean";
        function isRegExp(o) {
          return o && toString.call(o) === "[object RegExp]";
        }
        function isObject(o) {
          return o && typeof o === "object" && !isRegExp(o) && !Array.isArray(o);
        }
        function reEscape(s) {
          return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        }
        function reGroups(s) {
          var re = new RegExp("|" + s);
          return re.exec("").length - 1;
        }
        function reCapture(s) {
          return "(" + s + ")";
        }
        function reUnion(regexps) {
          if (!regexps.length)
            return "(?!)";
          var source = regexps.map(function(s) {
            return "(?:" + s + ")";
          }).join("|");
          return "(?:" + source + ")";
        }
        function regexpOrLiteral(obj) {
          if (typeof obj === "string") {
            return "(?:" + reEscape(obj) + ")";
          } else if (isRegExp(obj)) {
            if (obj.ignoreCase)
              throw new Error("RegExp /i flag not allowed");
            if (obj.global)
              throw new Error("RegExp /g flag is implied");
            if (obj.sticky)
              throw new Error("RegExp /y flag is implied");
            if (obj.multiline)
              throw new Error("RegExp /m flag is implied");
            return obj.source;
          } else {
            throw new Error("Not a pattern: " + obj);
          }
        }
        function pad(s, length) {
          if (s.length > length) {
            return s;
          }
          return Array(length - s.length + 1).join(" ") + s;
        }
        function lastNLines(string, numLines) {
          var position = string.length;
          var lineBreaks = 0;
          while (true) {
            var idx = string.lastIndexOf("\n", position - 1);
            if (idx === -1) {
              break;
            } else {
              lineBreaks++;
            }
            position = idx;
            if (lineBreaks === numLines) {
              break;
            }
            if (position === 0) {
              break;
            }
          }
          var startPosition = lineBreaks < numLines ? 0 : position + 1;
          return string.substring(startPosition).split("\n");
        }
        function objectToRules(object) {
          var keys = Object.getOwnPropertyNames(object);
          var result = [];
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var thing = object[key];
            var rules2 = [].concat(thing);
            if (key === "include") {
              for (var j = 0; j < rules2.length; j++) {
                result.push({ include: rules2[j] });
              }
              continue;
            }
            var match = [];
            rules2.forEach(function(rule2) {
              if (isObject(rule2)) {
                if (match.length)
                  result.push(ruleOptions(key, match));
                result.push(ruleOptions(key, rule2));
                match = [];
              } else {
                match.push(rule2);
              }
            });
            if (match.length)
              result.push(ruleOptions(key, match));
          }
          return result;
        }
        function arrayToRules(array) {
          var result = [];
          for (var i = 0; i < array.length; i++) {
            var obj = array[i];
            if (obj.include) {
              var include = [].concat(obj.include);
              for (var j = 0; j < include.length; j++) {
                result.push({ include: include[j] });
              }
              continue;
            }
            if (!obj.type) {
              throw new Error("Rule has no type: " + JSON.stringify(obj));
            }
            result.push(ruleOptions(obj.type, obj));
          }
          return result;
        }
        function ruleOptions(type, obj) {
          if (!isObject(obj)) {
            obj = { match: obj };
          }
          if (obj.include) {
            throw new Error("Matching rules cannot also include states");
          }
          var options = {
            defaultType: type,
            lineBreaks: !!obj.error || !!obj.fallback,
            pop: false,
            next: null,
            push: null,
            error: false,
            fallback: false,
            value: null,
            type: null,
            shouldThrow: false
          };
          for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
              options[key] = obj[key];
            }
          }
          if (typeof options.type === "string" && type !== options.type) {
            throw new Error("Type transform cannot be a string (type '" + options.type + "' for token '" + type + "')");
          }
          var match = options.match;
          options.match = Array.isArray(match) ? match : match ? [match] : [];
          options.match.sort(function(a, b) {
            return isRegExp(a) && isRegExp(b) ? 0 : isRegExp(b) ? -1 : isRegExp(a) ? 1 : b.length - a.length;
          });
          return options;
        }
        function toRules(spec) {
          return Array.isArray(spec) ? arrayToRules(spec) : objectToRules(spec);
        }
        var defaultErrorRule = ruleOptions("error", { lineBreaks: true, shouldThrow: true });
        function compileRules(rules2, hasStates) {
          var errorRule = null;
          var fast = /* @__PURE__ */ Object.create(null);
          var fastAllowed = true;
          var unicodeFlag = null;
          var groups = [];
          var parts = [];
          for (var i = 0; i < rules2.length; i++) {
            if (rules2[i].fallback) {
              fastAllowed = false;
            }
          }
          for (var i = 0; i < rules2.length; i++) {
            var options = rules2[i];
            if (options.include) {
              throw new Error("Inheritance is not allowed in stateless lexers");
            }
            if (options.error || options.fallback) {
              if (errorRule) {
                if (!options.fallback === !errorRule.fallback) {
                  throw new Error("Multiple " + (options.fallback ? "fallback" : "error") + " rules not allowed (for token '" + options.defaultType + "')");
                } else {
                  throw new Error("fallback and error are mutually exclusive (for token '" + options.defaultType + "')");
                }
              }
              errorRule = options;
            }
            var match = options.match.slice();
            if (fastAllowed) {
              while (match.length && typeof match[0] === "string" && match[0].length === 1) {
                var word = match.shift();
                fast[word.charCodeAt(0)] = options;
              }
            }
            if (options.pop || options.push || options.next) {
              if (!hasStates) {
                throw new Error("State-switching options are not allowed in stateless lexers (for token '" + options.defaultType + "')");
              }
              if (options.fallback) {
                throw new Error("State-switching options are not allowed on fallback tokens (for token '" + options.defaultType + "')");
              }
            }
            if (match.length === 0) {
              continue;
            }
            fastAllowed = false;
            groups.push(options);
            for (var j = 0; j < match.length; j++) {
              var obj = match[j];
              if (!isRegExp(obj)) {
                continue;
              }
              if (unicodeFlag === null) {
                unicodeFlag = obj.unicode;
              } else if (unicodeFlag !== obj.unicode && options.fallback === false) {
                throw new Error("If one rule is /u then all must be");
              }
            }
            var pat = reUnion(match.map(regexpOrLiteral));
            var regexp = new RegExp(pat);
            if (regexp.test("")) {
              throw new Error("RegExp matches empty string: " + regexp);
            }
            var groupCount = reGroups(pat);
            if (groupCount > 0) {
              throw new Error("RegExp has capture groups: " + regexp + "\nUse (?: \u2026 ) instead");
            }
            if (!options.lineBreaks && regexp.test("\n")) {
              throw new Error("Rule should declare lineBreaks: " + regexp);
            }
            parts.push(reCapture(pat));
          }
          var fallbackRule = errorRule && errorRule.fallback;
          var flags = hasSticky && !fallbackRule ? "ym" : "gm";
          var suffix = hasSticky || fallbackRule ? "" : "|";
          if (unicodeFlag === true)
            flags += "u";
          var combined = new RegExp(reUnion(parts) + suffix, flags);
          return { regexp: combined, groups, fast, error: errorRule || defaultErrorRule };
        }
        function compile2(rules2) {
          var result = compileRules(toRules(rules2));
          return new Lexer({ start: result }, "start");
        }
        function checkStateGroup(g, name, map) {
          var state = g && (g.push || g.next);
          if (state && !map[state]) {
            throw new Error("Missing state '" + state + "' (in token '" + g.defaultType + "' of state '" + name + "')");
          }
          if (g && g.pop && +g.pop !== 1) {
            throw new Error("pop must be 1 (in token '" + g.defaultType + "' of state '" + name + "')");
          }
        }
        function compileStates(states, start) {
          var all = states.$all ? toRules(states.$all) : [];
          delete states.$all;
          var keys = Object.getOwnPropertyNames(states);
          if (!start)
            start = keys[0];
          var ruleMap = /* @__PURE__ */ Object.create(null);
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            ruleMap[key] = toRules(states[key]).concat(all);
          }
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var rules2 = ruleMap[key];
            var included = /* @__PURE__ */ Object.create(null);
            for (var j = 0; j < rules2.length; j++) {
              var rule2 = rules2[j];
              if (!rule2.include)
                continue;
              var splice = [j, 1];
              if (rule2.include !== key && !included[rule2.include]) {
                included[rule2.include] = true;
                var newRules = ruleMap[rule2.include];
                if (!newRules) {
                  throw new Error("Cannot include nonexistent state '" + rule2.include + "' (in state '" + key + "')");
                }
                for (var k = 0; k < newRules.length; k++) {
                  var newRule = newRules[k];
                  if (rules2.indexOf(newRule) !== -1)
                    continue;
                  splice.push(newRule);
                }
              }
              rules2.splice.apply(rules2, splice);
              j--;
            }
          }
          var map = /* @__PURE__ */ Object.create(null);
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            map[key] = compileRules(ruleMap[key], true);
          }
          for (var i = 0; i < keys.length; i++) {
            var name = keys[i];
            var state = map[name];
            var groups = state.groups;
            for (var j = 0; j < groups.length; j++) {
              checkStateGroup(groups[j], name, map);
            }
            var fastKeys = Object.getOwnPropertyNames(state.fast);
            for (var j = 0; j < fastKeys.length; j++) {
              checkStateGroup(state.fast[fastKeys[j]], name, map);
            }
          }
          return new Lexer(map, start);
        }
        function keywordTransform(map) {
          var isMap = typeof Map !== "undefined";
          var reverseMap = isMap ? /* @__PURE__ */ new Map() : /* @__PURE__ */ Object.create(null);
          var types = Object.getOwnPropertyNames(map);
          for (var i = 0; i < types.length; i++) {
            var tokenType = types[i];
            var item = map[tokenType];
            var keywordList = Array.isArray(item) ? item : [item];
            keywordList.forEach(function(keyword) {
              if (typeof keyword !== "string") {
                throw new Error("keyword must be string (in keyword '" + tokenType + "')");
              }
              if (isMap) {
                reverseMap.set(keyword, tokenType);
              } else {
                reverseMap[keyword] = tokenType;
              }
            });
          }
          return function(k) {
            return isMap ? reverseMap.get(k) : reverseMap[k];
          };
        }
        var Lexer = function(states, state) {
          this.startState = state;
          this.states = states;
          this.buffer = "";
          this.stack = [];
          this.reset();
        };
        Lexer.prototype.reset = function(data, info) {
          this.buffer = data || "";
          this.index = 0;
          this.line = info ? info.line : 1;
          this.col = info ? info.col : 1;
          this.queuedToken = info ? info.queuedToken : null;
          this.queuedText = info ? info.queuedText : "";
          this.queuedThrow = info ? info.queuedThrow : null;
          this.setState(info ? info.state : this.startState);
          this.stack = info && info.stack ? info.stack.slice() : [];
          return this;
        };
        Lexer.prototype.save = function() {
          return {
            line: this.line,
            col: this.col,
            state: this.state,
            stack: this.stack.slice(),
            queuedToken: this.queuedToken,
            queuedText: this.queuedText,
            queuedThrow: this.queuedThrow
          };
        };
        Lexer.prototype.setState = function(state) {
          if (!state || this.state === state)
            return;
          this.state = state;
          var info = this.states[state];
          this.groups = info.groups;
          this.error = info.error;
          this.re = info.regexp;
          this.fast = info.fast;
        };
        Lexer.prototype.popState = function() {
          this.setState(this.stack.pop());
        };
        Lexer.prototype.pushState = function(state) {
          this.stack.push(this.state);
          this.setState(state);
        };
        var eat = hasSticky ? function(re, buffer) {
          return re.exec(buffer);
        } : function(re, buffer) {
          var match = re.exec(buffer);
          if (match[0].length === 0) {
            return null;
          }
          return match;
        };
        Lexer.prototype._getGroup = function(match) {
          var groupCount = this.groups.length;
          for (var i = 0; i < groupCount; i++) {
            if (match[i + 1] !== void 0) {
              return this.groups[i];
            }
          }
          throw new Error("Cannot find token type for matched text");
        };
        function tokenToString() {
          return this.value;
        }
        Lexer.prototype.next = function() {
          var index = this.index;
          if (this.queuedGroup) {
            var token = this._token(this.queuedGroup, this.queuedText, index);
            this.queuedGroup = null;
            this.queuedText = "";
            return token;
          }
          var buffer = this.buffer;
          if (index === buffer.length) {
            return;
          }
          var group4 = this.fast[buffer.charCodeAt(index)];
          if (group4) {
            return this._token(group4, buffer.charAt(index), index);
          }
          var re = this.re;
          re.lastIndex = index;
          var match = eat(re, buffer);
          var error2 = this.error;
          if (match == null) {
            return this._token(error2, buffer.slice(index, buffer.length), index);
          }
          var group4 = this._getGroup(match);
          var text3 = match[0];
          if (error2.fallback && match.index !== index) {
            this.queuedGroup = group4;
            this.queuedText = text3;
            return this._token(error2, buffer.slice(index, match.index), index);
          }
          return this._token(group4, text3, index);
        };
        Lexer.prototype._token = function(group4, text3, offset) {
          var lineBreaks = 0;
          if (group4.lineBreaks) {
            var matchNL = /\n/g;
            var nl = 1;
            if (text3 === "\n") {
              lineBreaks = 1;
            } else {
              while (matchNL.exec(text3)) {
                lineBreaks++;
                nl = matchNL.lastIndex;
              }
            }
          }
          var token = {
            type: typeof group4.type === "function" && group4.type(text3) || group4.defaultType,
            value: typeof group4.value === "function" ? group4.value(text3) : text3,
            text: text3,
            toString: tokenToString,
            offset,
            lineBreaks,
            line: this.line,
            col: this.col
          };
          var size = text3.length;
          this.index += size;
          this.line += lineBreaks;
          if (lineBreaks !== 0) {
            this.col = size - nl + 1;
          } else {
            this.col += size;
          }
          if (group4.shouldThrow) {
            var err = new Error(this.formatError(token, "invalid syntax"));
            throw err;
          }
          if (group4.pop)
            this.popState();
          else if (group4.push)
            this.pushState(group4.push);
          else if (group4.next)
            this.setState(group4.next);
          return token;
        };
        if (typeof Symbol !== "undefined" && Symbol.iterator) {
          var LexerIterator = function(lexer) {
            this.lexer = lexer;
          };
          LexerIterator.prototype.next = function() {
            var token = this.lexer.next();
            return { value: token, done: !token };
          };
          LexerIterator.prototype[Symbol.iterator] = function() {
            return this;
          };
          Lexer.prototype[Symbol.iterator] = function() {
            return new LexerIterator(this);
          };
        }
        Lexer.prototype.formatError = function(token, message) {
          if (token == null) {
            var text3 = this.buffer.slice(this.index);
            var token = {
              text: text3,
              offset: this.index,
              lineBreaks: text3.indexOf("\n") === -1 ? 0 : 1,
              line: this.line,
              col: this.col
            };
          }
          var numLinesAround = 2;
          var firstDisplayedLine = Math.max(token.line - numLinesAround, 1);
          var lastDisplayedLine = token.line + numLinesAround;
          var lastLineDigits = String(lastDisplayedLine).length;
          var displayedLines = lastNLines(
            this.buffer,
            this.line - token.line + numLinesAround + 1
          ).slice(0, 5);
          var errorLines = [];
          errorLines.push(message + " at line " + token.line + " col " + token.col + ":");
          errorLines.push("");
          for (var i = 0; i < displayedLines.length; i++) {
            var line2 = displayedLines[i];
            var lineNo = firstDisplayedLine + i;
            errorLines.push(pad(String(lineNo), lastLineDigits) + "  " + line2);
            if (lineNo === token.line) {
              errorLines.push(pad("", lastLineDigits + token.col + 1) + "^");
            }
          }
          return errorLines.join("\n");
        };
        Lexer.prototype.clone = function() {
          return new Lexer(this.states, this.state);
        };
        Lexer.prototype.has = function(tokenType) {
          return true;
        };
        return {
          compile: compile2,
          states: compileStates,
          error: Object.freeze({ error: true }),
          fallback: Object.freeze({ fallback: true }),
          keywords: keywordTransform
        };
      });
    }
  });

  // node_modules/eastasianwidth/eastasianwidth.js
  var require_eastasianwidth = __commonJS({
    "node_modules/eastasianwidth/eastasianwidth.js"(exports, module) {
      var eaw = {};
      if ("undefined" == typeof module) {
        window.eastasianwidth = eaw;
      } else {
        module.exports = eaw;
      }
      eaw.eastAsianWidth = function(character) {
        var x = character.charCodeAt(0);
        var y = character.length == 2 ? character.charCodeAt(1) : 0;
        var codePoint = x;
        if (55296 <= x && x <= 56319 && (56320 <= y && y <= 57343)) {
          x &= 1023;
          y &= 1023;
          codePoint = x << 10 | y;
          codePoint += 65536;
        }
        if (12288 == codePoint || 65281 <= codePoint && codePoint <= 65376 || 65504 <= codePoint && codePoint <= 65510) {
          return "F";
        }
        if (8361 == codePoint || 65377 <= codePoint && codePoint <= 65470 || 65474 <= codePoint && codePoint <= 65479 || 65482 <= codePoint && codePoint <= 65487 || 65490 <= codePoint && codePoint <= 65495 || 65498 <= codePoint && codePoint <= 65500 || 65512 <= codePoint && codePoint <= 65518) {
          return "H";
        }
        if (4352 <= codePoint && codePoint <= 4447 || 4515 <= codePoint && codePoint <= 4519 || 4602 <= codePoint && codePoint <= 4607 || 9001 <= codePoint && codePoint <= 9002 || 11904 <= codePoint && codePoint <= 11929 || 11931 <= codePoint && codePoint <= 12019 || 12032 <= codePoint && codePoint <= 12245 || 12272 <= codePoint && codePoint <= 12283 || 12289 <= codePoint && codePoint <= 12350 || 12353 <= codePoint && codePoint <= 12438 || 12441 <= codePoint && codePoint <= 12543 || 12549 <= codePoint && codePoint <= 12589 || 12593 <= codePoint && codePoint <= 12686 || 12688 <= codePoint && codePoint <= 12730 || 12736 <= codePoint && codePoint <= 12771 || 12784 <= codePoint && codePoint <= 12830 || 12832 <= codePoint && codePoint <= 12871 || 12880 <= codePoint && codePoint <= 13054 || 13056 <= codePoint && codePoint <= 19903 || 19968 <= codePoint && codePoint <= 42124 || 42128 <= codePoint && codePoint <= 42182 || 43360 <= codePoint && codePoint <= 43388 || 44032 <= codePoint && codePoint <= 55203 || 55216 <= codePoint && codePoint <= 55238 || 55243 <= codePoint && codePoint <= 55291 || 63744 <= codePoint && codePoint <= 64255 || 65040 <= codePoint && codePoint <= 65049 || 65072 <= codePoint && codePoint <= 65106 || 65108 <= codePoint && codePoint <= 65126 || 65128 <= codePoint && codePoint <= 65131 || 110592 <= codePoint && codePoint <= 110593 || 127488 <= codePoint && codePoint <= 127490 || 127504 <= codePoint && codePoint <= 127546 || 127552 <= codePoint && codePoint <= 127560 || 127568 <= codePoint && codePoint <= 127569 || 131072 <= codePoint && codePoint <= 194367 || 177984 <= codePoint && codePoint <= 196605 || 196608 <= codePoint && codePoint <= 262141) {
          return "W";
        }
        if (32 <= codePoint && codePoint <= 126 || 162 <= codePoint && codePoint <= 163 || 165 <= codePoint && codePoint <= 166 || 172 == codePoint || 175 == codePoint || 10214 <= codePoint && codePoint <= 10221 || 10629 <= codePoint && codePoint <= 10630) {
          return "Na";
        }
        if (161 == codePoint || 164 == codePoint || 167 <= codePoint && codePoint <= 168 || 170 == codePoint || 173 <= codePoint && codePoint <= 174 || 176 <= codePoint && codePoint <= 180 || 182 <= codePoint && codePoint <= 186 || 188 <= codePoint && codePoint <= 191 || 198 == codePoint || 208 == codePoint || 215 <= codePoint && codePoint <= 216 || 222 <= codePoint && codePoint <= 225 || 230 == codePoint || 232 <= codePoint && codePoint <= 234 || 236 <= codePoint && codePoint <= 237 || 240 == codePoint || 242 <= codePoint && codePoint <= 243 || 247 <= codePoint && codePoint <= 250 || 252 == codePoint || 254 == codePoint || 257 == codePoint || 273 == codePoint || 275 == codePoint || 283 == codePoint || 294 <= codePoint && codePoint <= 295 || 299 == codePoint || 305 <= codePoint && codePoint <= 307 || 312 == codePoint || 319 <= codePoint && codePoint <= 322 || 324 == codePoint || 328 <= codePoint && codePoint <= 331 || 333 == codePoint || 338 <= codePoint && codePoint <= 339 || 358 <= codePoint && codePoint <= 359 || 363 == codePoint || 462 == codePoint || 464 == codePoint || 466 == codePoint || 468 == codePoint || 470 == codePoint || 472 == codePoint || 474 == codePoint || 476 == codePoint || 593 == codePoint || 609 == codePoint || 708 == codePoint || 711 == codePoint || 713 <= codePoint && codePoint <= 715 || 717 == codePoint || 720 == codePoint || 728 <= codePoint && codePoint <= 731 || 733 == codePoint || 735 == codePoint || 768 <= codePoint && codePoint <= 879 || 913 <= codePoint && codePoint <= 929 || 931 <= codePoint && codePoint <= 937 || 945 <= codePoint && codePoint <= 961 || 963 <= codePoint && codePoint <= 969 || 1025 == codePoint || 1040 <= codePoint && codePoint <= 1103 || 1105 == codePoint || 8208 == codePoint || 8211 <= codePoint && codePoint <= 8214 || 8216 <= codePoint && codePoint <= 8217 || 8220 <= codePoint && codePoint <= 8221 || 8224 <= codePoint && codePoint <= 8226 || 8228 <= codePoint && codePoint <= 8231 || 8240 == codePoint || 8242 <= codePoint && codePoint <= 8243 || 8245 == codePoint || 8251 == codePoint || 8254 == codePoint || 8308 == codePoint || 8319 == codePoint || 8321 <= codePoint && codePoint <= 8324 || 8364 == codePoint || 8451 == codePoint || 8453 == codePoint || 8457 == codePoint || 8467 == codePoint || 8470 == codePoint || 8481 <= codePoint && codePoint <= 8482 || 8486 == codePoint || 8491 == codePoint || 8531 <= codePoint && codePoint <= 8532 || 8539 <= codePoint && codePoint <= 8542 || 8544 <= codePoint && codePoint <= 8555 || 8560 <= codePoint && codePoint <= 8569 || 8585 == codePoint || 8592 <= codePoint && codePoint <= 8601 || 8632 <= codePoint && codePoint <= 8633 || 8658 == codePoint || 8660 == codePoint || 8679 == codePoint || 8704 == codePoint || 8706 <= codePoint && codePoint <= 8707 || 8711 <= codePoint && codePoint <= 8712 || 8715 == codePoint || 8719 == codePoint || 8721 == codePoint || 8725 == codePoint || 8730 == codePoint || 8733 <= codePoint && codePoint <= 8736 || 8739 == codePoint || 8741 == codePoint || 8743 <= codePoint && codePoint <= 8748 || 8750 == codePoint || 8756 <= codePoint && codePoint <= 8759 || 8764 <= codePoint && codePoint <= 8765 || 8776 == codePoint || 8780 == codePoint || 8786 == codePoint || 8800 <= codePoint && codePoint <= 8801 || 8804 <= codePoint && codePoint <= 8807 || 8810 <= codePoint && codePoint <= 8811 || 8814 <= codePoint && codePoint <= 8815 || 8834 <= codePoint && codePoint <= 8835 || 8838 <= codePoint && codePoint <= 8839 || 8853 == codePoint || 8857 == codePoint || 8869 == codePoint || 8895 == codePoint || 8978 == codePoint || 9312 <= codePoint && codePoint <= 9449 || 9451 <= codePoint && codePoint <= 9547 || 9552 <= codePoint && codePoint <= 9587 || 9600 <= codePoint && codePoint <= 9615 || 9618 <= codePoint && codePoint <= 9621 || 9632 <= codePoint && codePoint <= 9633 || 9635 <= codePoint && codePoint <= 9641 || 9650 <= codePoint && codePoint <= 9651 || 9654 <= codePoint && codePoint <= 9655 || 9660 <= codePoint && codePoint <= 9661 || 9664 <= codePoint && codePoint <= 9665 || 9670 <= codePoint && codePoint <= 9672 || 9675 == codePoint || 9678 <= codePoint && codePoint <= 9681 || 9698 <= codePoint && codePoint <= 9701 || 9711 == codePoint || 9733 <= codePoint && codePoint <= 9734 || 9737 == codePoint || 9742 <= codePoint && codePoint <= 9743 || 9748 <= codePoint && codePoint <= 9749 || 9756 == codePoint || 9758 == codePoint || 9792 == codePoint || 9794 == codePoint || 9824 <= codePoint && codePoint <= 9825 || 9827 <= codePoint && codePoint <= 9829 || 9831 <= codePoint && codePoint <= 9834 || 9836 <= codePoint && codePoint <= 9837 || 9839 == codePoint || 9886 <= codePoint && codePoint <= 9887 || 9918 <= codePoint && codePoint <= 9919 || 9924 <= codePoint && codePoint <= 9933 || 9935 <= codePoint && codePoint <= 9953 || 9955 == codePoint || 9960 <= codePoint && codePoint <= 9983 || 10045 == codePoint || 10071 == codePoint || 10102 <= codePoint && codePoint <= 10111 || 11093 <= codePoint && codePoint <= 11097 || 12872 <= codePoint && codePoint <= 12879 || 57344 <= codePoint && codePoint <= 63743 || 65024 <= codePoint && codePoint <= 65039 || 65533 == codePoint || 127232 <= codePoint && codePoint <= 127242 || 127248 <= codePoint && codePoint <= 127277 || 127280 <= codePoint && codePoint <= 127337 || 127344 <= codePoint && codePoint <= 127386 || 917760 <= codePoint && codePoint <= 917999 || 983040 <= codePoint && codePoint <= 1048573 || 1048576 <= codePoint && codePoint <= 1114109) {
          return "A";
        }
        return "N";
      };
      eaw.characterLength = function(character) {
        var code = this.eastAsianWidth(character);
        if (code == "F" || code == "W" || code == "A") {
          return 2;
        } else {
          return 1;
        }
      };
      function stringToArray(string) {
        return string.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g) || [];
      }
      eaw.length = function(string) {
        var characters = stringToArray(string);
        var len = 0;
        for (var i = 0; i < characters.length; i++) {
          len = len + this.characterLength(characters[i]);
        }
        return len;
      };
      eaw.slice = function(text3, start, end) {
        textLen = eaw.length(text3);
        start = start ? start : 0;
        end = end ? end : 1;
        if (start < 0) {
          start = textLen + start;
        }
        if (end < 0) {
          end = textLen + end;
        }
        var result = "";
        var eawLen = 0;
        var chars = stringToArray(text3);
        for (var i = 0; i < chars.length; i++) {
          var char = chars[i];
          var charLen = eaw.length(char);
          if (eawLen >= start - (charLen == 2 ? 1 : 0)) {
            if (eawLen + charLen <= end) {
              result += char;
            } else {
              break;
            }
          }
          eawLen += charLen;
        }
        return result;
      };
    }
  });

  // node_modules/emoji-regex/index.js
  var require_emoji_regex = __commonJS({
    "node_modules/emoji-regex/index.js"(exports, module) {
      "use strict";
      module.exports = function() {
        return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67)\uDB40\uDC7F|(?:\uD83E\uDDD1\uD83C\uDFFF\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFC-\uDFFF])|\uD83D\uDC68(?:\uD83C\uDFFB(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|[\u2695\u2696\u2708]\uFE0F|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))?|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])\uFE0F|\u200D(?:(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D[\uDC66\uDC67])|\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC)?|(?:\uD83D\uDC69(?:\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69]))|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC69(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83E\uDDD1(?:\u200D(?:\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDE36\u200D\uD83C\uDF2B|\uD83C\uDFF3\uFE0F\u200D\u26A7|\uD83D\uDC3B\u200D\u2744|(?:(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\uD83C\uDFF4\u200D\u2620|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])\u200D[\u2640\u2642]|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u2600-\u2604\u260E\u2611\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26B0\u26B1\u26C8\u26CF\u26D1\u26D3\u26E9\u26F0\u26F1\u26F4\u26F7\u26F8\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u3030\u303D\u3297\u3299]|\uD83C[\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]|\uD83D[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3])\uFE0F|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDE35\u200D\uD83D\uDCAB|\uD83D\uDE2E\u200D\uD83D\uDCA8|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83E\uDDD1(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83D\uDC69(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF6\uD83C\uDDE6|\uD83C\uDDF4\uD83C\uDDF2|\uD83D\uDC08\u200D\u2B1B|\u2764\uFE0F\u200D(?:\uD83D\uDD25|\uD83E\uDE79)|\uD83D\uDC41\uFE0F|\uD83C\uDFF3\uFE0F|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|[#\*0-9]\uFE0F\u20E3|\u2764\uFE0F|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|\uD83C\uDFF4|(?:[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270C\u270D]|\uD83D[\uDD74\uDD90])(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC08\uDC15\uDC3B\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE2E\uDE35\uDE36\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5]|\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD]|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF]|[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0D\uDD0E\uDD10-\uDD17\uDD1D\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78\uDD7A-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCB\uDDD0\uDDE0-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6]|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26A7\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5-\uDED7\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDD77\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
      };
    }
  });

  // docs/mockups/calculus-tab/engine.ts
  var engine_exports = {};
  __export(engine_exports, {
    OPERATION_LABELS: () => OPERATION_LABELS,
    analyze: () => analyze,
    init: () => init,
    precise: () => precise,
    readGraph: () => readGraph
  });

  // text-mode-core/TextAST/index.ts
  var TextAST_exports = {};
  __export(TextAST_exports, {
    NodePath: () => NodePath,
    isExpression: () => isExpression,
    isStatement: () => isStatement
  });
  function isExpression(n) {
    if (isStatement(n))
      return false;
    switch (n.type) {
      case "Program":
      case "RegressionParameters":
      case "RegressionEntry":
      case "StyleMapping":
      case "MappingEntry":
      case "AssignmentExpression":
      case "PiecewiseBranch":
        n;
        return false;
      default:
        n;
        return true;
    }
  }
  function isStatement(n) {
    switch (n.type) {
      case "ExprStatement":
      case "Table":
      case "Image":
      case "Text":
      case "Folder":
      case "Settings":
      case "Ticker":
        n;
        return true;
      default:
        n;
        return false;
    }
  }
  var NodePath = class _NodePath {
    constructor(node, parentPath, name) {
      this.node = node;
      this.parentPath = parentPath;
      this.name = name;
    }
    get parent() {
      return this.parentPath ? this.parentPath.node : null;
    }
    withChild(node, name) {
      return new _NodePath(node, this, name);
    }
  };

  // text-mode-core/TextAST/Synthetic.ts
  var NodePath2 = class extends TextAST_exports.NodePath {
  };

  // text-mode-core/aug/AugState.ts
  var AugState_exports = {};
  __export(AugState_exports, {
    Latex: () => AugLatex_exports
  });

  // text-mode-core/aug/AugLatex.ts
  var AugLatex_exports = {};
  __export(AugLatex_exports, {
    constant: () => constant,
    isConstant: () => isConstant,
    isPiecewiseBoolean: () => isPiecewiseBoolean,
    isRestrictionBoolean: () => isRestrictionBoolean
  });
  function isPiecewiseBoolean(arg) {
    return arg.type === "Comparator" || arg.type === "ComparatorChain";
  }
  function isRestrictionBoolean(arg) {
    return isPiecewiseBoolean(arg) || arg.type === "Or";
  }
  function isConstant(e, v) {
    return e && e.type === "Constant" && (e.value === v || isNaN(e.value) && isNaN(v));
  }
  function constant(value) {
    return { type: "Constant", value };
  }

  // text-mode-core/aug/augNeedsParens.ts
  function augNeedsParens(node, parent, path) {
    if (node.type === "Seq" && node.parenWrapped)
      return true;
    const nodeIsLikeSub = node.type === "Substitution";
    if (path === "before-comma" && nodeIsLikeSub)
      return true;
    if (parent === null)
      return false;
    switch (parent.type) {
      case "Integral":
        return path === "integrand" && power(node) <= POWERS.add;
      case "ListAccess":
        return path === "list" && power(node) < POWERS.power;
      case "DotAccess":
      case "OrderedPairAccess":
        return path === "object" && power(node) < POWERS.power;
      case "RepeatedOperator":
        return path === "term" && power(node) <= POWERS.add;
      case "Derivative":
        return power(node) <= POWERS.add;
      case "Comparator":
      case "ComparatorChain":
        return power(node) <= (path === "top-level-eq" ? POWERS.top : POWERS.compare);
      case "BinaryOperator":
        return binopNeedsParens(node, parent.name, path);
      case "Negative":
      case "Positive":
        if (node.type === "Constant" && node.value > 0)
          return false;
        return power(node) <= POWERS.prefix;
      case "Factorial":
        return power(node) < POWERS.power;
      case "AssignmentExpression":
        return nodeIsLikeSub;
      case "ListComprehension":
      case "Substitution":
      case "UpdateRule":
        return power(node) <= POWERS.update;
      case "FunctionCall":
      case "Seq":
      case "Prime":
      case "Visualization":
      case "List":
      case "Matrix":
      case "Piecewise":
      case "Restriction":
      case "Or":
      case "Range":
      case "Norm":
        return false;
      case "Equation":
      case "FunctionDefinition":
      case "Regression":
      case "Assignment":
        return false;
      default:
        parent.type;
        return true;
    }
  }
  var _precedence = [
    "top",
    "seq",
    "update",
    "with",
    "compare",
    "add",
    "multiply",
    "prefix",
    "power",
    "factorial",
    "index",
    "call",
    "atom"
  ];
  var _precIndices = _precedence.map((op, index) => [op, index * 10]);
  var POWERS = Object.fromEntries(_precIndices);
  function binopNeedsParens(node, parentName, path) {
    const parentPower = path === "left" ? binopLeftPower(parentName) : binopRightPower(parentName);
    if (node.type === "BinaryOperator") {
      if (node.name === "CrossMultiply" && parentName === "Multiply" || // For clarity, always parenthesize multiplication in cross product or vice versa etc.
      node.name === "Multiply" && parentName === "CrossMultiply")
        return true;
    }
    return power(node) <= parentPower;
  }
  function binopLeftPower(name) {
    return name === "Divide" ? POWERS.top - 1 : name === "Exponent" ? POWERS.power + 1 : binopPower(name) - 1;
  }
  function binopRightPower(name) {
    return name === "Divide" || name === "Exponent" ? POWERS.top - 1 : binopPower(name);
  }
  function binopPower(name) {
    switch (name) {
      case "Exponent":
        return POWERS.power;
      case "Multiply":
      case "CrossMultiply":
        return POWERS.multiply;
      case "Divide":
        return POWERS.atom;
      case "Add":
      case "Subtract":
        return POWERS.add;
      default:
        name;
        return POWERS.top;
    }
  }
  function power(node) {
    switch (node.type) {
      case "Constant":
        return node.value < 0 ? POWERS.prefix : POWERS.atom;
      case "Identifier":
      case "List":
      case "Matrix":
      case "Range":
      case "Piecewise":
      case "Restriction":
        return POWERS.atom;
      case "ListComprehension":
        return node.bracketWrapped ? POWERS.atom : POWERS.with;
      case "Factorial":
        return POWERS.factorial;
      case "FunctionCall":
      case "Prime":
      case "Norm":
        return POWERS.call;
      case "ListAccess":
      case "DotAccess":
      case "OrderedPairAccess":
        return POWERS.index;
      case "Negative":
      case "Positive":
        return POWERS.prefix;
      case "BinaryOperator":
        return binopPower(node.name);
      case "Integral":
      case "Derivative":
      case "RepeatedOperator":
        return POWERS.multiply;
      case "UpdateRule":
        return POWERS.update;
      case "Comparator":
      case "ComparatorChain":
      case "AssignmentExpression":
        return POWERS.compare;
      case "Or":
      case "Seq":
        return POWERS.seq;
      case "Substitution":
        return POWERS.with;
      default:
        node;
        return POWERS.top;
    }
  }

  // text-mode-core/aug/augLatexToRaw.ts
  function latexTreeToString(cfg2, e) {
    switch (e.type) {
      case "Equation":
      case "Assignment":
        return childNodeToString(cfg2, e.left, e) + "=" + childNodeToString(cfg2, e.right, e, "top-level-eq");
      case "FunctionDefinition":
        return funcToString(cfg2, e.symbol, e.argSymbols, e) + "=" + childNodeToString(cfg2, e.definition, e, "top-level-eq");
      case "Visualization":
        return funcToString(cfg2, e.callee, e.args, e);
      case "Regression":
        return childNodeToString(cfg2, e.left, e) + "\\sim " + childNodeToString(cfg2, e.right, e);
      default:
        return childNodeToString(cfg2, e, null, "top");
    }
  }
  function childNodeToString(cfg2, e, parent, path) {
    const inner = childNodeToStringNoParen(cfg2, e, path);
    if (augNeedsParens(e, parent, path))
      return wrapParen(inner);
    return inner;
  }
  function childNodeToStringNoParen(cfg2, e, path) {
    switch (e.type) {
      case "Constant": {
        const res = e.value.toString();
        return res.includes("e") ? "(" + res.replace("e", "*10^{") + "})" : res;
      }
      case "Identifier":
        return identifierToString(cfg2, e);
      case "FunctionCall":
        return funcToString(cfg2, e.callee, e.args, e);
      case "Integral":
        return `\\int_{${childNodeToString(cfg2, e.start, e)}}^{${childNodeToString(cfg2, e.end, e)}}` + childNodeToString(cfg2, e.integrand, e, "integrand") + "d" + identifierToString(cfg2, e.differential);
      case "Derivative":
        return `\\frac{d}{d${identifierToString(cfg2, e.variable)}}` + childNodeToString(cfg2, e.arg, e);
      case "Prime":
        return identifierToString(cfg2, e.arg.callee) + "'".repeat(e.order) + wrapParen(bareSeq(cfg2, e.arg.args, e.arg));
      case "List":
        return wrapBracket(bareSeq(cfg2, e.args, e));
      case "Matrix":
        return "\\begin{bmatrix}" + e.rows.map(
          (row) => row.map((entry) => childNodeToString(cfg2, entry, e)).join("&")
        ).join("\\\\") + "\\end{bmatrix}";
      case "Range":
        return wrapBracket(
          bareSeq(cfg2, e.start, e, { alwaysBeforeComma: true }) + "..." + bareSeq(cfg2, e.end, e)
        );
      case "ListAccess":
        return childNodeToString(cfg2, e.list, e, "list") + (e.index.type === "Range" || e.index.type === "List" ? childNodeToString(cfg2, e.index, e) : wrapBracket(childNodeToString(cfg2, e.index, e)));
      case "DotAccess":
        return childNodeToString(cfg2, e.object, e, "object") + "." + childNodeToString(cfg2, e.property, e);
      case "OrderedPairAccess":
        return childNodeToString(cfg2, e.point, e, "object") + "." + e.index;
      case "Seq":
        return bareSeq(cfg2, e.args, e);
      case "UpdateRule":
        return identifierToString(cfg2, e.variable) + "\\to " + childNodeToString(cfg2, e.expression, e);
      case "ListComprehension": {
        const assignments = e.assignments.map(
          (f) => childNodeToString(cfg2, f, e)
        );
        const parameters = e.parameters.map(
          ({ identifier: identifier2, open, bounds: [min2, max2] }) => childNodeToString(cfg2, min2, e) + (open[0] ? "<" : "\\le ") + childNodeToString(cfg2, identifier2, e) + (open[1] ? "<" : "\\le ") + childNodeToString(cfg2, max2, e)
        );
        if (assignments.length + parameters.length === 0) {
          throw new Error("Programming error: empty 'for' RHS.");
        }
        const unwrapped = childNodeToString(cfg2, e.expr, e) + "\\operatorname{for}" + [...parameters, ...assignments].join(",");
        return e.bracketWrapped ? wrapBracket(unwrapped) : unwrapped;
      }
      case "Substitution":
        return childNodeToString(cfg2, e.body, e) + "\\operatorname{with}" + bareSeq(cfg2, e.assignments, e);
      case "Piecewise": {
        const piecewiseParts = [];
        let curr = e;
        while (curr.type === "Piecewise") {
          if (curr.condition === true) {
            curr = curr.consequent;
            break;
          }
          let part = childNodeToString(cfg2, curr.condition, curr);
          if (!AugState_exports.Latex.isConstant(curr.consequent, 1)) {
            part += ":" + childNodeToString(
              cfg2,
              curr.consequent,
              curr,
              beforeComma(
                curr.alternate.type === "Piecewise" || !AugState_exports.Latex.isConstant(curr.alternate, NaN)
              )
            );
          }
          piecewiseParts.push(part);
          curr = curr.alternate;
        }
        if (!AugState_exports.Latex.isConstant(curr, NaN)) {
          if (piecewiseParts.length === 0) {
            if (!AugState_exports.Latex.isConstant(curr, 1))
              throw new Error(
                "Programming error: first branch in Aug piecewise is unconditional but not 1."
              );
          } else
            piecewiseParts.push(childNodeToString(cfg2, curr, e));
        }
        return "\\left\\{" + piecewiseParts.join(",") + "\\right\\}";
      }
      case "Restriction": {
        if (e.condition === true)
          return "\\left\\{\\right\\}";
        return "\\left\\{" + childNodeToString(cfg2, e.condition, e) + "\\right\\}";
      }
      case "Or":
        return childNodeToString(cfg2, e.left, e) + "," + childNodeToString(cfg2, e.right, e);
      case "RepeatedOperator": {
        const prefix = e.name === "Product" ? "\\prod" : "\\sum";
        return prefix + `_{${identifierToString(cfg2, e.index)}=${childNodeToString(
          cfg2,
          e.start,
          e
        )}}^{${childNodeToString(cfg2, e.end, e)}}` + childNodeToString(cfg2, e.expression, e, "term");
      }
      case "BinaryOperator": {
        const binopLeft = childNodeToString(cfg2, e.left, e, "left");
        const binopRight = childNodeToString(cfg2, e.right, e, "right");
        switch (e.name) {
          case "Add":
            return binopLeft + "+" + binopRight;
          case "Subtract":
            return binopLeft + "-" + binopRight;
          case "Multiply":
            return binopLeft + "\\cdot " + binopRight;
          case "CrossMultiply":
            return binopLeft + "\\times " + binopRight;
          case "Divide":
            return `\\frac{${binopLeft}}{${binopRight}}`;
          case "Exponent":
            return binopLeft + "^{" + binopRight + "}";
          default:
            e;
            throw new Error(`Unexpected BinaryOperator ${e.name}`);
        }
      }
      case "Negative":
        return "-" + childNodeToString(cfg2, e.arg, e);
      case "Positive":
        return "+" + childNodeToString(cfg2, e.arg, e);
      case "Norm":
        return "\\left|" + childNodeToString(cfg2, e.arg, e) + "\\right|";
      case "Factorial":
        return childNodeToString(cfg2, e.arg, e, "factorial") + "!";
      case "Comparator":
        return childNodeToString(cfg2, e.left, e) + comparatorMap[e.operator] + childNodeToString(
          cfg2,
          e.right,
          e,
          path === "top" && e.operator === "=" ? "top-level-eq" : void 0
        );
      case "ComparatorChain": {
        let s = "";
        for (let i = 0; i < e.args.length; i++) {
          s += childNodeToString(cfg2, e.args[i], e);
          if (i < e.symbols.length) {
            s += comparatorMap[e.symbols[i]];
          }
        }
        return s;
      }
      case "AssignmentExpression":
        return identifierToString(cfg2, e.variable) + "=" + childNodeToString(cfg2, e.expression, e);
      default:
        e;
        throw new Error(
          `Programming Error: Unexpected Aug node ${e.type}`
        );
    }
  }
  var comparatorMap = {
    "<": "<",
    "<=": "\\le ",
    "=": "=",
    ">=": "\\ge ",
    ">": ">"
  };
  function bareSeq(cfg2, e, parent, { alwaysBeforeComma } = { alwaysBeforeComma: false }) {
    return e.map(
      (f, i) => childNodeToString(
        cfg2,
        f,
        parent,
        beforeComma(alwaysBeforeComma || i < e.length - 1)
      )
    ).join(",");
  }
  function beforeComma(beforeComma2) {
    return beforeComma2 ? "before-comma" : "last-element";
  }
  function funcToString(cfg2, callee, args, parent) {
    if (callee.symbol === "sqrt" && args.length === 1) {
      return `\\sqrt{${bareSeq(cfg2, args, parent)}}`;
    } else if (callee.symbol === "nthroot" && [1, 2].includes(args.length)) {
      if (args.length === 1)
        return `\\sqrt{${bareSeq(cfg2, args, parent)}}`;
      return `\\sqrt[${childNodeToString(cfg2, args[1], parent)}]{${bareSeq(
        cfg2,
        [...args.slice(0, 1), ...args.slice(2)],
        parent
      )}}`;
    } else if (callee.symbol === "logbase" && args.length === 2) {
      return `\\log_{${childNodeToString(cfg2, args[args.length - 1], parent)}}` + wrapParen(bareSeq(cfg2, args.slice(0, args.length - 1), parent));
    } else {
      return identifierToString(cfg2, callee) + wrapParen(bareSeq(cfg2, args, parent));
    }
  }
  function identifierToString(cfg2, id8) {
    const tokenMatch = /^\$(\d+)$/.exec(id8.symbol);
    if (tokenMatch)
      return `\\token{${tokenMatch[1]}}`;
    const symbol = id8.symbol.replace(/[{}]/g, "");
    let main = symbol;
    let subscript;
    const uIndex = symbol.indexOf("_");
    if (uIndex >= 0) {
      main = symbol.substring(0, uIndex);
      subscript = symbol.substring(uIndex + 1);
      if (!/^[a-zA-Z]+$/.test(main) || !/^[a-zA-Z0-9]+$/.test(subscript)) {
        throw new Error(`Unexpected character in ${symbol}`);
      }
    }
    const start = main.length === 1 ? main : cfg2.commandNames.has(main) ? "\\" + main : `\\operatorname{${main}}`;
    const end = subscript ? `_{${subscript}}` : "";
    return start + end;
  }
  function wrapParen(s) {
    return "\\left(" + s + "\\right)";
  }
  function wrapBracket(s) {
    return "\\left[" + s + "\\right]";
  }

  // text-mode-core/up/augToAST.ts
  function ignoredID(id8) {
    return id8.startsWith("__") || /^\d+$/.test(id8);
  }

  // text-mode-core/down/staticEval.ts
  var builtinMap = {
    false: false,
    true: true,
    pi: Math.PI,
    tau: 2 * Math.PI,
    e: Math.E,
    infty: Infinity
  };

  // text-mode-core/down/style/defaults.ts
  var ticker = {
    minStep: constant(0),
    playing: false
  };
  var itemBase = {
    secret: false
  };
  var nonFolderBase = {
    ...itemBase,
    pinned: false
  };
  var columnExpressionCommon = {
    // empty color will be filled in later in the process
    color: "",
    hidden: false,
    points: {
      opacity: constant(0.9),
      size: constant(9),
      style: "POINT",
      drag: "NONE"
    },
    lines: {
      opacity: constant(0.9),
      width: constant(2.5),
      style: "SOLID"
    }
  };
  var clickable = {
    onClick: null,
    clickDescription: ""
  };
  var defaultBounds = {
    min: void 0,
    max: void 0
  };
  var expression = {
    ...nonFolderBase,
    ...columnExpressionCommon,
    ...clickable,
    label: {
      text: "",
      size: constant(1),
      orientation: "default",
      angle: constant(0),
      outline: true,
      showOnHover: false,
      editableMode: "NONE"
    },
    errorHidden: false,
    glesmos: false,
    fill: void 0,
    logMode: false,
    fractionDisplay: false,
    slider: {
      playing: false,
      reversed: false,
      loopMode: "LOOP_FORWARD_REVERSE",
      period: 4e3,
      min: void 0,
      max: void 0,
      step: void 0
    },
    cdf: defaultBounds,
    domain: {
      theta: defaultBounds,
      t: defaultBounds,
      u: defaultBounds,
      v: defaultBounds,
      r: defaultBounds,
      phi: defaultBounds
    }
    // TODO vizProps
    // vizProps
  };
  var regression = {
    ...nonFolderBase,
    errorHidden: false,
    logMode: false
  };
  var column = {
    ...columnExpressionCommon
  };
  var image = {
    ...nonFolderBase,
    ...clickable,
    width: constant(10),
    height: constant(10),
    center: {
      type: "Seq",
      args: [constant(0), constant(0)],
      parenWrapped: true
    },
    angle: constant(0),
    opacity: constant(1),
    foreground: false,
    draggable: false,
    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYGBg+A8AAQQBAHAgZQsAAAAASUVORK5CYII=",
    hoveredImage: "",
    depressedImage: ""
  };
  var folder = {
    ...itemBase,
    hidden: false,
    collapsed: false
  };

  // text-mode-core/down/style/schema.ts
  var settings = {
    product: enumL(["graphing", "geometry-calculator", "graphing-3d"]),
    viewport: schemaL(
      {
        xmin: "number",
        ymin: "number",
        zmin: "number",
        xmax: "number",
        ymax: "number",
        zmax: "number"
      },
      { fillDefaults: true }
    ),
    squareAxes: "boolean",
    // empty randomSeed will be filled in later in the process
    randomSeed: "string",
    xAxisLabel: "string",
    yAxisLabel: "string",
    xAxisArrowMode: enumL(["NONE", "POSITIVE", "BOTH"]),
    yAxisArrowMode: enumL(["NONE", "POSITIVE", "BOTH"]),
    xAxisMinorSubdivisions: "number",
    yAxisMinorSubdivisions: "number",
    xAxisStep: "number",
    yAxisStep: "number",
    degreeMode: "boolean",
    complex: "boolean",
    showGrid: "boolean",
    showXAxis: "boolean",
    showYAxis: "boolean",
    xAxisNumbers: "boolean",
    yAxisNumbers: "boolean",
    polarNumbers: "boolean",
    restrictGridToFirstQuadrant: "boolean",
    polarMode: "boolean",
    lockViewport: "boolean",
    axis3D: {
      type: "number[]",
      length: 3
    },
    speed3D: "number",
    worldRotation3D: { type: "number[]", length: 9 },
    lockRotation: "boolean",
    disableLighting: "boolean"
  };
  var base = {
    // empty ID will be filled in later in the process
    id: "string"
  };
  var itemBase2 = {
    ...base,
    secret: "boolean"
  };
  var nonFolderBase2 = {
    ...itemBase2,
    pinned: "boolean"
  };
  var columnExpressionCommon2 = {
    id: "string",
    // empty color will be filled in later in the process
    color: "color",
    hidden: "boolean",
    points: schemaL(
      {
        opacity: "expr",
        size: "expr",
        style: enumL(["POINT", "OPEN", "CROSS"]),
        drag: enumL(["NONE", "X", "Y", "XY", "AUTO"])
      },
      { orBool: true }
    ),
    lines: schemaL(
      {
        opacity: "expr",
        width: "expr",
        style: enumL(["SOLID", "DASHED", "DOTTED"])
      },
      { orBool: true }
    )
  };
  var clickable2 = {
    onClick: "expr",
    clickDescription: "string"
  };
  var boundsSchema = schemaL({
    min: "expr",
    max: "expr"
  });
  var expression2 = {
    ...nonFolderBase2,
    ...columnExpressionCommon2,
    ...clickable2,
    label: schemaL({
      text: "string",
      size: "expr",
      orientation: {
        type: "enum",
        enum: [
          "default",
          "center",
          "center_auto",
          "auto_center",
          "above",
          "above_left",
          "above_right",
          "above_auto",
          "below",
          "below_left",
          "below_right",
          "below_auto",
          "left",
          "auto_left",
          "right",
          "auto_right"
        ]
      },
      angle: "expr",
      outline: "boolean",
      showOnHover: "boolean",
      editableMode: enumL(["MATH", "TEXT", "NONE"])
    }),
    errorHidden: "boolean",
    glesmos: "boolean",
    fill: "expr",
    fractionDisplay: "boolean",
    slider: schemaL({
      playing: "boolean",
      reversed: "boolean",
      loopMode: enumL([
        "LOOP_FORWARD_REVERSE",
        "LOOP_FORWARD",
        "PLAY_ONCE",
        "PLAY_INDEFINITELY"
      ]),
      period: "number",
      min: "expr",
      max: "expr",
      step: "expr"
    }),
    domain: schemaL({
      theta: boundsSchema,
      t: boundsSchema,
      u: boundsSchema,
      v: boundsSchema,
      rho: boundsSchema,
      phi: boundsSchema
    }),
    cdf: boundsSchema
    // TODO vizProps
    // vizProps
  };
  var regression2 = {
    ...nonFolderBase2,
    errorHidden: "boolean",
    logMode: "boolean"
  };
  var column2 = {
    ...base,
    ...columnExpressionCommon2
  };
  var image2 = {
    ...nonFolderBase2,
    ...clickable2,
    width: "expr",
    height: "expr",
    center: "expr",
    angle: "expr",
    opacity: "expr",
    foreground: "boolean",
    draggable: "boolean",
    url: "string",
    hoveredImage: "string",
    depressedImage: "string"
  };
  var folder2 = {
    ...itemBase2,
    hidden: "boolean",
    collapsed: "boolean"
  };
  function enumL(L2) {
    return { type: "enum", enum: L2 };
  }
  function schemaL(s, t = {}) {
    return {
      type: "schema",
      schema: s,
      fillDefaults: t.fillDefaults ?? false,
      orBool: t.orBool ?? false
    };
  }

  // text-mode-core/down/textToAST.ts
  var moo = __toESM(require_moo());
  var punct = [
    "<",
    "<=",
    "=",
    ">=",
    ">",
    "~",
    "->",
    ",",
    ":",
    "...",
    ".",
    "'",
    "|",
    "+",
    "-",
    "*",
    "/",
    "^",
    "!",
    "d/d",
    // '% of' TODO
    "@{",
    "#{",
    "(",
    ")",
    "[",
    "]",
    "{",
    "}"
  ];
  var rules = {
    comment: /\/\/[^\n]*/,
    number: /(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/,
    punct: [...punct],
    id: {
      match: /\$\d+|[a-zA-Z][a-zA-Z0-9_]*/,
      type: moo.keywords({
        // prettier-ignore
        keyword: [
          "table",
          "image",
          "settings",
          "folder",
          "ticker",
          "for",
          "integral",
          "sum",
          "product",
          "of",
          "with",
          "cross"
        ]
      })
    },
    string: /"(?:[^"\\]|\\.)*?"/,
    prime: /'+/,
    semi: { match: /;|[ \t\n]*\n[ \t\n]*\n[ \t\n]*/, lineBreaks: true },
    space: { match: /[ \t\n]+/, lineBreaks: true },
    invalid: { match: /[^]/, lineBreaks: true }
  };
  var _power = [
    "top",
    "meta",
    "seq",
    "rel",
    "sim",
    "updateRule",
    "for",
    "substitution",
    "derivative",
    "add",
    "mul",
    "prefix",
    "pow",
    "postfix",
    "call",
    "access",
    "member"
  ];
  var Power = Object.fromEntries(
    _power.map((k, i) => [k, i * 10])
  );
  function minus1(bp) {
    return bp - 1;
  }
  var ParseError = class extends Error {
  };
  function parseMain(ps, lastBindingPower, { isStatementTop } = { isStatementTop: false }) {
    const firstToken = ps.consume();
    const initial = getInitialParselet(firstToken);
    if (!initial)
      throw ps.pushFatalError(
        `Unexpected text: '${firstToken.value}'.`,
        pos(firstToken)
      );
    let leftNode = initial(ps, firstToken);
    while (true) {
      const nextToken = ps.peek();
      const cp = consequentParselets[nextToken.value];
      if (!cp)
        break;
      if (cp.bindingPower <= lastBindingPower)
        break;
      ps.consume();
      leftNode = cp.parse(ps, leftNode, nextToken, {
        topLevelEq: isStatementTop && nextToken.value === "="
      });
    }
    return leftNode;
  }
  function parseExpr(ps, lastBindingPower, posMsg, example) {
    const result = parseMain(ps, lastBindingPower);
    if (!isExpression(result))
      throw ps.pushFatalError(
        `Expected ${posMsg} to be an expression. Did you mean to write something like '${example}'?`,
        pos(result)
      );
    return result;
  }
  function getInitialParselet(token) {
    const tagGroup = initialParselets[token.type];
    if (typeof tagGroup === "function")
      return tagGroup;
    else
      return tagGroup?.[token.value];
  }
  var initialParselets = {
    punct: {
      "(": (ps, token) => {
        if (ps.peek().value === "d/d") {
          ps.consume();
          const variable = id(ps, ps.consumeType("id"));
          ps.consume(")");
          const expr = parseExpr(
            ps,
            Power.derivative,
            "argument of derivative",
            "(d/d x) x^2"
          );
          return {
            type: "DerivativeExpression",
            expr,
            variable,
            pos: pos(token, expr)
          };
        }
        const inner = parseMain(ps, Power.top);
        const closeParen = ps.consume(")");
        if (inner.type === "SequenceExpression") {
          return {
            ...inner,
            parenWrapped: true,
            pos: pos(token, closeParen)
          };
        }
        return {
          ...inner,
          pos: pos(token, closeParen)
        };
      },
      "|": (ps, token) => {
        const inner = parseExpr(ps, Power.top, "Argument of norm", "|x|");
        const closeAbs = ps.consume("|");
        return {
          type: "Norm",
          expr: inner,
          pos: pos(token, closeAbs)
        };
      },
      "-": (ps, token) => {
        const bp = Power.prefix;
        const expr = parseExpr(ps, bp, "Argument of negative", "-x");
        return {
          type: "PrefixExpression",
          op: "-",
          expr,
          pos: pos(token, expr)
        };
      },
      "+": (ps, token) => {
        const bp = Power.prefix;
        const expr = parseExpr(ps, bp, "Argument of positive", "+x");
        return {
          type: "PrefixExpression",
          op: "+",
          expr,
          pos: pos(token, expr)
        };
      },
      "[": parseList,
      "{": (ps, token) => {
        const branches = [];
        const next = ps.peek();
        if (next.value === "}") {
          const next2 = ps.consume();
          return finalizePiecewise(branches, pos(token, next2));
        }
        while (true) {
          const curr = parseExpr(
            ps,
            Power.seq,
            "condition of piecewise",
            "{x>3}"
          );
          const next2 = ps.consume();
          if (next2.value === "}") {
            const first = branches.length === 0;
            if (first)
              assertComparison(ps, curr);
            branches.push(
              first || isComparison(curr) ? {
                type: "PiecewiseBranch",
                condition: curr,
                consequent: null,
                pos: pos(curr)
              } : {
                type: "PiecewiseBranch",
                condition: null,
                consequent: curr,
                pos: pos(curr)
              }
            );
            return finalizePiecewise(branches, pos(token, next2));
          } else if (next2.value === ":") {
            const consequent = parseExpr(
              ps,
              Power.seq,
              "branch of piecewise",
              "{x>3:5}"
            );
            assertComparison(ps, curr);
            branches.push({
              type: "PiecewiseBranch",
              condition: curr,
              consequent,
              pos: pos(curr, consequent)
            });
            const next3 = ps.consume();
            if (next3.value === "}")
              return finalizePiecewise(branches, pos(token, next3));
            else if (next3.value !== ",")
              throw ps.pushFatalError(
                "Unexpected character in Piecewise",
                pos(next3)
              );
          } else if (next2.value === ",") {
            assertComparison(ps, curr);
            branches.push({
              type: "PiecewiseBranch",
              condition: curr,
              consequent: null,
              pos: pos(curr)
            });
          } else {
            throw ps.pushFatalError(
              "Unexpected character in Piecewise",
              pos(next2)
            );
          }
        }
      },
      "@{": parseStyleMapping
    },
    number: (_, token) => ({
      type: "Number",
      value: parseFloat(token.value),
      pos: pos(token)
    }),
    id: (ps, token) => id(ps, token),
    string: stringParselet,
    keyword: {
      sum: repeatedOperatorParselet("sum"),
      product: repeatedOperatorParselet("product"),
      integral: repeatedOperatorParselet("integral"),
      table: (ps, token) => {
        const index = ps.nextIndex();
        const defaultID = ps.nextID();
        const open = ps.consume("{");
        const columns = parseStatements(ps).flatMap((stmt) => {
          if (stmt.type !== "ExprStatement") {
            ps.pushError(
              "Expected a valid table column. Try: x1 = [1, 2, 3]",
              stmt.pos
            );
            return [];
          } else
            return [stmt];
        });
        const end = ps.consume("}");
        return ps.finishStatement(
          {
            type: "Table",
            columns,
            pos: pos(token, end),
            afterOpen: pos(open).to
          },
          { index, defaultID }
        );
      },
      folder: (ps, token) => {
        const index = ps.nextIndex();
        const defaultID = ps.nextID();
        const title = stringParselet(ps, ps.consumeType("string"));
        const open = ps.consume("{");
        const children = parseStatements(ps);
        const end = ps.consume("}");
        return ps.finishStatement(
          {
            type: "Folder",
            children,
            title: title.value,
            pos: pos(token, end),
            afterOpen: pos(open).to
          },
          { index, defaultID }
        );
      },
      image: (ps, token) => {
        const name = stringParselet(ps, ps.consumeType("string"));
        return ps.finishStatement({
          type: "Image",
          name: name.value,
          pos: pos(token, name)
        });
      },
      settings: (ps, token) => ps.finishStatement({
        type: "Settings",
        pos: pos(token)
      }),
      ticker: (ps, token) => {
        const handler = parseExpr(ps, Power.meta, "ticker handler", "a -> a+1");
        return ps.finishStatement({
          type: "Ticker",
          handler,
          pos: pos(token, handler)
        });
      }
    }
  };
  function finalizePiecewise(branches, piecewisePos) {
    if (branches.every((b) => b.consequent === null)) {
      if (branches.length === 0)
        return { type: "Restriction", condition: true, pos: piecewisePos };
      const condition = branches.map((b) => b.condition).reduceRight(
        (right, left) => ({
          type: "Or",
          left,
          right,
          pos: pos(left, right)
        })
      );
      return { type: "Restriction", condition, pos: piecewisePos };
    }
    return {
      type: "PiecewiseExpression",
      branches,
      pos: piecewisePos
    };
  }
  function isComparisonOp(op) {
    return ["<", ">", "<=", ">=", "="].includes(op);
  }
  function assertComparison(ps, node) {
    if (!isComparison(node))
      throw ps.pushFatalError("Condition must be a comparison", node.pos);
  }
  function isComparison(node) {
    return node.type === "ComparatorChain" || node.type === "BinaryExpression" && isComparisonOp(node.op);
  }
  function id(ps, token) {
    return {
      type: "Identifier",
      name: normalizeID(ps, token),
      pos: pos(token)
    };
  }
  function normalizeID(ps, token) {
    const error2 = (msg) => {
      ps.pushError(msg, pos(token));
      return "error";
    };
    if (/^\$\d+$/.test(token.value))
      return token.value;
    const parts = token.value.split("_");
    if (parts.length === 1) {
      const [p] = parts;
      if (p.length === 1 || ps.cfg.commandNames.has(p) || ps.cfg.operatorNames.has(p))
        return p;
      return p[0] + "_" + p.slice(1);
    } else if (parts.length === 2) {
      const [main, subscript] = parts;
      if (subscript.length === 0)
        return error2("Cannot end with '_'");
      if (/[0-9]/.test(main))
        return error2("Digits are not allowed before '_'");
      return main + "_" + subscript;
    } else {
      return error2("Too many '_' in identifier");
    }
  }
  function parseStatements(ps, { isTop } = { isTop: false }) {
    const out = [];
    while (true) {
      let next = ps.peek();
      while (next.type === "semi") {
        ps.consume();
        next = ps.peek();
      }
      if (isTop && next.value === "}") {
        ps.pushError("Unexpected '}'", pos(next));
        ps.consume();
        continue;
      }
      if (next.value === "}" || next.type === "eof")
        return out;
      try {
        const stmt = parseMain(ps, Power.top, { isStatementTop: true });
        out.push(finalizeStatement(ps, stmt));
        const next2 = ps.peek();
        if (next2.value === "}" || next2.type === "eof")
          return out;
        ps.consumeType("semi");
      } catch (e) {
        if (!(e instanceof ParseError))
          throw e;
        ps.scanToNextStatement();
      }
    }
  }
  function stringParselet(_ps, token) {
    return {
      type: "String",
      value: JSON.parse(token.value),
      pos: pos(token)
    };
  }
  function repeatedOperatorParselet(name) {
    const ex = `(${name}=(1...5) x^2)`;
    return (ps, token) => {
      const index = id(ps, ps.consumeType("id"));
      ps.consume("=");
      ps.consume("(");
      const start = parseExpr(ps, Power.top, `lower bound of ${name}`, ex);
      ps.consume("...");
      const end = parseExpr(ps, Power.top, `Upper bound of ${name}`, ex);
      ps.consume(")");
      const expr = parseExpr(ps, Power.add, `Term expression of ${name}`, ex);
      return {
        type: "RepeatedExpression",
        name,
        index,
        start,
        end,
        expr,
        pos: pos(token, expr)
      };
    };
  }
  var consequentParselets = {
    "+": binaryParselet(Power.add, "+"),
    "-": binaryParselet(Power.add, "-"),
    "*": binaryParselet(Power.mul, "*"),
    cross: binaryParselet(Power.mul, "cross"),
    "/": binaryParselet(Power.mul, "/"),
    "^": binaryParselet(Power.pow, "^", { rightAssociative: true }),
    "(": consequentParselet(Power.call, parseFunctionCall),
    "'": consequentParselet(Power.call, (ps, left) => {
      if (left.type !== "Identifier")
        throw ps.pushFatalError(
          "Cannot use prime notation on a non-identifier",
          pos(left)
        );
      let order = 1;
      while (true) {
        const next = ps.consume();
        if (next.value === "'")
          order++;
        else if (next.value === "(") {
          const expr = parseFunctionCall(ps, left);
          return {
            type: "PrimeExpression",
            expr,
            order,
            pos: pos(left, expr)
          };
        } else {
          throw ps.pushFatalError("Expected '('", pos(next));
        }
      }
    }),
    "!": consequentParselet(Power.postfix, (ps, left, token) => {
      assertLeftIsExpression(ps, left, token, "x!");
      return {
        type: "PostfixExpression",
        op: "factorial",
        expr: left,
        pos: pos(left, token)
      };
    }),
    ".": consequentParselet(Power.member, (ps, left, token) => {
      assertLeftIsExpression(ps, left, token, "(2,3).x");
      const right = parseMain(ps, Power.member);
      if (right.type !== "Identifier")
        throw ps.pushFatalError(
          `Member access name must be an identifier but got ${right.type}`,
          pos(token)
        );
      return {
        type: "MemberExpression",
        object: left,
        property: right,
        pos: pos(left, right)
      };
    }),
    "[": consequentParselet(Power.access, (ps, left, token) => {
      assertLeftIsExpression(ps, left, token, "L[L>5]");
      const right = parseList(ps, token);
      return {
        type: "ListAccessExpression",
        expr: left,
        index: right.type === "ListExpression" && right.values.length === 1 ? right.values[0] : right,
        pos: pos(left, right)
      };
    }),
    "<": compareOpParselet("<"),
    "<=": compareOpParselet("<="),
    "=": compareOpParselet("="),
    ">=": compareOpParselet(">="),
    ">": compareOpParselet(">"),
    "->": consequentParselet(Power.updateRule, (ps, left) => {
      if (left.type !== "Identifier")
        throw ps.pushFatalError(
          `Left side of update rule must be Identifier, but got ${left.type}`,
          pos(left)
        );
      const right = parseExpr(
        ps,
        Power.updateRule,
        "right side of action update rule",
        "a -> a+1"
      );
      return {
        type: "UpdateRule",
        variable: left,
        expr: right,
        pos: pos(left, right)
      };
    }),
    ",": consequentParselet(Power.seq, (ps, left, token) => {
      const ex = "a -> a+b, b -> a";
      assertLeftIsExpression(ps, left, token, ex);
      if (ps.peek().value === "...")
        return left;
      const right = parseExpr(ps, minus1(Power.seq), "right side of ','", ex);
      return {
        type: "SequenceExpression",
        left,
        right,
        pos: pos(left, right),
        parenWrapped: false
      };
    }),
    "@{": consequentParselet(Power.meta, (ps, left, token) => {
      const stmt = finalizeStatement(ps, left);
      const style = parseStyleMapping(ps, token);
      const stmt2 = {
        ...stmt,
        id: getIDOverride(ps, style) ?? stmt.id,
        style,
        pos: pos(stmt, style)
      };
      delete ps.mapIDstmt[stmt.id];
      ps.mapIDstmt[stmt2.id] = stmt2;
      return stmt2;
    }),
    "~": consequentParselet(Power.sim, (ps, left, token) => {
      const ex = "y1 ~ m * x1 + b";
      assertLeftIsExpression(ps, left, token, ex);
      const right = parseExpr(ps, Power.sim, "Right side of '~", ex);
      return {
        type: "BinaryExpression",
        op: "~",
        left,
        right,
        pos: pos(left, right)
      };
    }),
    "#{": consequentParselet(Power.meta, (ps, left, token) => {
      if (!isStatement(left))
        left = finalizeStatement(ps, left);
      if (left.type !== "ExprStatement" || left.expr.type !== "BinaryExpression" || left.expr.op !== "~")
        throw ps.pushFatalError(
          "Regression Parameters '#{' must be preceded by a regression of the form `LHS ~ RHS`",
          pos(token)
        );
      const seq = parseBareSeq(ps, "y1 ~ m * x1 + b #{ m = 1.5, b = 2.3 }");
      const end = ps.consume("}");
      const entries = seq.map((expr) => {
        if (expr.type !== "BinaryExpression" || expr.op !== "=" || expr.left.type !== "Identifier")
          throw ps.pushFatalError(
            "Regression mapping entry must be of the form 'name = 123'",
            pos(expr)
          );
        return {
          type: "RegressionEntry",
          variable: expr.left,
          value: expr.right,
          pos: pos(expr)
        };
      });
      const parameters = {
        type: "RegressionParameters",
        entries,
        pos: pos(token, end)
      };
      return {
        ...left,
        parameters,
        pos: pos(left, parameters)
      };
    }),
    with: consequentParselet(Power.substitution, (ps, left, token) => {
      assertLeftIsExpression(ps, left, token, "f(x) with a=3");
      const assignments = parseBareSeq(ps, "f(x) with a=3,b=[1...5]").map(
        (item) => {
          if (item.type !== "BinaryExpression" || item.op !== "=" || item.left.type !== "Identifier")
            throw ps.pushFatalError(
              "Substitution must set variable = identifier",
              pos(item)
            );
          return {
            type: "AssignmentExpression",
            variable: item.left,
            expr: item.right,
            pos: item.pos
          };
        }
      );
      return {
        type: "Substitution",
        body: left,
        assignments,
        pos: pos(left, assignments[assignments.length - 1])
      };
    }),
    for: consequentParselet(Power.for, (ps, left, token) => {
      assertLeftIsExpression(ps, left, token, "(a,a^2) for 1<a<2");
      const assignments = [];
      const parameters = [];
      let last = null;
      for (const item of parseBareSeq(ps, "[a+b for a=[0,5,10],b=[1...5]]")) {
        if (item.type === "BinaryExpression" && item.op === "=" && item.left.type === "Identifier") {
          last = {
            type: "AssignmentExpression",
            variable: item.left,
            expr: item.right,
            pos: item.pos
          };
          assignments.push(last);
        } else if (item.type === "ComparatorChain" && item.symbols.length === 2 && item.symbols.every((s) => s === "<" || s === "<=") && item.args[1].type === "Identifier") {
          [, , last] = item.args;
          parameters.push({
            identifier: item.args[1],
            open: [item.symbols[0] === "<", item.symbols[1] === "<"],
            bounds: [item.args[0], item.args[2]]
          });
        } else {
          throw ps.pushFatalError(
            "List comprehension must set variable = identifier",
            pos(item)
          );
        }
      }
      if (last === null)
        throw ps.pushFatalError("Missing an assignment after 'for'", pos(token));
      return {
        type: "ListComprehension",
        expr: left,
        assignments,
        parameters,
        bracketWrapped: false,
        pos: pos(left, last)
      };
    }),
    "...": void 0,
    "]": void 0,
    "{": void 0,
    "}": void 0,
    ":": void 0,
    "d/d": void 0,
    ")": void 0,
    "|": void 0
  };
  function parseList(ps, token) {
    const startValues = parseBareSeq(ps, "[1,2,3]");
    const next = ps.consume();
    if (next.value === "...") {
      if (ps.peek().value === ",")
        ps.consume();
      const endValues = parseBareSeq(ps, "[1,11,...,81,91]");
      const t = ps.consume("]");
      return {
        type: "RangeExpression",
        startValues,
        endValues,
        pos: pos(token, t)
      };
    } else if (next.value === "]") {
      const listcomps = startValues.filter((e) => e.type === "ListComprehension");
      if (listcomps.length > 0) {
        const [inner] = startValues;
        if (listcomps.length > 1)
          throw ps.pushFatalError(
            "List comprehension can only have one 'for'",
            pos(startValues[1])
          );
        if (inner.type !== "ListComprehension")
          throw ps.pushFatalError(
            "Expected exactly one expression before 'for'",
            pos(next)
          );
        if (!inner.bracketWrapped) {
          return {
            ...inner,
            bracketWrapped: true
          };
        }
      }
      return {
        type: "ListExpression",
        values: startValues,
        pos: pos(token, next)
      };
    } else {
      throw ps.pushFatalError("Expected ']'", pos(next));
    }
  }
  function getIDOverride(ps, style) {
    let cnt = 0;
    let id8;
    for (const {
      property: { value: key },
      expr
    } of style.entries) {
      if (key === "id") {
        cnt++;
        if (cnt > 1) {
          ps.pushError("Duplicate id field", expr.pos);
        } else if (expr.type === "String") {
          if (ignoredID(expr.value)) {
            if (expr.value.startsWith("__"))
              ps.pushError(`Specified id must not start with '__'`, expr.pos);
            else
              ps.pushError(
                `Specified id must include a character other than a digit`,
                expr.pos
              );
          } else {
            id8 = expr.value;
          }
        } else {
          ps.pushError(
            `Expected id to be a string, but got ${expr.type}`,
            expr.pos
          );
        }
      }
    }
    if (cnt === 1)
      return id8;
  }
  function parseStyleMapping(ps, token) {
    const entries = [];
    while (true) {
      if (ps.peek().value === "}") {
        const close = ps.consume();
        return {
          type: "StyleMapping",
          entries,
          pos: pos(token, close)
        };
      }
      const key = ps.consumeType(["id", "keyword"]);
      ps.consume(":");
      const expr = parseMain(ps, Power.seq);
      if (!isExpression(expr) && expr.type !== "StyleMapping")
        throw ps.pushFatalError("Expected value on the right of ':'", pos(expr));
      entries.push({
        type: "MappingEntry",
        property: {
          type: "String",
          value: key.value,
          pos: pos(key)
        },
        expr,
        pos: pos(key, expr)
      });
      if (ps.peek().value !== "}")
        ps.consume(",");
    }
  }
  function finalizeStatement(ps, expr) {
    if (isStatement(expr))
      return expr;
    else if (isExpression(expr))
      return exprToStatement(ps, expr);
    else
      throw ps.pushFatalError(
        `I don't know how to finalize '${expr.type}'`,
        pos(expr)
      );
  }
  function exprToStatement(ps, expr) {
    if (expr.type === "String")
      return ps.finishStatement({
        type: "Text",
        text: expr.value,
        pos: expr.pos
      });
    let residualVariable;
    if (expr.type === "BinaryExpression" && expr.op === "=" && expr.right.type === "BinaryExpression" && expr.right.op === "~") {
      const { left } = expr;
      if (left.type !== "Identifier") {
        throw ps.pushFatalError(
          `Residual variable must be identifier, but got ${left.type}`,
          pos(left)
        );
      }
      expr = expr.right;
      residualVariable = left;
    }
    const isRegression = expr.type === "BinaryExpression" && expr.op === "~";
    return ps.finishStatement({
      type: "ExprStatement",
      expr,
      pos: isRegression && residualVariable ? pos(residualVariable, expr) : pos(expr),
      parameters: void 0,
      residualVariable: isRegression ? residualVariable : void 0
    });
  }
  function parseBareSeq(ps, example) {
    const out = [];
    while (true) {
      const peek = ps.peek();
      if (peek.value === "]" || peek.value === "...")
        break;
      const item = parseExpr(ps, Power.seq, `item in sequence`, example);
      out.push(item);
      const next = ps.peek();
      if (next.value !== ",")
        break;
      ps.consume();
    }
    return out;
  }
  function parseFunctionCall(ps, left) {
    const args = ps.peek().value === ")" ? [] : parseBareSeq(ps, "f(x,y)");
    const next = ps.consume(")");
    if (left.type !== "Identifier" && left.type !== "MemberExpression")
      throw ps.pushFatalError("Function call must be an identifier", pos(left));
    return {
      type: "CallExpression",
      callee: left,
      arguments: args,
      pos: pos(left, next)
    };
  }
  function extendComparison(ps, left, op, opToken, right) {
    if (left.type === "ComparatorChain") {
      const leftSymbol = left.symbols.at(-1);
      if (relopDir(leftSymbol) !== relopDir(op)) {
        throw ps.pushFatalError(
          `Cannot chain ${leftSymbol} with ${op}`,
          pos(opToken)
        );
      }
      return {
        type: "ComparatorChain",
        args: [...left.args, right],
        symbols: [...left.symbols, op],
        pos: pos(left, right)
      };
    } else if (left.type === "BinaryExpression" && isComparisonOp(left.op)) {
      if (relopDir(left.op) !== relopDir(op)) {
        throw ps.pushFatalError(
          `Cannot chain ${left.op} with ${op}`,
          pos(opToken)
        );
      }
      return {
        type: "ComparatorChain",
        args: [left.left, left.right, right],
        symbols: [left.op, op],
        pos: pos(left, right)
      };
    } else {
      return {
        type: "BinaryExpression",
        left,
        right,
        op,
        pos: pos(left, right)
      };
    }
  }
  function compareOpParselet(op) {
    return consequentParselet(Power.rel, (ps, left, token, opts) => {
      const ex = `y ${op} x`;
      assertLeftIsExpression(ps, left, token, ex);
      const rightPrec = opts.topLevelEq ? minus1(Power.seq) : Power.rel;
      const right = parseExpr(ps, rightPrec, "right side of comparison", ex);
      return extendComparison(ps, left, op, token, right);
    });
  }
  function relopDir(symbol) {
    return symbol === "=" ? 0 : symbol.startsWith("<") ? 1 : -1;
  }
  function consequentParselet(bindingPower, parse2) {
    return { bindingPower, parse: parse2 };
  }
  function binaryParselet(bp, op, { rightAssociative } = {}) {
    return consequentParselet(bp, (ps, left, token) => {
      const ex = op === "cross" ? `v ${op} u` : `2 ${op} x`;
      assertLeftIsExpression(ps, left, token, ex);
      const right = parseExpr(
        ps,
        rightAssociative ?? false ? minus1(bp) : bp,
        `right side of ${op}`,
        ex
      );
      return {
        type: "BinaryExpression",
        op,
        left,
        right,
        pos: pos(left, right)
      };
    });
  }
  function assertLeftIsExpression(ps, node, posToken, example) {
    if (!isExpression(node))
      throw ps.pushFatalError(
        `Unexpected '${posToken.value}'. Did you mean to precede it by an expression, such as '${example}'?`,
        pos(posToken)
      );
  }
  function pos(start, end = start) {
    return {
      from: "pos" in start ? start.pos.from : start.offset,
      to: "pos" in end ? end.pos.to : end.offset + end.text.length
    };
  }

  // parsing/parsenode.ts
  function evalMaybeRational(x) {
    if (typeof x === "number") {
      return x;
    } else {
      return x.n / x.d;
    }
  }

  // text-mode-core/aug/rawToAug.ts
  function parseLatex(cfg2, str) {
    if (str === "")
      return { type: "Constant", value: NaN };
    const res = cfg2.parseDesmosLatex(str);
    return childNodeToTree(res);
  }
  function postfixBaseToTree(node) {
    const tree = childNodeToTree(node);
    if (node.type === "Paren" && tree.type === "FunctionCall")
      return { ...tree, parenWrapped: true };
    return tree;
  }
  function childNodeToTree(node) {
    switch (node.type) {
      case "Constant":
      case "MixedNumber":
        if (typeof node._constantValue === "boolean") {
          throw Error(
            "Constant value is boolean, but expected rational or number"
          );
        }
        return {
          type: "Constant",
          value: evalMaybeRational(node._constantValue)
        };
      case "Identifier":
        return parseIdentifier(node._symbol);
      case "Norm":
        return {
          type: "Norm",
          arg: childNodeToTree(node.args[0])
        };
      case "FunctionCall":
        if (node._symbol === "factorial" && node.args.length === 1)
          return { type: "Factorial", arg: postfixBaseToTree(node.args[0]) };
        return {
          type: "FunctionCall",
          callee: parseIdentifier(node._symbol),
          args: node.args.map(childNodeToTree)
        };
      case "SeededFunctionCall":
        return {
          type: "FunctionCall",
          callee: parseIdentifier(node._symbol),
          // exclude the seed
          args: node.args.filter((e) => e.type !== "ExtendSeed").map((e) => childNodeToTree(e))
        };
      case "Seed":
      case "ExtendSeed":
        throw Error(`Programming error: ${node.type} encountered`);
      case "FunctionExponent":
        return {
          type: "BinaryOperator",
          name: "Exponent",
          left: {
            type: "FunctionCall",
            callee: nodeToIdentifier(node.args[0]),
            args: [childNodeToTree(node.args[1])]
          },
          right: childNodeToTree(node.args[2])
        };
      case "FunctionFactorial":
        return {
          type: "Factorial",
          arg: {
            type: "FunctionCall",
            callee: nodeToIdentifier(node.args[0]),
            args: [childNodeToTree(node.args[1])]
          }
        };
      case "Integral":
        return {
          type: "Integral",
          differential: nodeToIdentifier(node.args[0]),
          start: childNodeToTree(node.args[1]),
          end: childNodeToTree(node.args[2]),
          integrand: childNodeToTree(node.args[3])
        };
      case "Derivative":
        return {
          type: "Derivative",
          arg: childNodeToTree(node.args[0]),
          variable: parseIdentifier(node._symbol)
        };
      case "Prime": {
        const primeArg = childNodeToTree(node.args[0]);
        if (primeArg.type !== "FunctionCall") {
          throw Error("Expected function call as argument of prime");
        }
        return {
          type: "Prime",
          arg: primeArg,
          order: node.order
        };
      }
      case "List":
        return {
          type: "List",
          args: node.args.map(childNodeToTree)
        };
      case "Matrix":
        return {
          type: "Matrix",
          rows: node.args.map((row) => row.args.map(childNodeToTree))
        };
      case "MatrixRow":
        throw Error("Programming error: MatrixRow outside a Matrix");
      case "Range":
        return {
          type: "Range",
          start: node.args[0].args.map(childNodeToTree),
          end: node.args[1].args.map(childNodeToTree)
        };
      case "ListAccess":
        return {
          type: "ListAccess",
          list: childNodeToTree(node.args[0]),
          index: childNodeToTree(node.args[1])
        };
      case "DotAccess": {
        const prop = childNodeToTree(node.args[1]);
        if (prop.type !== "Identifier" && prop.type !== "FunctionCall") {
          throw Error(
            "Dot access property is not an identifier or function call"
          );
        }
        return {
          type: "DotAccess",
          object: childNodeToTree(node.args[0]),
          property: prop
        };
      }
      case "NamedCoordinateAccess": {
        return {
          type: "OrderedPairAccess",
          point: childNodeToTree(node.args[0]),
          index: node.symbol
        };
      }
      case "BareSeq":
      case "ParenSeq":
        return {
          type: "Seq",
          parenWrapped: node.type === "ParenSeq",
          args: node.args.map(childNodeToTree)
        };
      case "Paren":
        return childNodeToTree(node.args[0]);
      case "UpdateRule":
        return {
          type: "UpdateRule",
          variable: parseIdentifier(node._symbol),
          expression: childNodeToTree(node._expression)
        };
      case "ListComprehension":
        return {
          type: "ListComprehension",
          expr: childNodeToTree(node.args[1]),
          assignments: node.args.slice(2).map(assignmentExprToTree),
          parameters: node.parameters.map(
            ({ identifier: identifier2, open, bounds: [min2, max2] }) => ({
              identifier: parseIdentifier(identifier2._symbol),
              open,
              bounds: [childNodeToTree(min2), childNodeToTree(max2)]
            })
          ),
          bracketWrapped: node.shouldCoerceToList
        };
      case "Substitution":
        return {
          type: "Substitution",
          body: childNodeToTree(node.args[0]),
          assignments: node.args.slice(1).map(assignmentExprToTree)
        };
      case "Piecewise": {
        const [conditionNode] = node.args;
        const condition = conditionNode.type === "Constant" && conditionNode._constantValue === true ? true : childNodeToTree(conditionNode);
        if (condition !== true && !isPiecewiseBoolean(condition)) {
          throw Error(
            "Expected condition of Piecewise to be a Comparator, DoubleInequality, or true"
          );
        }
        return {
          type: "Piecewise",
          condition,
          consequent: childNodeToTree(node.args[1]),
          alternate: childNodeToTree(node.args[2])
        };
      }
      case "Restriction": {
        const [conditionNode] = node.args;
        const condition = conditionNode.type === "Constant" && conditionNode._constantValue === true ? true : childNodeToTree(conditionNode);
        if (condition !== true && !isRestrictionBoolean(condition)) {
          throw Error(
            "Expected condition of Restriction to be a Comparator, DoubleInequality, Or, or true"
          );
        }
        return { type: "Restriction", condition };
      }
      case "Or": {
        const left = childNodeToTree(node.args[0]);
        const right = childNodeToTree(node.args[1]);
        if (!isRestrictionBoolean(left) || !isRestrictionBoolean(right))
          throw new Error("Expected 'Or' to combine two syntactical booelans.");
        return { type: "Or", left, right };
      }
      case "Product":
      case "Sum":
        return {
          type: "RepeatedOperator",
          name: node.type,
          index: nodeToIdentifier(node._index),
          start: childNodeToTree(node.args[1]),
          end: childNodeToTree(node.args[2]),
          expression: childNodeToTree(node.args[3])
        };
      case "Add":
      case "Subtract":
      case "Multiply":
      case "DotMultiply":
      case "CrossMultiply":
      case "Divide":
      case "Exponent":
        return {
          type: "BinaryOperator",
          name: node.type === "DotMultiply" ? "Multiply" : node.type,
          left: node.type === "Exponent" ? postfixBaseToTree(node.args[0]) : childNodeToTree(node.args[0]),
          right: childNodeToTree(node.args[1])
        };
      case "Positive":
        return {
          type: "Positive",
          arg: childNodeToTree(node.args[0])
        };
      case "Negative":
        return {
          type: "Negative",
          arg: childNodeToTree(node.args[0])
        };
      case "ComparatorChain":
        return {
          type: "ComparatorChain",
          args: node.args.map(childNodeToTree),
          symbols: node.symbols
        };
      case "Comparator['<']":
      case "Comparator['<=']":
      case "Comparator['=']":
      case "Comparator['>=']":
      case "Comparator['>']":
      case "Greater":
      case "Less":
      case "GreaterEqual":
      case "LessEqual":
      case "Equal":
        return {
          type: "Comparator",
          operator: node.operator,
          left: childNodeToTree(node.args[0]),
          right: childNodeToTree(node.args[1])
        };
      case "CallAssignment":
        return {
          type: "Comparator",
          operator: "=",
          left: childNodeToTree(node._lhs),
          right: childNodeToTree(node._rhs)
        };
      case "Error":
        throw new Error("Parsing threw an error");
      case "Equation":
      case "Assignment":
      case "FunctionDefinition":
      case "Stats":
      case "AssignmentExpression":
      case "Ans":
      case "DotPlot":
      case "BoxPlot":
      case "Histogram":
      case "IndependentTTest":
      case "TTest":
      case "Regression":
      case "RGBColor":
      case "Image":
      case "Ticker":
      case "SolvedEquation":
      case "Slider":
      case "OptimizedRegression":
      case "IRExpression":
      case "Table":
      case "TableColumn":
        throw new Error(
          `Programming Error: Expected parsenode ${node.type} to not be created`
        );
      default:
        node;
        throw new Error(
          `Programming Error: Unexpected raw node ${node.type}`
        );
    }
  }
  function assignmentExprToTree(node) {
    if (node.type !== "AssignmentExpression")
      throw Error(
        "Programming Error: expected AssignmentExpression in list comprehension"
      );
    return {
      type: "AssignmentExpression",
      variable: nodeToIdentifier(node.args[0]),
      expression: childNodeToTree(node.args[1])
    };
  }
  function nodeToIdentifier(node) {
    if (node.type !== "Identifier") {
      throw Error("Expected identifier");
    }
    return parseIdentifier(node._symbol);
  }
  function parseIdentifier(str) {
    return {
      type: "Identifier",
      symbol: str
    };
  }

  // prettier-doc/builders.ts
  var builders_exports = {};
  __export(builders_exports, {
    addAlignmentToDoc: () => addAlignmentToDoc,
    align: () => align,
    breakParent: () => breakParent,
    conditionalGroup: () => conditionalGroup,
    cursor: () => cursor,
    dedent: () => dedent,
    dedentToRoot: () => dedentToRoot,
    fill: () => fill,
    group: () => group,
    hardline: () => hardline,
    hardlineWithoutBreakParent: () => hardlineWithoutBreakParent,
    ifBreak: () => ifBreak,
    indent: () => indent,
    indentIfBreak: () => indentIfBreak,
    join: () => join,
    label: () => label,
    line: () => line,
    lineSuffix: () => lineSuffix,
    lineSuffixBoundary: () => lineSuffixBoundary,
    literalline: () => literalline,
    literallineWithoutBreakParent: () => literallineWithoutBreakParent,
    markAsRoot: () => markAsRoot,
    softline: () => softline,
    trim: () => trim
  });
  function indent(contents) {
    return { type: "indent" /* Indent */, contents };
  }
  function align(widthOrString, contents) {
    return { type: "align" /* Align */, contents, n: widthOrString };
  }
  function group(contents, opts = {}) {
    return {
      type: "group" /* Group */,
      id: opts.id,
      contents,
      break: Boolean(opts.shouldBreak),
      expandedStates: opts.expandedStates
    };
  }
  function dedentToRoot(contents) {
    return align(Number.NEGATIVE_INFINITY, contents);
  }
  function markAsRoot(contents) {
    return align({ type: "root" }, contents);
  }
  function dedent(contents) {
    return align(-1, contents);
  }
  function conditionalGroup(states, opts) {
    return group(states[0], { ...opts, expandedStates: states });
  }
  function fill(parts) {
    return { type: "fill" /* Fill */, parts };
  }
  function ifBreak(breakContents, flatContents = "", opts = {}) {
    return {
      type: "if-break" /* IfBreak */,
      breakContents,
      flatContents,
      groupId: opts.groupId
    };
  }
  function indentIfBreak(contents, opts) {
    return {
      type: "indent-if-break" /* IndentIfBreak */,
      contents,
      groupId: opts.groupId,
      negate: opts.negate
    };
  }
  function lineSuffix(contents) {
    return { type: "line-suffix" /* LineSuffix */, contents };
  }
  var lineSuffixBoundary = { type: "line-suffix-boundary" /* LineSuffixBoundary */ };
  var breakParent = { type: "break-parent" /* BreakParent */ };
  var trim = { type: "trim" /* Trim */ };
  var hardlineWithoutBreakParent = { type: "line" /* Line */, hard: true };
  var literallineWithoutBreakParent = {
    type: "line" /* Line */,
    hard: true,
    literal: true
  };
  var line = { type: "line" /* Line */ };
  var softline = { type: "line" /* Line */, soft: true };
  var hardline = [hardlineWithoutBreakParent, breakParent];
  var literalline = [literallineWithoutBreakParent, breakParent];
  var cursor = {
    type: "cursor" /* Cursor */
  };
  function join(separator, docs) {
    const parts = [];
    for (let i = 0; i < docs.length; i++) {
      if (i !== 0) {
        parts.push(separator);
      }
      parts.push(docs[i]);
    }
    return parts;
  }
  function addAlignmentToDoc(doc, size, tabWidth) {
    let aligned = doc;
    if (size > 0) {
      for (let i = 0; i < Math.floor(size / tabWidth); ++i) {
        aligned = indent(aligned);
      }
      aligned = align(size % tabWidth, aligned);
      aligned = align(Number.NEGATIVE_INFINITY, aligned);
    }
    return aligned;
  }
  function label(label2, contents) {
    return label2 ? { type: "label" /* Label */, label: label2, contents } : contents;
  }

  // node_modules/string-width/node_modules/ansi-regex/index.js
  function ansiRegex({ onlyFirst = false } = {}) {
    const ST = "(?:\\u0007|\\u001B\\u005C|\\u009C)";
    const pattern = [
      `[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?${ST})`,
      "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"
    ].join("|");
    return new RegExp(pattern, onlyFirst ? void 0 : "g");
  }

  // node_modules/string-width/node_modules/strip-ansi/index.js
  var regex = ansiRegex();

  // node_modules/string-width/index.js
  var import_eastasianwidth = __toESM(require_eastasianwidth(), 1);
  var import_emoji_regex = __toESM(require_emoji_regex(), 1);

  // prettier-doc/printer.ts
  var MODE_BREAK = Symbol("MODE_BREAK");
  var MODE_FLAT = Symbol("MODE_FLAT");
  var CURSOR_PLACEHOLDER = Symbol("cursor");

  // text-mode-core/up/needsParens.ts
  var PRECEDENCE = new Map(
    [
      ["<", ">", "<=", ">=", "="],
      ["~"],
      ["+", "-"],
      ["*", "cross", "/"],
      ["^"]
    ].flatMap((operators, index) => operators.map((op) => [op, index]))
  );

  // text-mode-core/up/astToText.ts
  var { group: group2, indent: indent2, join: join2, ifBreak: ifBreak2 } = builders_exports;
  function startsOrEndsWithWord(dir) {
    function fn(doc) {
      if (!doc)
        return false;
      if (typeof doc === "string")
        return /[a-zA-Z0-9_]/.test(dir === 0 ? doc[0] : doc[doc.length - 1]);
      if (Array.isArray(doc))
        return fn(doc.at(dir));
      switch (doc.type) {
        case "fill" /* Fill */:
          return fn(doc.parts.at(dir));
        case "if-break" /* IfBreak */:
          return fn(doc.flatContents) || fn(doc.breakContents);
        case "group" /* Group */:
          if (doc.expandedStates) {
            return doc.expandedStates.some((d) => fn(d));
          } else {
            return fn(doc.contents);
          }
        case "align" /* Align */:
        case "indent" /* Indent */:
        case "label" /* Label */:
        case "line-suffix" /* LineSuffix */:
          return fn(doc.contents);
        case "indent-if-break" /* IndentIfBreak */:
        case "cursor" /* Cursor */:
        case "trim" /* Trim */:
        case "line-suffix-boundary" /* LineSuffixBoundary */:
        case "line" /* Line */:
        case "break-parent" /* BreakParent */:
          return false;
        default:
          doc;
          throw new Error(`Invalid doc type: ${doc?.type}.`);
      }
    }
    return fn;
  }
  var startsWithWord = startsOrEndsWithWord(0);
  var endsWithWord = startsOrEndsWithWord(-1);

  // text-mode-core/aug/augBuilders.ts
  var augBuilders_exports = {};
  __export(augBuilders_exports, {
    arrayOf: () => arrayOf,
    assignmentExpr: () => assignmentExpr,
    bareSeq: () => bareSeq2,
    bareSeqOf: () => bareSeqOf,
    binop: () => binop,
    comparator: () => comparator,
    factorial: () => factorial,
    functionCall: () => functionCall,
    id: () => id2,
    list: () => list,
    listAccess: () => listAccess,
    listOf: () => listOf,
    negative: () => negative,
    number: () => number,
    positive: () => positive,
    range: () => range,
    rangeOf: () => rangeOf,
    substitution: () => substitution,
    updateRule: () => updateRule,
    wrappedSeq: () => wrappedSeq,
    wrappedSeqOf: () => wrappedSeqOf
  });
  function number(x) {
    return {
      type: "Constant",
      value: x
    };
  }
  function id2(name) {
    return {
      type: "Identifier",
      symbol: name
    };
  }
  function binop(op, left, right) {
    return {
      type: "BinaryOperator",
      name: op,
      left,
      right
    };
  }
  function comparator(op, left, right) {
    return {
      type: "Comparator",
      operator: op,
      left,
      right
    };
  }
  function list(...children) {
    return {
      type: "List",
      args: children
    };
  }
  function listOf(mapper, ...children) {
    return list(...children.map(mapper));
  }
  function arrayOf(mapper, ...children) {
    return children.map(mapper);
  }
  function assignmentExpr(variable, expression3) {
    return {
      type: "AssignmentExpression",
      variable,
      expression: expression3
    };
  }
  function substitution(body, ...assignments) {
    return { type: "Substitution", body, assignments };
  }
  function updateRule(variable, expression3) {
    return {
      type: "UpdateRule",
      variable,
      expression: expression3
    };
  }
  function functionCall(callee, ...args) {
    return {
      type: "FunctionCall",
      callee: typeof callee === "string" ? id2(callee) : callee,
      args
    };
  }
  function negative(arg) {
    return {
      type: "Negative",
      arg
    };
  }
  function positive(arg) {
    return {
      type: "Positive",
      arg
    };
  }
  function factorial(arg) {
    return {
      type: "Factorial",
      arg
    };
  }
  function listAccess(list2, index) {
    return {
      type: "ListAccess",
      list: list2,
      index
    };
  }
  function range(start, end) {
    return {
      type: "Range",
      start,
      end
    };
  }
  function rangeOf(start, end) {
    return range(start.map(number), end.map(number));
  }
  function bareSeq2(...args) {
    return {
      type: "Seq",
      parenWrapped: false,
      args
    };
  }
  function bareSeqOf(mapper, ...args) {
    return bareSeq2(...args.map(mapper));
  }
  function wrappedSeq(...args) {
    return {
      type: "Seq",
      parenWrapped: true,
      args
    };
  }
  function wrappedSeqOf(mapper, ...args) {
    return wrappedSeq(...args.map(mapper));
  }

  // text-mode-core/TextModeConfig.ts
  function buildConfigFromGlobals(Desmos, calc) {
    const config2 = calc.controller.getMathquillConfig({});
    return buildConfig({
      operatorNames: config2.autoOperatorNames,
      commandNames: config2.autoCommands,
      colors: calc?.colors,
      parseDesmosLatex: Desmos.Private.Parser.parse
    });
  }
  function buildConfig(config2) {
    const operatorNames = split(config2.operatorNames ?? defaultOperatorNames);
    for (const extra of extraOperatorNames)
      operatorNames.add(extra);
    return {
      operatorNames,
      commandNames: split(config2.commandNames ?? defaultCommandNames),
      colors: config2.colors ?? defaultColors,
      parseDesmosLatex: function(s) {
        if (!config2.parseDesmosLatex)
          throw new Error(
            "Test Error: trying to parse LaTeX from Desmos, but the config does not define `parseDesmosLatex`."
          );
        return config2.parseDesmosLatex(s, {
          allowDt: true,
          allowIndex: true,
          allowIntervalComprehensions: true
        });
      }
    };
  }
  var extraOperatorNames = [
    // fragile
    "polyGamma",
    "argmin",
    "argmax",
    "uniquePerm",
    "rtxsqpone",
    "rtxsqmone",
    "hypot",
    // required for logbase to be good
    "logbase",
    // true and false have many exceptions
    "true",
    "false",
    // index and dt have many exceptions
    "index",
    "dt"
  ];
  function split(s) {
    return new Set(s.split(" ").map((e) => e.split("|")[0]));
  }
  var defaultOperatorNames = "exp ln log total length mean median quantile quartile nCr nPr stats stdev stddev stdDev stdevp stddevp stdDevP mad var varp variance cov covp corr spearman lcm mcm gcd mcd gcf mod ceil floor round abs min max sign signum sgn sin cos tan csc sec cot sinh cosh tanh csch sech coth arcsin arccos arctan arccsc arcsec arccot arcsinh arccosh arctanh arccsch arcsech arccoth arsinh arcosh artanh arcsch arsech arcoth polygon distance midpoint sort shuffle join unique erf TTest ttest TScore tscore iTTest ittest IndependentTTest TScore Tscore tscore normaldist tdist poissondist binomialdist uniformdist pdf cdf random inverseCdf inversecdf histogram dotplot boxplot pdf cdf rgb hsv for width height with det inv transpose rref trace";
  var defaultCommandNames = "alpha beta sqrt theta phi pi tau nthroot cbrt sum prod integral percent infinity infty cross ans frac";
  var defaultColors = {
    RED: "#c74440",
    BLUE: "#2d70b3",
    GREEN: "#348543",
    ORANGE: "#fa7e19",
    PURPLE: "#6042a6",
    BLACK: "#000000"
  };

  // src/symbolic/tree.ts
  var { number: number2, binop: binop2, functionCall: functionCall2, id: id3, negative: negative2 } = augBuilders_exports;
  var add = (a, b) => binop2("Add", a, b);
  var subtract = (a, b) => binop2("Subtract", a, b);
  var multiply = (a, b) => binop2("Multiply", a, b);
  var divide = (a, b) => binop2("Divide", a, b);
  var power2 = (a, b) => binop2("Exponent", a, b);
  var call = (name, arg) => functionCall2(id3(name), arg);
  function visit(node, callback) {
    callback(node);
    forEachChild(node, (child) => {
      visit(child, callback);
    });
  }
  function forEachChild(node, on) {
    for (const key in node) {
      const value = node[key];
      if (typeof value !== "object" || value === null)
        continue;
      if (Array.isArray(value)) {
        for (const child of value)
          if (isNode(child))
            on(child);
      } else if (isNode(value)) {
        on(value);
      }
    }
  }
  function isNode(value) {
    return typeof value === "object" && value !== null && typeof value.type === "string";
  }
  function dependsOn(node, variable) {
    if (node.type === "Identifier")
      return node.symbol === variable;
    let found = false;
    forEachChild(node, (child) => {
      if (!found && dependsOn(child, variable))
        found = true;
    });
    return found;
  }
  function identifiersIn(node) {
    const names = [];
    visit(node, (child) => {
      if (child.type === "Identifier" && !names.includes(child.symbol))
        names.push(child.symbol);
    });
    return names;
  }
  function sameTree(a, b) {
    return deepEqual(a, b);
  }
  function isBracketMark(node, key) {
    return key === "parenWrapped" && node.type === "FunctionCall";
  }
  function deepEqual(a, b) {
    if (a === b)
      return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
      return false;
    }
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
        return false;
      for (let i = 0; i < a.length; i += 1) {
        if (!deepEqual(a[i], b[i]))
          return false;
      }
      return true;
    }
    const left = a;
    const right = b;
    let keys = 0;
    for (const key in left) {
      if (isBracketMark(left, key))
        continue;
      keys += 1;
      if (!deepEqual(left[key], right[key]))
        return false;
    }
    let otherKeys = 0;
    for (const key in right) {
      if (isBracketMark(right, key))
        continue;
      otherKeys += 1;
    }
    return keys === otherKeys;
  }
  function topLevelTerms(node) {
    const out = [];
    collectTerms(node, false, out);
    return out;
  }
  function collectTerms(node, negated, out) {
    if (node.type === "BinaryOperator") {
      if (node.name === "Add") {
        collectTerms(node.left, negated, out);
        collectTerms(node.right, negated, out);
        return;
      }
      if (node.name === "Subtract") {
        collectTerms(node.left, negated, out);
        collectTerms(node.right, !negated, out);
        return;
      }
    }
    out.push({ term: node, negated });
  }
  function rebuildSum(parts) {
    let result;
    for (const part of parts) {
      if (result === void 0) {
        result = part.negated ? negative2(part.value) : part.value;
      } else {
        result = part.negated ? subtract(result, part.value) : add(result, part.value);
      }
    }
    return result ?? number2(0);
  }
  function quotientFactors(node, inNumerator, out) {
    if (node.type === "BinaryOperator") {
      if (node.name === "Multiply" || node.name === "CrossMultiply") {
        quotientFactors(node.left, inNumerator, out);
        quotientFactors(node.right, inNumerator, out);
        return;
      }
      if (node.name === "Divide") {
        quotientFactors(node.left, inNumerator, out);
        quotientFactors(node.right, !inNumerator, out);
        return;
      }
    }
    if (node.type === "Negative") {
      out.push({ node: number2(-1), inNumerator });
      quotientFactors(node.arg, inNumerator, out);
      return;
    }
    out.push({ node, inNumerator });
  }
  function constantValue(node) {
    if (node.type === "Constant")
      return node.value;
    if (node.type === "Negative") {
      const inner = constantValue(node.arg);
      return inner === void 0 ? void 0 : -inner;
    }
    return void 0;
  }
  function splitCoefficient(node) {
    if (node.type === "Constant")
      return [node.value, number2(1)];
    if (node.type === "Negative") {
      const [factor, rest] = splitCoefficient(node.arg);
      return [-factor, rest];
    }
    if (node.type === "BinaryOperator" && (node.name === "Multiply" || node.name === "CrossMultiply")) {
      const factor = constantValue(node.left);
      if (factor !== void 0)
        return [factor, node.right];
    }
    return [1, node];
  }
  function rationalOf(node) {
    if (node.type === "Constant")
      return Number.isInteger(node.value) ? { n: node.value, d: 1 } : void 0;
    if (node.type === "Negative") {
      const inner = rationalOf(node.arg);
      return inner === void 0 ? void 0 : { n: -inner.n, d: inner.d };
    }
    if (node.type === "BinaryOperator" && node.name === "Divide") {
      const top = rationalOf(node.left);
      const bottom = rationalOf(node.right);
      if (top === void 0 || bottom === void 0 || bottom.n === 0)
        return void 0;
      return { n: top.n * bottom.d, d: top.d * bottom.n };
    }
    return void 0;
  }
  function rationalNode(value) {
    let { n, d } = value;
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const divisor = greatestCommonDivisor(Math.abs(n), d);
    if (divisor > 1) {
      n /= divisor;
      d /= divisor;
    }
    if (d === 1)
      return number2(n);
    return n < 0 ? negative2(divide(number2(-n), number2(d))) : divide(number2(n), number2(d));
  }
  function greatestCommonDivisor(a, b) {
    while (b !== 0)
      [a, b] = [b, a % b];
    return a;
  }
  function nodeCount(node) {
    let count = 1;
    forEachChild(node, (child) => {
      count += nodeCount(child);
    });
    return count;
  }
  function exceedsNodeCount(node, limit) {
    return countUpTo(node, limit) > limit;
  }
  function countUpTo(node, limit) {
    let count = 1;
    forEachChild(node, (child) => {
      if (count > limit)
        return;
      count += countUpTo(child, limit - count);
    });
    return count;
  }
  function replaceSubtree(node, target, value) {
    if (sameTree(node, target))
      return value;
    return mapChildNodes(node, (child) => replaceSubtree(child, target, value));
  }
  function replaceIdentifier(node, name, value) {
    if (node.type === "Identifier" && node.symbol === name)
      return value;
    return mapChildNodes(node, (child) => replaceIdentifier(child, name, value));
  }
  function mapChildNodes(node, on) {
    switch (node.type) {
      case "Negative":
        return negative2(on(node.arg));
      case "FunctionCall":
        return { ...node, args: node.args.map(on) };
      case "Factorial":
        return { ...node, arg: on(node.arg) };
      case "BinaryOperator":
        return node.name === "CrossMultiply" ? { ...node, left: on(node.left), right: on(node.right) } : binop2(node.name, on(node.left), on(node.right));
      case "Seq":
        return { ...node, args: node.args.map(on) };
      case "RepeatedOperator":
        return { ...node, expression: on(node.expression) };
      default:
        return node;
    }
  }
  function normsToAbs(node) {
    if (node.type === "Norm")
      return call("abs", normsToAbs(node.arg));
    return mapChildNodes(node, normsToAbs);
  }
  function freshName(node, preferred) {
    const taken = new Set(identifiersIn(node));
    for (const name of preferred)
      if (!taken.has(name))
        return name;
    for (let i = 1; ; i += 1) {
      const name = `u_{${i}}`;
      if (!taken.has(name))
        return name;
    }
  }
  function splitRationalCoefficient(node) {
    const whole = rationalOf(node);
    if (whole !== void 0)
      return { coefficient: whole, rest: number2(1) };
    if (node.type === "Negative") {
      const inner = splitRationalCoefficient(node.arg);
      return {
        coefficient: { n: -inner.coefficient.n, d: inner.coefficient.d },
        rest: inner.rest
      };
    }
    if (node.type === "BinaryOperator") {
      if (node.name === "Multiply" || node.name === "CrossMultiply") {
        const left = rationalOf(node.left);
        if (left !== void 0) {
          const inner = splitRationalCoefficient(node.right);
          return {
            coefficient: {
              n: left.n * inner.coefficient.n,
              d: left.d * inner.coefficient.d
            },
            rest: inner.rest
          };
        }
      }
      if (node.name === "Divide") {
        const right = rationalOf(node.right);
        if (right !== void 0 && right.n !== 0) {
          const inner = splitRationalCoefficient(node.left);
          return {
            coefficient: {
              n: inner.coefficient.n * right.d,
              d: inner.coefficient.d * right.n
            },
            rest: inner.rest
          };
        }
      }
    }
    return { coefficient: { n: 1, d: 1 }, rest: node };
  }
  function asRatio(node) {
    const whole = (value) => ({ numerator: value, denominator: number2(1) });
    switch (node.type) {
      case "Negative": {
        const inner = asRatio(node.arg);
        return { ...inner, numerator: negative2(inner.numerator) };
      }
      case "BinaryOperator": {
        const left = asRatio(node.left);
        const right = asRatio(node.right);
        switch (node.name) {
          case "Add":
          case "Subtract": {
            const scaledLeft = multiply(left.numerator, right.denominator);
            const scaledRight = multiply(right.numerator, left.denominator);
            return {
              numerator: node.name === "Add" ? add(scaledLeft, scaledRight) : subtract(scaledLeft, scaledRight),
              denominator: multiply(left.denominator, right.denominator)
            };
          }
          case "Multiply":
          case "CrossMultiply":
            return {
              numerator: multiply(left.numerator, right.numerator),
              denominator: multiply(left.denominator, right.denominator)
            };
          case "Divide":
            return {
              numerator: multiply(left.numerator, right.denominator),
              denominator: multiply(left.denominator, right.numerator)
            };
          case "Exponent": {
            const exponent2 = constantValue(node.right);
            if (exponent2 === void 0 || !Number.isInteger(exponent2))
              return whole(node);
            const raise2 = (value, to) => to === 1 ? value : binop2("Exponent", value, number2(to));
            if (exponent2 >= 0) {
              return {
                numerator: raise2(left.numerator, exponent2),
                denominator: raise2(left.denominator, exponent2)
              };
            }
            return {
              numerator: raise2(left.denominator, -exponent2),
              denominator: raise2(left.numerator, -exponent2)
            };
          }
          default:
            return whole(node);
        }
      }
      default:
        return whole(node);
    }
  }
  function sameProduct(a, b) {
    if (sameTree(a, b))
      return true;
    const left = [];
    const right = [];
    quotientFactors(a, true, left);
    quotientFactors(b, true, right);
    if (left.length !== right.length)
      return false;
    const taken = new Array(right.length).fill(false);
    for (const factor of left) {
      const match = right.findIndex(
        (other, index) => !taken[index] && other.inNumerator === factor.inNumerator && sameTree(other.node, factor.node)
      );
      if (match < 0)
        return false;
      taken[match] = true;
    }
    return true;
  }

  // src/symbolic/fold.ts
  function fold(node) {
    switch (node.type) {
      case "Negative": {
        const arg = fold(node.arg);
        if (arg.type === "Constant")
          return number2(-arg.value);
        if (arg.type === "Negative")
          return arg.arg;
        if (arg.type === "BinaryOperator" && (arg.name === "Multiply" || arg.name === "CrossMultiply")) {
          const coefficient = constantValue(arg.left);
          if (coefficient !== void 0)
            return fold(binop2("Multiply", number2(-coefficient), arg.right));
        }
        return negative2(arg);
      }
      case "Factorial": {
        const arg = fold(node.arg);
        const value = constantValue(arg);
        if (value !== void 0 && Number.isInteger(value) && value >= 0 && value <= 18) {
          let total = 1;
          for (let i = 2; i <= value; i += 1)
            total *= i;
          return number2(total);
        }
        return { ...node, arg };
      }
      case "FunctionCall": {
        const args = node.args.map(fold);
        const folded = foldKnownValue(node.callee.symbol, args) ?? foldInverse(node.callee.symbol, args) ?? foldParity(node.callee.symbol, args);
        return folded ?? { ...node, args };
      }
      case "BinaryOperator": {
        if (node.name === "Exponent") {
          const base2 = fold(node.left);
          const n = constantValue(fold(node.right));
          if (base2.type === "BinaryOperator" && base2.name === "Exponent" && n !== void 0 && Number.isInteger(n)) {
            const a = constantValue(base2.right);
            if (a !== void 0)
              return fold(binop2("Exponent", base2.left, number2(a * n)));
          }
          if (base2.type === "Negative" && n !== void 0 && Number.isInteger(n)) {
            const inner = fold(binop2("Exponent", base2.arg, number2(n)));
            return n % 2 === 0 ? inner : fold(negative2(inner));
          }
        }
        return foldBinary(node);
      }
      default:
        return node;
    }
  }
  var PARITY = {
    cos: "even",
    sec: "even",
    cosh: "even",
    sin: "odd",
    tan: "odd",
    csc: "odd",
    cot: "odd",
    sinh: "odd",
    tanh: "odd",
    arcsin: "odd",
    arctan: "odd"
  };
  function foldParity(name, args) {
    const parity = PARITY[name];
    if (parity === void 0 || args.length !== 1)
      return void 0;
    const [arg] = args;
    let positive3;
    if (arg.type === "Negative")
      positive3 = arg.arg;
    else if (arg.type === "Constant" && arg.value < 0)
      positive3 = number2(-arg.value);
    else if (arg.type === "BinaryOperator" && (arg.name === "Multiply" || arg.name === "Divide")) {
      const coefficient = constantValue(arg.left);
      if (coefficient !== void 0 && coefficient < 0)
        positive3 = fold(binop2(arg.name, number2(-coefficient), arg.right));
    }
    if (positive3 === void 0)
      return void 0;
    const mirrored = {
      type: "FunctionCall",
      callee: id3(name),
      args: [positive3]
    };
    return parity === "even" ? mirrored : negative2(mirrored);
  }
  function isFractionLike(node) {
    if (node.type === "Negative")
      return isFractionLike(node.arg);
    if (node.type !== "BinaryOperator")
      return false;
    if (node.name === "Divide")
      return true;
    return node.name === "Multiply" || node.name === "CrossMultiply" ? isFractionLike(node.left) || isFractionLike(node.right) : false;
  }
  function foldBinary(node) {
    const left = fold(node.left);
    const right = fold(node.right);
    const lc = constantValue(left);
    const rc = constantValue(right);
    if ((node.name === "Multiply" || node.name === "CrossMultiply") && (left.type === "Negative" || right.type === "Negative")) {
      const bareLeft = left.type === "Negative" ? left.arg : left;
      const bareRight = right.type === "Negative" ? right.arg : right;
      const product = fold(binop2("Multiply", bareLeft, bareRight));
      return left.type === "Negative" && right.type === "Negative" ? product : fold(negative2(product));
    }
    if (node.name === "Add" && right.type === "Negative")
      return fold(binop2("Subtract", left, right.arg));
    if (node.name === "Add" && left.type === "Negative")
      return fold(binop2("Subtract", right, left.arg));
    if (node.name === "Subtract" && right.type === "Negative")
      return fold(binop2("Add", left, right.arg));
    if (node.name === "Multiply" || node.name === "CrossMultiply") {
      const shared = foldSharedBases(binop2("Multiply", left, right));
      if (shared !== void 0)
        return fold(shared);
      if (left.type === "BinaryOperator" && left.name === "Divide") {
        return fold(
          binop2("Divide", binop2("Multiply", left.left, right), left.right)
        );
      }
      if (right.type === "BinaryOperator" && right.name === "Divide") {
        return fold(
          binop2("Divide", binop2("Multiply", left, right.left), right.right)
        );
      }
    }
    if (node.name === "Divide") {
      const cancelled = cancelCommonFactors(binop2("Divide", left, right));
      if (cancelled !== void 0)
        return fold(cancelled);
      const shared = foldSharedBases(binop2("Divide", left, right));
      if (shared !== void 0)
        return fold(shared);
    }
    switch (node.name) {
      case "Add":
        if (lc === 0)
          return right;
        if (rc === 0)
          return left;
        if (lc !== void 0 && rc !== void 0)
          return number2(lc + rc);
        break;
      case "Subtract":
        if (rc === 0)
          return left;
        if (lc === 0)
          return fold(negative2(right));
        if (lc !== void 0 && rc !== void 0)
          return number2(lc - rc);
        if (sameTree(left, right))
          return number2(0);
        break;
    }
    if (node.name === "Add" || node.name === "Subtract") {
      const [factor, rest] = splitCoefficient(right);
      if (factor < 0 && rc === void 0) {
        const positive3 = fold(binop2("Multiply", number2(-factor), rest));
        return fold(
          binop2(node.name === "Add" ? "Subtract" : "Add", left, positive3)
        );
      }
    }
    if (node.name === "Add" || node.name === "Subtract" || node.name === "Multiply") {
      const a = rationalOf(left);
      const b = rationalOf(right);
      if (a !== void 0 && b !== void 0) {
        if (node.name === "Multiply")
          return rationalNode({ n: a.n * b.n, d: a.d * b.d });
        const sign3 = node.name === "Add" ? 1 : -1;
        return rationalNode({
          n: a.n * b.d + sign3 * b.n * a.d,
          d: a.d * b.d
        });
      }
    }
    if ((node.name === "Add" || node.name === "Subtract") && left.type === "BinaryOperator" && (left.name === "Add" || left.name === "Subtract")) {
      const outer = rationalOf(right);
      const trailing = rationalOf(left.right);
      if (outer !== void 0 && trailing !== void 0) {
        const innerSign = left.name === "Add" ? 1 : -1;
        const outerSign = node.name === "Add" ? 1 : -1;
        const total = {
          n: innerSign * trailing.n * outer.d + outerSign * outer.n * trailing.d,
          d: trailing.d * outer.d
        };
        return fold(binop2("Add", left.left, rationalNode(total)));
      }
    }
    if (rc !== void 0 && rc < 0 && (node.name === "Add" || node.name === "Subtract"))
      return fold(
        binop2(node.name === "Add" ? "Subtract" : "Add", left, number2(-rc))
      );
    if (node.name === "Add" && right.type === "BinaryOperator" && (right.name === "Add" || right.name === "Subtract")) {
      const head = fold(binop2("Add", left, right.left));
      return fold(binop2(right.name, head, right.right));
    }
    if ((node.name === "Multiply" || node.name === "CrossMultiply") && lc !== void 0 && right.type === "BinaryOperator" && (right.name === "Add" || right.name === "Subtract") && (isFractionLike(right.left) || isFractionLike(right.right))) {
      return fold(
        binop2(
          right.name,
          binop2("Multiply", left, right.left),
          binop2("Multiply", left, right.right)
        )
      );
    }
    if (node.name === "Subtract" && right.type === "BinaryOperator" && (right.name === "Add" || right.name === "Subtract")) {
      const head = fold(binop2("Subtract", left, right.left));
      return fold(
        binop2(right.name === "Add" ? "Subtract" : "Add", head, right.right)
      );
    }
    if (node.name === "Add" || node.name === "Subtract") {
      const [leftFactor, leftRest] = splitCoefficient(left);
      const [rightFactor, rightRest] = splitCoefficient(right);
      if (sameTree(leftRest, rightRest)) {
        const combined = node.name === "Add" ? leftFactor + rightFactor : leftFactor - rightFactor;
        return fold(binop2("Multiply", number2(combined), leftRest));
      }
    }
    switch (node.name) {
      case "Multiply":
      case "CrossMultiply": {
        if (lc === 0 || rc === 0)
          return number2(0);
        if (lc === 1)
          return right;
        if (rc === 1)
          return left;
        if (lc === -1)
          return fold(negative2(right));
        if (rc === -1)
          return fold(negative2(left));
        if (lc !== void 0 && rc !== void 0)
          return number2(lc * rc);
        if (lc === void 0 && right.type === "BinaryOperator" && (right.name === "Multiply" || right.name === "CrossMultiply") && constantValue(right.left) !== void 0) {
          return fold(
            binop2("Multiply", binop2("Multiply", right.left, left), right.right)
          );
        }
        if (lc !== void 0 && right.type === "BinaryOperator" && (right.name === "Multiply" || right.name === "CrossMultiply")) {
          const inner = constantValue(right.left);
          if (inner !== void 0)
            return fold(binop2("Multiply", number2(lc * inner), right.right));
        }
        if (lc !== void 0 && right.type === "BinaryOperator" && right.name === "Divide") {
          return fold(
            binop2("Divide", binop2("Multiply", left, right.left), right.right)
          );
        }
        if (rc !== void 0 && lc === void 0)
          return fold(binop2("Multiply", right, left));
        break;
      }
      case "Divide": {
        if (lc === 0)
          return number2(0);
        if (rc === 1)
          return left;
        if (rc === -1)
          return fold(negative2(left));
        if (rc !== void 0 && rc < 0)
          return fold(negative2(binop2("Divide", left, number2(-rc))));
        if (lc !== void 0 && lc < 0)
          return fold(negative2(binop2("Divide", number2(-lc), right)));
        {
          const a = rationalOf(left);
          const b = rationalOf(right);
          if (a !== void 0 && b !== void 0 && b.n !== 0)
            return rationalNode({ n: a.n * b.d, d: a.d * b.n });
        }
        if (lc !== void 0 && rc !== void 0 && rc !== 0 && Number.isInteger(lc / rc))
          return number2(lc / rc);
        if (rc !== void 0 && rc !== 0 && left.type === "BinaryOperator" && (left.name === "Multiply" || left.name === "CrossMultiply")) {
          const factor = constantValue(left.left);
          if (factor !== void 0 && Number.isInteger(factor / rc))
            return fold(binop2("Multiply", number2(factor / rc), left.right));
          if (factor !== void 0 && Number.isInteger(factor)) {
            const common = greatestCommonDivisor(Math.abs(factor), Math.abs(rc));
            if (common > 1) {
              const reduced = factor / common;
              const under = rc / common;
              const top = reduced === 1 ? left.right : binop2("Multiply", number2(reduced), left.right);
              return fold(binop2("Divide", top, number2(under)));
            }
          }
        }
        if (left.type === "BinaryOperator" && left.name === "Divide") {
          return fold(
            binop2("Divide", left.left, binop2("Multiply", left.right, right))
          );
        }
        if (right.type === "BinaryOperator" && right.name === "Divide") {
          return fold(
            binop2("Divide", binop2("Multiply", left, right.right), right.left)
          );
        }
        if (rc !== void 0 && rc !== 0 && left.type === "BinaryOperator" && (left.name === "Add" || left.name === "Subtract") && (isFractionLike(left.left) || isFractionLike(left.right))) {
          return fold(
            binop2(
              left.name,
              binop2("Divide", left.left, right),
              binop2("Divide", left.right, right)
            )
          );
        }
        if (left.type === "Negative")
          return fold(negative2(binop2("Divide", left.arg, right)));
        if (right.type === "Negative")
          return fold(negative2(binop2("Divide", left, right.arg)));
        break;
      }
      case "Exponent":
        if (rc === 1)
          return left;
        if (rc === 0)
          return number2(1);
        if (rc !== void 0 && Number.isInteger(rc) && left.type === "FunctionCall" && left.callee.symbol === "sqrt" && left.args.length === 1) {
          return fold(
            binop2("Exponent", left.args[0], rationalNode({ n: rc, d: 2 }))
          );
        }
        if (left.type === "Identifier" && left.symbol === "e" && right.type === "FunctionCall" && right.callee.symbol === "ln" && right.args.length === 1) {
          return right.args[0];
        }
        if (left.type === "Identifier" && left.symbol === "e") {
          const scaled2 = right.type === "Negative" ? { k: -1, inner: right.arg } : right.type === "BinaryOperator" && right.name === "Multiply" && rationalOf(right.left) !== void 0 ? { k: rationalOf(right.left), inner: right.right } : void 0;
          const k = scaled2 === void 0 ? void 0 : typeof scaled2.k === "number" ? { n: scaled2.k, d: 1 } : scaled2.k;
          if (scaled2 !== void 0 && k !== void 0 && scaled2.inner.type === "FunctionCall" && scaled2.inner.callee.symbol === "ln" && scaled2.inner.args.length === 1)
            return fold(binop2("Exponent", scaled2.inner.args[0], rationalNode(k)));
        }
        if (rc !== void 0 && left.type === "BinaryOperator" && left.name === "Exponent" && (left.left.type === "Identifier" && left.left.symbol === "e" || (constantValue(left.left) ?? 0) > 0)) {
          return fold(
            binop2("Exponent", left.left, binop2("Multiply", right, left.right))
          );
        }
        {
          const exponent2 = rationalOf(right);
          if (exponent2 !== void 0 && exponent2.n === 1 && exponent2.d === 2) {
            return { type: "FunctionCall", callee: id3("sqrt"), args: [left] };
          }
        }
        if (lc === 1)
          return number2(1);
        if (rc !== void 0 && Number.isInteger(rc) && rc < 0)
          return fold(
            binop2("Divide", number2(1), binop2("Exponent", left, number2(-rc)))
          );
        if (lc !== void 0 && rc !== void 0 && Number.isInteger(lc ** rc))
          return number2(lc ** rc);
        {
          const base2 = rationalOf(left);
          if (base2 !== void 0 && base2.d !== 1 && rc !== void 0 && Number.isInteger(rc) && rc > 0 && rc <= 12)
            return rationalNode({ n: base2.n ** rc, d: base2.d ** rc });
        }
        break;
    }
    return node.name === "CrossMultiply" ? { ...node, left, right } : binop2(node.name, left, right);
  }
  function foldSharedBases(node) {
    const entries = [];
    quotientFactors(node, true, entries);
    if (entries.length < 2)
      return void 0;
    const powers = [];
    const others = [];
    let folded = false;
    for (const entry of entries) {
      const { node: factor, inNumerator } = entry;
      const isPower = factor.type === "BinaryOperator" && factor.name === "Exponent";
      const base2 = isPower ? factor.left : factor;
      const exponent2 = isPower ? factor.right : number2(1);
      if (base2.type === "Constant") {
        others.push(entry);
        continue;
      }
      const contribution = inNumerator ? exponent2 : negative2(exponent2);
      const match = powers.findIndex((existing) => sameTree(existing.base, base2));
      if (match >= 0) {
        powers[match] = {
          base: powers[match].base,
          exponent: binop2("Add", powers[match].exponent, contribution)
        };
        folded = true;
      } else {
        powers.push({ base: base2, exponent: contribution });
      }
    }
    if (!folded)
      return void 0;
    let numerator = number2(1);
    let denominator = number2(1);
    for (const { base: base2, exponent: exponent2 } of powers)
      numerator = binop2("Multiply", numerator, binop2("Exponent", base2, exponent2));
    for (const { node: factor, inNumerator } of others) {
      if (inNumerator)
        numerator = binop2("Multiply", numerator, factor);
      else
        denominator = binop2("Multiply", denominator, factor);
    }
    return binop2("Divide", numerator, denominator);
  }
  function cancelCommonFactors(node) {
    const entries = [];
    quotientFactors(node, true, entries);
    const numerator = entries.filter((e) => e.inNumerator).map((e) => e.node);
    const denominator = entries.filter((e) => !e.inNumerator).map((e) => e.node);
    if (numerator.length === 0 || denominator.length === 0)
      return void 0;
    let cancelled = false;
    for (let i = numerator.length - 1; i >= 0; i--) {
      const match = denominator.findIndex((d) => sameTree(d, numerator[i]));
      if (match < 0)
        continue;
      numerator.splice(i, 1);
      denominator.splice(match, 1);
      cancelled = true;
    }
    if (!cancelled)
      return void 0;
    const product = (factors) => factors.length === 0 ? number2(1) : factors.reduce((a, b) => binop2("Multiply", a, b));
    return denominator.length === 0 ? product(numerator) : binop2("Divide", product(numerator), product(denominator));
  }
  function foldInverse(name, args) {
    if (args.length !== 1)
      return void 0;
    const [inner] = args;
    if (name === "abs" && inner.type === "BinaryOperator" && inner.name === "Exponent" && (inner.left.type === "Identifier" && inner.left.symbol === "e" || (constantValue(inner.left) ?? 0) > 0))
      return inner;
    if (name === "ln" && inner.type === "BinaryOperator") {
      if (inner.name === "Exponent" && inner.left.type === "Identifier" && inner.left.symbol === "e")
        return inner.right;
      if (inner.name === "Exponent" && (constantValue(inner.left) ?? 0) > 0 && constantValue(inner.right) === void 0)
        return fold(
          binop2("Multiply", inner.right, {
            type: "FunctionCall",
            callee: id3("ln"),
            args: [inner.left]
          })
        );
      return void 0;
    }
    if (inner.type !== "FunctionCall" || inner.args.length !== 1)
      return void 0;
    const [u] = inner.args;
    const square4 = () => binop2("Exponent", u, number2(2));
    const root2 = (radicand) => fold({ type: "FunctionCall", callee: id3("sqrt"), args: [radicand] });
    const oneMinus = () => root2(binop2("Subtract", number2(1), square4()));
    const onePlus = () => root2(binop2("Add", square4(), number2(1)));
    const key = `${name} ${inner.callee.symbol}`;
    switch (key) {
      case "sin arcsin":
      case "cos arccos":
      case "tan arctan":
      case "sinh arcsinh":
      case "cosh arccosh":
      case "tanh arctanh":
      case "ln exp":
        return u;
      case "cos arcsin":
      case "sin arccos":
        return oneMinus();
      case "tan arcsin":
        return binop2("Divide", u, oneMinus());
      case "tan arccos":
        return binop2("Divide", oneMinus(), u);
      case "sin arctan":
        return binop2("Divide", u, onePlus());
      case "cos arctan":
        return binop2("Divide", number2(1), onePlus());
      case "cosh arcsinh":
        return onePlus();
      case "sinh arccosh":
        return root2(binop2("Subtract", square4(), number2(1)));
      default:
        return void 0;
    }
  }
  function foldKnownValue(name, args) {
    if (args.length !== 1)
      return void 0;
    const symbol = args[0].type === "Identifier" ? args[0].symbol : void 0;
    if (name === "ln" && symbol === "e")
      return number2(1);
    const argument = constantValue(args[0]);
    if (name === "log" && argument === 10)
      return number2(1);
    if (argument === void 0)
      return void 0;
    switch (name) {
      case "sin":
      case "tan":
      case "sinh":
      case "tanh":
        return argument === 0 ? number2(0) : void 0;
      case "cos":
      case "cosh":
        return argument === 0 ? number2(1) : void 0;
      case "exp":
        return argument === 0 ? number2(1) : void 0;
      case "ln":
        return argument === 1 ? number2(0) : void 0;
      case "log":
        return argument === 1 ? number2(0) : void 0;
      case "abs":
        return number2(Math.abs(argument));
      case "sign":
        return number2(Math.sign(argument));
      case "sqrt": {
        if (!Number.isInteger(argument) || argument < 0)
          return void 0;
        const root2 = Math.sqrt(argument);
        if (Number.isInteger(root2))
          return number2(root2);
        for (let factor = Math.floor(root2); factor >= 2; factor -= 1) {
          const square4 = factor * factor;
          if (argument % square4 !== 0)
            continue;
          return binop2("Multiply", number2(factor), {
            type: "FunctionCall",
            callee: id3("sqrt"),
            args: [number2(argument / square4)]
          });
        }
        return void 0;
      }
      default:
        return void 0;
    }
  }

  // src/symbolic/differentiate.ts
  var SymbolicError = class extends Error {
  };
  var FUNCTION_DERIVATIVES = {
    sin: (u) => call("cos", u),
    cos: (u) => negative2(call("sin", u)),
    // `sec^2` rather than `1/cos^2`, which is the same function and is what
    // every table prints. It also matters mechanically: the integrator finds a
    // substitution by dividing the integrand by `du`, and `tan^2 sec^2` divided
    // by `sec^2` cancels while the same thing divided by `1/cos^2` does not --
    // nothing here knows that `sec` and `cos` are reciprocals.
    tan: (u) => power2(call("sec", u), number2(2)),
    cot: (u) => negative2(power2(call("csc", u), number2(2))),
    sec: (u) => multiply(call("sec", u), call("tan", u)),
    csc: (u) => negative2(multiply(call("csc", u), call("cot", u))),
    exp: (u) => call("exp", u),
    ln: (u) => divide(number2(1), u),
    log: (u) => divide(number2(1), multiply(u, call("ln", number2(10)))),
    sqrt: (u) => divide(number2(1), multiply(number2(2), call("sqrt", u))),
    arcsin: (u) => divide(number2(1), call("sqrt", subtract(number2(1), square(u)))),
    arccos: (u) => negative2(divide(number2(1), call("sqrt", subtract(number2(1), square(u))))),
    arctan: (u) => divide(number2(1), add(number2(1), square(u))),
    sinh: (u) => call("cosh", u),
    cosh: (u) => call("sinh", u),
    tanh: (u) => divide(number2(1), power2(call("cosh", u), number2(2))),
    abs: (u) => call("sign", u)
  };
  function differentiate(node, variable) {
    return fold(derivative(node, variable));
  }
  function derivative(node, variable) {
    switch (node.type) {
      case "Constant":
        return number2(0);
      case "Identifier":
        return number2(node.symbol === variable ? 1 : 0);
      case "Negative":
        return negative2(derivative(node.arg, variable));
      case "BinaryOperator":
        return binaryDerivative(node, variable);
      case "FunctionCall":
        return functionCallDerivative(node, variable);
      case "Factorial":
        if (!dependsOn(node.arg, variable))
          return number2(0);
        throw new SymbolicError(
          "The derivative of a factorial of the variable needs the digamma function, which Desmos does not have."
        );
      case "RepeatedOperator":
        if (dependsOn(node.start, variable) || dependsOn(node.end, variable))
          throw new SymbolicError(
            "A sum or product whose bounds depend on the variable cannot be differentiated symbolically."
          );
        if (node.index.symbol === variable)
          return number2(0);
        if (node.name === "Sum")
          return {
            ...node,
            expression: fold(derivative(node.expression, variable))
          };
        if (!dependsOn(node.expression, variable))
          return number2(0);
        throw new SymbolicError(
          "A product of terms that depend on the variable cannot be differentiated symbolically."
        );
      default:
        throw new SymbolicError(
          `${describe(node)} cannot be differentiated symbolically.`
        );
    }
  }
  function binaryDerivative(node, variable) {
    const { left, right } = node;
    const dLeft = derivative(left, variable);
    const dRight = derivative(right, variable);
    switch (node.name) {
      case "Add":
        return add(dLeft, dRight);
      case "Subtract":
        return subtract(dLeft, dRight);
      case "Multiply":
      case "CrossMultiply":
        return add(multiply(dLeft, right), multiply(left, dRight));
      case "Divide":
        return divide(
          subtract(multiply(dLeft, right), multiply(left, dRight)),
          square(right)
        );
      case "Exponent":
        return exponentDerivative(left, right, dLeft, dRight, variable);
    }
  }
  function exponentDerivative(base2, exponent2, dBase, dExponent, variable) {
    if (!dependsOn(exponent2, variable)) {
      return multiply(
        multiply(exponent2, power2(base2, subtract(exponent2, number2(1)))),
        dBase
      );
    }
    if (!dependsOn(base2, variable)) {
      return multiply(
        multiply(power2(base2, exponent2), call("ln", base2)),
        dExponent
      );
    }
    return multiply(
      power2(base2, exponent2),
      add(
        multiply(dExponent, call("ln", base2)),
        divide(multiply(exponent2, dBase), base2)
      )
    );
  }
  function functionCallDerivative(node, variable) {
    const name = node.callee.symbol;
    if (node.args.length !== 1) {
      throw new SymbolicError(
        `${name} takes more than one argument, so it cannot be differentiated here.`
      );
    }
    const rule2 = FUNCTION_DERIVATIVES[name];
    if (rule2 === void 0) {
      throw new SymbolicError(`The derivative of ${name} is not known.`);
    }
    const [arg] = node.args;
    return multiply(rule2(arg), derivative(arg, variable));
  }
  function describe(node) {
    switch (node.type) {
      case "Integral":
        return "An integral";
      case "Derivative":
      case "Prime":
        return "A derivative";
      case "List":
      case "Range":
      case "ListComprehension":
        return "A list";
      case "Piecewise":
        return "A piecewise";
      case "RepeatedOperator":
        return "A sum or product";
      default:
        return `\`${node.type}\``;
    }
  }
  function square(node) {
    return power2(node, number2(2));
  }

  // src/symbolic/latex.ts
  var LEFT = "\\left";
  var RIGHT = "\\right";
  function matchingRight(latex, from) {
    let depth2 = 1;
    let cursor2 = from;
    while (cursor2 < latex.length) {
      if (latex.startsWith(LEFT, cursor2)) {
        depth2 += 1;
        cursor2 += LEFT.length;
      } else if (latex.startsWith(RIGHT, cursor2)) {
        depth2 -= 1;
        if (depth2 === 0)
          return cursor2;
        cursor2 += RIGHT.length;
      } else {
        cursor2 += 1;
      }
    }
    return -1;
  }
  var ABS_OPEN = `\\operatorname{abs}${LEFT}(`;
  function absToBars(latex) {
    let result = latex;
    let index = result.indexOf(ABS_OPEN);
    while (index >= 0) {
      const start = index + ABS_OPEN.length;
      const close = matchingRight(result, start);
      if (close < 0)
        return result;
      const inner = result.slice(start, close);
      result = result.slice(0, index) + `${LEFT}|${inner}${RIGHT}|` + result.slice(close + RIGHT.length + 1);
      index = result.indexOf(ABS_OPEN, index);
    }
    return result;
  }
  function dropRedundantParens(latex) {
    let result = latex;
    let index = result.indexOf(`${LEFT}(${LEFT}|`);
    while (index >= 0) {
      const innerStart = index + LEFT.length + 1;
      const outerClose = matchingRight(result, innerStart);
      const innerClose = matchingRight(result, innerStart + LEFT.length + 1);
      if (outerClose < 0 || innerClose < 0 || innerClose + RIGHT.length + 1 !== outerClose) {
        index = result.indexOf(`${LEFT}(${LEFT}|`, index + 1);
        continue;
      }
      result = result.slice(0, index) + result.slice(innerStart, outerClose) + result.slice(outerClose + RIGHT.length + 1);
      index = result.indexOf(`${LEFT}(${LEFT}|`);
    }
    return result;
  }
  function toLatex(cfg2, node) {
    return dropRedundantParens(
      absToBars(
        latexTreeToString(cfg2, bracketFractionPowers(node)).replace(
          /\\cdot (?=[A-Za-z\\])/g,
          ""
        )
      )
    );
  }
  function bracketFractionPowers(node) {
    switch (node.type) {
      case "BinaryOperator": {
        const left = bracketFractionPowers(node.left);
        const right = bracketFractionPowers(node.right);
        const calledPower = left.type === "FunctionCall" && left.callee.symbol !== "sqrt" && left.callee.symbol !== "abs";
        if (node.name === "Exponent" && (left.type === "BinaryOperator" && left.name === "Divide" || calledPower))
          return {
            ...node,
            left: { type: "Seq", parenWrapped: true, args: [left] },
            right
          };
        return { ...node, left, right };
      }
      case "Negative":
        return { ...node, arg: bracketFractionPowers(node.arg) };
      case "FunctionCall":
        return { ...node, args: node.args.map(bracketFractionPowers) };
      default:
        return node;
    }
  }

  // src/symbolic/products.ts
  function implicitProducts(node, values) {
    const rewrite3 = (child) => implicitProducts(child, values);
    const isProduct = (child) => child.type === "FunctionCall" && child.args.length === 1 && values.has(child.callee.symbol);
    if (node.type === "BinaryOperator" && node.name === "Exponent" && isProduct(node.left) && node.left.parenWrapped !== true)
      return multiply(
        node.left.callee,
        power2(rewrite3(node.left.args[0]), rewrite3(node.right))
      );
    if (node.type === "Factorial" && isProduct(node.arg) && node.arg.parenWrapped !== true)
      return multiply(node.arg.callee, {
        ...node,
        arg: rewrite3(node.arg.args[0])
      });
    const mapped = mapChildNodes(node, rewrite3);
    if (isProduct(mapped))
      return multiply(mapped.callee, mapped.args[0]);
    return mapped;
  }

  // src/symbolic/condense.ts
  var MAX_PASSES = 4;
  function condense(node) {
    let current = fold(node);
    const notes = [];
    for (let pass = 0; pass < MAX_PASSES; pass += 1) {
      const before = current;
      current = fold(rewriteTrig(current, notes));
      current = fold(factorSums(current, notes));
      if (sameTree(before, current))
        break;
    }
    return { node: current, notes: dedupe(notes) };
  }
  function dedupe(notes) {
    const seen = /* @__PURE__ */ new Set();
    return notes.filter((note) => {
      const key = `${note.text}|${note.latex}|${JSON.stringify(note.factor)}`;
      if (seen.has(key))
        return false;
      seen.add(key);
      return true;
    });
  }
  function rewrite(node, transform) {
    switch (node.type) {
      case "BinaryOperator":
        return transform({
          ...node,
          left: rewrite(node.left, transform),
          right: rewrite(node.right, transform)
        });
      case "Negative":
        return transform({ ...node, arg: rewrite(node.arg, transform) });
      case "FunctionCall":
        return transform({
          ...node,
          args: node.args.map((arg) => rewrite(arg, transform))
        });
      default:
        return transform(node);
    }
  }
  function rewriteTrig(node, notes) {
    return rewrite(node, (current) => {
      if (current.type !== "BinaryOperator" || current.name !== "Divide" && current.name !== "Multiply" && current.name !== "CrossMultiply")
        return current;
      const entries = [];
      quotientFactors(current, true, entries);
      const top = entries.filter((e) => e.inNumerator).map((e) => e.node);
      const bottom = entries.filter((e) => !e.inNumerator).map((e) => e.node);
      if (bottom.length === 0)
        return current;
      let changed = false;
      for (const [over, under, becomes] of QUOTIENT_IDENTITIES) {
        for (let i = top.length - 1; i >= 0; i -= 1) {
          const argument = argumentOf(top[i], over);
          if (argument === void 0)
            continue;
          const match = bottom.findIndex((factor) => {
            const other = argumentOf(factor, under);
            return other !== void 0 && sameTree(other, argument);
          });
          if (match < 0)
            continue;
          top[i] = call(becomes, argument);
          bottom.splice(match, 1);
          changed = true;
          notes.push({
            text: `Rewrite ${over} over ${under} as ${becomes}.`,
            latex: `\\frac{\\operatorname{${over}}u}{\\operatorname{${under}}u}=\\operatorname{${becomes}}u`
          });
        }
      }
      if (!changed)
        return current;
      const product = (factors) => factors.length === 0 ? number2(1) : factors.reduce((a, b) => multiply(a, b));
      return bottom.length === 0 ? product(top) : divide(product(top), product(bottom));
    });
  }
  var QUOTIENT_IDENTITIES = [
    ["cos", "sin", "cot"],
    ["sin", "cos", "tan"]
  ];
  function argumentOf(node, name) {
    if (node.type !== "FunctionCall")
      return void 0;
    if (node.callee.symbol !== name)
      return void 0;
    if (node.args.length !== 1)
      return void 0;
    return node.args[0];
  }
  function factorSums(node, notes) {
    return rewrite(node, (current) => {
      if (current.type !== "BinaryOperator" || current.name !== "Add" && current.name !== "Subtract")
        return current;
      const terms = topLevelTerms(current);
      if (terms.length < 2)
        return current;
      const split4 = terms.map((entry) => splitFactors(entry.term));
      let result = current;
      for (const candidate of split4[0].top) {
        if (candidate.type === "Constant")
          continue;
        if (!split4.every((term2) => hasFactor(term2.top, candidate)))
          continue;
        const remainders = split4.map((term2, index) => ({
          value: withoutFactor(term2, candidate),
          negated: terms[index].negated
        }));
        result = multiply(candidate, rebuildSum(remainders));
        notes.push({
          text: "Factor out what every term shares:",
          latex: "",
          factor: candidate
        });
        break;
      }
      return result;
    });
  }
  function splitFactors(term2) {
    const entries = [];
    quotientFactors(term2, true, entries);
    return {
      top: entries.filter((e) => e.inNumerator).map((e) => e.node),
      bottom: entries.filter((e) => !e.inNumerator).map((e) => e.node)
    };
  }
  function hasFactor(factors, candidate) {
    return factors.some((factor) => sameTree(factor, candidate));
  }
  function withoutFactor(term2, candidate) {
    const top = [...term2.top];
    const index = top.findIndex((factor) => sameTree(factor, candidate));
    top.splice(index, 1);
    const product = (factors) => factors.length === 0 ? number2(1) : factors.reduce((a, b) => multiply(a, b));
    const numerator = product(top);
    return term2.bottom.length === 0 ? numerator : divide(numerator, product(term2.bottom));
  }

  // src/symbolic/notes.ts
  function dedupe2(notes) {
    const seen = /* @__PURE__ */ new Set();
    return notes.filter((note) => {
      const key = `${note.text}|${note.latex}|${JSON.stringify(note.factor)}`;
      if (seen.has(key))
        return false;
      seen.add(key);
      return true;
    });
  }

  // src/symbolic/expand.ts
  var EXPANSION_LIMIT = 260;
  var MAX_POWER = 8;
  var MAX_PASSES2 = 6;
  var DISTRIBUTE = {
    text: "Multiplied out, so each term can be handled on its own.",
    latex: "a\\left(b+c\\right)=ab+ac"
  };
  var SPLIT = {
    text: "Split the fraction over the sum. Watch the domain: the split form may cancel to something defined where the original is not.",
    latex: "\\frac{a+b}{c}=\\frac{a}{c}+\\frac{b}{c}"
  };
  var RAISE = {
    text: "Wrote the power out as repeated multiplication.",
    latex: "\\left(a+b\\right)^{3}=\\left(a+b\\right)\\left(a+b\\right)\\left(a+b\\right)"
  };
  var SIGN = {
    text: "Took the minus sign inside, so each term carries its own.",
    latex: "-\\left(a+b\\right)=-a-b"
  };
  var TOO_BIG = {
    text: "Stopped short: multiplying the rest out would make it longer than it is worth.",
    latex: ""
  };
  function withinLimit(node) {
    return !exceedsNodeCount(node, EXPANSION_LIMIT);
  }
  function expand(node) {
    let current = fold(node);
    const notes = [];
    for (let pass = 0; pass < MAX_PASSES2; pass += 1) {
      const before = current;
      const rewritten = openOnce(current, notes);
      if (sameTree(rewritten, before))
        break;
      const opened2 = fold(tidySums(fold(rewritten)));
      if (exceedsNodeCount(opened2, EXPANSION_LIMIT)) {
        notes.push(TOO_BIG);
        return { node: before, notes: dedupe2(notes) };
      }
      current = opened2;
      if (sameTree(before, current))
        break;
    }
    return { node: current, notes: dedupe2(notes) };
  }
  function openOnce(node, notes) {
    const rebuilt = mapChildren(node, (child) => openOnce(child, notes));
    switch (rebuilt.type) {
      case "Negative":
        return distributeSign(rebuilt.arg, notes) ?? rebuilt;
      case "BinaryOperator":
        switch (rebuilt.name) {
          case "Multiply":
          case "CrossMultiply":
            return distribute(rebuilt.left, rebuilt.right, notes) ?? rebuilt;
          case "Divide":
            return split2(rebuilt.left, rebuilt.right, notes) ?? rebuilt;
          case "Exponent":
            return raise(rebuilt.left, rebuilt.right, notes) ?? rebuilt;
          default:
            return rebuilt;
        }
      default:
        return rebuilt;
    }
  }
  function mapChildren(node, on) {
    switch (node.type) {
      case "Negative":
        return negative2(on(node.arg));
      case "FunctionCall":
        return { ...node, args: node.args.map(on) };
      case "BinaryOperator":
        return node.name === "CrossMultiply" ? { ...node, left: on(node.left), right: on(node.right) } : binop2(node.name, on(node.left), on(node.right));
      default:
        return node;
    }
  }
  function distributeSign(inner, notes) {
    const terms = topLevelTerms(inner);
    if (terms.length < 2)
      return void 0;
    notes.push(SIGN);
    return rebuildSum(
      terms.map(({ term: term2, negated }) => ({ value: term2, negated: !negated }))
    );
  }
  function distribute(left, right, notes) {
    const leftTerms = topLevelTerms(left);
    const rightTerms = topLevelTerms(right);
    if (leftTerms.length < 2 && rightTerms.length < 2)
      return void 0;
    const parts = [];
    for (const l of leftTerms) {
      for (const r of rightTerms) {
        parts.push({
          value: multiply(l.term, r.term),
          // Two minus signs make a plus, which is what `!==` says here.
          negated: l.negated !== r.negated
        });
      }
    }
    const result = rebuildSum(parts);
    if (!withinLimit(result)) {
      notes.push(TOO_BIG);
      return void 0;
    }
    notes.push(DISTRIBUTE);
    return result;
  }
  function split2(numerator, denominator, notes) {
    const terms = topLevelTerms(numerator);
    if (terms.length < 2)
      return void 0;
    notes.push(SPLIT);
    return rebuildSum(
      terms.map(({ term: term2, negated }) => ({
        value: divide(term2, denominator),
        negated
      }))
    );
  }
  function raise(base2, exponent2, notes) {
    if (topLevelTerms(base2).length < 2)
      return void 0;
    const n = constantValue(exponent2);
    if (n === void 0 || !Number.isInteger(n) || n < 2 || n > MAX_POWER)
      return void 0;
    let sum3 = base2;
    for (let i = 1; i < n; i += 1) {
      const next = distribute(sum3, base2, notes);
      if (next === void 0)
        return void 0;
      sum3 = next;
    }
    notes.push(RAISE);
    return sum3;
  }
  function tidySums(node) {
    const rebuilt = mapChildren(node, tidySums);
    const terms = opened(topLevelTerms(rebuilt));
    if (terms.length < 2)
      return rebuilt;
    const groups = [];
    for (const { term: term2, negated } of terms) {
      const { coefficient, rest } = splitRationalCoefficient(term2);
      const signed = negated ? { n: -coefficient.n, d: coefficient.d } : coefficient;
      const match = groups.findIndex((group4) => sameProduct(group4.rest, rest));
      if (match >= 0) {
        const total = groups[match].coefficient;
        groups[match].coefficient = {
          n: total.n * signed.d + signed.n * total.d,
          d: total.d * signed.d
        };
      } else {
        groups.push({ coefficient: signed, rest, degree: degreeOf(rest) });
      }
    }
    groups.sort((a, b) => b.degree - a.degree);
    const kept = groups.filter((group4) => group4.coefficient.n !== 0);
    if (kept.length === 0)
      return number2(0);
    return rebuildSum(
      kept.map(({ coefficient, rest }) => ({
        value: multiply(
          rationalNode({
            n: Math.abs(coefficient.n),
            d: Math.abs(coefficient.d)
          }),
          rest
        ),
        negated: coefficient.n < 0 !== coefficient.d < 0
      }))
    );
  }
  function opened(terms) {
    if (terms.length < 2)
      return [...terms];
    const out = [];
    for (const { term: term2, negated } of terms) {
      const divisor = term2.type === "BinaryOperator" && term2.name === "Divide" ? constantValue(term2.right) : void 0;
      if (term2.type !== "BinaryOperator" || divisor === void 0 || divisor === 0) {
        out.push({ term: term2, negated });
        continue;
      }
      const inner = topLevelTerms(term2.left);
      if (inner.length < 2) {
        out.push({ term: term2, negated });
        continue;
      }
      for (const piece of inner) {
        out.push({
          term: divide(piece.term, term2.right),
          negated: negated !== piece.negated
        });
      }
    }
    return out;
  }
  function degreeOf(node) {
    switch (node.type) {
      case "Identifier":
        return node.symbol === "e" || node.symbol === "pi" ? 0 : 1;
      case "Negative":
        return degreeOf(node.arg);
      case "BinaryOperator":
        switch (node.name) {
          case "Multiply":
          case "CrossMultiply":
            return degreeOf(node.left) + degreeOf(node.right);
          case "Divide":
            return degreeOf(node.left) - degreeOf(node.right);
          case "Exponent": {
            const n = constantValue(node.right);
            return n === void 0 || !Number.isInteger(n) ? 0 : n * degreeOf(node.left);
          }
          default:
            return 0;
        }
      default:
        return 0;
    }
  }

  // src/symbolic/special.ts
  var EULER = 0.5772156649015329;
  var GL_X = [
    0.1488743389816312,
    0.4333953941292472,
    0.6794095682990244,
    0.8650633666889845,
    0.9739065285171717
  ];
  var GL_W = [
    0.2955242247147529,
    0.2692667193099963,
    0.219086362515982,
    0.1494513491505806,
    0.0666713443086881
  ];
  function integrate(g, a, b, width = 0.5) {
    if (a === b)
      return 0;
    const panels = Math.max(1, Math.ceil(Math.abs(b - a) / width));
    const h = (b - a) / panels;
    let total = 0;
    for (let p = 0; p < panels; p += 1) {
      const mid = a + (p + 0.5) * h;
      for (let i = 0; i < 5; i += 1) {
        const dx = h / 2 * GL_X[i];
        total += GL_W[i] * (g(mid - dx) + g(mid + dx));
      }
    }
    return total * h / 2;
  }
  var removable = (f, at0) => (t) => t === 0 ? at0 : (f(t) - f(0)) / t;
  function reciprocalGamma(z) {
    if (Number.isInteger(z) && z <= 0)
      return 0;
    return 1 / gamma(z);
  }
  function digamma(x) {
    if (Number.isInteger(x) && x <= 0)
      return NaN;
    if (x < 0.5)
      return digamma(1 - x) - Math.PI / Math.tan(Math.PI * x);
    let shift = 0;
    while (x < 16) {
      shift -= 1 / x;
      x += 1;
    }
    const inv = 1 / (x * x);
    return shift + Math.log(x) - 0.5 / x - inv * (1 / 12 - inv * (1 / 120 - inv * (1 / 252 - inv / 240)));
  }
  var beta = (a, b) => gamma(a) * gamma(b) / gamma(a + b);
  function zeta(s) {
    if (s === 1)
      return NaN;
    const N = 10;
    let total = 0;
    for (let n = 1; n < N; n += 1)
      total += n ** -s;
    total += N ** (1 - s) / (s - 1) + N ** -s / 2;
    const B = [1 / 12, -1 / 720, 1 / 30240, -1 / 1209600];
    let rising = s;
    for (let j = 0; j < B.length; j += 1) {
      total += B[j] * rising * N ** (-s - 2 * j - 1);
      rising *= (s + 2 * j + 1) * (s + 2 * j + 2);
    }
    return total;
  }
  function erf(x) {
    if (Math.abs(x) > 6)
      return Math.sign(x);
    return 2 / Math.sqrt(Math.PI) * integrate((t) => Math.exp(-t * t), 0, x, 0.25);
  }
  var erfc = (x) => 1 - erf(x);
  var erfi = (x) => 2 / Math.sqrt(Math.PI) * integrate((t) => Math.exp(t * t), 0, x, 0.25);
  var Si = (x) => integrate((t) => t === 0 ? 1 : Math.sin(t) / t, 0, x);
  var Ci = (x) => x <= 0 ? NaN : EULER + Math.log(x) + integrate(removable(Math.cos, 0), 0, x);
  var Shi = (x) => integrate((t) => t === 0 ? 1 : Math.sinh(t) / t, 0, x);
  var Chi = (x) => x <= 0 ? NaN : EULER + Math.log(x) + integrate(removable(Math.cosh, 0), 0, x);
  var Ei = (x) => x === 0 ? NaN : EULER + Math.log(Math.abs(x)) + integrate(removable(Math.exp, 1), 0, x);
  var li = (x) => x <= 0 || x === 1 ? NaN : Ei(Math.log(x));
  function dilog(z) {
    if (z > 1)
      return NaN;
    if (z === 1)
      return Math.PI * Math.PI / 6;
    if (z < -1)
      return -(Math.PI * Math.PI) / 6 - 0.5 * Math.log(-z) ** 2 - dilog(1 / z);
    if (z > 0.5)
      return Math.PI * Math.PI / 6 - Math.log(z) * Math.log(1 - z) - dilog(1 - z);
    if (z < -0.5)
      return -dilog(z / (z - 1)) - 0.5 * Math.log(1 - z) ** 2;
    let total = 0;
    let power8 = z;
    for (let k = 1; k < 200; k += 1) {
      total += power8 / (k * k);
      power8 *= z;
      if (Math.abs(power8) < 1e-18)
        break;
    }
    return total;
  }
  var fresnelS = (x) => integrate((t) => Math.sin(Math.PI * t * t / 2), 0, x, 0.25);
  var fresnelC = (x) => integrate((t) => Math.cos(Math.PI * t * t / 2), 0, x, 0.25);
  function besselJ(nu, x) {
    if (Number.isInteger(nu))
      return integrate((u) => Math.cos(nu * u - x * Math.sin(u)), 0, Math.PI, 0.1) / Math.PI;
    let total = 0;
    for (let k = 0; k < 120; k += 1) {
      const term2 = (-1) ** k * (x / 2) ** (2 * k + nu) / (gamma(k + 1) * gamma(k + nu + 1));
      total += term2;
      if (Math.abs(term2) < 1e-18 * Math.max(1, Math.abs(total)) && k > x)
        break;
    }
    return total;
  }
  function lambertW(x) {
    if (x < -1 / Math.E)
      return NaN;
    if (x === 0)
      return 0;
    let w = x < 1 ? x * (1 - x) : Math.log(x) - Math.log(Math.log(x) + 1);
    if (x < 0)
      w = -0.5;
    for (let i = 0; i < 60; i += 1) {
      const e = Math.exp(w);
      const f = w * e - x;
      const next = w - f / (e * (w + 1) - (w + 2) * f / (2 * w + 2));
      if (Math.abs(next - w) < 1e-15 * (1 + Math.abs(next)))
        return next;
      w = next;
    }
    return w;
  }
  function ellipticK(k) {
    if (Math.abs(k) >= 1)
      return NaN;
    let a = 1;
    let b = Math.sqrt(1 - k * k);
    for (let i = 0; i < 40 && Math.abs(a - b) > 1e-16; i += 1)
      [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
    return Math.PI / (2 * a);
  }
  function mittagLeffler(a, b, z) {
    let sum3 = 0;
    let quiet = 0;
    for (let k = 0; k < 600; k += 1) {
      const term2 = z === 0 && k > 0 ? 0 : z ** k * reciprocalGamma(a * k + b);
      sum3 += term2;
      if (Math.abs(term2) <= 1e-17 * Math.max(1, Math.abs(sum3))) {
        quiet += 1;
        if (quiet > 6 && k > 2 * Math.abs(z))
          break;
      } else
        quiet = 0;
    }
    return sum3;
  }
  var L = (s) => `\\left(${s}\\right)`;
  var SPECIAL_FUNCTIONS = [
    {
      symbol: "Gamma",
      name: "the gamma function",
      notation: `\\Gamma${L("#1")}`,
      arity: 1,
      evaluate: gamma,
      definitions: [`\\Gamma${L("z")}=${L("z-1")}!`],
      needs: []
    },
    {
      symbol: "Gamma_r",
      name: "1/\u0393, which is 0 at \u0393's poles",
      notation: `\\frac{1}{\\Gamma${L("#1")}}`,
      arity: 1,
      evaluate: reciprocalGamma,
      definitions: [
        `\\Gamma_{r}${L("z")}=\\left\\{z>0:\\frac{1}{${L("z-1")}!},\\frac{${L("-z")}!\\sin${L("\\pi z")}}{\\pi}\\right\\}`
      ],
      needs: []
    },
    {
      symbol: "B",
      name: "the beta function",
      notation: `B${L("#1,#2")}`,
      arity: 2,
      evaluate: beta,
      definitions: [
        `B${L("a,b")}=\\frac{\\Gamma${L("a")}\\Gamma${L("b")}}{\\Gamma${L("a+b")}}`
      ],
      needs: ["Gamma"]
    },
    {
      symbol: "psi",
      name: "the digamma function \u03C8 = \u0393\u2032/\u0393",
      notation: `\\psi${L("#1")}`,
      arity: 1,
      evaluate: digamma,
      definitions: [
        `\\psi${L("z")}=\\frac{d}{dz}\\ln${L("\\left|\\Gamma\\left(z\\right)\\right|")}`
      ],
      needs: ["Gamma"]
    },
    {
      symbol: "zeta",
      name: "the Riemann zeta function",
      notation: `\\zeta${L("#1")}`,
      arity: 1,
      evaluate: zeta,
      definitions: [
        `\\zeta${L("s")}=\\sum_{n=1}^{9}n^{-s}+\\frac{10^{1-s}}{s-1}+\\frac{10^{-s}}{2}+\\frac{s\\cdot10^{-s-1}}{12}-\\frac{s${L("s+1")}${L("s+2")}10^{-s-3}}{720}+\\frac{s${L("s+1")}${L("s+2")}${L("s+3")}${L("s+4")}10^{-s-5}}{30240}-\\frac{s${L("s+1")}${L("s+2")}${L("s+3")}${L("s+4")}${L("s+5")}${L("s+6")}10^{-s-7}}{1209600}`
      ],
      needs: [],
      domain: "s > \u22123, s \u2260 1"
    },
    {
      symbol: "erf",
      name: "the error function",
      notation: `\\operatorname{erf}${L("#1")}`,
      arity: 1,
      evaluate: erf,
      definitions: [],
      needs: []
    },
    {
      symbol: "erfc",
      name: "the complementary error function",
      notation: `\\operatorname{erfc}${L("#1")}`,
      arity: 1,
      evaluate: erfc,
      definitions: [
        `\\operatorname{erfc}${L("z")}=1-\\operatorname{erf}${L("z")}`
      ],
      needs: []
    },
    {
      symbol: "erfi",
      name: "the imaginary error function",
      notation: `\\operatorname{erfi}${L("#1")}`,
      arity: 1,
      evaluate: erfi,
      definitions: [
        `\\operatorname{erfi}${L("z")}=\\frac{2}{\\sqrt{\\pi}}\\int_{0}^{z}e^{t^{2}}dt`
      ],
      needs: []
    },
    {
      symbol: "Si",
      name: "the sine integral",
      notation: `\\operatorname{Si}${L("#1")}`,
      arity: 1,
      evaluate: Si,
      definitions: [
        `\\operatorname{Si}${L("z")}=\\int_{0}^{z}\\frac{\\sin${L("t")}}{t}dt`
      ],
      needs: []
    },
    {
      symbol: "Ci",
      name: "the cosine integral",
      notation: `\\operatorname{Ci}${L("#1")}`,
      arity: 1,
      evaluate: Ci,
      definitions: [
        `\\operatorname{Ci}${L("z")}=${EULER}+\\ln${L("z")}+\\int_{0}^{z}\\frac{\\cos${L("t")}-1}{t}dt`
      ],
      needs: [],
      domain: "z > 0"
    },
    {
      symbol: "Shi",
      name: "the hyperbolic sine integral",
      notation: `\\operatorname{Shi}${L("#1")}`,
      arity: 1,
      evaluate: Shi,
      definitions: [
        `\\operatorname{Shi}${L("z")}=\\int_{0}^{z}\\frac{\\sinh${L("t")}}{t}dt`
      ],
      needs: []
    },
    {
      symbol: "Chi",
      name: "the hyperbolic cosine integral",
      notation: `\\operatorname{Chi}${L("#1")}`,
      arity: 1,
      evaluate: Chi,
      definitions: [
        `\\operatorname{Chi}${L("z")}=${EULER}+\\ln${L("z")}+\\int_{0}^{z}\\frac{\\cosh${L("t")}-1}{t}dt`
      ],
      needs: [],
      domain: "z > 0"
    },
    {
      symbol: "Ei",
      name: "the exponential integral",
      notation: `\\operatorname{Ei}${L("#1")}`,
      arity: 1,
      evaluate: Ei,
      definitions: [
        `\\operatorname{Ei}${L("z")}=${EULER}+\\ln${L("\\left|z\\right|")}+\\int_{0}^{z}\\frac{e^{t}-1}{t}dt`
      ],
      needs: [],
      domain: "z \u2260 0"
    },
    {
      symbol: "li",
      name: "the logarithmic integral",
      notation: `\\operatorname{li}${L("#1")}`,
      arity: 1,
      evaluate: li,
      definitions: [
        `\\operatorname{li}${L("z")}=\\operatorname{Ei}${L("\\ln" + L("z"))}`
      ],
      needs: ["Ei"],
      domain: "z > 0, z \u2260 1"
    },
    {
      symbol: "Li_2",
      name: "the dilogarithm",
      notation: `\\operatorname{Li}_{2}${L("#1")}`,
      arity: 1,
      evaluate: dilog,
      definitions: [
        `\\operatorname{Li}_{2}${L("z")}=-\\int_{0}^{z}\\frac{\\ln${L("1-t")}}{t}dt`
      ],
      needs: [],
      domain: "z \u2264 1 (beyond 1 it is complex)"
    },
    {
      symbol: "S",
      name: "the Fresnel sine integral",
      notation: `S${L("#1")}`,
      arity: 1,
      evaluate: fresnelS,
      definitions: [
        `S${L("z")}=\\int_{0}^{z}\\sin${L("\\frac{\\pi t^{2}}{2}")}dt`
      ],
      needs: []
    },
    {
      symbol: "C",
      name: "the Fresnel cosine integral",
      notation: `C${L("#1")}`,
      arity: 1,
      evaluate: fresnelC,
      definitions: [
        `C${L("z")}=\\int_{0}^{z}\\cos${L("\\frac{\\pi t^{2}}{2}")}dt`
      ],
      needs: []
    },
    {
      symbol: "J",
      name: "the Bessel function of the first kind",
      notation: `J${L("#1,#2")}`,
      arity: 2,
      evaluate: besselJ,
      definitions: [
        `J${L("n,z")}=\\frac{1}{\\pi}\\int_{0}^{\\pi}\\cos${L("nu-z\\sin" + L("u"))}du`
      ],
      needs: [],
      domain: "whole orders n (Bessel's integral); J(n, z) is J_n(z)"
    },
    {
      symbol: "W",
      name: "the Lambert W function (principal branch)",
      notation: `W${L("#1")}`,
      arity: 1,
      evaluate: lambertW,
      definitions: [
        `W${L("z")}=\\frac{1}{\\pi}\\int_{0}^{\\pi}\\ln${L("1+\\frac{z\\sin" + L("u") + "}{u}e^{u\\cot" + L("u") + "}")}du`
      ],
      needs: [],
      domain: "z \u2265 \u22121/e"
    },
    {
      symbol: "K",
      name: "the complete elliptic integral of the first kind",
      notation: `K${L("#1")}`,
      arity: 1,
      evaluate: ellipticK,
      definitions: [
        `K${L("k")}=\\int_{0}^{\\frac{\\pi}{2}}\\frac{1}{\\sqrt{1-k^{2}\\sin^{2}${L("u")}}}du`
      ],
      needs: [],
      domain: "\u22121 < k < 1"
    },
    {
      symbol: "E",
      name: "the Mittag-Leffler function E_{a,b}",
      notation: `E${L("#1,#2,#3")}`,
      arity: 3,
      evaluate: mittagLeffler,
      definitions: [
        `E${L("a,b,z")}=\\sum_{k=0}^{100}z^{k}\\Gamma_{r}${L("ak+b")}`
      ],
      needs: ["Gamma_r"],
      domain: "E(a, b, z) is E_{a,b}(z); |z| up to about 30"
    }
  ];
  var BY_SYMBOL = new Map(SPECIAL_FUNCTIONS.map((f) => [f.symbol, f]));
  function specialFunction(symbol) {
    return BY_SYMBOL.get(symbol);
  }
  function desmosDefinitions(symbols) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    const add8 = (symbol) => {
      if (seen.has(symbol))
        return;
      seen.add(symbol);
      const f = BY_SYMBOL.get(symbol);
      if (f === void 0)
        return;
      f.needs.forEach(add8);
      out.push(...f.definitions);
    };
    for (const symbol of symbols)
      add8(symbol);
    return out;
  }
  var CALL_PATTERNS = SPECIAL_FUNCTIONS.map((f) => {
    const source = f.definitions[0] ?? f.notation;
    const head = source.slice(0, source.indexOf("\\left("));
    const literal = head.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
    return [f.symbol, new RegExp(String.raw`(?<![a-zA-Z_\\])${literal}\\left\(`)];
  });
  function specialFunctionsIn(latex) {
    return CALL_PATTERNS.filter(([, re]) => re.test(latex)).map(([s]) => s);
  }

  // src/symbolic/evaluate.ts
  var FUNCTIONS = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    cot: (x) => 1 / Math.tan(x),
    sec: (x) => 1 / Math.cos(x),
    csc: (x) => 1 / Math.sin(x),
    arcsin: Math.asin,
    arccos: Math.acos,
    arctan: Math.atan,
    arccot: (x) => Math.PI / 2 - Math.atan(x),
    arcsec: (x) => Math.acos(1 / x),
    arccsc: (x) => Math.asin(1 / x),
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    // The reciprocal hyperbolics, which the derivative table emits and JavaScript
    // does not provide. Without them a correct derivative of tanh evaluates to
    // NaN and the numeric check passes by never having tested anything.
    coth: (x) => 1 / Math.tanh(x),
    sech: (x) => 1 / Math.cosh(x),
    csch: (x) => 1 / Math.sinh(x),
    arcsinh: Math.asinh,
    arccosh: Math.acosh,
    arctanh: Math.atanh,
    exp: Math.exp,
    ln: Math.log,
    log: Math.log10,
    sqrt: Math.sqrt,
    abs: Math.abs,
    sign: Math.sign,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round
  };
  var LANCZOS = [
    0.9999999999998099,
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9984369578019572e-21,
    15056327351493116e-23
  ];
  function gamma(z) {
    if (z <= 0 && Number.isInteger(z))
      return NaN;
    if (z < 0.5)
      return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    const w = z - 1;
    const t = w + 7.5;
    let [a] = LANCZOS;
    for (let i = 1; i < LANCZOS.length; i += 1)
      a += LANCZOS[i] / (w + i);
    return Math.sqrt(2 * Math.PI) * Math.pow(t, w + 0.5) * Math.exp(-t) * a;
  }
  function evaluate(node, bindings) {
    switch (node.type) {
      case "Constant":
        return node.value;
      case "Identifier": {
        if (node.symbol === "pi")
          return Math.PI;
        if (node.symbol === "e")
          return Math.E;
        return bindings[node.symbol] ?? NaN;
      }
      case "Negative":
        return -evaluate(node.arg, bindings);
      case "FunctionCall": {
        const fn = FUNCTIONS[node.callee.symbol];
        if (fn !== void 0 && node.args.length === 1)
          return fn(evaluate(node.args[0], bindings));
        const special2 = specialFunction(node.callee.symbol);
        if (special2 === void 0 || special2.arity !== node.args.length)
          return NaN;
        return special2.evaluate(
          ...node.args.map((arg) => evaluate(arg, bindings))
        );
      }
      case "Factorial": {
        const value = evaluate(node.arg, bindings);
        if (Number.isInteger(value)) {
          if (value < 0)
            return NaN;
          let total = 1;
          for (let i = 2; i <= value; i += 1)
            total *= i;
          return total;
        }
        return gamma(value + 1);
      }
      case "RepeatedOperator": {
        const start = Math.round(evaluate(node.start, bindings));
        const end = Math.round(evaluate(node.end, bindings));
        if (!Number.isFinite(start) || !Number.isFinite(end))
          return NaN;
        const isSum = node.name === "Sum";
        let total = isSum ? 0 : 1;
        for (let i = start; i <= end; i += 1) {
          const value = evaluate(node.expression, {
            ...bindings,
            [node.index.symbol]: i
          });
          if (isSum)
            total += value;
          else
            total *= value;
        }
        return total;
      }
      case "Piecewise": {
        const holds = node.condition === true || conditionHolds(node.condition, bindings);
        return evaluate(holds ? node.consequent : node.alternate, bindings);
      }
      case "BinaryOperator": {
        const left = evaluate(node.left, bindings);
        const right = evaluate(node.right, bindings);
        switch (node.name) {
          case "Add":
            return left + right;
          case "Subtract":
            return left - right;
          case "Multiply":
          case "CrossMultiply":
            return left * right;
          case "Divide":
            return left / right;
          case "Exponent":
            return Math.pow(left, right);
        }
        return NaN;
      }
      default:
        return NaN;
    }
  }
  var COMPARE = {
    "<": (a, b) => a < b,
    "<=": (a, b) => a <= b,
    "=": (a, b) => a === b,
    ">=": (a, b) => a >= b,
    ">": (a, b) => a > b
  };
  function conditionHolds(condition, bindings) {
    const links = condition.type === "Comparator" ? [[condition.left, condition.operator, condition.right]] : condition.type === "ComparatorChain" ? condition.symbols.map((symbol, i) => [
      condition.args[i],
      symbol,
      condition.args[i + 1]
    ]) : [];
    if (links.length === 0)
      return false;
    return links.every(
      ([left, operator, right]) => (COMPARE[operator] ?? (() => false))(
        evaluate(left, bindings),
        evaluate(right, bindings)
      )
    );
  }
  function numericDerivative(node, variable, bindings) {
    const at2 = bindings[variable];
    const h = 606e-8 * Math.max(1, Math.abs(at2));
    const forward = evaluate(node, { ...bindings, [variable]: at2 + h });
    const backward = evaluate(node, { ...bindings, [variable]: at2 - h });
    return (forward - backward) / (2 * h);
  }
  function numericSecondDerivative(node, variable, bindings) {
    const at2 = bindings[variable];
    const h = 122e-6 * Math.max(1, Math.abs(at2));
    const forward = evaluate(node, { ...bindings, [variable]: at2 + h });
    const middle = evaluate(node, bindings);
    const backward = evaluate(node, { ...bindings, [variable]: at2 - h });
    return (forward - 2 * middle + backward) / (h * h);
  }
  function agreesOnSamples(left, right, samples2, tolerance = 1e-4) {
    let checked = 0;
    for (const bindings of samples2) {
      const a = left(bindings);
      const b = right(bindings);
      if (!Number.isFinite(a) || !Number.isFinite(b))
        continue;
      checked += 1;
      const scale = Math.max(1, Math.abs(a), Math.abs(b));
      if (Math.abs(a - b) > tolerance * scale)
        return false;
    }
    return checked >= Math.ceil(samples2.length / 3);
  }

  // node_modules/decimal.js/decimal.mjs
  var EXP_LIMIT = 9e15;
  var MAX_DIGITS = 1e9;
  var NUMERALS = "0123456789abcdef";
  var LN10 = "2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053089653777326288461633662222876982198867465436674744042432743651550489343149393914796194044002221051017141748003688084012647080685567743216228355220114804663715659121373450747856947683463616792101806445070648000277502684916746550586856935673420670581136429224554405758925724208241314695689016758940256776311356919292033376587141660230105703089634572075440370847469940168269282808481184289314848524948644871927809676271275775397027668605952496716674183485704422507197965004714951050492214776567636938662976979522110718264549734772662425709429322582798502585509785265383207606726317164309505995087807523710333101197857547331541421808427543863591778117054309827482385045648019095610299291824318237525357709750539565187697510374970888692180205189339507238539205144634197265287286965110862571492198849978748873771345686209167058";
  var PI = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632789";
  var DEFAULTS = {
    // These values must be integers within the stated ranges (inclusive).
    // Most of these values can be changed at run-time using the `Decimal.config` method.
    // The maximum number of significant digits of the result of a calculation or base conversion.
    // E.g. `Decimal.config({ precision: 20 });`
    precision: 20,
    // 1 to MAX_DIGITS
    // The rounding mode used when rounding to `precision`.
    //
    // ROUND_UP         0 Away from zero.
    // ROUND_DOWN       1 Towards zero.
    // ROUND_CEIL       2 Towards +Infinity.
    // ROUND_FLOOR      3 Towards -Infinity.
    // ROUND_HALF_UP    4 Towards nearest neighbour. If equidistant, up.
    // ROUND_HALF_DOWN  5 Towards nearest neighbour. If equidistant, down.
    // ROUND_HALF_EVEN  6 Towards nearest neighbour. If equidistant, towards even neighbour.
    // ROUND_HALF_CEIL  7 Towards nearest neighbour. If equidistant, towards +Infinity.
    // ROUND_HALF_FLOOR 8 Towards nearest neighbour. If equidistant, towards -Infinity.
    //
    // E.g.
    // `Decimal.rounding = 4;`
    // `Decimal.rounding = Decimal.ROUND_HALF_UP;`
    rounding: 4,
    // 0 to 8
    // The modulo mode used when calculating the modulus: a mod n.
    // The quotient (q = a / n) is calculated according to the corresponding rounding mode.
    // The remainder (r) is calculated as: r = a - n * q.
    //
    // UP         0 The remainder is positive if the dividend is negative, else is negative.
    // DOWN       1 The remainder has the same sign as the dividend (JavaScript %).
    // FLOOR      3 The remainder has the same sign as the divisor (Python %).
    // HALF_EVEN  6 The IEEE 754 remainder function.
    // EUCLID     9 Euclidian division. q = sign(n) * floor(a / abs(n)). Always positive.
    //
    // Truncated division (1), floored division (3), the IEEE 754 remainder (6), and Euclidian
    // division (9) are commonly used for the modulus operation. The other rounding modes can also
    // be used, but they may not give useful results.
    modulo: 1,
    // 0 to 9
    // The exponent value at and beneath which `toString` returns exponential notation.
    // JavaScript numbers: -7
    toExpNeg: -7,
    // 0 to -EXP_LIMIT
    // The exponent value at and above which `toString` returns exponential notation.
    // JavaScript numbers: 21
    toExpPos: 21,
    // 0 to EXP_LIMIT
    // The minimum exponent value, beneath which underflow to zero occurs.
    // JavaScript numbers: -324  (5e-324)
    minE: -EXP_LIMIT,
    // -1 to -EXP_LIMIT
    // The maximum exponent value, above which overflow to Infinity occurs.
    // JavaScript numbers: 308  (1.7976931348623157e+308)
    maxE: EXP_LIMIT,
    // 1 to EXP_LIMIT
    // Whether to use cryptographically-secure random number generation, if available.
    crypto: false
    // true/false
  };
  var inexact;
  var quadrant;
  var external = true;
  var decimalError = "[DecimalError] ";
  var invalidArgument = decimalError + "Invalid argument: ";
  var precisionLimitExceeded = decimalError + "Precision limit exceeded";
  var cryptoUnavailable = decimalError + "crypto unavailable";
  var tag = "[object Decimal]";
  var mathfloor = Math.floor;
  var mathpow = Math.pow;
  var isBinary = /^0b([01]+(\.[01]*)?|\.[01]+)(p[+-]?\d+)?$/i;
  var isHex = /^0x([0-9a-f]+(\.[0-9a-f]*)?|\.[0-9a-f]+)(p[+-]?\d+)?$/i;
  var isOctal = /^0o([0-7]+(\.[0-7]*)?|\.[0-7]+)(p[+-]?\d+)?$/i;
  var isDecimal = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;
  var BASE = 1e7;
  var LOG_BASE = 7;
  var MAX_SAFE_INTEGER = 9007199254740991;
  var LN10_PRECISION = LN10.length - 1;
  var PI_PRECISION = PI.length - 1;
  var P = { toStringTag: tag };
  P.absoluteValue = P.abs = function() {
    var x = new this.constructor(this);
    if (x.s < 0)
      x.s = 1;
    return finalise(x);
  };
  P.ceil = function() {
    return finalise(new this.constructor(this), this.e + 1, 2);
  };
  P.clampedTo = P.clamp = function(min2, max2) {
    var k, x = this, Ctor = x.constructor;
    min2 = new Ctor(min2);
    max2 = new Ctor(max2);
    if (!min2.s || !max2.s)
      return new Ctor(NaN);
    if (min2.gt(max2))
      throw Error(invalidArgument + max2);
    k = x.cmp(min2);
    return k < 0 ? min2 : x.cmp(max2) > 0 ? max2 : new Ctor(x);
  };
  P.comparedTo = P.cmp = function(y) {
    var i, j, xdL, ydL, x = this, xd = x.d, yd = (y = new x.constructor(y)).d, xs = x.s, ys = y.s;
    if (!xd || !yd) {
      return !xs || !ys ? NaN : xs !== ys ? xs : xd === yd ? 0 : !xd ^ xs < 0 ? 1 : -1;
    }
    if (!xd[0] || !yd[0])
      return xd[0] ? xs : yd[0] ? -ys : 0;
    if (xs !== ys)
      return xs;
    if (x.e !== y.e)
      return x.e > y.e ^ xs < 0 ? 1 : -1;
    xdL = xd.length;
    ydL = yd.length;
    for (i = 0, j = xdL < ydL ? xdL : ydL; i < j; ++i) {
      if (xd[i] !== yd[i])
        return xd[i] > yd[i] ^ xs < 0 ? 1 : -1;
    }
    return xdL === ydL ? 0 : xdL > ydL ^ xs < 0 ? 1 : -1;
  };
  P.cosine = P.cos = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.d)
      return new Ctor(NaN);
    if (!x.d[0])
      return new Ctor(1);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(x.e, x.sd()) + LOG_BASE;
    Ctor.rounding = 1;
    x = cosine(Ctor, toLessThanHalfPi(Ctor, x));
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return finalise(quadrant == 2 || quadrant == 3 ? x.neg() : x, pr, rm, true);
  };
  P.cubeRoot = P.cbrt = function() {
    var e, m, n, r, rep, s, sd, t, t3, t3plusx, x = this, Ctor = x.constructor;
    if (!x.isFinite() || x.isZero())
      return new Ctor(x);
    external = false;
    s = x.s * mathpow(x.s * x, 1 / 3);
    if (!s || Math.abs(s) == 1 / 0) {
      n = digitsToString(x.d);
      e = x.e;
      if (s = (e - n.length + 1) % 3)
        n += s == 1 || s == -2 ? "0" : "00";
      s = mathpow(n, 1 / 3);
      e = mathfloor((e + 1) / 3) - (e % 3 == (e < 0 ? -1 : 2));
      if (s == 1 / 0) {
        n = "5e" + e;
      } else {
        n = s.toExponential();
        n = n.slice(0, n.indexOf("e") + 1) + e;
      }
      r = new Ctor(n);
      r.s = x.s;
    } else {
      r = new Ctor(s.toString());
    }
    sd = (e = Ctor.precision) + 3;
    for (; ; ) {
      t = r;
      t3 = t.times(t).times(t);
      t3plusx = t3.plus(x);
      r = divide2(t3plusx.plus(x).times(t), t3plusx.plus(t3), sd + 2, 1);
      if (digitsToString(t.d).slice(0, sd) === (n = digitsToString(r.d)).slice(0, sd)) {
        n = n.slice(sd - 3, sd + 1);
        if (n == "9999" || !rep && n == "4999") {
          if (!rep) {
            finalise(t, e + 1, 0);
            if (t.times(t).times(t).eq(x)) {
              r = t;
              break;
            }
          }
          sd += 4;
          rep = 1;
        } else {
          if (!+n || !+n.slice(1) && n.charAt(0) == "5") {
            finalise(r, e + 1, 1);
            m = !r.times(r).times(r).eq(x);
          }
          break;
        }
      }
    }
    external = true;
    return finalise(r, e, Ctor.rounding, m);
  };
  P.decimalPlaces = P.dp = function() {
    var w, d = this.d, n = NaN;
    if (d) {
      w = d.length - 1;
      n = (w - mathfloor(this.e / LOG_BASE)) * LOG_BASE;
      w = d[w];
      if (w)
        for (; w % 10 == 0; w /= 10)
          n--;
      if (n < 0)
        n = 0;
    }
    return n;
  };
  P.dividedBy = P.div = function(y) {
    return divide2(this, new this.constructor(y));
  };
  P.dividedToIntegerBy = P.divToInt = function(y) {
    var x = this, Ctor = x.constructor;
    return finalise(divide2(x, new Ctor(y), 0, 1, 1), Ctor.precision, Ctor.rounding);
  };
  P.equals = P.eq = function(y) {
    return this.cmp(y) === 0;
  };
  P.floor = function() {
    return finalise(new this.constructor(this), this.e + 1, 3);
  };
  P.greaterThan = P.gt = function(y) {
    return this.cmp(y) > 0;
  };
  P.greaterThanOrEqualTo = P.gte = function(y) {
    var k = this.cmp(y);
    return k == 1 || k === 0;
  };
  P.hyperbolicCosine = P.cosh = function() {
    var k, n, pr, rm, len, x = this, Ctor = x.constructor, one2 = new Ctor(1);
    if (!x.isFinite())
      return new Ctor(x.s ? 1 / 0 : NaN);
    if (x.isZero())
      return one2;
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(x.e, x.sd()) + 4;
    Ctor.rounding = 1;
    len = x.d.length;
    if (len < 32) {
      k = Math.ceil(len / 3);
      n = (1 / tinyPow(4, k)).toString();
    } else {
      k = 16;
      n = "2.3283064365386962890625e-10";
    }
    x = taylorSeries(Ctor, 1, x.times(n), new Ctor(1), true);
    var cosh2_x, i = k, d8 = new Ctor(8);
    for (; i--; ) {
      cosh2_x = x.times(x);
      x = one2.minus(cosh2_x.times(d8.minus(cosh2_x.times(d8))));
    }
    return finalise(x, Ctor.precision = pr, Ctor.rounding = rm, true);
  };
  P.hyperbolicSine = P.sinh = function() {
    var k, pr, rm, len, x = this, Ctor = x.constructor;
    if (!x.isFinite() || x.isZero())
      return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(x.e, x.sd()) + 4;
    Ctor.rounding = 1;
    len = x.d.length;
    if (len < 3) {
      x = taylorSeries(Ctor, 2, x, x, true);
    } else {
      k = 1.4 * Math.sqrt(len);
      k = k > 16 ? 16 : k | 0;
      x = x.times(1 / tinyPow(5, k));
      x = taylorSeries(Ctor, 2, x, x, true);
      var sinh2_x, d5 = new Ctor(5), d16 = new Ctor(16), d20 = new Ctor(20);
      for (; k--; ) {
        sinh2_x = x.times(x);
        x = x.times(d5.plus(sinh2_x.times(d16.times(sinh2_x).plus(d20))));
      }
    }
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return finalise(x, pr, rm, true);
  };
  P.hyperbolicTangent = P.tanh = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.isFinite())
      return new Ctor(x.s);
    if (x.isZero())
      return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + 7;
    Ctor.rounding = 1;
    return divide2(x.sinh(), x.cosh(), Ctor.precision = pr, Ctor.rounding = rm);
  };
  P.inverseCosine = P.acos = function() {
    var halfPi, x = this, Ctor = x.constructor, k = x.abs().cmp(1), pr = Ctor.precision, rm = Ctor.rounding;
    if (k !== -1) {
      return k === 0 ? x.isNeg() ? getPi(Ctor, pr, rm) : new Ctor(0) : new Ctor(NaN);
    }
    if (x.isZero())
      return getPi(Ctor, pr + 4, rm).times(0.5);
    Ctor.precision = pr + 6;
    Ctor.rounding = 1;
    x = x.asin();
    halfPi = getPi(Ctor, pr + 4, rm).times(0.5);
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return halfPi.minus(x);
  };
  P.inverseHyperbolicCosine = P.acosh = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (x.lte(1))
      return new Ctor(x.eq(1) ? 0 : NaN);
    if (!x.isFinite())
      return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(Math.abs(x.e), x.sd()) + 4;
    Ctor.rounding = 1;
    external = false;
    x = x.times(x).minus(1).sqrt().plus(x);
    external = true;
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return x.ln();
  };
  P.inverseHyperbolicSine = P.asinh = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.isFinite() || x.isZero())
      return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + 2 * Math.max(Math.abs(x.e), x.sd()) + 6;
    Ctor.rounding = 1;
    external = false;
    x = x.times(x).plus(1).sqrt().plus(x);
    external = true;
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return x.ln();
  };
  P.inverseHyperbolicTangent = P.atanh = function() {
    var pr, rm, wpr, xsd, x = this, Ctor = x.constructor;
    if (!x.isFinite())
      return new Ctor(NaN);
    if (x.e >= 0)
      return new Ctor(x.abs().eq(1) ? x.s / 0 : x.isZero() ? x : NaN);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    xsd = x.sd();
    if (Math.max(xsd, pr) < 2 * -x.e - 1)
      return finalise(new Ctor(x), pr, rm, true);
    Ctor.precision = wpr = xsd - x.e;
    x = divide2(x.plus(1), new Ctor(1).minus(x), wpr + pr, 1);
    Ctor.precision = pr + 4;
    Ctor.rounding = 1;
    x = x.ln();
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return x.times(0.5);
  };
  P.inverseSine = P.asin = function() {
    var halfPi, k, pr, rm, x = this, Ctor = x.constructor;
    if (x.isZero())
      return new Ctor(x);
    k = x.abs().cmp(1);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    if (k !== -1) {
      if (k === 0) {
        halfPi = getPi(Ctor, pr + 4, rm).times(0.5);
        halfPi.s = x.s;
        return halfPi;
      }
      return new Ctor(NaN);
    }
    Ctor.precision = pr + 6;
    Ctor.rounding = 1;
    x = x.div(new Ctor(1).minus(x.times(x)).sqrt().plus(1)).atan();
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return x.times(2);
  };
  P.inverseTangent = P.atan = function() {
    var i, j, k, n, px, t, r, wpr, x2, x = this, Ctor = x.constructor, pr = Ctor.precision, rm = Ctor.rounding;
    if (!x.isFinite()) {
      if (!x.s)
        return new Ctor(NaN);
      if (pr + 4 <= PI_PRECISION) {
        r = getPi(Ctor, pr + 4, rm).times(0.5);
        r.s = x.s;
        return r;
      }
    } else if (x.isZero()) {
      return new Ctor(x);
    } else if (x.abs().eq(1) && pr + 4 <= PI_PRECISION) {
      r = getPi(Ctor, pr + 4, rm).times(0.25);
      r.s = x.s;
      return r;
    }
    Ctor.precision = wpr = pr + 10;
    Ctor.rounding = 1;
    k = Math.min(28, wpr / LOG_BASE + 2 | 0);
    for (i = k; i; --i)
      x = x.div(x.times(x).plus(1).sqrt().plus(1));
    external = false;
    j = Math.ceil(wpr / LOG_BASE);
    n = 1;
    x2 = x.times(x);
    r = new Ctor(x);
    px = x;
    for (; i !== -1; ) {
      px = px.times(x2);
      t = r.minus(px.div(n += 2));
      px = px.times(x2);
      r = t.plus(px.div(n += 2));
      if (r.d[j] !== void 0)
        for (i = j; r.d[i] === t.d[i] && i--; )
          ;
    }
    if (k)
      r = r.times(2 << k - 1);
    external = true;
    return finalise(r, Ctor.precision = pr, Ctor.rounding = rm, true);
  };
  P.isFinite = function() {
    return !!this.d;
  };
  P.isInteger = P.isInt = function() {
    return !!this.d && mathfloor(this.e / LOG_BASE) > this.d.length - 2;
  };
  P.isNaN = function() {
    return !this.s;
  };
  P.isNegative = P.isNeg = function() {
    return this.s < 0;
  };
  P.isPositive = P.isPos = function() {
    return this.s > 0;
  };
  P.isZero = function() {
    return !!this.d && this.d[0] === 0;
  };
  P.lessThan = P.lt = function(y) {
    return this.cmp(y) < 0;
  };
  P.lessThanOrEqualTo = P.lte = function(y) {
    return this.cmp(y) < 1;
  };
  P.logarithm = P.log = function(base2) {
    var isBase10, d, denominator, k, inf, num2, sd, r, arg = this, Ctor = arg.constructor, pr = Ctor.precision, rm = Ctor.rounding, guard = 5;
    if (base2 == null) {
      base2 = new Ctor(10);
      isBase10 = true;
    } else {
      base2 = new Ctor(base2);
      d = base2.d;
      if (base2.s < 0 || !d || !d[0] || base2.eq(1))
        return new Ctor(NaN);
      isBase10 = base2.eq(10);
    }
    d = arg.d;
    if (arg.s < 0 || !d || !d[0] || arg.eq(1)) {
      return new Ctor(d && !d[0] ? -1 / 0 : arg.s != 1 ? NaN : d ? 0 : 1 / 0);
    }
    if (isBase10) {
      if (d.length > 1) {
        inf = true;
      } else {
        for (k = d[0]; k % 10 === 0; )
          k /= 10;
        inf = k !== 1;
      }
    }
    external = false;
    sd = pr + guard;
    num2 = naturalLogarithm(arg, sd);
    denominator = isBase10 ? getLn10(Ctor, sd + 10) : naturalLogarithm(base2, sd);
    r = divide2(num2, denominator, sd, 1);
    if (checkRoundingDigits(r.d, k = pr, rm)) {
      do {
        sd += 10;
        num2 = naturalLogarithm(arg, sd);
        denominator = isBase10 ? getLn10(Ctor, sd + 10) : naturalLogarithm(base2, sd);
        r = divide2(num2, denominator, sd, 1);
        if (!inf) {
          if (+digitsToString(r.d).slice(k + 1, k + 15) + 1 == 1e14) {
            r = finalise(r, pr + 1, 0);
          }
          break;
        }
      } while (checkRoundingDigits(r.d, k += 10, rm));
    }
    external = true;
    return finalise(r, pr, rm);
  };
  P.minus = P.sub = function(y) {
    var d, e, i, j, k, len, pr, rm, xd, xe, xLTy, yd, x = this, Ctor = x.constructor;
    y = new Ctor(y);
    if (!x.d || !y.d) {
      if (!x.s || !y.s)
        y = new Ctor(NaN);
      else if (x.d)
        y.s = -y.s;
      else
        y = new Ctor(y.d || x.s !== y.s ? x : NaN);
      return y;
    }
    if (x.s != y.s) {
      y.s = -y.s;
      return x.plus(y);
    }
    xd = x.d;
    yd = y.d;
    pr = Ctor.precision;
    rm = Ctor.rounding;
    if (!xd[0] || !yd[0]) {
      if (yd[0])
        y.s = -y.s;
      else if (xd[0])
        y = new Ctor(x);
      else
        return new Ctor(rm === 3 ? -0 : 0);
      return external ? finalise(y, pr, rm) : y;
    }
    e = mathfloor(y.e / LOG_BASE);
    xe = mathfloor(x.e / LOG_BASE);
    xd = xd.slice();
    k = xe - e;
    if (k) {
      xLTy = k < 0;
      if (xLTy) {
        d = xd;
        k = -k;
        len = yd.length;
      } else {
        d = yd;
        e = xe;
        len = xd.length;
      }
      i = Math.max(Math.ceil(pr / LOG_BASE), len) + 2;
      if (k > i) {
        k = i;
        d.length = 1;
      }
      d.reverse();
      for (i = k; i--; )
        d.push(0);
      d.reverse();
    } else {
      i = xd.length;
      len = yd.length;
      xLTy = i < len;
      if (xLTy)
        len = i;
      for (i = 0; i < len; i++) {
        if (xd[i] != yd[i]) {
          xLTy = xd[i] < yd[i];
          break;
        }
      }
      k = 0;
    }
    if (xLTy) {
      d = xd;
      xd = yd;
      yd = d;
      y.s = -y.s;
    }
    len = xd.length;
    for (i = yd.length - len; i > 0; --i)
      xd[len++] = 0;
    for (i = yd.length; i > k; ) {
      if (xd[--i] < yd[i]) {
        for (j = i; j && xd[--j] === 0; )
          xd[j] = BASE - 1;
        --xd[j];
        xd[i] += BASE;
      }
      xd[i] -= yd[i];
    }
    for (; xd[--len] === 0; )
      xd.pop();
    for (; xd[0] === 0; xd.shift())
      --e;
    if (!xd[0])
      return new Ctor(rm === 3 ? -0 : 0);
    y.d = xd;
    y.e = getBase10Exponent(xd, e);
    return external ? finalise(y, pr, rm) : y;
  };
  P.modulo = P.mod = function(y) {
    var q, x = this, Ctor = x.constructor;
    y = new Ctor(y);
    if (!x.d || !y.s || y.d && !y.d[0])
      return new Ctor(NaN);
    if (!y.d || x.d && !x.d[0]) {
      return finalise(new Ctor(x), Ctor.precision, Ctor.rounding);
    }
    external = false;
    if (Ctor.modulo == 9) {
      q = divide2(x, y.abs(), 0, 3, 1);
      q.s *= y.s;
    } else {
      q = divide2(x, y, 0, Ctor.modulo, 1);
    }
    q = q.times(y);
    external = true;
    return x.minus(q);
  };
  P.naturalExponential = P.exp = function() {
    return naturalExponential(this);
  };
  P.naturalLogarithm = P.ln = function() {
    return naturalLogarithm(this);
  };
  P.negated = P.neg = function() {
    var x = new this.constructor(this);
    x.s = -x.s;
    return finalise(x);
  };
  P.plus = P.add = function(y) {
    var carry, d, e, i, k, len, pr, rm, xd, yd, x = this, Ctor = x.constructor;
    y = new Ctor(y);
    if (!x.d || !y.d) {
      if (!x.s || !y.s)
        y = new Ctor(NaN);
      else if (!x.d)
        y = new Ctor(y.d || x.s === y.s ? x : NaN);
      return y;
    }
    if (x.s != y.s) {
      y.s = -y.s;
      return x.minus(y);
    }
    xd = x.d;
    yd = y.d;
    pr = Ctor.precision;
    rm = Ctor.rounding;
    if (!xd[0] || !yd[0]) {
      if (!yd[0])
        y = new Ctor(x);
      return external ? finalise(y, pr, rm) : y;
    }
    k = mathfloor(x.e / LOG_BASE);
    e = mathfloor(y.e / LOG_BASE);
    xd = xd.slice();
    i = k - e;
    if (i) {
      if (i < 0) {
        d = xd;
        i = -i;
        len = yd.length;
      } else {
        d = yd;
        e = k;
        len = xd.length;
      }
      k = Math.ceil(pr / LOG_BASE);
      len = k > len ? k + 1 : len + 1;
      if (i > len) {
        i = len;
        d.length = 1;
      }
      d.reverse();
      for (; i--; )
        d.push(0);
      d.reverse();
    }
    len = xd.length;
    i = yd.length;
    if (len - i < 0) {
      i = len;
      d = yd;
      yd = xd;
      xd = d;
    }
    for (carry = 0; i; ) {
      carry = (xd[--i] = xd[i] + yd[i] + carry) / BASE | 0;
      xd[i] %= BASE;
    }
    if (carry) {
      xd.unshift(carry);
      ++e;
    }
    for (len = xd.length; xd[--len] == 0; )
      xd.pop();
    y.d = xd;
    y.e = getBase10Exponent(xd, e);
    return external ? finalise(y, pr, rm) : y;
  };
  P.precision = P.sd = function(z) {
    var k, x = this;
    if (z !== void 0 && z !== !!z && z !== 1 && z !== 0)
      throw Error(invalidArgument + z);
    if (x.d) {
      k = getPrecision(x.d);
      if (z && x.e + 1 > k)
        k = x.e + 1;
    } else {
      k = NaN;
    }
    return k;
  };
  P.round = function() {
    var x = this, Ctor = x.constructor;
    return finalise(new Ctor(x), x.e + 1, Ctor.rounding);
  };
  P.sine = P.sin = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.isFinite())
      return new Ctor(NaN);
    if (x.isZero())
      return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(x.e, x.sd()) + LOG_BASE;
    Ctor.rounding = 1;
    x = sine(Ctor, toLessThanHalfPi(Ctor, x));
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return finalise(quadrant > 2 ? x.neg() : x, pr, rm, true);
  };
  P.squareRoot = P.sqrt = function() {
    var m, n, sd, r, rep, t, x = this, d = x.d, e = x.e, s = x.s, Ctor = x.constructor;
    if (s !== 1 || !d || !d[0]) {
      return new Ctor(!s || s < 0 && (!d || d[0]) ? NaN : d ? x : 1 / 0);
    }
    external = false;
    s = Math.sqrt(+x);
    if (s == 0 || s == 1 / 0) {
      n = digitsToString(d);
      if ((n.length + e) % 2 == 0)
        n += "0";
      s = Math.sqrt(n);
      e = mathfloor((e + 1) / 2) - (e < 0 || e % 2);
      if (s == 1 / 0) {
        n = "5e" + e;
      } else {
        n = s.toExponential();
        n = n.slice(0, n.indexOf("e") + 1) + e;
      }
      r = new Ctor(n);
    } else {
      r = new Ctor(s.toString());
    }
    sd = (e = Ctor.precision) + 3;
    for (; ; ) {
      t = r;
      r = t.plus(divide2(x, t, sd + 2, 1)).times(0.5);
      if (digitsToString(t.d).slice(0, sd) === (n = digitsToString(r.d)).slice(0, sd)) {
        n = n.slice(sd - 3, sd + 1);
        if (n == "9999" || !rep && n == "4999") {
          if (!rep) {
            finalise(t, e + 1, 0);
            if (t.times(t).eq(x)) {
              r = t;
              break;
            }
          }
          sd += 4;
          rep = 1;
        } else {
          if (!+n || !+n.slice(1) && n.charAt(0) == "5") {
            finalise(r, e + 1, 1);
            m = !r.times(r).eq(x);
          }
          break;
        }
      }
    }
    external = true;
    return finalise(r, e, Ctor.rounding, m);
  };
  P.tangent = P.tan = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.isFinite())
      return new Ctor(NaN);
    if (x.isZero())
      return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + 10;
    Ctor.rounding = 1;
    x = x.sin();
    x.s = 1;
    x = divide2(x, new Ctor(1).minus(x.times(x)).sqrt(), pr + 10, 0);
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return finalise(quadrant == 2 || quadrant == 4 ? x.neg() : x, pr, rm, true);
  };
  P.times = P.mul = function(y) {
    var carry, e, i, k, r, rL, t, xdL, ydL, x = this, Ctor = x.constructor, xd = x.d, yd = (y = new Ctor(y)).d;
    y.s *= x.s;
    if (!xd || !xd[0] || !yd || !yd[0]) {
      return new Ctor(!y.s || xd && !xd[0] && !yd || yd && !yd[0] && !xd ? NaN : !xd || !yd ? y.s / 0 : y.s * 0);
    }
    e = mathfloor(x.e / LOG_BASE) + mathfloor(y.e / LOG_BASE);
    xdL = xd.length;
    ydL = yd.length;
    if (xdL < ydL) {
      r = xd;
      xd = yd;
      yd = r;
      rL = xdL;
      xdL = ydL;
      ydL = rL;
    }
    r = [];
    rL = xdL + ydL;
    for (i = rL; i--; )
      r.push(0);
    for (i = ydL; --i >= 0; ) {
      carry = 0;
      for (k = xdL + i; k > i; ) {
        t = r[k] + yd[i] * xd[k - i - 1] + carry;
        r[k--] = t % BASE | 0;
        carry = t / BASE | 0;
      }
      r[k] = (r[k] + carry) % BASE | 0;
    }
    for (; !r[--rL]; )
      r.pop();
    if (carry)
      ++e;
    else
      r.shift();
    y.d = r;
    y.e = getBase10Exponent(r, e);
    return external ? finalise(y, Ctor.precision, Ctor.rounding) : y;
  };
  P.toBinary = function(sd, rm) {
    return toStringBinary(this, 2, sd, rm);
  };
  P.toDecimalPlaces = P.toDP = function(dp, rm) {
    var x = this, Ctor = x.constructor;
    x = new Ctor(x);
    if (dp === void 0)
      return x;
    checkInt32(dp, 0, MAX_DIGITS);
    if (rm === void 0)
      rm = Ctor.rounding;
    else
      checkInt32(rm, 0, 8);
    return finalise(x, dp + x.e + 1, rm);
  };
  P.toExponential = function(dp, rm) {
    var str, x = this, Ctor = x.constructor;
    if (dp === void 0) {
      str = finiteToString(x, true);
    } else {
      checkInt32(dp, 0, MAX_DIGITS);
      if (rm === void 0)
        rm = Ctor.rounding;
      else
        checkInt32(rm, 0, 8);
      x = finalise(new Ctor(x), dp + 1, rm);
      str = finiteToString(x, true, dp + 1);
    }
    return x.isNeg() && !x.isZero() ? "-" + str : str;
  };
  P.toFixed = function(dp, rm) {
    var str, y, x = this, Ctor = x.constructor;
    if (dp === void 0) {
      str = finiteToString(x);
    } else {
      checkInt32(dp, 0, MAX_DIGITS);
      if (rm === void 0)
        rm = Ctor.rounding;
      else
        checkInt32(rm, 0, 8);
      y = finalise(new Ctor(x), dp + x.e + 1, rm);
      str = finiteToString(y, false, dp + y.e + 1);
    }
    return x.isNeg() && !x.isZero() ? "-" + str : str;
  };
  P.toFraction = function(maxD) {
    var d, d0, d1, d2, e, k, n, n0, n1, pr, q, r, x = this, xd = x.d, Ctor = x.constructor;
    if (!xd)
      return new Ctor(x);
    n1 = d0 = new Ctor(1);
    d1 = n0 = new Ctor(0);
    d = new Ctor(d1);
    e = d.e = getPrecision(xd) - x.e - 1;
    k = e % LOG_BASE;
    d.d[0] = mathpow(10, k < 0 ? LOG_BASE + k : k);
    if (maxD == null) {
      maxD = e > 0 ? d : n1;
    } else {
      n = new Ctor(maxD);
      if (!n.isInt() || n.lt(n1))
        throw Error(invalidArgument + n);
      maxD = n.gt(d) ? e > 0 ? d : n1 : n;
    }
    external = false;
    n = new Ctor(digitsToString(xd));
    pr = Ctor.precision;
    Ctor.precision = e = xd.length * LOG_BASE * 2;
    for (; ; ) {
      q = divide2(n, d, 0, 1, 1);
      d2 = d0.plus(q.times(d1));
      if (d2.cmp(maxD) == 1)
        break;
      d0 = d1;
      d1 = d2;
      d2 = n1;
      n1 = n0.plus(q.times(d2));
      n0 = d2;
      d2 = d;
      d = n.minus(q.times(d2));
      n = d2;
    }
    d2 = divide2(maxD.minus(d0), d1, 0, 1, 1);
    n0 = n0.plus(d2.times(n1));
    d0 = d0.plus(d2.times(d1));
    n0.s = n1.s = x.s;
    r = divide2(n1, d1, e, 1).minus(x).abs().cmp(divide2(n0, d0, e, 1).minus(x).abs()) < 1 ? [n1, d1] : [n0, d0];
    Ctor.precision = pr;
    external = true;
    return r;
  };
  P.toHexadecimal = P.toHex = function(sd, rm) {
    return toStringBinary(this, 16, sd, rm);
  };
  P.toNearest = function(y, rm) {
    var x = this, Ctor = x.constructor;
    x = new Ctor(x);
    if (y == null) {
      if (!x.d)
        return x;
      y = new Ctor(1);
      rm = Ctor.rounding;
    } else {
      y = new Ctor(y);
      if (rm === void 0) {
        rm = Ctor.rounding;
      } else {
        checkInt32(rm, 0, 8);
      }
      if (!x.d)
        return y.s ? x : y;
      if (!y.d) {
        if (y.s)
          y.s = x.s;
        return y;
      }
    }
    if (y.d[0]) {
      external = false;
      x = divide2(x, y, 0, rm, 1).times(y);
      external = true;
      finalise(x);
    } else {
      y.s = x.s;
      x = y;
    }
    return x;
  };
  P.toNumber = function() {
    return +this;
  };
  P.toOctal = function(sd, rm) {
    return toStringBinary(this, 8, sd, rm);
  };
  P.toPower = P.pow = function(y) {
    var e, k, pr, r, rm, s, x = this, Ctor = x.constructor, yn = +(y = new Ctor(y));
    if (!x.d || !y.d || !x.d[0] || !y.d[0])
      return new Ctor(mathpow(+x, yn));
    x = new Ctor(x);
    if (x.eq(1))
      return x;
    pr = Ctor.precision;
    rm = Ctor.rounding;
    if (y.eq(1))
      return finalise(x, pr, rm);
    e = mathfloor(y.e / LOG_BASE);
    if (e >= y.d.length - 1 && (k = yn < 0 ? -yn : yn) <= MAX_SAFE_INTEGER) {
      r = intPow(Ctor, x, k, pr);
      return y.s < 0 ? new Ctor(1).div(r) : finalise(r, pr, rm);
    }
    s = x.s;
    if (s < 0) {
      if (e < y.d.length - 1)
        return new Ctor(NaN);
      if ((y.d[e] & 1) == 0)
        s = 1;
      if (x.e == 0 && x.d[0] == 1 && x.d.length == 1) {
        x.s = s;
        return x;
      }
    }
    k = mathpow(+x, yn);
    e = k == 0 || !isFinite(k) ? mathfloor(yn * (Math.log("0." + digitsToString(x.d)) / Math.LN10 + x.e + 1)) : new Ctor(k + "").e;
    if (e > Ctor.maxE + 1 || e < Ctor.minE - 1)
      return new Ctor(e > 0 ? s / 0 : 0);
    external = false;
    Ctor.rounding = x.s = 1;
    k = Math.min(12, (e + "").length);
    r = naturalExponential(y.times(naturalLogarithm(x, pr + k)), pr);
    if (r.d) {
      r = finalise(r, pr + 5, 1);
      if (checkRoundingDigits(r.d, pr, rm)) {
        e = pr + 10;
        r = finalise(naturalExponential(y.times(naturalLogarithm(x, e + k)), e), e + 5, 1);
        if (+digitsToString(r.d).slice(pr + 1, pr + 15) + 1 == 1e14) {
          r = finalise(r, pr + 1, 0);
        }
      }
    }
    r.s = s;
    external = true;
    Ctor.rounding = rm;
    return finalise(r, pr, rm);
  };
  P.toPrecision = function(sd, rm) {
    var str, x = this, Ctor = x.constructor;
    if (sd === void 0) {
      str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);
    } else {
      checkInt32(sd, 1, MAX_DIGITS);
      if (rm === void 0)
        rm = Ctor.rounding;
      else
        checkInt32(rm, 0, 8);
      x = finalise(new Ctor(x), sd, rm);
      str = finiteToString(x, sd <= x.e || x.e <= Ctor.toExpNeg, sd);
    }
    return x.isNeg() && !x.isZero() ? "-" + str : str;
  };
  P.toSignificantDigits = P.toSD = function(sd, rm) {
    var x = this, Ctor = x.constructor;
    if (sd === void 0) {
      sd = Ctor.precision;
      rm = Ctor.rounding;
    } else {
      checkInt32(sd, 1, MAX_DIGITS);
      if (rm === void 0)
        rm = Ctor.rounding;
      else
        checkInt32(rm, 0, 8);
    }
    return finalise(new Ctor(x), sd, rm);
  };
  P.toString = function() {
    var x = this, Ctor = x.constructor, str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);
    return x.isNeg() && !x.isZero() ? "-" + str : str;
  };
  P.truncated = P.trunc = function() {
    return finalise(new this.constructor(this), this.e + 1, 1);
  };
  P.valueOf = P.toJSON = function() {
    var x = this, Ctor = x.constructor, str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);
    return x.isNeg() ? "-" + str : str;
  };
  function digitsToString(d) {
    var i, k, ws, indexOfLastWord = d.length - 1, str = "", w = d[0];
    if (indexOfLastWord > 0) {
      str += w;
      for (i = 1; i < indexOfLastWord; i++) {
        ws = d[i] + "";
        k = LOG_BASE - ws.length;
        if (k)
          str += getZeroString(k);
        str += ws;
      }
      w = d[i];
      ws = w + "";
      k = LOG_BASE - ws.length;
      if (k)
        str += getZeroString(k);
    } else if (w === 0) {
      return "0";
    }
    for (; w % 10 === 0; )
      w /= 10;
    return str + w;
  }
  function checkInt32(i, min2, max2) {
    if (i !== ~~i || i < min2 || i > max2) {
      throw Error(invalidArgument + i);
    }
  }
  function checkRoundingDigits(d, i, rm, repeating) {
    var di, k, r, rd;
    for (k = d[0]; k >= 10; k /= 10)
      --i;
    if (--i < 0) {
      i += LOG_BASE;
      di = 0;
    } else {
      di = Math.ceil((i + 1) / LOG_BASE);
      i %= LOG_BASE;
    }
    k = mathpow(10, LOG_BASE - i);
    rd = d[di] % k | 0;
    if (repeating == null) {
      if (i < 3) {
        if (i == 0)
          rd = rd / 100 | 0;
        else if (i == 1)
          rd = rd / 10 | 0;
        r = rm < 4 && rd == 99999 || rm > 3 && rd == 49999 || rd == 5e4 || rd == 0;
      } else {
        r = (rm < 4 && rd + 1 == k || rm > 3 && rd + 1 == k / 2) && (d[di + 1] / k / 100 | 0) == mathpow(10, i - 2) - 1 || (rd == k / 2 || rd == 0) && (d[di + 1] / k / 100 | 0) == 0;
      }
    } else {
      if (i < 4) {
        if (i == 0)
          rd = rd / 1e3 | 0;
        else if (i == 1)
          rd = rd / 100 | 0;
        else if (i == 2)
          rd = rd / 10 | 0;
        r = (repeating || rm < 4) && rd == 9999 || !repeating && rm > 3 && rd == 4999;
      } else {
        r = ((repeating || rm < 4) && rd + 1 == k || !repeating && rm > 3 && rd + 1 == k / 2) && (d[di + 1] / k / 1e3 | 0) == mathpow(10, i - 3) - 1;
      }
    }
    return r;
  }
  function convertBase(str, baseIn, baseOut) {
    var j, arr = [0], arrL, i = 0, strL = str.length;
    for (; i < strL; ) {
      for (arrL = arr.length; arrL--; )
        arr[arrL] *= baseIn;
      arr[0] += NUMERALS.indexOf(str.charAt(i++));
      for (j = 0; j < arr.length; j++) {
        if (arr[j] > baseOut - 1) {
          if (arr[j + 1] === void 0)
            arr[j + 1] = 0;
          arr[j + 1] += arr[j] / baseOut | 0;
          arr[j] %= baseOut;
        }
      }
    }
    return arr.reverse();
  }
  function cosine(Ctor, x) {
    var k, len, y;
    if (x.isZero())
      return x;
    len = x.d.length;
    if (len < 32) {
      k = Math.ceil(len / 3);
      y = (1 / tinyPow(4, k)).toString();
    } else {
      k = 16;
      y = "2.3283064365386962890625e-10";
    }
    Ctor.precision += k;
    x = taylorSeries(Ctor, 1, x.times(y), new Ctor(1));
    for (var i = k; i--; ) {
      var cos2x = x.times(x);
      x = cos2x.times(cos2x).minus(cos2x).times(8).plus(1);
    }
    Ctor.precision -= k;
    return x;
  }
  var divide2 = /* @__PURE__ */ function() {
    function multiplyInteger(x, k, base2) {
      var temp, carry = 0, i = x.length;
      for (x = x.slice(); i--; ) {
        temp = x[i] * k + carry;
        x[i] = temp % base2 | 0;
        carry = temp / base2 | 0;
      }
      if (carry)
        x.unshift(carry);
      return x;
    }
    function compare2(a, b, aL, bL) {
      var i, r;
      if (aL != bL) {
        r = aL > bL ? 1 : -1;
      } else {
        for (i = r = 0; i < aL; i++) {
          if (a[i] != b[i]) {
            r = a[i] > b[i] ? 1 : -1;
            break;
          }
        }
      }
      return r;
    }
    function subtract6(a, b, aL, base2) {
      var i = 0;
      for (; aL--; ) {
        a[aL] -= i;
        i = a[aL] < b[aL] ? 1 : 0;
        a[aL] = i * base2 + a[aL] - b[aL];
      }
      for (; !a[0] && a.length > 1; )
        a.shift();
    }
    return function(x, y, pr, rm, dp, base2) {
      var cmp, e, i, k, logBase, more, prod, prodL, q, qd, rem, remL, rem0, sd, t, xi, xL, yd0, yL, yz, Ctor = x.constructor, sign3 = x.s == y.s ? 1 : -1, xd = x.d, yd = y.d;
      if (!xd || !xd[0] || !yd || !yd[0]) {
        return new Ctor(
          // Return NaN if either NaN, or both Infinity or 0.
          !x.s || !y.s || (xd ? yd && xd[0] == yd[0] : !yd) ? NaN : (
            // Return ±0 if x is 0 or y is ±Infinity, or return ±Infinity as y is 0.
            xd && xd[0] == 0 || !yd ? sign3 * 0 : sign3 / 0
          )
        );
      }
      if (base2) {
        logBase = 1;
        e = x.e - y.e;
      } else {
        base2 = BASE;
        logBase = LOG_BASE;
        e = mathfloor(x.e / logBase) - mathfloor(y.e / logBase);
      }
      yL = yd.length;
      xL = xd.length;
      q = new Ctor(sign3);
      qd = q.d = [];
      for (i = 0; yd[i] == (xd[i] || 0); i++)
        ;
      if (yd[i] > (xd[i] || 0))
        e--;
      if (pr == null) {
        sd = pr = Ctor.precision;
        rm = Ctor.rounding;
      } else if (dp) {
        sd = pr + (x.e - y.e) + 1;
      } else {
        sd = pr;
      }
      if (sd < 0) {
        qd.push(1);
        more = true;
      } else {
        sd = sd / logBase + 2 | 0;
        i = 0;
        if (yL == 1) {
          k = 0;
          yd = yd[0];
          sd++;
          for (; (i < xL || k) && sd--; i++) {
            t = k * base2 + (xd[i] || 0);
            qd[i] = t / yd | 0;
            k = t % yd | 0;
          }
          more = k || i < xL;
        } else {
          k = base2 / (yd[0] + 1) | 0;
          if (k > 1) {
            yd = multiplyInteger(yd, k, base2);
            xd = multiplyInteger(xd, k, base2);
            yL = yd.length;
            xL = xd.length;
          }
          xi = yL;
          rem = xd.slice(0, yL);
          remL = rem.length;
          for (; remL < yL; )
            rem[remL++] = 0;
          yz = yd.slice();
          yz.unshift(0);
          yd0 = yd[0];
          if (yd[1] >= base2 / 2)
            ++yd0;
          do {
            k = 0;
            cmp = compare2(yd, rem, yL, remL);
            if (cmp < 0) {
              rem0 = rem[0];
              if (yL != remL)
                rem0 = rem0 * base2 + (rem[1] || 0);
              k = rem0 / yd0 | 0;
              if (k > 1) {
                if (k >= base2)
                  k = base2 - 1;
                prod = multiplyInteger(yd, k, base2);
                prodL = prod.length;
                remL = rem.length;
                cmp = compare2(prod, rem, prodL, remL);
                if (cmp == 1) {
                  k--;
                  subtract6(prod, yL < prodL ? yz : yd, prodL, base2);
                }
              } else {
                if (k == 0)
                  cmp = k = 1;
                prod = yd.slice();
              }
              prodL = prod.length;
              if (prodL < remL)
                prod.unshift(0);
              subtract6(rem, prod, remL, base2);
              if (cmp == -1) {
                remL = rem.length;
                cmp = compare2(yd, rem, yL, remL);
                if (cmp < 1) {
                  k++;
                  subtract6(rem, yL < remL ? yz : yd, remL, base2);
                }
              }
              remL = rem.length;
            } else if (cmp === 0) {
              k++;
              rem = [0];
            }
            qd[i++] = k;
            if (cmp && rem[0]) {
              rem[remL++] = xd[xi] || 0;
            } else {
              rem = [xd[xi]];
              remL = 1;
            }
          } while ((xi++ < xL || rem[0] !== void 0) && sd--);
          more = rem[0] !== void 0;
        }
        if (!qd[0])
          qd.shift();
      }
      if (logBase == 1) {
        q.e = e;
        inexact = more;
      } else {
        for (i = 1, k = qd[0]; k >= 10; k /= 10)
          i++;
        q.e = i + e * logBase - 1;
        finalise(q, dp ? pr + q.e + 1 : pr, rm, more);
      }
      return q;
    };
  }();
  function finalise(x, sd, rm, isTruncated) {
    var digits, i, j, k, rd, roundUp, w, xd, xdi, Ctor = x.constructor;
    out:
      if (sd != null) {
        xd = x.d;
        if (!xd)
          return x;
        for (digits = 1, k = xd[0]; k >= 10; k /= 10)
          digits++;
        i = sd - digits;
        if (i < 0) {
          i += LOG_BASE;
          j = sd;
          w = xd[xdi = 0];
          rd = w / mathpow(10, digits - j - 1) % 10 | 0;
        } else {
          xdi = Math.ceil((i + 1) / LOG_BASE);
          k = xd.length;
          if (xdi >= k) {
            if (isTruncated) {
              for (; k++ <= xdi; )
                xd.push(0);
              w = rd = 0;
              digits = 1;
              i %= LOG_BASE;
              j = i - LOG_BASE + 1;
            } else {
              break out;
            }
          } else {
            w = k = xd[xdi];
            for (digits = 1; k >= 10; k /= 10)
              digits++;
            i %= LOG_BASE;
            j = i - LOG_BASE + digits;
            rd = j < 0 ? 0 : w / mathpow(10, digits - j - 1) % 10 | 0;
          }
        }
        isTruncated = isTruncated || sd < 0 || xd[xdi + 1] !== void 0 || (j < 0 ? w : w % mathpow(10, digits - j - 1));
        roundUp = rm < 4 ? (rd || isTruncated) && (rm == 0 || rm == (x.s < 0 ? 3 : 2)) : rd > 5 || rd == 5 && (rm == 4 || isTruncated || rm == 6 && // Check whether the digit to the left of the rounding digit is odd.
        (i > 0 ? j > 0 ? w / mathpow(10, digits - j) : 0 : xd[xdi - 1]) % 10 & 1 || rm == (x.s < 0 ? 8 : 7));
        if (sd < 1 || !xd[0]) {
          xd.length = 0;
          if (roundUp) {
            sd -= x.e + 1;
            xd[0] = mathpow(10, (LOG_BASE - sd % LOG_BASE) % LOG_BASE);
            x.e = -sd || 0;
          } else {
            xd[0] = x.e = 0;
          }
          return x;
        }
        if (i == 0) {
          xd.length = xdi;
          k = 1;
          xdi--;
        } else {
          xd.length = xdi + 1;
          k = mathpow(10, LOG_BASE - i);
          xd[xdi] = j > 0 ? (w / mathpow(10, digits - j) % mathpow(10, j) | 0) * k : 0;
        }
        if (roundUp) {
          for (; ; ) {
            if (xdi == 0) {
              for (i = 1, j = xd[0]; j >= 10; j /= 10)
                i++;
              j = xd[0] += k;
              for (k = 1; j >= 10; j /= 10)
                k++;
              if (i != k) {
                x.e++;
                if (xd[0] == BASE)
                  xd[0] = 1;
              }
              break;
            } else {
              xd[xdi] += k;
              if (xd[xdi] != BASE)
                break;
              xd[xdi--] = 0;
              k = 1;
            }
          }
        }
        for (i = xd.length; xd[--i] === 0; )
          xd.pop();
      }
    if (external) {
      if (x.e > Ctor.maxE) {
        x.d = null;
        x.e = NaN;
      } else if (x.e < Ctor.minE) {
        x.e = 0;
        x.d = [0];
      }
    }
    return x;
  }
  function finiteToString(x, isExp, sd) {
    if (!x.isFinite())
      return nonFiniteToString(x);
    var k, e = x.e, str = digitsToString(x.d), len = str.length;
    if (isExp) {
      if (sd && (k = sd - len) > 0) {
        str = str.charAt(0) + "." + str.slice(1) + getZeroString(k);
      } else if (len > 1) {
        str = str.charAt(0) + "." + str.slice(1);
      }
      str = str + (x.e < 0 ? "e" : "e+") + x.e;
    } else if (e < 0) {
      str = "0." + getZeroString(-e - 1) + str;
      if (sd && (k = sd - len) > 0)
        str += getZeroString(k);
    } else if (e >= len) {
      str += getZeroString(e + 1 - len);
      if (sd && (k = sd - e - 1) > 0)
        str = str + "." + getZeroString(k);
    } else {
      if ((k = e + 1) < len)
        str = str.slice(0, k) + "." + str.slice(k);
      if (sd && (k = sd - len) > 0) {
        if (e + 1 === len)
          str += ".";
        str += getZeroString(k);
      }
    }
    return str;
  }
  function getBase10Exponent(digits, e) {
    var w = digits[0];
    for (e *= LOG_BASE; w >= 10; w /= 10)
      e++;
    return e;
  }
  function getLn10(Ctor, sd, pr) {
    if (sd > LN10_PRECISION) {
      external = true;
      if (pr)
        Ctor.precision = pr;
      throw Error(precisionLimitExceeded);
    }
    return finalise(new Ctor(LN10), sd, 1, true);
  }
  function getPi(Ctor, sd, rm) {
    if (sd > PI_PRECISION)
      throw Error(precisionLimitExceeded);
    return finalise(new Ctor(PI), sd, rm, true);
  }
  function getPrecision(digits) {
    var w = digits.length - 1, len = w * LOG_BASE + 1;
    w = digits[w];
    if (w) {
      for (; w % 10 == 0; w /= 10)
        len--;
      for (w = digits[0]; w >= 10; w /= 10)
        len++;
    }
    return len;
  }
  function getZeroString(k) {
    var zs = "";
    for (; k--; )
      zs += "0";
    return zs;
  }
  function intPow(Ctor, x, n, pr) {
    var isTruncated, r = new Ctor(1), k = Math.ceil(pr / LOG_BASE + 4);
    external = false;
    for (; ; ) {
      if (n % 2) {
        r = r.times(x);
        if (truncate(r.d, k))
          isTruncated = true;
      }
      n = mathfloor(n / 2);
      if (n === 0) {
        n = r.d.length - 1;
        if (isTruncated && r.d[n] === 0)
          ++r.d[n];
        break;
      }
      x = x.times(x);
      truncate(x.d, k);
    }
    external = true;
    return r;
  }
  function isOdd(n) {
    return n.d[n.d.length - 1] & 1;
  }
  function maxOrMin(Ctor, args, ltgt) {
    var y, x = new Ctor(args[0]), i = 0;
    for (; ++i < args.length; ) {
      y = new Ctor(args[i]);
      if (!y.s) {
        x = y;
        break;
      } else if (x[ltgt](y)) {
        x = y;
      }
    }
    return x;
  }
  function naturalExponential(x, sd) {
    var denominator, guard, j, pow3, sum3, t, wpr, rep = 0, i = 0, k = 0, Ctor = x.constructor, rm = Ctor.rounding, pr = Ctor.precision;
    if (!x.d || !x.d[0] || x.e > 17) {
      return new Ctor(x.d ? !x.d[0] ? 1 : x.s < 0 ? 0 : 1 / 0 : x.s ? x.s < 0 ? 0 : x : 0 / 0);
    }
    if (sd == null) {
      external = false;
      wpr = pr;
    } else {
      wpr = sd;
    }
    t = new Ctor(0.03125);
    while (x.e > -2) {
      x = x.times(t);
      k += 5;
    }
    guard = Math.log(mathpow(2, k)) / Math.LN10 * 2 + 5 | 0;
    wpr += guard;
    denominator = pow3 = sum3 = new Ctor(1);
    Ctor.precision = wpr;
    for (; ; ) {
      pow3 = finalise(pow3.times(x), wpr, 1);
      denominator = denominator.times(++i);
      t = sum3.plus(divide2(pow3, denominator, wpr, 1));
      if (digitsToString(t.d).slice(0, wpr) === digitsToString(sum3.d).slice(0, wpr)) {
        j = k;
        while (j--)
          sum3 = finalise(sum3.times(sum3), wpr, 1);
        if (sd == null) {
          if (rep < 3 && checkRoundingDigits(sum3.d, wpr - guard, rm, rep)) {
            Ctor.precision = wpr += 10;
            denominator = pow3 = t = new Ctor(1);
            i = 0;
            rep++;
          } else {
            return finalise(sum3, Ctor.precision = pr, rm, external = true);
          }
        } else {
          Ctor.precision = pr;
          return sum3;
        }
      }
      sum3 = t;
    }
  }
  function naturalLogarithm(y, sd) {
    var c, c0, denominator, e, numerator, rep, sum3, t, wpr, x1, x2, n = 1, guard = 10, x = y, xd = x.d, Ctor = x.constructor, rm = Ctor.rounding, pr = Ctor.precision;
    if (x.s < 0 || !xd || !xd[0] || !x.e && xd[0] == 1 && xd.length == 1) {
      return new Ctor(xd && !xd[0] ? -1 / 0 : x.s != 1 ? NaN : xd ? 0 : x);
    }
    if (sd == null) {
      external = false;
      wpr = pr;
    } else {
      wpr = sd;
    }
    Ctor.precision = wpr += guard;
    c = digitsToString(xd);
    c0 = c.charAt(0);
    if (Math.abs(e = x.e) < 15e14) {
      while (c0 < 7 && c0 != 1 || c0 == 1 && c.charAt(1) > 3) {
        x = x.times(y);
        c = digitsToString(x.d);
        c0 = c.charAt(0);
        n++;
      }
      e = x.e;
      if (c0 > 1) {
        x = new Ctor("0." + c);
        e++;
      } else {
        x = new Ctor(c0 + "." + c.slice(1));
      }
    } else {
      t = getLn10(Ctor, wpr + 2, pr).times(e + "");
      x = naturalLogarithm(new Ctor(c0 + "." + c.slice(1)), wpr - guard).plus(t);
      Ctor.precision = pr;
      return sd == null ? finalise(x, pr, rm, external = true) : x;
    }
    x1 = x;
    sum3 = numerator = x = divide2(x.minus(1), x.plus(1), wpr, 1);
    x2 = finalise(x.times(x), wpr, 1);
    denominator = 3;
    for (; ; ) {
      numerator = finalise(numerator.times(x2), wpr, 1);
      t = sum3.plus(divide2(numerator, new Ctor(denominator), wpr, 1));
      if (digitsToString(t.d).slice(0, wpr) === digitsToString(sum3.d).slice(0, wpr)) {
        sum3 = sum3.times(2);
        if (e !== 0)
          sum3 = sum3.plus(getLn10(Ctor, wpr + 2, pr).times(e + ""));
        sum3 = divide2(sum3, new Ctor(n), wpr, 1);
        if (sd == null) {
          if (checkRoundingDigits(sum3.d, wpr - guard, rm, rep)) {
            Ctor.precision = wpr += guard;
            t = numerator = x = divide2(x1.minus(1), x1.plus(1), wpr, 1);
            x2 = finalise(x.times(x), wpr, 1);
            denominator = rep = 1;
          } else {
            return finalise(sum3, Ctor.precision = pr, rm, external = true);
          }
        } else {
          Ctor.precision = pr;
          return sum3;
        }
      }
      sum3 = t;
      denominator += 2;
    }
  }
  function nonFiniteToString(x) {
    return String(x.s * x.s / 0);
  }
  function parseDecimal(x, str) {
    var e, i, len;
    if ((e = str.indexOf(".")) > -1)
      str = str.replace(".", "");
    if ((i = str.search(/e/i)) > 0) {
      if (e < 0)
        e = i;
      e += +str.slice(i + 1);
      str = str.substring(0, i);
    } else if (e < 0) {
      e = str.length;
    }
    for (i = 0; str.charCodeAt(i) === 48; i++)
      ;
    for (len = str.length; str.charCodeAt(len - 1) === 48; --len)
      ;
    str = str.slice(i, len);
    if (str) {
      len -= i;
      x.e = e = e - i - 1;
      x.d = [];
      i = (e + 1) % LOG_BASE;
      if (e < 0)
        i += LOG_BASE;
      if (i < len) {
        if (i)
          x.d.push(+str.slice(0, i));
        for (len -= LOG_BASE; i < len; )
          x.d.push(+str.slice(i, i += LOG_BASE));
        str = str.slice(i);
        i = LOG_BASE - str.length;
      } else {
        i -= len;
      }
      for (; i--; )
        str += "0";
      x.d.push(+str);
      if (external) {
        if (x.e > x.constructor.maxE) {
          x.d = null;
          x.e = NaN;
        } else if (x.e < x.constructor.minE) {
          x.e = 0;
          x.d = [0];
        }
      }
    } else {
      x.e = 0;
      x.d = [0];
    }
    return x;
  }
  function parseOther(x, str) {
    var base2, Ctor, divisor, i, isFloat, len, p, xd, xe;
    if (str.indexOf("_") > -1) {
      str = str.replace(/(\d)_(?=\d)/g, "$1");
      if (isDecimal.test(str))
        return parseDecimal(x, str);
    } else if (str === "Infinity" || str === "NaN") {
      if (!+str)
        x.s = NaN;
      x.e = NaN;
      x.d = null;
      return x;
    }
    if (isHex.test(str)) {
      base2 = 16;
      str = str.toLowerCase();
    } else if (isBinary.test(str)) {
      base2 = 2;
    } else if (isOctal.test(str)) {
      base2 = 8;
    } else {
      throw Error(invalidArgument + str);
    }
    i = str.search(/p/i);
    if (i > 0) {
      p = +str.slice(i + 1);
      str = str.substring(2, i);
    } else {
      str = str.slice(2);
    }
    i = str.indexOf(".");
    isFloat = i >= 0;
    Ctor = x.constructor;
    if (isFloat) {
      str = str.replace(".", "");
      len = str.length;
      i = len - i;
      divisor = intPow(Ctor, new Ctor(base2), i, i * 2);
    }
    xd = convertBase(str, base2, BASE);
    xe = xd.length - 1;
    for (i = xe; xd[i] === 0; --i)
      xd.pop();
    if (i < 0)
      return new Ctor(x.s * 0);
    x.e = getBase10Exponent(xd, xe);
    x.d = xd;
    external = false;
    if (isFloat)
      x = divide2(x, divisor, len * 4);
    if (p)
      x = x.times(Math.abs(p) < 54 ? mathpow(2, p) : Decimal.pow(2, p));
    external = true;
    return x;
  }
  function sine(Ctor, x) {
    var k, len = x.d.length;
    if (len < 3) {
      return x.isZero() ? x : taylorSeries(Ctor, 2, x, x);
    }
    k = 1.4 * Math.sqrt(len);
    k = k > 16 ? 16 : k | 0;
    x = x.times(1 / tinyPow(5, k));
    x = taylorSeries(Ctor, 2, x, x);
    var sin2_x, d5 = new Ctor(5), d16 = new Ctor(16), d20 = new Ctor(20);
    for (; k--; ) {
      sin2_x = x.times(x);
      x = x.times(d5.plus(sin2_x.times(d16.times(sin2_x).minus(d20))));
    }
    return x;
  }
  function taylorSeries(Ctor, n, x, y, isHyperbolic) {
    var j, t, u, x2, i = 1, pr = Ctor.precision, k = Math.ceil(pr / LOG_BASE);
    external = false;
    x2 = x.times(x);
    u = new Ctor(y);
    for (; ; ) {
      t = divide2(u.times(x2), new Ctor(n++ * n++), pr, 1);
      u = isHyperbolic ? y.plus(t) : y.minus(t);
      y = divide2(t.times(x2), new Ctor(n++ * n++), pr, 1);
      t = u.plus(y);
      if (t.d[k] !== void 0) {
        for (j = k; t.d[j] === u.d[j] && j--; )
          ;
        if (j == -1)
          break;
      }
      j = u;
      u = y;
      y = t;
      t = j;
      i++;
    }
    external = true;
    t.d.length = k + 1;
    return t;
  }
  function tinyPow(b, e) {
    var n = b;
    while (--e)
      n *= b;
    return n;
  }
  function toLessThanHalfPi(Ctor, x) {
    var t, isNeg = x.s < 0, pi = getPi(Ctor, Ctor.precision, 1), halfPi = pi.times(0.5);
    x = x.abs();
    if (x.lte(halfPi)) {
      quadrant = isNeg ? 4 : 1;
      return x;
    }
    t = x.divToInt(pi);
    if (t.isZero()) {
      quadrant = isNeg ? 3 : 2;
    } else {
      x = x.minus(t.times(pi));
      if (x.lte(halfPi)) {
        quadrant = isOdd(t) ? isNeg ? 2 : 3 : isNeg ? 4 : 1;
        return x;
      }
      quadrant = isOdd(t) ? isNeg ? 1 : 4 : isNeg ? 3 : 2;
    }
    return x.minus(pi).abs();
  }
  function toStringBinary(x, baseOut, sd, rm) {
    var base2, e, i, k, len, roundUp, str, xd, y, Ctor = x.constructor, isExp = sd !== void 0;
    if (isExp) {
      checkInt32(sd, 1, MAX_DIGITS);
      if (rm === void 0)
        rm = Ctor.rounding;
      else
        checkInt32(rm, 0, 8);
    } else {
      sd = Ctor.precision;
      rm = Ctor.rounding;
    }
    if (!x.isFinite()) {
      str = nonFiniteToString(x);
    } else {
      str = finiteToString(x);
      i = str.indexOf(".");
      if (isExp) {
        base2 = 2;
        if (baseOut == 16) {
          sd = sd * 4 - 3;
        } else if (baseOut == 8) {
          sd = sd * 3 - 2;
        }
      } else {
        base2 = baseOut;
      }
      if (i >= 0) {
        str = str.replace(".", "");
        y = new Ctor(1);
        y.e = str.length - i;
        y.d = convertBase(finiteToString(y), 10, base2);
        y.e = y.d.length;
      }
      xd = convertBase(str, 10, base2);
      e = len = xd.length;
      for (; xd[--len] == 0; )
        xd.pop();
      if (!xd[0]) {
        str = isExp ? "0p+0" : "0";
      } else {
        if (i < 0) {
          e--;
        } else {
          x = new Ctor(x);
          x.d = xd;
          x.e = e;
          x = divide2(x, y, sd, rm, 0, base2);
          xd = x.d;
          e = x.e;
          roundUp = inexact;
        }
        i = xd[sd];
        k = base2 / 2;
        roundUp = roundUp || xd[sd + 1] !== void 0;
        roundUp = rm < 4 ? (i !== void 0 || roundUp) && (rm === 0 || rm === (x.s < 0 ? 3 : 2)) : i > k || i === k && (rm === 4 || roundUp || rm === 6 && xd[sd - 1] & 1 || rm === (x.s < 0 ? 8 : 7));
        xd.length = sd;
        if (roundUp) {
          for (; ++xd[--sd] > base2 - 1; ) {
            xd[sd] = 0;
            if (!sd) {
              ++e;
              xd.unshift(1);
            }
          }
        }
        for (len = xd.length; !xd[len - 1]; --len)
          ;
        for (i = 0, str = ""; i < len; i++)
          str += NUMERALS.charAt(xd[i]);
        if (isExp) {
          if (len > 1) {
            if (baseOut == 16 || baseOut == 8) {
              i = baseOut == 16 ? 4 : 3;
              for (--len; len % i; len++)
                str += "0";
              xd = convertBase(str, base2, baseOut);
              for (len = xd.length; !xd[len - 1]; --len)
                ;
              for (i = 1, str = "1."; i < len; i++)
                str += NUMERALS.charAt(xd[i]);
            } else {
              str = str.charAt(0) + "." + str.slice(1);
            }
          }
          str = str + (e < 0 ? "p" : "p+") + e;
        } else if (e < 0) {
          for (; ++e; )
            str = "0" + str;
          str = "0." + str;
        } else {
          if (++e > len)
            for (e -= len; e--; )
              str += "0";
          else if (e < len)
            str = str.slice(0, e) + "." + str.slice(e);
        }
      }
      str = (baseOut == 16 ? "0x" : baseOut == 2 ? "0b" : baseOut == 8 ? "0o" : "") + str;
    }
    return x.s < 0 ? "-" + str : str;
  }
  function truncate(arr, len) {
    if (arr.length > len) {
      arr.length = len;
      return true;
    }
  }
  function abs(x) {
    return new this(x).abs();
  }
  function acos(x) {
    return new this(x).acos();
  }
  function acosh(x) {
    return new this(x).acosh();
  }
  function add2(x, y) {
    return new this(x).plus(y);
  }
  function asin(x) {
    return new this(x).asin();
  }
  function asinh(x) {
    return new this(x).asinh();
  }
  function atan(x) {
    return new this(x).atan();
  }
  function atanh(x) {
    return new this(x).atanh();
  }
  function atan2(y, x) {
    y = new this(y);
    x = new this(x);
    var r, pr = this.precision, rm = this.rounding, wpr = pr + 4;
    if (!y.s || !x.s) {
      r = new this(NaN);
    } else if (!y.d && !x.d) {
      r = getPi(this, wpr, 1).times(x.s > 0 ? 0.25 : 0.75);
      r.s = y.s;
    } else if (!x.d || y.isZero()) {
      r = x.s < 0 ? getPi(this, pr, rm) : new this(0);
      r.s = y.s;
    } else if (!y.d || x.isZero()) {
      r = getPi(this, wpr, 1).times(0.5);
      r.s = y.s;
    } else if (x.s < 0) {
      this.precision = wpr;
      this.rounding = 1;
      r = this.atan(divide2(y, x, wpr, 1));
      x = getPi(this, wpr, 1);
      this.precision = pr;
      this.rounding = rm;
      r = y.s < 0 ? r.minus(x) : r.plus(x);
    } else {
      r = this.atan(divide2(y, x, wpr, 1));
    }
    return r;
  }
  function cbrt(x) {
    return new this(x).cbrt();
  }
  function ceil(x) {
    return finalise(x = new this(x), x.e + 1, 2);
  }
  function clamp(x, min2, max2) {
    return new this(x).clamp(min2, max2);
  }
  function config(obj) {
    if (!obj || typeof obj !== "object")
      throw Error(decimalError + "Object expected");
    var i, p, v, useDefaults = obj.defaults === true, ps = [
      "precision",
      1,
      MAX_DIGITS,
      "rounding",
      0,
      8,
      "toExpNeg",
      -EXP_LIMIT,
      0,
      "toExpPos",
      0,
      EXP_LIMIT,
      "maxE",
      0,
      EXP_LIMIT,
      "minE",
      -EXP_LIMIT,
      0,
      "modulo",
      0,
      9
    ];
    for (i = 0; i < ps.length; i += 3) {
      if (p = ps[i], useDefaults)
        this[p] = DEFAULTS[p];
      if ((v = obj[p]) !== void 0) {
        if (mathfloor(v) === v && v >= ps[i + 1] && v <= ps[i + 2])
          this[p] = v;
        else
          throw Error(invalidArgument + p + ": " + v);
      }
    }
    if (p = "crypto", useDefaults)
      this[p] = DEFAULTS[p];
    if ((v = obj[p]) !== void 0) {
      if (v === true || v === false || v === 0 || v === 1) {
        if (v) {
          if (typeof crypto != "undefined" && crypto && (crypto.getRandomValues || crypto.randomBytes)) {
            this[p] = true;
          } else {
            throw Error(cryptoUnavailable);
          }
        } else {
          this[p] = false;
        }
      } else {
        throw Error(invalidArgument + p + ": " + v);
      }
    }
    return this;
  }
  function cos(x) {
    return new this(x).cos();
  }
  function cosh(x) {
    return new this(x).cosh();
  }
  function clone(obj) {
    var i, p, ps;
    function Decimal2(v) {
      var e, i2, t, x = this;
      if (!(x instanceof Decimal2))
        return new Decimal2(v);
      x.constructor = Decimal2;
      if (isDecimalInstance(v)) {
        x.s = v.s;
        if (external) {
          if (!v.d || v.e > Decimal2.maxE) {
            x.e = NaN;
            x.d = null;
          } else if (v.e < Decimal2.minE) {
            x.e = 0;
            x.d = [0];
          } else {
            x.e = v.e;
            x.d = v.d.slice();
          }
        } else {
          x.e = v.e;
          x.d = v.d ? v.d.slice() : v.d;
        }
        return;
      }
      t = typeof v;
      if (t === "number") {
        if (v === 0) {
          x.s = 1 / v < 0 ? -1 : 1;
          x.e = 0;
          x.d = [0];
          return;
        }
        if (v < 0) {
          v = -v;
          x.s = -1;
        } else {
          x.s = 1;
        }
        if (v === ~~v && v < 1e7) {
          for (e = 0, i2 = v; i2 >= 10; i2 /= 10)
            e++;
          if (external) {
            if (e > Decimal2.maxE) {
              x.e = NaN;
              x.d = null;
            } else if (e < Decimal2.minE) {
              x.e = 0;
              x.d = [0];
            } else {
              x.e = e;
              x.d = [v];
            }
          } else {
            x.e = e;
            x.d = [v];
          }
          return;
        } else if (v * 0 !== 0) {
          if (!v)
            x.s = NaN;
          x.e = NaN;
          x.d = null;
          return;
        }
        return parseDecimal(x, v.toString());
      } else if (t !== "string") {
        throw Error(invalidArgument + v);
      }
      if ((i2 = v.charCodeAt(0)) === 45) {
        v = v.slice(1);
        x.s = -1;
      } else {
        if (i2 === 43)
          v = v.slice(1);
        x.s = 1;
      }
      return isDecimal.test(v) ? parseDecimal(x, v) : parseOther(x, v);
    }
    Decimal2.prototype = P;
    Decimal2.ROUND_UP = 0;
    Decimal2.ROUND_DOWN = 1;
    Decimal2.ROUND_CEIL = 2;
    Decimal2.ROUND_FLOOR = 3;
    Decimal2.ROUND_HALF_UP = 4;
    Decimal2.ROUND_HALF_DOWN = 5;
    Decimal2.ROUND_HALF_EVEN = 6;
    Decimal2.ROUND_HALF_CEIL = 7;
    Decimal2.ROUND_HALF_FLOOR = 8;
    Decimal2.EUCLID = 9;
    Decimal2.config = Decimal2.set = config;
    Decimal2.clone = clone;
    Decimal2.isDecimal = isDecimalInstance;
    Decimal2.abs = abs;
    Decimal2.acos = acos;
    Decimal2.acosh = acosh;
    Decimal2.add = add2;
    Decimal2.asin = asin;
    Decimal2.asinh = asinh;
    Decimal2.atan = atan;
    Decimal2.atanh = atanh;
    Decimal2.atan2 = atan2;
    Decimal2.cbrt = cbrt;
    Decimal2.ceil = ceil;
    Decimal2.clamp = clamp;
    Decimal2.cos = cos;
    Decimal2.cosh = cosh;
    Decimal2.div = div;
    Decimal2.exp = exp;
    Decimal2.floor = floor;
    Decimal2.hypot = hypot;
    Decimal2.ln = ln;
    Decimal2.log = log;
    Decimal2.log10 = log10;
    Decimal2.log2 = log2;
    Decimal2.max = max;
    Decimal2.min = min;
    Decimal2.mod = mod;
    Decimal2.mul = mul;
    Decimal2.pow = pow;
    Decimal2.random = random;
    Decimal2.round = round;
    Decimal2.sign = sign;
    Decimal2.sin = sin;
    Decimal2.sinh = sinh;
    Decimal2.sqrt = sqrt;
    Decimal2.sub = sub;
    Decimal2.sum = sum;
    Decimal2.tan = tan;
    Decimal2.tanh = tanh;
    Decimal2.trunc = trunc;
    if (obj === void 0)
      obj = {};
    if (obj) {
      if (obj.defaults !== true) {
        ps = ["precision", "rounding", "toExpNeg", "toExpPos", "maxE", "minE", "modulo", "crypto"];
        for (i = 0; i < ps.length; )
          if (!obj.hasOwnProperty(p = ps[i++]))
            obj[p] = this[p];
      }
    }
    Decimal2.config(obj);
    return Decimal2;
  }
  function div(x, y) {
    return new this(x).div(y);
  }
  function exp(x) {
    return new this(x).exp();
  }
  function floor(x) {
    return finalise(x = new this(x), x.e + 1, 3);
  }
  function hypot() {
    var i, n, t = new this(0);
    external = false;
    for (i = 0; i < arguments.length; ) {
      n = new this(arguments[i++]);
      if (!n.d) {
        if (n.s) {
          external = true;
          return new this(1 / 0);
        }
        t = n;
      } else if (t.d) {
        t = t.plus(n.times(n));
      }
    }
    external = true;
    return t.sqrt();
  }
  function isDecimalInstance(obj) {
    return obj instanceof Decimal || obj && obj.toStringTag === tag || false;
  }
  function ln(x) {
    return new this(x).ln();
  }
  function log(x, y) {
    return new this(x).log(y);
  }
  function log2(x) {
    return new this(x).log(2);
  }
  function log10(x) {
    return new this(x).log(10);
  }
  function max() {
    return maxOrMin(this, arguments, "lt");
  }
  function min() {
    return maxOrMin(this, arguments, "gt");
  }
  function mod(x, y) {
    return new this(x).mod(y);
  }
  function mul(x, y) {
    return new this(x).mul(y);
  }
  function pow(x, y) {
    return new this(x).pow(y);
  }
  function random(sd) {
    var d, e, k, n, i = 0, r = new this(1), rd = [];
    if (sd === void 0)
      sd = this.precision;
    else
      checkInt32(sd, 1, MAX_DIGITS);
    k = Math.ceil(sd / LOG_BASE);
    if (!this.crypto) {
      for (; i < k; )
        rd[i++] = Math.random() * 1e7 | 0;
    } else if (crypto.getRandomValues) {
      d = crypto.getRandomValues(new Uint32Array(k));
      for (; i < k; ) {
        n = d[i];
        if (n >= 429e7) {
          d[i] = crypto.getRandomValues(new Uint32Array(1))[0];
        } else {
          rd[i++] = n % 1e7;
        }
      }
    } else if (crypto.randomBytes) {
      d = crypto.randomBytes(k *= 4);
      for (; i < k; ) {
        n = d[i] + (d[i + 1] << 8) + (d[i + 2] << 16) + ((d[i + 3] & 127) << 24);
        if (n >= 214e7) {
          crypto.randomBytes(4).copy(d, i);
        } else {
          rd.push(n % 1e7);
          i += 4;
        }
      }
      i = k / 4;
    } else {
      throw Error(cryptoUnavailable);
    }
    k = rd[--i];
    sd %= LOG_BASE;
    if (k && sd) {
      n = mathpow(10, LOG_BASE - sd);
      rd[i] = (k / n | 0) * n;
    }
    for (; rd[i] === 0; i--)
      rd.pop();
    if (i < 0) {
      e = 0;
      rd = [0];
    } else {
      e = -1;
      for (; rd[0] === 0; e -= LOG_BASE)
        rd.shift();
      for (k = 1, n = rd[0]; n >= 10; n /= 10)
        k++;
      if (k < LOG_BASE)
        e -= LOG_BASE - k;
    }
    r.e = e;
    r.d = rd;
    return r;
  }
  function round(x) {
    return finalise(x = new this(x), x.e + 1, this.rounding);
  }
  function sign(x) {
    x = new this(x);
    return x.d ? x.d[0] ? x.s : 0 * x.s : x.s || NaN;
  }
  function sin(x) {
    return new this(x).sin();
  }
  function sinh(x) {
    return new this(x).sinh();
  }
  function sqrt(x) {
    return new this(x).sqrt();
  }
  function sub(x, y) {
    return new this(x).sub(y);
  }
  function sum() {
    var i = 0, args = arguments, x = new this(args[i]);
    external = false;
    for (; x.s && ++i < args.length; )
      x = x.plus(args[i]);
    external = true;
    return finalise(x, this.precision, this.rounding);
  }
  function tan(x) {
    return new this(x).tan();
  }
  function tanh(x) {
    return new this(x).tanh();
  }
  function trunc(x) {
    return finalise(x = new this(x), x.e + 1, 1);
  }
  P[Symbol.for("nodejs.util.inspect.custom")] = P.toString;
  P[Symbol.toStringTag] = "Decimal";
  var Decimal = P.constructor = clone(DEFAULTS);
  LN10 = new Decimal(LN10);
  PI = new Decimal(PI);
  var decimal_default = Decimal;

  // src/symbolic/precise.ts
  var WORKING_DIGITS = 60;
  var contexts = /* @__PURE__ */ new Map();
  function decimalContext(digits = WORKING_DIGITS) {
    let context = contexts.get(digits);
    if (context === void 0) {
      context = decimal_default.clone({
        precision: digits,
        rounding: decimal_default.ROUND_HALF_EVEN
        // toExpPos and toExpNeg stay at their defaults. They only choose when a
        // string uses exponent notation, not the range, which is maxE, but
        // decimal.js goes through strings inside `pow`. Set to 9e15, raising
        // e^{10⁸} to a power wrote out a hundred-million-digit string, and a
        // limit at infinity that sampled there ran out of memory.
      });
      contexts.set(digits, context);
    }
    return context;
  }
  var sinh2 = (D, x) => {
    if (x.abs().lt(0.5))
      return D.sinh(x);
    const e = D.exp(x);
    return e.minus(new D(1).div(e)).div(2);
  };
  var cosh2 = (D, x) => {
    const e = D.exp(x.abs());
    return e.plus(new D(1).div(e)).div(2);
  };
  var tanh2 = (D, x) => {
    if (x.abs().lt(0.5))
      return D.tanh(x);
    const e = D.exp(x.abs().times(-2));
    const t = new D(1).minus(e).div(new D(1).plus(e));
    return x.isNegative() ? t.neg() : t;
  };
  var FUNCTIONS2 = {
    sin: (D, x) => D.sin(x),
    cos: (D, x) => D.cos(x),
    tan: (D, x) => D.tan(x),
    cot: (D, x) => new D(1).div(D.tan(x)),
    sec: (D, x) => new D(1).div(D.cos(x)),
    csc: (D, x) => new D(1).div(D.sin(x)),
    arcsin: (D, x) => D.asin(x),
    arccos: (D, x) => D.acos(x),
    arctan: (D, x) => D.atan(x),
    arccot: (D, x) => D.acos(-1).div(2).minus(D.atan(x)),
    arcsec: (D, x) => D.acos(new D(1).div(x)),
    arccsc: (D, x) => D.asin(new D(1).div(x)),
    sinh: sinh2,
    cosh: cosh2,
    tanh: tanh2,
    coth: (D, x) => new D(1).div(tanh2(D, x)),
    sech: (D, x) => new D(1).div(cosh2(D, x)),
    csch: (D, x) => new D(1).div(sinh2(D, x)),
    arcsinh: (D, x) => D.asinh(x),
    arccosh: (D, x) => D.acosh(x),
    arctanh: (D, x) => D.atanh(x),
    exp: (D, x) => D.exp(x),
    ln: (D, x) => D.ln(x),
    log: (D, x) => D.log10(x),
    sqrt: (D, x) => D.sqrt(x),
    abs: (D, x) => D.abs(x),
    sign: (D, x) => new D(D.sign(x)),
    floor: (D, x) => D.floor(x),
    ceil: (D, x) => D.ceil(x),
    // JavaScript's and Desmos's rounding: halves go up.
    round: (D, x) => x.toDecimalPlaces(0, D.ROUND_HALF_CEIL)
  };
  var COMPARE2 = {
    "<": (a, b) => a.lt(b),
    "<=": (a, b) => a.lte(b),
    "=": (a, b) => a.eq(b),
    ">=": (a, b) => a.gte(b),
    ">": (a, b) => a.gt(b)
  };
  function evaluatePrecise(node, bindings, digits = WORKING_DIGITS) {
    const D = decimalContext(digits);
    const walk = (n) => {
      switch (n.type) {
        case "Constant":
          return new D(n.value);
        case "Identifier":
          if (n.symbol === "pi")
            return D.acos(-1);
          if (n.symbol === "e")
            return D.exp(1);
          return bindings[n.symbol] === void 0 ? new D(NaN) : new D(bindings[n.symbol]);
        case "Negative":
          return walk(n.arg).neg();
        case "FunctionCall": {
          const fn = FUNCTIONS2[n.callee.symbol];
          if (fn === void 0 || n.args.length !== 1)
            return new D(NaN);
          const x = walk(n.args[0]);
          if (x.isNaN())
            return x;
          try {
            return fn(D, x);
          } catch {
            return new D(NaN);
          }
        }
        case "Piecewise": {
          const holds = n.condition === true || conditionHolds2(n.condition);
          return walk(holds ? n.consequent : n.alternate);
        }
        case "BinaryOperator": {
          const left = walk(n.left);
          const right = walk(n.right);
          switch (n.name) {
            case "Add":
              return left.plus(right);
            case "Subtract":
              return left.minus(right);
            case "Multiply":
            case "CrossMultiply":
              return left.times(right);
            case "Divide":
              return left.div(right);
            case "Exponent":
              return power3(D, left, right);
          }
          return new D(NaN);
        }
        default:
          return new D(NaN);
      }
    };
    const conditionHolds2 = (condition) => {
      const links = condition.type === "Comparator" ? [[condition.left, condition.operator, condition.right]] : condition.type === "ComparatorChain" ? condition.symbols.map((symbol, i) => [
        condition.args[i],
        symbol,
        condition.args[i + 1]
      ]) : [];
      if (links.length === 0)
        return false;
      return links.every(([left, operator, right]) => {
        const a = walk(left);
        const b = walk(right);
        if (a.isNaN() || b.isNaN())
          return false;
        return (COMPARE2[operator] ?? (() => false))(a, b);
      });
    };
    return walk(node);
  }
  function power3(D, base2, exponent2) {
    if (base2.isNaN() || exponent2.isNaN())
      return new D(NaN);
    if (base2.isNegative() && !base2.isZero() && !exponent2.isInteger())
      return new D(NaN);
    if (base2.isZero() && exponent2.isNegative())
      return new D(Infinity);
    return D.pow(base2, exponent2);
  }

  // src/plugins/physics-lab/symbolic/differentiate.ts
  var { number: number3, binop: binop3, functionCall: functionCall3, id: id4, negative: negative3 } = augBuilders_exports;
  var add3 = (a, b) => binop3("Add", a, b);
  var subtract2 = (a, b) => binop3("Subtract", a, b);
  var multiply2 = (a, b) => binop3("Multiply", a, b);
  var divide3 = (a, b) => binop3("Divide", a, b);
  var power4 = (a, b) => binop3("Exponent", a, b);
  var call2 = (name, arg) => functionCall3(id4(name), arg);
  var square2 = (node) => power4(node, number3(2));
  var paren = (node) => ({
    type: "Seq",
    parenWrapped: true,
    args: [node]
  });
  var pending = (node, variable) => ({
    type: "Derivative",
    arg: paren(node),
    variable: id4(variable)
  });
  var DifferentiationError = class extends Error {
  };
  var RULE_FORMULAS = {
    linear: String.raw`\frac{d}{dx}\left(cx\right)=c`,
    "constant-multiple": String.raw`\left(cf\right)'=cf'`,
    power: String.raw`\frac{d}{dx}x^{n}=nx^{n-1}`,
    "power-chain": String.raw`\frac{d}{dx}u^{n}=nu^{n-1}u'`,
    sum: String.raw`\left(f+g\right)'=f'+g'`,
    product: String.raw`\left(uv\right)'=u'v+uv'`,
    quotient: String.raw`\left(\frac{u}{v}\right)'=\frac{u'v-uv'}{v^{2}}`,
    chain: String.raw`\frac{d}{dx}f\left(u\right)=f'\left(u\right)u'`,
    exponential: String.raw`\frac{d}{dx}e^{x}=e^{x}`,
    "exponential-chain": String.raw`\frac{d}{dx}e^{u}=e^{u}u'`,
    "exponential-base": String.raw`\frac{d}{dx}a^{x}=a^{x}\ln a`,
    "exponential-base-chain": String.raw`\frac{d}{dx}a^{u}=a^{u}u'\ln a`,
    "logarithmic-differentiation": String.raw`\frac{d}{dx}u^{v}=u^{v}\left(v'\ln u+\frac{vu'}{u}\right)`,
    implicit: String.raw`\frac{dy}{dx}=-\frac{F_{x}}{F_{y}}`
  };
  var RULE_DERIVATIONS = {
    "logarithmic-differentiation": [
      { latex: String.raw`y=u^{v}`, note: "Give the expression a name." },
      {
        latex: String.raw`\ln y=v\ln u`,
        note: "Take the natural log of both sides. The exponent comes down, and the power becomes a product."
      },
      {
        latex: String.raw`\frac{y'}{y}=v'\ln u+\frac{vu'}{u}`,
        note: "Differentiate both sides. The left is the chain rule on ln y; the right is the product rule."
      },
      {
        latex: String.raw`y'=u^{v}\left(v'\ln u+\frac{vu'}{u}\right)`,
        note: "Multiply through by y, which is u to the v."
      }
    ]
  };
  var FUNCTION_RULES = {
    sin: rule(
      "trigonometric",
      "Derivative of sine",
      (u) => call2("cos", u),
      "sin(u) differentiates to cos(u)"
    ),
    cos: rule(
      "trigonometric",
      "Derivative of cosine",
      (u) => negative3(call2("sin", u)),
      "cos(u) differentiates to -sin(u)"
    ),
    tan: rule(
      "trigonometric",
      "Derivative of tangent",
      (u) => square2(call2("sec", u)),
      "tan(u) differentiates to sec\xB2(u)"
    ),
    cot: rule(
      "trigonometric",
      "Derivative of cotangent",
      (u) => negative3(square2(call2("csc", u))),
      "cot(u) differentiates to -csc\xB2(u)"
    ),
    sec: rule(
      "trigonometric",
      "Derivative of secant",
      (u) => multiply2(call2("sec", u), call2("tan", u)),
      "sec(u) differentiates to sec(u)tan(u)"
    ),
    csc: rule(
      "trigonometric",
      "Derivative of cosecant",
      (u) => negative3(multiply2(call2("csc", u), call2("cot", u))),
      "csc(u) differentiates to -csc(u)cot(u)"
    ),
    arcsin: rule(
      "inverse-trigonometric",
      "Derivative of arcsine",
      (u) => divide3(number3(1), call2("sqrt", subtract2(number3(1), square2(u)))),
      "arcsin(u) differentiates to 1/\u221A(1-u\xB2)"
    ),
    arccos: rule(
      "inverse-trigonometric",
      "Derivative of arccosine",
      (u) => negative3(divide3(number3(1), call2("sqrt", subtract2(number3(1), square2(u))))),
      "arccos(u) differentiates to -1/\u221A(1-u\xB2)"
    ),
    arctan: rule(
      "inverse-trigonometric",
      "Derivative of arctangent",
      (u) => divide3(number3(1), add3(number3(1), square2(u))),
      "arctan(u) differentiates to 1/(1+u\xB2)"
    ),
    arccot: rule(
      "inverse-trigonometric",
      "Derivative of arccotangent",
      (u) => negative3(divide3(number3(1), add3(number3(1), square2(u)))),
      "arccot(u) differentiates to -1/(1+u\xB2)"
    ),
    arcsec: rule(
      "inverse-trigonometric",
      "Derivative of arcsecant",
      (u) => divide3(
        number3(1),
        multiply2(call2("abs", u), call2("sqrt", subtract2(square2(u), number3(1))))
      ),
      "arcsec(u) differentiates to 1/(|u|\u221A(u\xB2-1))"
    ),
    arccsc: rule(
      "inverse-trigonometric",
      "Derivative of arccosecant",
      (u) => negative3(
        divide3(
          number3(1),
          multiply2(call2("abs", u), call2("sqrt", subtract2(square2(u), number3(1))))
        )
      ),
      "arccsc(u) differentiates to -1/(|u|\u221A(u\xB2-1))"
    ),
    sinh: rule(
      "hyperbolic",
      "Derivative of hyperbolic sine",
      (u) => call2("cosh", u),
      "sinh(u) differentiates to cosh(u)"
    ),
    cosh: rule(
      "hyperbolic",
      "Derivative of hyperbolic cosine",
      (u) => call2("sinh", u),
      "cosh(u) differentiates to sinh(u)"
    ),
    tanh: rule(
      "hyperbolic",
      "Derivative of hyperbolic tangent",
      (u) => square2(call2("sech", u)),
      "tanh(u) differentiates to sech\xB2(u)"
    ),
    coth: rule(
      "hyperbolic",
      "Derivative of hyperbolic cotangent",
      (u) => negative3(square2(call2("csch", u))),
      "coth(u) differentiates to -csch\xB2(u)"
    ),
    sech: rule(
      "hyperbolic",
      "Derivative of hyperbolic secant",
      (u) => negative3(multiply2(call2("sech", u), call2("tanh", u))),
      "sech(u) differentiates to -sech(u)tanh(u)"
    ),
    csch: rule(
      "hyperbolic",
      "Derivative of hyperbolic cosecant",
      (u) => negative3(multiply2(call2("csch", u), call2("coth", u))),
      "csch(u) differentiates to -csch(u)coth(u)"
    ),
    arcsinh: rule(
      "inverse-trigonometric",
      "Derivative of inverse hyperbolic sine",
      (u) => divide3(number3(1), call2("sqrt", add3(square2(u), number3(1)))),
      "arcsinh(u) differentiates to 1/\u221A(u\xB2+1)"
    ),
    arccosh: rule(
      "inverse-trigonometric",
      "Derivative of inverse hyperbolic cosine",
      (u) => divide3(number3(1), call2("sqrt", subtract2(square2(u), number3(1)))),
      "arccosh(u) differentiates to 1/\u221A(u\xB2-1)"
    ),
    arctanh: rule(
      "inverse-trigonometric",
      "Derivative of inverse hyperbolic tangent",
      (u) => divide3(number3(1), subtract2(number3(1), square2(u))),
      "arctanh(u) differentiates to 1/(1-u\xB2)"
    ),
    exp: rule(
      "exponential",
      "Derivative of the exponential",
      (u) => call2("exp", u),
      "exp(u) differentiates to itself"
    ),
    ln: rule(
      "logarithm",
      "Derivative of the natural logarithm",
      (u) => divide3(number3(1), u),
      "ln(u) differentiates to 1/u"
    ),
    log: rule(
      "logarithm",
      "Derivative of the base-10 logarithm",
      (u) => divide3(number3(1), multiply2(u, call2("ln", number3(10)))),
      "log(u) differentiates to 1/(u ln 10)"
    ),
    sqrt: rule(
      "root",
      "Derivative of the square root",
      (u) => divide3(number3(1), multiply2(number3(2), call2("sqrt", u))),
      "\u221Au differentiates to 1/(2\u221Au)"
    ),
    abs: rule(
      "absolute",
      "Derivative of absolute value",
      (u) => call2("sign", u),
      "|u| differentiates to sign(u), undefined where u is 0"
    )
  };
  function rule(name, title, derivative4, says) {
    return { rule: name, title, derivative: derivative4, says };
  }
  function differentiate2(cfg2, node, variable) {
    const { derivative: derivative4, step } = derive(cfg2, node, variable);
    return {
      result: fold(derivative4),
      raw: derivative4,
      root: step,
      domain: gatherDomain(step)
    };
  }
  function gatherDomain(step) {
    const found = [...step.domain];
    for (const child of step.children)
      found.push(...gatherDomain(child));
    return found;
  }
  function derive(cfg2, node, variable) {
    if (!dependsOn(node, variable)) {
      return leaf({
        rule: "constant",
        title: "Constant rule",
        recognition: `This part contains no ${variable}.`,
        detail: "A constant does not change, so its derivative is 0.",
        before: node,
        after: number3(0)
      });
    }
    switch (node.type) {
      case "Identifier":
        return leaf({
          rule: "identity",
          title: "Derivative of the variable",
          recognition: `This is ${variable} on its own.`,
          detail: `The derivative of ${variable} with respect to itself is 1.`,
          before: node,
          after: number3(1)
        });
      case "Negative": {
        const inner = derive(cfg2, node.arg, variable);
        return {
          derivative: negative3(inner.derivative),
          step: {
            rule: "constant-multiple",
            title: "Constant multiple rule",
            recognition: "A leading minus sign is a factor of -1.",
            detail: "It comes along unchanged.",
            importance: "atomic",
            before: node,
            intermediate: negative3(pending(node.arg, variable)),
            after: negative3(inner.derivative),
            substitutions: [],
            domain: [],
            children: [inner.step]
          }
        };
      }
      case "BinaryOperator":
        return binaryRule(cfg2, node, variable);
      case "FunctionCall":
        return functionCallRule(cfg2, node, variable);
      default:
        throw new DifferentiationError(
          `${describe2(node)} cannot be differentiated here.`
        );
    }
  }
  function leaf(partial) {
    return {
      derivative: partial.after,
      step: {
        ...partial,
        importance: "atomic",
        substitutions: [],
        domain: [],
        children: []
      }
    };
  }
  function binaryRule(cfg2, node, variable) {
    const { left, right } = node;
    const leftHas = dependsOn(left, variable);
    const rightHas = dependsOn(right, variable);
    switch (node.name) {
      case "Add":
      case "Subtract":
        return sumRule(cfg2, node, variable);
      case "Multiply":
      case "CrossMultiply": {
        if (!leftHas || !rightHas) {
          const [constant3, varying] = leftHas ? [right, left] : [left, right];
          if (isVariable(varying, variable)) {
            return leaf({
              rule: "linear",
              title: "Linear rule",
              recognition: `This is a constant times ${variable}.`,
              detail: "Its derivative is that constant.",
              before: node,
              after: constant3
            });
          }
          const inner = derive(cfg2, varying, variable);
          return {
            derivative: multiply2(constant3, inner.derivative),
            step: {
              rule: "constant-multiple",
              title: "Constant multiple rule",
              recognition: `One factor contains no ${variable}, so it is a coefficient rather than a second function.`,
              detail: "It stays put; only the other factor is differentiated.",
              importance: "supporting",
              before: node,
              intermediate: multiply2(constant3, pending(varying, variable)),
              after: multiply2(constant3, inner.derivative),
              substitutions: [],
              domain: [],
              children: [inner.step]
            }
          };
        }
        const dLeft = derive(cfg2, left, variable);
        const dRight = derive(cfg2, right, variable);
        const product = (dU, dV) => add3(multiply2(dU, right), multiply2(left, dV));
        return {
          derivative: product(dLeft.derivative, dRight.derivative),
          step: {
            rule: "product",
            title: "Product rule",
            recognition: "The expression is a product of two functions.",
            detail: "",
            importance: "major",
            before: node,
            intermediate: product(
              pending(left, variable),
              pending(right, variable)
            ),
            after: product(dLeft.derivative, dRight.derivative),
            substitutions: [
              { symbol: "u", value: left },
              { symbol: "v", value: right }
            ],
            childRoles: ["u", "v"],
            domain: [],
            children: [dLeft.step, dRight.step]
          }
        };
      }
      case "Divide": {
        if (!rightHas) {
          const inner = derive(cfg2, left, variable);
          return {
            derivative: divide3(inner.derivative, right),
            step: {
              rule: "constant-multiple",
              title: "Constant multiple rule",
              recognition: `The denominator contains no ${variable}.`,
              detail: "A constant denominator divides the derivative of the numerator, so the quotient rule is not needed.",
              importance: "supporting",
              before: node,
              intermediate: divide3(pending(left, variable), right),
              after: divide3(inner.derivative, right),
              substitutions: [],
              domain: [],
              children: [inner.step]
            }
          };
        }
        const dLeft = derive(cfg2, left, variable);
        const dRight = derive(cfg2, right, variable);
        const quotient = (dU, dV) => divide3(
          subtract2(multiply2(dU, right), multiply2(left, dV)),
          square2(right)
        );
        return {
          derivative: quotient(dLeft.derivative, dRight.derivative),
          step: {
            rule: "quotient",
            title: "Quotient rule",
            recognition: `${variable} is above and below the line.`,
            detail: "",
            importance: "major",
            before: node,
            intermediate: quotient(
              pending(left, variable),
              pending(right, variable)
            ),
            after: quotient(dLeft.derivative, dRight.derivative),
            substitutions: [
              { symbol: "u", value: left },
              { symbol: "v", value: right }
            ],
            childRoles: ["u", "v"],
            domain: [],
            children: [dLeft.step, dRight.step]
          }
        };
      }
      case "Exponent":
        return exponentRule(cfg2, node, left, right, variable);
    }
  }
  function sumRule(cfg2, node, variable) {
    const terms = topLevelTerms(node);
    const worked = terms.map((entry) => ({
      ...entry,
      working: derive(cfg2, entry.term, variable)
    }));
    const assemble3 = (value) => rebuildSum(
      worked.map((entry) => ({ value: value(entry), negated: entry.negated }))
    );
    const after = assemble3((entry) => entry.working.derivative);
    const anyNegated = terms.some((entry) => entry.negated);
    return {
      derivative: after,
      step: {
        rule: "sum",
        title: anyNegated ? "Sum and difference rule" : "Sum rule",
        recognition: `This is ${terms.length} terms added${anyNegated ? " and subtracted" : ""}.`,
        detail: "Derivatives distribute over addition, so differentiate each term on its own and keep the signs.",
        importance: "supporting",
        before: node,
        intermediate: assemble3((entry) => pending(entry.term, variable)),
        after,
        substitutions: [],
        domain: [],
        children: worked.map((entry) => entry.working.step)
      }
    };
  }
  function exponentRule(cfg2, node, base2, exponent2, variable) {
    const baseHas = dependsOn(base2, variable);
    const exponentHas = dependsOn(exponent2, variable);
    if (baseHas && !exponentHas) {
      const lowered = fold(subtract2(exponent2, number3(1)));
      const outer = multiply2(exponent2, power4(base2, lowered));
      if (isVariable(base2, variable)) {
        const named2 = exponent2.type === "Constant" ? `The exponent ${exponent2.value} is` : "The exponent is";
        return {
          derivative: outer,
          step: {
            rule: "power",
            title: "Power rule",
            // Why the rule may be used here, before what it does. An expression
            // can hold `x²` and a variable exponent at once — the first screen of
            // this plugin does — and "bring the exponent down" read beside the
            // second is a rule the reader will misapply for the rest of the term.
            recognition: `${named2} constant and the base is ${variable} itself, so the ordinary power rule applies.`,
            detail: "Bring the constant exponent down as a factor and reduce it by one. This is not available when the exponent contains the variable.",
            importance: "supporting",
            before: node,
            after: outer,
            substitutions: [],
            domain: [],
            children: []
          }
        };
      }
      const inner = derive(cfg2, base2, variable);
      return {
        derivative: multiply2(outer, inner.derivative),
        step: {
          rule: "power-chain",
          title: "Power rule with the chain rule",
          recognition: `The exponent is a constant, so the power rule applies \u2014 but the base is a whole expression rather than ${variable}, so the chain rule comes with it.`,
          detail: "",
          importance: "major",
          before: node,
          intermediate: multiply2(outer, pending(base2, variable)),
          after: multiply2(outer, inner.derivative),
          substitutions: [{ symbol: "u", value: base2 }],
          childRoles: ["u"],
          domain: [],
          children: [inner.step]
        }
      };
    }
    if (!baseHas && exponentHas) {
      const isE = base2.type === "Identifier" && base2.symbol === "e";
      const outer = isE ? power4(base2, exponent2) : multiply2(power4(base2, exponent2), call2("ln", base2));
      const recognition = `The base is constant and ${variable} is in the exponent, so this is an exponential, not a power.`;
      if (isVariable(exponent2, variable)) {
        return {
          derivative: outer,
          step: {
            rule: isE ? "exponential" : "exponential-base",
            title: isE ? "Derivative of e to the x" : "Derivative of a to the x",
            recognition,
            detail: isE ? "The exponential is its own derivative." : "It differentiates to itself times the natural log of the base.",
            importance: "supporting",
            before: node,
            after: outer,
            substitutions: [],
            domain: [],
            children: []
          }
        };
      }
      const inner = derive(cfg2, exponent2, variable);
      return {
        derivative: multiply2(outer, inner.derivative),
        step: {
          rule: isE ? "exponential-chain" : "exponential-base-chain",
          title: "Exponential rule with the chain rule",
          recognition: `${recognition} The exponent is a whole expression, so the chain rule comes with it.`,
          detail: "",
          importance: "major",
          before: node,
          intermediate: multiply2(outer, pending(exponent2, variable)),
          after: multiply2(outer, inner.derivative),
          substitutions: [{ symbol: "u", value: exponent2 }],
          childRoles: ["u"],
          domain: [],
          children: [inner.step]
        }
      };
    }
    const dBase = derive(cfg2, base2, variable);
    const dExponent = derive(cfg2, exponent2, variable);
    const built = (dU, dV) => multiply2(
      power4(base2, exponent2),
      add3(multiply2(dV, call2("ln", base2)), divide3(multiply2(exponent2, dU), base2))
    );
    return {
      derivative: built(dBase.derivative, dExponent.derivative),
      step: {
        rule: "logarithmic-differentiation",
        title: "Logarithmic differentiation",
        recognition: `Both the base and the exponent depend on ${variable}, so neither the ordinary power rule nor the ordinary exponential rule is sufficient.`,
        detail: "Taking logs first turns the power into a product, which the product and chain rules can handle. Do not bring the exponent down: it is not a constant.",
        importance: "major",
        before: node,
        intermediate: built(pending(base2, variable), pending(exponent2, variable)),
        after: built(dBase.derivative, dExponent.derivative),
        substitutions: [
          { symbol: "u", value: base2 },
          { symbol: "v", value: exponent2 }
        ],
        childRoles: ["u", "v"],
        // The log of the base ends up in the answer whether or not the question
        // mentioned one, so the answer is only real where the base is positive.
        domain: [{ expression: base2, requirement: "positive" }],
        children: [dBase.step, dExponent.step]
      }
    };
  }
  function functionCallRule(cfg2, node, variable) {
    const name = node.callee.symbol;
    if (node.args.length !== 1) {
      throw new DifferentiationError(
        `${name} takes more than one argument, so it cannot be differentiated here.`
      );
    }
    const known = FUNCTION_RULES[name];
    if (known === void 0) {
      throw new DifferentiationError(`The derivative of ${name} is not known.`);
    }
    const [argument] = node.args;
    const outer = known.derivative(argument);
    if (isVariable(argument, variable)) {
      return {
        derivative: outer,
        step: {
          rule: known.rule,
          title: known.title,
          recognition: `The function is applied to ${variable} on its own.`,
          detail: `${known.says}.`,
          importance: "supporting",
          before: node,
          after: outer,
          substitutions: [],
          domain: [],
          children: []
        }
      };
    }
    const inner = derive(cfg2, argument, variable);
    return {
      derivative: multiply2(outer, inner.derivative),
      step: {
        rule: "chain",
        title: "Chain rule",
        // Named as an outer function and an inner one, rather than as "the
        // inside". The naming is what scales: `sin(e^{x²+1})` is three
        // compositions, and a reader who has only ever been told to "multiply by
        // the derivative of the inside" has no way to say which inside.
        recognition: "This is a composition \u2014 one function applied to another, rather than to the variable on its own.",
        detail: `${known.says}. Differentiate the outer function, leave the inner one where it is, then multiply by the derivative of the inner one.`,
        importance: "major",
        before: node,
        intermediate: multiply2(outer, pending(argument, variable)),
        after: multiply2(outer, inner.derivative),
        substitutions: [
          { symbol: "outer", value: functionCall3(node.callee, id4("u")) },
          { symbol: "u", value: argument }
        ],
        childRoles: ["u"],
        domain: [],
        children: [inner.step]
      }
    };
  }
  function isVariable(node, variable) {
    return node.type === "Identifier" && node.symbol === variable;
  }
  function stepsOf(root2) {
    const out = [];
    const walk = (step, depth2) => {
      out.push({ step, depth: depth2 });
      for (const child of step.children)
        walk(child, depth2 + 1);
    };
    walk(root2, 0);
    return out;
  }
  function describe2(node) {
    switch (node.type) {
      case "Integral":
        return "An integral";
      case "Derivative":
      case "Prime":
        return "A derivative";
      case "List":
      case "Range":
      case "ListComprehension":
        return "A list";
      case "Piecewise":
        return "A piecewise";
      case "RepeatedOperator":
        return "A sum or product";
      default:
        return `\`${node.type}\``;
    }
  }

  // src/plugins/physics-lab/symbolic/substitute.ts
  var MINIMUM_CANDIDATE_NODES = 2;
  var MAX_CANDIDATES = 24;
  function findSubstitution(node, variable) {
    const name = freshName(node, ["u", "w", "s", "v"]);
    let best;
    for (const u of candidates(node, variable)) {
      const found = tryCandidate(node, variable, u, name);
      if (found === void 0)
        continue;
      const score = nodeCount(found.u) - nodeCount(found.derivative);
      if (best === void 0 || score > best.score)
        best = { found, score };
    }
    return best?.found;
  }
  function tryCandidate(node, variable, u, name) {
    if (u.type === "Identifier" && u.symbol === variable)
      return void 0;
    let derivative4;
    try {
      derivative4 = fold(differentiate(u, variable));
    } catch (error2) {
      if (error2 instanceof SymbolicError)
        return void 0;
      throw error2;
    }
    if (derivative4.type === "Constant" && derivative4.value === 0)
      return void 0;
    const quotient = fold({
      type: "BinaryOperator",
      name: "Divide",
      left: node,
      right: derivative4
    });
    const rewritten = fold(
      replacePowers(replaceSubtree(quotient, u, identifier(name)), u, name)
    );
    if (dependsOn(rewritten, variable))
      return void 0;
    return { u, name, integrand: rewritten, derivative: derivative4 };
  }
  function identifier(symbol) {
    return { type: "Identifier", symbol };
  }
  function replacePowers(node, u, name) {
    if (u.type !== "BinaryOperator" || u.name !== "Exponent")
      return node;
    const base2 = u.left;
    const step = u.right;
    const rewrite3 = (child) => {
      if (child.type !== "BinaryOperator" || child.name !== "Exponent" || !sameTree(child.left, base2)) {
        return child;
      }
      const ratio = constantValue(
        fold({
          type: "BinaryOperator",
          name: "Divide",
          left: child.right,
          right: step
        })
      );
      if (ratio === void 0 || !Number.isInteger(ratio) || ratio < 1)
        return child;
      return {
        type: "BinaryOperator",
        name: "Exponent",
        left: identifier(name),
        right: { type: "Constant", value: ratio }
      };
    };
    return mapTree(node, rewrite3);
  }
  function candidates(node, variable) {
    const found = [];
    visit(node, (child) => {
      if (sameTree(child, node))
        return;
      if (nodeCount(child) < MINIMUM_CANDIDATE_NODES)
        return;
      if (!dependsOn(child, variable))
        return;
      if (found.some((existing) => sameTree(existing, child)))
        return;
      found.push(child);
    });
    for (const child of [...found]) {
      for (const root2 of lowerPowers(child)) {
        if (!found.some((existing) => sameTree(existing, root2)))
          found.push(root2);
      }
    }
    found.sort((a, b) => nodeCount(b) - nodeCount(a));
    return found.slice(0, MAX_CANDIDATES);
  }
  function lowerPowers(node) {
    if (node.type !== "BinaryOperator" || node.name !== "Exponent")
      return [];
    const exponent2 = fold(node.right);
    const whole = constantValue(exponent2);
    const out = [];
    const raise2 = (to) => ({
      type: "BinaryOperator",
      name: "Exponent",
      left: node.left,
      right: to
    });
    if (whole !== void 0 && Number.isInteger(whole) && whole >= 2) {
      for (let d = 1; d < whole; d += 1) {
        if (whole % d === 0)
          out.push(d === 1 ? node.left : raise2(number2(d)));
      }
      return out;
    }
    if (exponent2.type === "BinaryOperator" && (exponent2.name === "Multiply" || exponent2.name === "CrossMultiply")) {
      const factor = constantValue(exponent2.left);
      if (factor !== void 0 && Number.isInteger(factor) && factor >= 2) {
        for (let d = 1; d < factor; d += 1) {
          if (factor % d !== 0)
            continue;
          out.push(
            raise2(
              d === 1 ? exponent2.right : {
                type: "BinaryOperator",
                name: "Multiply",
                left: number2(d),
                right: exponent2.right
              }
            )
          );
        }
      }
    }
    return out;
  }
  function withArg(name, argument) {
    return { type: "FunctionCall", callee: identifier(name), args: [argument] };
  }
  function asSinesAndCosines(node, variable) {
    let rewrote = false;
    const rewrite3 = (child) => {
      if (child.type !== "FunctionCall" || child.args.length !== 1)
        return child;
      const [argument] = child.args;
      if (!dependsOn(argument, variable))
        return child;
      const sin2 = withArg("sin", argument);
      const cos2 = withArg("cos", argument);
      switch (child.callee.symbol) {
        case "tan":
          rewrote = true;
          return divide4(sin2, cos2);
        case "cot":
          rewrote = true;
          return divide4(cos2, sin2);
        case "sec":
          rewrote = true;
          return divide4(one(), cos2);
        case "csc":
          rewrote = true;
          return divide4(one(), sin2);
        default:
          return child;
      }
    };
    const rewritten = mapTree(node, rewrite3);
    return rewrote ? rewritten : void 0;
  }
  function one() {
    return { type: "Constant", value: 1 };
  }
  function divide4(left, right) {
    return { type: "BinaryOperator", name: "Divide", left, right };
  }
  function mapTree(node, on) {
    const rebuilt = node.type === "Negative" ? { ...node, arg: mapTree(node.arg, on) } : node.type === "FunctionCall" ? { ...node, args: node.args.map((arg) => mapTree(arg, on)) } : node.type === "BinaryOperator" ? {
      ...node,
      left: mapTree(node.left, on),
      right: mapTree(node.right, on)
    } : node;
    return on(rebuilt);
  }
  function findLogSubstitution(node, variable) {
    const logs = [];
    visit(node, (child) => {
      if (child.type !== "FunctionCall" || child.args.length !== 1)
        return;
      if (child.callee.symbol !== "ln")
        return;
      if (!dependsOn(child.args[0], variable))
        return;
      if (logs.some((existing) => sameTree(existing, child)))
        return;
      logs.push(child);
    });
    if (logs.length !== 1)
      return void 0;
    const [logarithm3] = logs;
    const [inside] = logarithm3.args;
    const linear2 = linearIn(inside, variable);
    if (linear2 === void 0)
      return void 0;
    const slope = constantValue(fold(linear2.a));
    const intercept = constantValue(fold(linear2.b));
    if (slope === void 0 || slope === 0 || intercept === void 0)
      return void 0;
    const name = freshName(node, ["u", "w", "s", "v"]);
    const u = identifier(name);
    const exponential3 = {
      type: "BinaryOperator",
      name: "Exponent",
      left: identifier("e"),
      right: u
    };
    const inverse = divideNodes(
      {
        type: "BinaryOperator",
        name: "Subtract",
        left: exponential3,
        right: numberNode(intercept)
      },
      numberNode(slope)
    );
    const jacobian = divideNodes(exponential3, numberNode(slope));
    const withoutLog = replaceSubtree(node, logarithm3, u);
    const rewritten = replaceIdentifier(withoutLog, variable, inverse);
    if (dependsOn(rewritten, variable))
      return void 0;
    return {
      integrand: fold(multiply(rewritten, jacobian)),
      name,
      back: (answer) => fold(replaceIdentifier(answer, name, logarithm3))
    };
  }
  function numberNode(value) {
    return { type: "Constant", value };
  }
  function divideNodes(left, right) {
    return { type: "BinaryOperator", name: "Divide", left, right };
  }

  // src/plugins/physics-lab/symbolic/weierstrass.ts
  var TRIGONOMETRIC = /* @__PURE__ */ new Set(["sin", "cos", "tan", "cot", "sec", "csc"]);
  function findHalfAngleSubstitution(node, variable) {
    const calls = trigCalls(node, variable);
    if (calls.length === 0)
      return void 0;
    const [first] = calls;
    const [angle] = first.args;
    if (!calls.every((call4) => sameTree(call4.args[0], angle)))
      return void 0;
    const linear2 = linearIn(angle, variable);
    if (linear2 === void 0)
      return void 0;
    const slope = constantValue(fold(linear2.a));
    if (slope === void 0 || slope === 0)
      return void 0;
    const name = freshName(node, ["t", "w", "s", "u"]);
    const t = id3(name);
    const squared = power2(t, number2(2));
    const onePlus = add(number2(1), squared);
    const sine2 = divide(multiply(number2(2), t), onePlus);
    const cosine2 = divide(subtract(number2(1), squared), onePlus);
    const table3 = {
      sin: sine2,
      cos: cosine2,
      tan: divide(sine2, cosine2),
      cot: divide(cosine2, sine2),
      sec: divide(number2(1), cosine2),
      csc: divide(number2(1), sine2)
    };
    let rewritten = node;
    for (const call4 of calls) {
      const replacement = table3[call4.callee.symbol];
      if (replacement === void 0)
        return void 0;
      rewritten = replaceSubtree(rewritten, call4, replacement);
    }
    if (dependsOn(rewritten, variable))
      return void 0;
    const jacobian = divide(number2(2), multiply(number2(slope), onePlus));
    const ratio = asRatio(multiply(rewritten, jacobian));
    const factored = fold(divide(ratio.numerator, ratio.denominator));
    const opened2 = fold(
      divide(
        fold(expand(ratio.numerator).node),
        fold(expand(ratio.denominator).node)
      )
    );
    return {
      integrands: sameTree(factored, opened2) ? [factored] : [factored, opened2],
      name,
      back: (answer) => fold(
        replaceSubtree(answer, t, {
          type: "FunctionCall",
          callee: id3("tan"),
          args: [divide(angle, number2(2))]
        })
      )
    };
  }
  function trigCalls(node, variable) {
    const found = [];
    visit(node, (child) => {
      if (child.type !== "FunctionCall" || child.args.length !== 1)
        return;
      if (!TRIGONOMETRIC.has(child.callee.symbol))
        return;
      if (!dependsOn(child.args[0], variable))
        return;
      if (found.some((existing) => sameTree(existing, child)))
        return;
      found.push(child);
    });
    return found;
  }

  // src/plugins/physics-lab/symbolic/expSubstitution.ts
  var HYPERBOLIC = ["sinh", "cosh", "tanh", "coth", "sech", "csch"];
  function hyperbolicAsExponentials(node, variable) {
    let rewrote = false;
    const walk = (n) => {
      switch (n.type) {
        case "Negative":
          return { ...n, arg: walk(n.arg) };
        case "BinaryOperator":
          return { ...n, left: walk(n.left), right: walk(n.right) };
        case "FunctionCall": {
          const args = n.args.map(walk);
          const name = n.callee.symbol;
          if (args.length !== 1 || !HYPERBOLIC.includes(name) || !dependsOn(args[0], variable))
            return { ...n, args };
          rewrote = true;
          const [u] = args;
          const up = power2(id3("e"), u);
          const down = power2(id3("e"), multiply(number2(-1), u));
          const sum3 = add(up, down);
          const difference = subtract(up, down);
          switch (name) {
            case "sinh":
              return divide(difference, number2(2));
            case "cosh":
              return divide(sum3, number2(2));
            case "tanh":
              return divide(difference, sum3);
            case "coth":
              return divide(sum3, difference);
            case "sech":
              return divide(number2(2), sum3);
            default:
              return divide(number2(2), difference);
          }
        }
        default:
          return n;
      }
    };
    const rewritten = walk(node);
    return rewrote ? fold(rewritten) : void 0;
  }
  function gcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0)
      [x, y] = [y, x % y];
    return x;
  }
  function findExpSubstitution(node, variable) {
    const slopes = [];
    let base2;
    let usable = true;
    visit(node, (child) => {
      if (child.type !== "BinaryOperator" || child.name !== "Exponent" || dependsOn(child.left, variable) || !dependsOn(child.right, variable))
        return;
      if (base2 !== void 0 && !sameTree(base2, child.left))
        usable = false;
      base2 ??= child.left;
      const linear2 = linearIn(child.right, variable);
      const slope = linear2 && rationalOf(fold(linear2.a));
      if (slope === void 0 || slope.n === 0)
        usable = false;
      else
        slopes.push(slope);
    });
    if (!usable || slopes.length === 0 || base2 === void 0)
      return void 0;
    const e = base2.type === "Identifier" && base2.symbol === "e";
    if (!e && !(Number(rationalOf(base2)?.n) > 0))
      return void 0;
    const numerator = slopes.reduce((g, s) => gcd(g, s.n), 0);
    const denominator = slopes.reduce((l, s) => l * s.d / gcd(l, s.d), 1);
    const k = { n: numerator, d: denominator };
    const name = freshName(node, ["u", "w", "s", "v"]);
    const u = id3(name);
    const walk = (n) => {
      if (n.type === "BinaryOperator" && n.name === "Exponent" && !dependsOn(n.left, variable) && dependsOn(n.right, variable)) {
        const linear2 = linearIn(n.right, variable);
        const slope = linear2 && rationalOf(fold(linear2.a));
        if (linear2 === void 0 || slope === void 0)
          return n;
        const ratio2 = { n: slope.n * k.d, d: slope.d * k.n };
        const g = gcd(ratio2.n, ratio2.d);
        const exponent2 = rationalNode({ n: ratio2.n / g, d: ratio2.d / g });
        return multiply(power2(n.left, linear2.b), power2(u, exponent2));
      }
      switch (n.type) {
        case "Negative":
          return { ...n, arg: walk(n.arg) };
        case "BinaryOperator":
          return { ...n, left: walk(n.left), right: walk(n.right) };
        case "FunctionCall":
          return { ...n, args: n.args.map(walk) };
        default:
          return n;
      }
    };
    const rewritten = walk(node);
    if (dependsOn(rewritten, variable))
      return void 0;
    const kNode = rationalNode(k);
    const scale = e ? kNode : multiply(kNode, call("ln", base2));
    const back = power2(base2, multiply(kNode, id3(variable)));
    const ratio = asRatio(divide(rewritten, multiply(scale, u)));
    const factored = fold(divide(ratio.numerator, ratio.denominator));
    const opened2 = fold(
      divide(
        fold(tidySums(fold(expand(ratio.numerator).node))),
        fold(tidySums(fold(expand(ratio.denominator).node)))
      )
    );
    return {
      integrands: sameTree(factored, opened2) ? [factored] : [factored, opened2],
      name,
      back: (answer) => fold(replaceIdentifier(answer, name, fold(back)))
    };
  }

  // src/plugins/physics-lab/symbolic/trigProducts.ts
  var AS_POWERS = {
    sin: { p: 1, q: 0 },
    cos: { p: 0, q: 1 },
    tan: { p: 1, q: -1 },
    cot: { p: -1, q: 1 },
    sec: { p: 0, q: -1 },
    csc: { p: -1, q: 0 }
  };
  var MAX_POWER2 = 10;
  function trigRewrite(node, variable) {
    const parsed = readSinCosPowers(node, variable);
    if (parsed === void 0)
      return productToSum(node, variable);
    const { coefficient, rest, argument, p, q } = parsed;
    if (p === 0 && q === 0)
      return void 0;
    if (Math.abs(p) > MAX_POWER2 || Math.abs(q) > MAX_POWER2)
      return void 0;
    const sin2 = call("sin", argument);
    const cos2 = call("cos", argument);
    const tan2 = call("tan", argument);
    const sec = call("sec", argument);
    const csc = call("csc", argument);
    const cot = call("cot", argument);
    const scaled2 = (inner) => fold(multiply(multiply(coefficient, rest), inner));
    const one2 = number2(1);
    if (p === 1 && q === 1) {
      return scaled2(
        divide(call("sin", multiply(number2(2), argument)), number2(2))
      );
    }
    if (q === -p && p >= 2) {
      return scaled2(
        subtract(
          multiply(power2(tan2, number2(p - 2)), power2(sec, number2(2))),
          power2(tan2, number2(p - 2))
        )
      );
    }
    if (p === -q && q >= 2) {
      return scaled2(
        subtract(
          multiply(power2(cot, number2(q - 2)), power2(csc, number2(2))),
          power2(cot, number2(q - 2))
        )
      );
    }
    if (p > 0 && p % 2 === 1) {
      return scaled2(
        multiply(
          multiply(
            power2(subtract(one2, power2(cos2, number2(2))), number2((p - 1) / 2)),
            power2(cos2, number2(q))
          ),
          sin2
        )
      );
    }
    if (q > 0 && q % 2 === 1) {
      return scaled2(
        multiply(
          multiply(
            power2(subtract(one2, power2(sin2, number2(2))), number2((q - 1) / 2)),
            power2(sin2, number2(p))
          ),
          cos2
        )
      );
    }
    if (p >= 0 && p % 2 === 0 && p + q <= -2 && (p + q) % 2 === 0) {
      const spare = (-(p + q) - 2) / 2;
      return scaled2(
        multiply(
          multiply(
            power2(tan2, number2(p)),
            power2(add(one2, power2(tan2, number2(2))), number2(spare))
          ),
          power2(sec, number2(2))
        )
      );
    }
    if (q >= 0 && q % 2 === 0 && p + q <= -2 && (p + q) % 2 === 0) {
      const spare = (-(p + q) - 2) / 2;
      return scaled2(
        multiply(
          multiply(
            power2(cot, number2(q)),
            power2(add(one2, power2(cot, number2(2))), number2(spare))
          ),
          power2(csc, number2(2))
        )
      );
    }
    if (p > 0 && p % 2 === 0 && q < 0 && Math.abs(q % 2) === 1) {
      return scaled2(binomialInReciprocal(p / 2, -q, sec));
    }
    if (q > 0 && q % 2 === 0 && p < 0 && Math.abs(p % 2) === 1) {
      return scaled2(binomialInReciprocal(q / 2, -p, csc));
    }
    if (p >= 0 && q >= 0 && p % 2 === 0 && q % 2 === 0 && p + q >= 2) {
      const doubled = call("cos", multiply(number2(2), argument));
      const sinSquared = divide(subtract(one2, doubled), number2(2));
      const cosSquared = divide(add(one2, doubled), number2(2));
      return scaled2(
        multiply(
          power2(sinSquared, number2(p / 2)),
          power2(cosSquared, number2(q / 2))
        )
      );
    }
    return void 0;
  }
  function trigReduction(node, variable) {
    const parsed = readSinCosPowers(node, variable);
    if (parsed === void 0)
      return void 0;
    const { coefficient, rest, argument, p, q } = parsed;
    if (dependsOn(rest, variable))
      return void 0;
    const secant = p === 0 && q <= -3 && Math.abs(q) % 2 === 1;
    const cosecant = q === 0 && p <= -3 && Math.abs(p) % 2 === 1;
    if (!secant && !cosecant)
      return void 0;
    const n = secant ? -q : -p;
    if (n > MAX_POWER2)
      return void 0;
    const linear2 = linearIn(argument, variable);
    if (linear2 === void 0)
      return void 0;
    const slope = fold(linear2.a);
    if (constantValue(slope) === 0)
      return void 0;
    const scale = fold(multiply(coefficient, rest));
    const name = secant ? "sec" : "csc";
    const lowered = power2(call(name, argument), number2(n - 2));
    const partner = call(secant ? "tan" : "cot", argument);
    const stepped = divide(
      multiply(multiply(scale, lowered), partner),
      multiply(number2(n - 1), slope)
    );
    return {
      finished: fold(secant ? stepped : { type: "Negative", arg: stepped }),
      remaining: fold(
        multiply(divide(multiply(scale, number2(n - 2)), number2(n - 1)), lowered)
      )
    };
  }
  function binomialInReciprocal(k, m, reciprocal) {
    let total;
    let coefficient = 1;
    for (let j = 0; j <= k; j += 1) {
      const term2 = multiply(
        number2(Math.abs(coefficient)),
        power2(reciprocal, number2(m - 2 * j))
      );
      const signed = j % 2 === 0 ? term2 : { type: "Negative", arg: term2 };
      total = total === void 0 ? signed : add(total, signed);
      coefficient = coefficient * (k - j) / (j + 1);
    }
    return total ?? number2(1);
  }
  function readSinCosPowers(node, variable) {
    const factors = [];
    quotientFactors(node, true, factors);
    let coefficient = number2(1);
    let rest = number2(1);
    let argument;
    let p = 0;
    let q = 0;
    let found = false;
    for (const { node: factor, inNumerator } of factors) {
      if (!dependsOn(factor, variable)) {
        coefficient = inNumerator ? multiply(coefficient, factor) : divide(coefficient, factor);
        continue;
      }
      const isPower = factor.type === "BinaryOperator" && factor.name === "Exponent";
      const base2 = isPower ? factor.left : factor;
      const rawExponent = isPower ? constantValue(fold(factor.right)) : 1;
      const isCall2 = base2.type === "FunctionCall" && base2.args.length === 1;
      const spelling = isCall2 ? AS_POWERS[base2.callee.symbol] : void 0;
      if (!isCall2 || spelling === void 0 || rawExponent === void 0 || !Number.isInteger(rawExponent)) {
        rest = inNumerator ? multiply(rest, factor) : divide(rest, factor);
        continue;
      }
      const [inside] = base2.args;
      if (argument === void 0)
        argument = inside;
      else if (!sameTree(argument, inside))
        return void 0;
      const exponent2 = (inNumerator ? 1 : -1) * rawExponent;
      p += spelling.p * exponent2;
      q += spelling.q * exponent2;
      found = true;
    }
    if (!found || argument === void 0)
      return void 0;
    return { coefficient: fold(coefficient), rest: fold(rest), argument, p, q };
  }
  function productToSum(node, variable) {
    if (node.type !== "BinaryOperator" || node.name !== "Multiply" && node.name !== "CrossMultiply") {
      return void 0;
    }
    const first = asWave(node.left, variable);
    const second = asWave(node.right, variable);
    if (first === void 0 || second === void 0)
      return void 0;
    if (sameTree(first.argument, second.argument))
      return void 0;
    const sum3 = fold(add(first.argument, second.argument));
    const difference = fold(subtract(first.argument, second.argument));
    if (!dependsOn(sum3, variable) || !dependsOn(difference, variable))
      return void 0;
    const half = (inner) => divide(inner, number2(2));
    if (first.name === "sin" && second.name === "cos") {
      return half(add(call("sin", sum3), call("sin", difference)));
    }
    if (first.name === "cos" && second.name === "sin") {
      return half(subtract(call("sin", sum3), call("sin", difference)));
    }
    if (first.name === "sin" && second.name === "sin") {
      return half(subtract(call("cos", difference), call("cos", sum3)));
    }
    return half(add(call("cos", difference), call("cos", sum3)));
  }
  function asWave(node, variable) {
    if (node.type !== "FunctionCall" || node.args.length !== 1)
      return void 0;
    const name = node.callee.symbol;
    if (name !== "sin" && name !== "cos")
      return void 0;
    const [argument] = node.args;
    return dependsOn(argument, variable) ? { name, argument } : void 0;
  }

  // src/plugins/physics-lab/symbolic/rationalIntegral.ts
  function numericCoefficients(node, variable, maxDegree) {
    const symbolic = coefficientsIn(node, variable, maxDegree);
    if (symbolic === void 0)
      return void 0;
    const values = [];
    for (const coefficient of symbolic) {
      const value = constantValue(fold(coefficient));
      if (value === void 0 || !Number.isFinite(value))
        return void 0;
      values.push(value);
    }
    while (values.length > 1 && values[values.length - 1] === 0)
      values.pop();
    return values;
  }
  function exactNumber(value) {
    if (Number.isInteger(value))
      return number2(value);
    let denominator = 1;
    for (; denominator <= 1e4; denominator += 1) {
      const scaled2 = value * denominator;
      if (Math.abs(scaled2 - Math.round(scaled2)) < 1e-9)
        return divide(number2(Math.round(scaled2)), number2(denominator));
    }
    return number2(value);
  }
  function polynomialOf(coefficients, variable) {
    let result = number2(0);
    for (let degree3 = 0; degree3 < coefficients.length; degree3 += 1) {
      const coefficient = coefficients[degree3];
      if (coefficient === 0)
        continue;
      const term2 = degree3 === 0 ? exactNumber(coefficient) : multiply(
        exactNumber(coefficient),
        degree3 === 1 ? id3(variable) : power2(id3(variable), number2(degree3))
      );
      result = add(result, term2);
    }
    return fold(result);
  }
  function dividePolynomials(numerator, denominator) {
    const remainder = [...numerator];
    const degree3 = denominator.length - 1;
    const leading = denominator[degree3];
    const quotient = new Array(
      Math.max(0, remainder.length - degree3)
    ).fill(0);
    for (let i = remainder.length - 1; i >= degree3; i -= 1) {
      const factor = remainder[i] / leading;
      if (factor === 0)
        continue;
      quotient[i - degree3] = factor;
      for (let j = 0; j <= degree3; j += 1) {
        remainder[i - degree3 + j] -= factor * denominator[j];
      }
    }
    while (remainder.length > 1 && Math.abs(remainder[remainder.length - 1]) < 1e-12)
      remainder.pop();
    return { quotient, remainder };
  }
  function rationalIntegral(numerator, denominator, variable, recurse) {
    const bottom = numericCoefficients(denominator, variable, 2);
    if (bottom === void 0 || bottom.length < 2)
      return void 0;
    const top = numericCoefficients(numerator, variable, 8);
    if (top === void 0)
      return void 0;
    if (top.length >= bottom.length) {
      const { quotient, remainder } = dividePolynomials(top, bottom);
      const whole = recurse(polynomialOf(quotient, variable));
      const isZero4 = remainder.every((value) => value === 0);
      if (isZero4)
        return whole;
      const rest = properIntegral(remainder, bottom, denominator, variable);
      if (rest === void 0)
        return void 0;
      return add(whole, rest);
    }
    return properIntegral(top, bottom, denominator, variable);
  }
  function properIntegral(top, bottom, written, variable) {
    if (bottom.length === 2) {
      const [, a2] = bottom;
      const c2 = top[0] ?? 0;
      if (c2 === 0)
        return number2(0);
      return divide(
        multiply(exactNumber(c2), call("ln", call("abs", written))),
        exactNumber(a2)
      );
    }
    const [c, b, a] = bottom;
    const q = top[0] ?? 0;
    const p = top[1] ?? 0;
    const base2 = baseQuadraticIntegral(a, b, b * b - 4 * a * c, variable);
    if (base2 === void 0)
      return void 0;
    const logarithmic = p === 0 ? void 0 : multiply(
      divide(exactNumber(p), exactNumber(2 * a)),
      call("ln", call("abs", written))
    );
    const constantPart = q * 2 * a === p * b ? void 0 : multiply(
      subtract(
        exactNumber(q),
        divide(exactNumber(p * b), exactNumber(2 * a))
      ),
      base2
    );
    if (logarithmic === void 0 && constantPart === void 0)
      return number2(0);
    if (logarithmic === void 0)
      return constantPart;
    if (constantPart === void 0)
      return logarithmic;
    return add(logarithmic, constantPart);
  }
  function baseQuadraticIntegral(a, b, discriminant, variable) {
    if (a === 0)
      return void 0;
    const shifted = add(id3(variable), divide(exactNumber(b), exactNumber(2 * a)));
    if (discriminant === 0) {
      return negative2(divide(number2(1), multiply(exactNumber(a), shifted)));
    }
    const spread = divide(
      call("sqrt", exactNumber(Math.abs(discriminant))),
      exactNumber(2 * a)
    );
    if (discriminant < 0) {
      return divide(
        call("arctan", divide(shifted, spread)),
        multiply(exactNumber(a), spread)
      );
    }
    return divide(
      call(
        "ln",
        call("abs", divide(subtract(shifted, spread), add(shifted, spread)))
      ),
      multiply(exactNumber(2 * a), spread)
    );
  }

  // src/plugins/physics-lab/symbolic/rational.ts
  function gcd2(a, b) {
    let x = a < 0n ? -a : a;
    let y = b < 0n ? -b : b;
    while (y !== 0n)
      [x, y] = [y, x % y];
    return x;
  }
  function rational(n, d = 1n) {
    if (d === 0n)
      throw new Error("A rational cannot have a zero denominator.");
    if (d < 0n)
      [n, d] = [-n, -d];
    const g = gcd2(n, d);
    return g === 0n ? { n: 0n, d: 1n } : { n: n / g, d: d / g };
  }
  var ZERO = rational(0n);
  var ONE = rational(1n);
  var isZero = (q) => q.n === 0n;
  var isOne = (q) => q.n === 1n && q.d === 1n;
  var isInteger = (q) => q.d === 1n;
  var isNegative = (q) => q.n < 0n;
  var add4 = (a, b) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
  var subtract3 = (a, b) => rational(a.n * b.d - b.n * a.d, a.d * b.d);
  var multiply3 = (a, b) => rational(a.n * b.n, a.d * b.d);
  var negate = (a) => ({ n: -a.n, d: a.d });
  function divide5(a, b) {
    if (isZero(b))
      throw new Error("Division by zero.");
    return rational(a.n * b.d, a.d * b.n);
  }
  function floorSplit(q) {
    let whole = q.n / q.d;
    if (q.n < 0n && whole * q.d !== q.n)
      whole -= 1n;
    return { whole, frac: subtract3(q, rational(whole)) };
  }
  function pow2(base2, exponent2) {
    if (exponent2 < 0n)
      return pow2(divide5(ONE, base2), -exponent2);
    let result = ONE;
    let acc = base2;
    for (let e = exponent2; e > 0n; e >>= 1n) {
      if (e & 1n)
        result = multiply3(result, acc);
      acc = multiply3(acc, acc);
    }
    return result;
  }
  var equals = (a, b) => a.n === b.n && a.d === b.d;
  var compare = (a, b) => {
    const left = a.n * b.d;
    const right = b.n * a.d;
    return left < right ? -1 : left > right ? 1 : 0;
  };
  var toNumber = (q) => Number(q.n) / Number(q.d);
  function fromNumber(value) {
    if (!Number.isFinite(value))
      return void 0;
    if (Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER)
      return rational(BigInt(value));
    const text3 = String(value);
    const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text3);
    if (!match)
      return void 0;
    const [, sign3, whole, decimals = ""] = match;
    const scale = 10n ** BigInt(decimals.length);
    const magnitude = BigInt(whole) * scale + BigInt(decimals || "0");
    return rational(sign3 === "-" ? -magnitude : magnitude, scale);
  }
  function toLatex2(q) {
    if (isInteger(q))
      return String(q.n);
    const sign3 = q.n < 0n ? "-" : "";
    const magnitude = q.n < 0n ? -q.n : q.n;
    return `${sign3}\\frac{${magnitude}}{${q.d}}`;
  }

  // src/plugins/physics-lab/symbolic/field.ts
  var RATIONALS = {
    key: "Q",
    zero: ZERO,
    one: ONE,
    of: (value) => value,
    add: add4,
    subtract: subtract3,
    multiply: multiply3,
    divide: divide5,
    negate,
    isZero,
    equals,
    sign: (a) => a.n < 0n ? -1 : a.n > 0n ? 1 : 0,
    sqrt: exactSquareRoot,
    asRational: (a) => a,
    toNode: rationalNode2,
    toNumber
  };
  function rationalNode2(value) {
    const magnitude = value.n < 0n ? -value.n : value.n;
    const body = value.d === 1n ? number2(Number(magnitude)) : divide(number2(Number(magnitude)), number2(Number(value.d)));
    return value.n < 0n ? negative2(body) : body;
  }
  function exactSquareRoot(value) {
    if (isNegative(value))
      return void 0;
    const n = integerSquareRoot(value.n);
    const d = integerSquareRoot(value.d);
    if (n === void 0 || d === void 0)
      return void 0;
    return rational(n, d);
  }
  function integerSquareRoot(value) {
    if (value < 0n)
      return void 0;
    if (value < 2n)
      return value;
    let low = 1n;
    let high = value;
    while (low <= high) {
      const middle = (low + high) / 2n;
      const square4 = middle * middle;
      if (square4 === value)
        return middle;
      if (square4 < value)
        low = middle + 1n;
      else
        high = middle - 1n;
    }
    return void 0;
  }
  var SQUAREFREE_LIMIT = 10n ** 12n;
  function surd(value) {
    if (!(value.n > 0n))
      return void 0;
    const radicand = value.n * value.d;
    if (radicand > SQUAREFREE_LIMIT)
      return void 0;
    let inside = radicand;
    let outside = 1n;
    for (let p = 2n; p * p <= inside; p += 1n) {
      while (inside % (p * p) === 0n) {
        inside /= p * p;
        outside *= p;
      }
    }
    return { outside: rational(outside, value.d), inside };
  }
  function scaledRoot(coefficient, inside) {
    if (inside === 1n)
      return rationalNode2(coefficient);
    const root2 = call("sqrt", number2(Number(inside)));
    const magnitude = coefficient.n < 0n ? -coefficient.n : coefficient.n;
    const top = magnitude === 1n ? root2 : multiply(number2(Number(magnitude)), root2);
    const body = coefficient.d === 1n ? top : divide(top, number2(Number(coefficient.d)));
    return coefficient.n < 0n ? negative2(body) : body;
  }
  function quadraticField(d) {
    if (d < 2n)
      throw new Error("A quadratic field needs a squarefree d > 1.");
    const D = rational(d);
    const make = (a, b) => ({ a, b });
    const zero = make(ZERO, ZERO);
    const one2 = make(ONE, ZERO);
    const isZero4 = (x) => isZero(x.a) && isZero(x.b);
    const qSign = (q) => q.n < 0n ? -1 : q.n > 0n ? 1 : 0;
    const sign3 = (x) => {
      const sa = qSign(x.a);
      const sb = qSign(x.b);
      if (sb === 0)
        return sa;
      if (sa === 0 || sa === sb)
        return sb;
      const compare2 = compare(
        multiply3(x.a, x.a),
        multiply3(D, multiply3(x.b, x.b))
      );
      return compare2 > 0 ? sa : sb;
    };
    const field = {
      key: `Q(sqrt ${d})`,
      zero,
      one: one2,
      of: (value) => make(value, ZERO),
      add: (x, y) => make(add4(x.a, y.a), add4(x.b, y.b)),
      subtract: (x, y) => make(subtract3(x.a, y.a), subtract3(x.b, y.b)),
      multiply: (x, y) => make(
        add4(multiply3(x.a, y.a), multiply3(D, multiply3(x.b, y.b))),
        add4(multiply3(x.a, y.b), multiply3(x.b, y.a))
      ),
      divide: (x, y) => {
        const norm = subtract3(
          multiply3(y.a, y.a),
          multiply3(D, multiply3(y.b, y.b))
        );
        const top = field.multiply(x, make(y.a, negate(y.b)));
        return make(divide5(top.a, norm), divide5(top.b, norm));
      },
      negate: (x) => make(negate(x.a), negate(x.b)),
      isZero: isZero4,
      equals: (x, y) => equals(x.a, y.a) && equals(x.b, y.b),
      sign: sign3,
      sqrt: (x) => {
        if (isZero4(x))
          return zero;
        if (sign3(x) < 0)
          return void 0;
        if (isZero(x.b)) {
          const plain = exactSquareRoot(x.a);
          if (plain !== void 0)
            return make(plain, ZERO);
          const over = exactSquareRoot(divide5(x.a, D));
          return over === void 0 ? void 0 : make(ZERO, over);
        }
        const disc = exactSquareRoot(
          subtract3(multiply3(x.a, x.a), multiply3(D, multiply3(x.b, x.b)))
        );
        if (disc === void 0)
          return void 0;
        const half = rational(1n, 2n);
        for (const P2 of [
          multiply3(half, add4(x.a, disc)),
          multiply3(half, subtract3(x.a, disc))
        ]) {
          const p = exactSquareRoot(P2);
          if (p === void 0 || isZero(p))
            continue;
          const root2 = make(p, divide5(x.b, multiply3(rational(2n), p)));
          if (!field.equals(field.multiply(root2, root2), x))
            continue;
          return sign3(root2) < 0 ? field.negate(root2) : root2;
        }
        return void 0;
      },
      asRational: (x) => isZero(x.b) ? x.a : void 0,
      toNode: (x) => {
        if (isZero(x.b))
          return rationalNode2(x.a);
        const irrational = scaledRoot(x.b, d);
        if (isZero(x.a))
          return irrational;
        return isNegative(x.b) ? subtract(rationalNode2(x.a), scaledRoot(negate(x.b), d)) : add(rationalNode2(x.a), irrational);
      },
      toNumber: (x) => toNumber(x.a) + toNumber(x.b) * Math.sqrt(Number(d))
    };
    return field;
  }

  // src/plugins/physics-lab/symbolic/factor.ts
  var KRONECKER_BUDGET = 2e5;
  var MAX_FACTOR_DEGREE = 8;
  function trim2(p) {
    const out = [...p];
    while (out.length > 1 && isZero(out[out.length - 1]))
      out.pop();
    return out.length === 0 ? [ZERO] : out;
  }
  var degree = (p) => trim2(p).length - 1;
  var isZero2 = (p) => trim2(p).every(isZero);
  function multiply4(a, b) {
    const out = new Array(a.length + b.length - 1).fill(ZERO);
    for (let i = 0; i < a.length; i += 1)
      for (let j = 0; j < b.length; j += 1)
        out[i + j] = add4(out[i + j], multiply3(a[i], b[j]));
    return trim2(out);
  }
  function divide6(a, b) {
    const remainder = [...trim2(a)];
    const divisor = trim2(b);
    const d = degree(divisor);
    const quotient = new Array(
      Math.max(1, remainder.length - d)
    ).fill(ZERO);
    for (let i = remainder.length - 1; i >= d; i -= 1) {
      if (isZero(remainder[i]))
        continue;
      const factor = divide5(remainder[i], divisor[d]);
      quotient[i - d] = factor;
      for (let j = 0; j <= d; j += 1)
        remainder[i - d + j] = subtract3(
          remainder[i - d + j],
          multiply3(factor, divisor[j])
        );
    }
    return { quotient: trim2(quotient), remainder: trim2(remainder) };
  }
  function monic(p) {
    const t = trim2(p);
    const lead = t[t.length - 1];
    return t.map((c) => divide5(c, lead));
  }
  function gcd3(a, b) {
    let x = trim2(a);
    let y = trim2(b);
    while (!isZero2(y))
      [x, y] = [y, divide6(x, y).remainder];
    return monic(x);
  }
  function derivative2(p) {
    const out = p.slice(1).map((c, i) => multiply3(c, rational(BigInt(i + 1))));
    return out.length === 0 ? [ZERO] : trim2(out);
  }
  var isOne2 = (p) => degree(p) === 0;
  function squarefree(f) {
    const F = monic(f);
    if (degree(F) < 1)
      return [];
    let c = gcd3(F, derivative2(F));
    let w = divide6(F, c).quotient;
    const out = [];
    for (let i = 1; !isOne2(w); i += 1) {
      const y = gcd3(w, c);
      const z = divide6(w, y).quotient;
      if (!isOne2(z))
        out.push([monic(z), i]);
      w = y;
      c = divide6(c, y).quotient;
    }
    return out;
  }
  function bigAbs(n) {
    return n < 0n ? -n : n;
  }
  function bigGcd(a, b) {
    let x = bigAbs(a);
    let y = bigAbs(b);
    while (y !== 0n)
      [x, y] = [y, x % y];
    return x;
  }
  function primitiveInteger(p) {
    let lcm2 = 1n;
    for (const c of p)
      lcm2 = lcm2 / bigGcd(lcm2, c.d) * c.d;
    const ints = p.map((c) => c.n * lcm2 / c.d);
    let content = 0n;
    for (const c of ints)
      content = bigGcd(content, c);
    if (content === 0n)
      content = 1n;
    const sign3 = ints[ints.length - 1] < 0n ? -1n : 1n;
    return ints.map((c) => sign3 * c / content);
  }
  function evaluateInt(p, x) {
    let total = 0n;
    for (let i = p.length - 1; i >= 0; i -= 1)
      total = total * x + p[i];
    return total;
  }
  function positiveDivisors(n) {
    const value = bigAbs(n);
    if (value > 10n ** 9n)
      return void 0;
    const out = [];
    for (let i = 1n; i * i <= value; i += 1n) {
      if (value % i === 0n) {
        out.push(i);
        if (i * i !== value)
          out.push(value / i);
      }
    }
    return out;
  }
  function interpolate(xs, ys) {
    let result = [ZERO];
    for (let i = 0; i < xs.length; i += 1) {
      let basis = [ONE];
      let denominator = ONE;
      for (let j = 0; j < xs.length; j += 1) {
        if (i === j)
          continue;
        basis = multiply4(basis, [rational(-xs[j]), ONE]);
        denominator = multiply3(denominator, rational(xs[i] - xs[j]));
      }
      const scale = divide5(rational(ys[i]), denominator);
      const term2 = basis.map((c) => multiply3(c, scale));
      const length = Math.max(result.length, term2.length);
      const sum3 = [];
      for (let k = 0; k < length; k += 1)
        sum3.push(add4(result[k] ?? ZERO, term2[k] ?? ZERO));
      result = trim2(sum3);
    }
    return result;
  }
  var Budget = class {
    constructor() {
      this.remaining = KRONECKER_BUDGET;
    }
    tick() {
      this.remaining -= 1;
      return this.remaining >= 0;
    }
  };
  function kronecker(f, budget) {
    const F = primitiveInteger(f);
    const n = F.length - 1;
    if (n <= 1)
      return [monic(f)];
    const candidates2 = [];
    for (let x = -12n; x <= 12n; x += 1n) {
      const value = evaluateInt(F, x);
      if (value !== 0n)
        candidates2.push({ x, value });
    }
    candidates2.sort((a, b) => bigAbs(a.value) < bigAbs(b.value) ? -1 : 1);
    for (let k = 1; k <= Math.floor(n / 2); k += 1) {
      const points = candidates2.slice(0, k + 1);
      if (points.length < k + 1)
        return void 0;
      const values = [];
      for (let i = 0; i < points.length; i += 1) {
        const divisors2 = positiveDivisors(points[i].value);
        if (divisors2 === void 0)
          return void 0;
        values.push(
          i === 0 ? divisors2 : [...divisors2, ...divisors2.map((d) => -d)]
        );
      }
      const xs = points.map((p) => p.x);
      const indices = new Array(k + 1).fill(0);
      for (; ; ) {
        if (!budget.tick())
          return void 0;
        const h = interpolate(
          xs,
          indices.map((index, i) => values[i][index])
        );
        if (degree(h) === k) {
          const { quotient, remainder } = divide6(f, h);
          if (isZero2(remainder)) {
            const left = kronecker(monic(h), budget);
            const right = kronecker(monic(quotient), budget);
            if (left === void 0 || right === void 0)
              return void 0;
            return [...left, ...right];
          }
        }
        let position = 0;
        while (position <= k) {
          indices[position] += 1;
          if (indices[position] < values[position].length)
            break;
          indices[position] = 0;
          position += 1;
        }
        if (position > k)
          break;
      }
    }
    return [monic(f)];
  }
  function factorOverQ(f) {
    if (degree(f) > MAX_FACTOR_DEGREE)
      return void 0;
    const budget = new Budget();
    const out = [];
    for (const [layer, multiplicity] of squarefree(f)) {
      const factors = kronecker(layer, budget);
      if (factors === void 0)
        return void 0;
      for (const factor of factors)
        for (let i = 0; i < multiplicity; i += 1)
          out.push(factor);
    }
    return out;
  }

  // src/plugins/physics-lab/symbolic/partialFractions.ts
  var COEFFICIENT_LIMIT = 10n ** 12n;
  var MAX_DEGREE = 8;
  function trim3(F, poly) {
    const out = [...poly];
    while (out.length > 1 && F.isZero(out[out.length - 1]))
      out.pop();
    return out.length === 0 ? [F.zero] : out;
  }
  var degreeOf2 = (F, poly) => trim3(F, poly).length - 1;
  var isZeroPoly = (F, poly) => trim3(F, poly).every((value) => F.isZero(value));
  function polyMultiply(F, a, b) {
    const out = new Array(a.length + b.length - 1).fill(F.zero);
    for (let i = 0; i < a.length; i += 1) {
      for (let j = 0; j < b.length; j += 1) {
        out[i + j] = F.add(out[i + j], F.multiply(a[i], b[j]));
      }
    }
    return trim3(F, out);
  }
  function polyDivide(F, a, b) {
    const remainder = [...trim3(F, a)];
    const divisor = trim3(F, b);
    const d = degreeOf2(F, divisor);
    const leading = divisor[d];
    const quotient = new Array(
      Math.max(1, remainder.length - d)
    ).fill(F.zero);
    for (let i = remainder.length - 1; i >= d; i -= 1) {
      if (F.isZero(remainder[i]))
        continue;
      const factor = F.divide(remainder[i], leading);
      quotient[i - d] = factor;
      for (let j = 0; j <= d; j += 1) {
        remainder[i - d + j] = F.subtract(
          remainder[i - d + j],
          F.multiply(factor, divisor[j])
        );
      }
    }
    return { quotient: trim3(F, quotient), remainder: trim3(F, remainder) };
  }
  function polyGcd(F, a, b) {
    let x = trim3(F, a);
    let y = trim3(F, b);
    while (!isZeroPoly(F, y))
      [x, y] = [y, polyDivide(F, x, y).remainder];
    const leading = x[degreeOf2(F, x)];
    return x.map((value) => F.divide(value, leading));
  }
  function evaluatePoly(F, poly, at2) {
    let total = F.zero;
    for (let i = poly.length - 1; i >= 0; i -= 1)
      total = F.add(F.multiply(total, at2), poly[i]);
    return total;
  }
  function shiftPoly(F, poly, shift) {
    let total = [F.zero];
    for (let i = poly.length - 1; i >= 0; i -= 1) {
      total = polyMultiply(F, total, [shift, F.one]);
      total[0] = F.add(total[0], poly[i]);
    }
    return trim3(F, total);
  }
  var lift = (F, poly) => poly.map((value) => F.of(value));
  function factorise(poly) {
    const F = RATIONALS;
    let current = trim3(F, poly);
    const degree3 = degreeOf2(F, current);
    if (degree3 < 1 || degree3 > MAX_DEGREE)
      return void 0;
    const leading = current[degree3];
    current = current.map((value) => divide5(value, leading));
    const roots = [];
    while (degreeOf2(F, current) > 2) {
      const root2 = rationalRoot(current);
      if (root2 === void 0)
        break;
      roots.push(root2);
      current = polyDivide(F, current, [negate(root2), ONE]).quotient;
    }
    const rest = degreeOf2(F, current);
    const irreducible = rest <= 2 ? [current] : factorOverQ(current);
    if (irreducible === void 0)
      return void 0;
    let field = RATIONALS;
    const rationalPairs = [];
    const fieldPairs = [];
    for (const factor of irreducible) {
      const d = degreeOf2(F, factor);
      if (d === 0)
        continue;
      if (d === 1) {
        roots.push(negate(divide5(factor[0], factor[1])));
        continue;
      }
      if (d === 2) {
        rationalPairs.push([factor[1], factor[0]]);
        continue;
      }
      if (d !== 4)
        return void 0;
      const split4 = splitQuartic(factor);
      if (split4 === void 0)
        return void 0;
      if (split4.field.key !== "Q") {
        if (field.key !== "Q" && field.key !== split4.field.key)
          return void 0;
        ({ field } = split4);
      }
      fieldPairs.push(...split4.pairs);
    }
    const G = field;
    const pairs = [
      ...rationalPairs.map(
        ([b, c]) => [G.of(b), G.of(c)]
      ),
      ...fieldPairs.map(
        ([b, c]) => [liftInto(G, b), liftInto(G, c)]
      )
    ];
    return assemble(G, leading, roots, pairs, poly);
  }
  function liftInto(G, value) {
    const v = value;
    return typeof v.n === "bigint" && typeof v.d === "bigint" ? G.of(value) : value;
  }
  function assemble(F, leading, roots, pairs, original) {
    const factors = [];
    const addFactor = (factor) => {
      const existing = factors.find((other) => sameFactor(F, other, factor));
      if (existing === void 0)
        factors.push(factor);
      else
        existing.multiplicity += factor.multiplicity;
    };
    for (const root2 of roots)
      addFactor({ kind: "linear", root: F.of(root2), multiplicity: 1 });
    for (const [b, c] of pairs) {
      const discriminant = F.subtract(
        F.multiply(b, b),
        F.multiply(F.of(rational(4n)), c)
      );
      const root2 = F.sqrt(discriminant);
      if (root2 === void 0) {
        addFactor({ kind: "quadratic", b, c, multiplicity: 1 });
        continue;
      }
      const half = F.of(rational(1n, 2n));
      for (const signed of [F.negate(root2), root2]) {
        addFactor({
          kind: "linear",
          root: F.multiply(half, F.add(F.negate(b), signed)),
          multiplicity: 1
        });
      }
    }
    let product = [F.of(leading)];
    for (const factor of factors) {
      for (let i = 0; i < factor.multiplicity; i += 1)
        product = polyMultiply(F, product, factorPoly(F, factor));
    }
    const expected = lift(F, trim3(RATIONALS, original));
    if (product.length !== expected.length)
      return void 0;
    if (!product.every((value, i) => F.equals(value, expected[i])))
      return void 0;
    return {
      field: F,
      leading: F.of(leading),
      factors
    };
  }
  function factorPoly(F, factor) {
    return factor.kind === "linear" ? [F.negate(factor.root), F.one] : [factor.c, factor.b, F.one];
  }
  function sameFactor(F, a, b) {
    if (a.kind === "linear" && b.kind === "linear")
      return F.equals(a.root, b.root);
    if (a.kind === "quadratic" && b.kind === "quadratic")
      return F.equals(a.b, b.b) && F.equals(a.c, b.c);
    return false;
  }
  function splitQuartic(monic2) {
    const F = RATIONALS;
    const shift = divide5(monic2[3], rational(4n));
    const depressed = shiftPoly(F, monic2, negate(shift));
    const [s, r, q] = depressed;
    const resolvent = [
      negate(multiply3(r, r)),
      subtract3(multiply3(q, q), multiply3(rational(4n), s)),
      multiply3(rational(2n), q),
      ONE
    ];
    const candidates2 = allRationalRoots(resolvent);
    const ranked = [...candidates2].sort(
      (x, y) => rank(x, r, q, s) - rank(y, r, q, s)
    );
    for (const A of ranked) {
      const found = pairsFor(A, q, r, s);
      if (found === void 0)
        continue;
      const { field, pairs } = found;
      const G = field;
      const k = G.of(shift);
      const shifted = pairs.map(
        ([alpha, beta2]) => [
          G.add(alpha, G.multiply(G.of(rational(2n)), k)),
          G.add(G.add(beta2, G.multiply(alpha, k)), G.multiply(k, k))
        ]
      );
      return { field, pairs: shifted };
    }
    return void 0;
  }
  function rank(A, r, q, s) {
    if (isNegative(A))
      return 3;
    if (isZero(A)) {
      if (!isZero(r))
        return 3;
      const disc = subtract3(multiply3(q, q), multiply3(rational(4n), s));
      if (isNegative(disc))
        return 3;
      return RATIONALS.sqrt(disc) === void 0 ? 1 : 0;
    }
    return RATIONALS.sqrt(A) === void 0 ? 1 : 0;
  }
  function pairsFor(A, q, r, s) {
    if (isNegative(A))
      return void 0;
    const half = rational(1n, 2n);
    if (isZero(A)) {
      if (!isZero(r))
        return void 0;
      const disc = subtract3(multiply3(q, q), multiply3(rational(4n), s));
      if (isNegative(disc))
        return void 0;
      const root3 = rootIn(disc);
      if (root3 === void 0)
        return void 0;
      const G2 = root3.field;
      const qq = G2.of(q);
      const b2 = G2.multiply(G2.of(half), G2.subtract(qq, root3.value));
      const d2 = G2.multiply(G2.of(half), G2.add(qq, root3.value));
      return {
        field: G2,
        pairs: [
          [G2.zero, b2],
          [G2.zero, d2]
        ]
      };
    }
    const root2 = rootIn(A);
    if (root2 === void 0)
      return void 0;
    const G = root2.field;
    const a = root2.value;
    const base2 = G.of(add4(q, A));
    const skew = G.divide(G.of(r), a);
    const b = G.multiply(G.of(half), G.subtract(base2, skew));
    const d = G.multiply(G.of(half), G.add(base2, skew));
    return {
      field: G,
      pairs: [
        [a, b],
        [G.negate(a), d]
      ]
    };
  }
  function rootIn(value) {
    const plain = RATIONALS.sqrt(value);
    if (plain !== void 0)
      return { field: RATIONALS, value: plain };
    const found = surd(value);
    if (found === void 0)
      return void 0;
    const G = quadraticField(found.inside);
    return {
      field: G,
      value: { a: ZERO, b: found.outside }
    };
  }
  function allRationalRoots(poly) {
    const out = [];
    let current = trim3(RATIONALS, poly);
    while (degreeOf2(RATIONALS, current) >= 1) {
      if (degreeOf2(RATIONALS, current) === 1) {
        out.push(negate(divide5(current[0], current[1])));
        break;
      }
      if (degreeOf2(RATIONALS, current) === 2) {
        const [c, b, a] = current;
        const disc = subtract3(
          multiply3(b, b),
          multiply3(rational(4n), multiply3(a, c))
        );
        const root3 = RATIONALS.sqrt(disc);
        if (root3 !== void 0) {
          const twice2 = multiply3(rational(2n), a);
          out.push(divide5(subtract3(negate(b), root3), twice2));
          out.push(divide5(add4(negate(b), root3), twice2));
        }
        break;
      }
      const root2 = rationalRoot(current);
      if (root2 === void 0)
        break;
      out.push(root2);
      current = polyDivide(RATIONALS, current, [negate(root2), ONE]).quotient;
    }
    return out.filter(
      (value, index) => out.findIndex((other) => equals(other, value)) === index
    );
  }
  function rationalRoot(poly) {
    const cleared = clearDenominators(poly);
    if (cleared === void 0)
      return void 0;
    const degree3 = degreeOf2(RATIONALS, cleared);
    if (isZero(cleared[0]))
      return ZERO;
    const constant3 = cleared[0].n < 0n ? -cleared[0].n : cleared[0].n;
    const leading = cleared[degree3].n < 0n ? -cleared[degree3].n : cleared[degree3].n;
    for (const p of divisors(constant3)) {
      for (const q of divisors(leading)) {
        for (const sign3 of [1n, -1n]) {
          const candidate = rational(sign3 * p, q);
          if (isZero(evaluatePoly(RATIONALS, cleared, candidate)))
            return candidate;
        }
      }
    }
    return void 0;
  }
  function clearDenominators(poly) {
    let multiplier = 1n;
    for (const value of poly) {
      multiplier = lcm(multiplier, value.d);
      if (multiplier > COEFFICIENT_LIMIT)
        return void 0;
    }
    const out = poly.map((value) => multiply3(value, rational(multiplier)));
    for (const value of out) {
      if (value.n > COEFFICIENT_LIMIT || -value.n > COEFFICIENT_LIMIT)
        return void 0;
    }
    return out;
  }
  function lcm(a, b) {
    return a / gcd4(a, b) * b;
  }
  function gcd4(a, b) {
    let x = a < 0n ? -a : a;
    let y = b < 0n ? -b : b;
    while (y !== 0n)
      [x, y] = [y, x % y];
    return x;
  }
  function divisors(value) {
    if (value === 0n)
      return [1n];
    const out = [];
    for (let i = 1n; i * i <= value && i <= 100000n; i += 1n) {
      if (value % i === 0n) {
        out.push(i);
        if (i * i !== value)
          out.push(value / i);
      }
    }
    return out.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  }
  function decompose(F, numerator, factors, denominator) {
    const columns = [];
    for (const factor of factors) {
      const base2 = factorPoly(F, factor);
      for (let at2 = 1; at2 <= factor.multiplicity; at2 += 1) {
        let divisorPower = [F.one];
        for (let i = 0; i < at2; i += 1)
          divisorPower = polyMultiply(F, divisorPower, base2);
        const { quotient, remainder } = polyDivide(F, denominator, divisorPower);
        if (!isZeroPoly(F, remainder))
          return void 0;
        columns.push({ piece: { factor, at: at2 }, multiplier: quotient });
        if (factor.kind === "quadratic") {
          columns.push({
            piece: { factor, at: at2 },
            multiplier: polyMultiply(F, [F.zero, F.one], quotient)
          });
        }
      }
    }
    const size = degreeOf2(F, denominator);
    if (columns.length !== size)
      return void 0;
    const matrix = [];
    for (let row = 0; row < size; row += 1) {
      const line2 = [];
      for (const column3 of columns)
        line2.push(column3.multiplier[row] ?? F.zero);
      line2.push(numerator[row] ?? F.zero);
      matrix.push(line2);
    }
    const solution = solve(F, matrix, size);
    if (solution === void 0)
      return void 0;
    const pieces = [];
    columns.forEach((column3, index) => {
      const value = solution[index];
      const existing = pieces.find(
        (piece) => piece.factor === column3.piece.factor && piece.at === column3.piece.at
      );
      if (existing === void 0) {
        pieces.push({ ...column3.piece, numerator: [value] });
      } else {
        existing.numerator = [existing.numerator[0], value];
      }
    });
    return pieces;
  }
  function solve(F, matrix, size) {
    const rows = matrix.map((row) => [...row]);
    for (let column3 = 0; column3 < size; column3 += 1) {
      let pivot = -1;
      for (let row = column3; row < size; row += 1) {
        if (!F.isZero(rows[row][column3])) {
          pivot = row;
          break;
        }
      }
      if (pivot < 0)
        return void 0;
      [rows[column3], rows[pivot]] = [rows[pivot], rows[column3]];
      const leading = rows[column3][column3];
      for (let i = column3; i <= size; i += 1) {
        rows[column3][i] = F.divide(rows[column3][i], leading);
      }
      for (let row = 0; row < size; row += 1) {
        if (row === column3 || F.isZero(rows[row][column3]))
          continue;
        const factor = rows[row][column3];
        for (let i = column3; i <= size; i += 1) {
          rows[row][i] = F.subtract(
            rows[row][i],
            F.multiply(factor, rows[column3][i])
          );
        }
      }
    }
    return rows.map((row) => row[size]);
  }
  function partialFractionIntegral(numerator, denominator, variable) {
    const F = RATIONALS;
    let top = asPoly(numerator, variable);
    let bottom = asPoly(denominator, variable);
    if (top === void 0 || bottom === void 0)
      return void 0;
    if (degreeOf2(F, bottom) < 1)
      return void 0;
    const common = polyGcd(F, top, bottom);
    const cancelled = degreeOf2(F, common) > 0;
    if (cancelled) {
      top = polyDivide(F, top, common).quotient;
      bottom = polyDivide(F, bottom, common).quotient;
    }
    let whole;
    if (degreeOf2(F, top) >= degreeOf2(F, bottom)) {
      if (!cancelled && degreeOf2(F, bottom) <= 2)
        return void 0;
      const { quotient, remainder } = polyDivide(F, top, bottom);
      whole = integratePolynomial(quotient, variable);
      top = remainder;
    }
    if (isZeroPoly(F, top))
      return whole ?? number2(0);
    if (degreeOf2(F, bottom) < 1)
      return void 0;
    const factored = factorise(bottom);
    if (factored === void 0)
      return void 0;
    const rest = integrateFactored(factored, top, bottom, variable);
    if (rest === void 0)
      return void 0;
    return fold(whole === void 0 ? rest : add(whole, rest));
  }
  function integrateFactored(factored, top, bottom, variable) {
    const { field: F, leading } = factored;
    const monic2 = lift(F, bottom).map((value) => F.divide(value, leading));
    const scaled2 = lift(F, top).map((value) => F.divide(value, leading));
    const pieces = decompose(F, scaled2, factored.factors, monic2);
    if (pieces === void 0)
      return void 0;
    let total;
    for (const piece of pieces) {
      const term2 = integratePiece(F, piece, variable);
      if (term2 === void 0)
        return void 0;
      total = total === void 0 ? term2 : add(total, term2);
    }
    return total ?? number2(0);
  }
  function integratePolynomial(poly, variable) {
    let total = number2(0);
    poly.forEach((coefficient, k) => {
      if (isZero(coefficient))
        return;
      const raised2 = power2(id3(variable), number2(k + 1));
      total = add(
        total,
        multiply(
          rationalNode2(divide5(coefficient, rational(BigInt(k + 1)))),
          raised2
        )
      );
    });
    return total;
  }
  function linearNode(F, slope, intercept, variable) {
    const x = id3(variable);
    const scaled2 = F.equals(slope, F.one) ? x : multiply(F.toNode(slope), x);
    if (F.isZero(intercept))
      return scaled2;
    return F.sign(intercept) < 0 ? subtract(scaled2, F.toNode(F.negate(intercept))) : add(scaled2, F.toNode(intercept));
  }
  function quadraticNode(F, b, c, variable) {
    const x = id3(variable);
    const squared = power2(x, number2(2));
    const withLinear = F.isZero(b) ? squared : F.sign(b) < 0 ? subtract(squared, linearNode(F, F.negate(b), F.zero, variable)) : add(squared, linearNode(F, b, F.zero, variable));
    if (F.isZero(c))
      return withLinear;
    return F.sign(c) < 0 ? subtract(withLinear, F.toNode(F.negate(c))) : add(withLinear, F.toNode(c));
  }
  function scaledBy(F, coefficient, node) {
    if (F.equals(coefficient, F.one))
      return node;
    if (F.equals(coefficient, F.negate(F.one)))
      return negative2(node);
    return multiply(F.toNode(coefficient), node);
  }
  function integratePiece(F, piece, variable) {
    const x = id3(variable);
    if (piece.factor.kind === "linear") {
      const [coefficient] = piece.numerator;
      if (F.isZero(coefficient))
        return number2(0);
      const shifted = linearNode(F, F.one, F.negate(piece.factor.root), variable);
      if (piece.at === 1)
        return scaledBy(F, coefficient, call("ln", call("abs", shifted)));
      return negative2(
        divide(
          F.toNode(coefficient),
          multiply(number2(piece.at - 1), power2(shifted, number2(piece.at - 1)))
        )
      );
    }
    const { b, c } = piece.factor;
    const m = piece.at;
    const constantTerm = piece.numerator[0] ?? F.zero;
    const linearTerm = piece.numerator[1] ?? F.zero;
    const quadratic2 = quadraticNode(F, b, c, variable);
    const half = F.of(rational(1n, 2n));
    const h = F.multiply(half, b);
    const K = F.subtract(c, F.multiply(h, h));
    if (F.isZero(K))
      return void 0;
    const halfB = F.multiply(half, linearTerm);
    const logarithmic = F.isZero(linearTerm) ? void 0 : m === 1 ? scaledBy(F, halfB, call("ln", call("abs", quadratic2))) : negative2(
      divide(
        F.toNode(F.divide(halfB, F.of(rational(BigInt(m - 1))))),
        power2(quadratic2, number2(m - 1))
      )
    );
    const leftover = F.subtract(constantTerm, F.multiply(linearTerm, h));
    const rest = F.isZero(leftover) ? void 0 : reduction(F, m, leftover, h, K, quadratic2, variable);
    if (logarithmic === void 0 && rest === void 0)
      return number2(0);
    if (logarithmic === void 0)
      return rest;
    if (rest === void 0)
      return logarithmic;
    return add(logarithmic, rest);
  }
  function reduction(F, m, scale, h, K, quadratic2, variable) {
    if (m === 1)
      return quadraticBase(F, scale, h, K, variable);
    const steps = F.of(rational(BigInt(m - 1)));
    const denominator = F.multiply(F.multiply(F.of(rational(2n)), K), steps);
    const u = linearNode(F, F.one, h, variable);
    const algebraic = divide(
      scaledBy(F, F.divide(scale, denominator), u),
      power2(quadratic2, number2(m - 1))
    );
    const next = F.divide(
      F.multiply(scale, F.of(rational(BigInt(2 * m - 3)))),
      denominator
    );
    return add(algebraic, reduction(F, m - 1, next, h, K, quadratic2, variable));
  }
  function quadraticBase(F, scale, h, K, variable) {
    const positive3 = F.sign(K) > 0;
    const magnitude = positive3 ? K : F.negate(K);
    const two = F.of(rational(2n));
    const inside = F.sqrt(magnitude);
    if (inside !== void 0 && positive3 && F.asRational(inside) !== void 0) {
      const u2 = linearNode(F, F.one, h, variable);
      const over = F.equals(inside, F.one) ? u2 : divide(u2, F.toNode(inside));
      return scaledBy(F, F.divide(scale, inside), call("arctan", over));
    }
    if (inside !== void 0) {
      if (positive3) {
        const inverse = F.divide(F.one, inside);
        return scaledBy(
          F,
          F.multiply(scale, inverse),
          call("arctan", linearNode(F, inverse, F.multiply(h, inverse), variable))
        );
      }
      const over = linearNode(F, F.one, F.subtract(h, inside), variable);
      const under = linearNode(F, F.one, F.add(h, inside), variable);
      return scaledBy(
        F,
        F.divide(scale, F.multiply(two, inside)),
        call("ln", call("abs", divide(over, under)))
      );
    }
    const rational2 = F.asRational(magnitude);
    const written = rational2 === void 0 ? void 0 : surd(rational2);
    if (written !== void 0) {
      const o = F.of(written.outside);
      const root3 = call("sqrt", number2(Number(written.inside)));
      const u2 = linearNode(F, F.divide(F.one, o), F.divide(h, o), variable);
      if (positive3) {
        return divide(
          scaledBy(F, F.divide(scale, o), call("arctan", divide(u2, root3))),
          root3
        );
      }
      return divide(
        scaledBy(
          F,
          F.divide(scale, F.multiply(two, o)),
          call("ln", call("abs", divide(subtract(u2, root3), add(u2, root3))))
        ),
        root3
      );
    }
    const root2 = call("sqrt", F.toNode(magnitude));
    const u = linearNode(F, F.one, h, variable);
    if (positive3) {
      return divide(scaledBy(F, scale, call("arctan", divide(u, root2))), root2);
    }
    return divide(
      scaledBy(
        F,
        F.divide(scale, two),
        call("ln", call("abs", divide(subtract(u, root2), add(u, root2))))
      ),
      root2
    );
  }
  function asPoly(node, variable) {
    const symbolic = coefficientsIn(node, variable, MAX_DEGREE);
    if (symbolic === void 0)
      return void 0;
    const out = [];
    for (const coefficient of symbolic) {
      const value = constantValue(fold(coefficient));
      if (value === void 0)
        return void 0;
      const exact = fromNumber(value);
      if (exact === void 0)
        return void 0;
      out.push(exact);
    }
    return trim3(RATIONALS, out);
  }

  // src/plugins/physics-lab/symbolic/trigSubstitution.ts
  function findTrigSubstitution(node, variable) {
    node = asRootPowers(node);
    const form = firstForm(node, variable);
    if (form === void 0)
      return void 0;
    const name = freshName(node, ["\\theta", "t", "w"]);
    const angle = id3(name);
    const { scale, root: root2, kind } = form;
    const a = scale;
    const sin2 = call("sin", angle);
    const cos2 = call("cos", angle);
    const tan2 = call("tan", angle);
    const sec = call("sec", angle);
    const substitution2 = kind === "sine" ? { x: multiply(a, sin2), root: multiply(a, cos2), dx: multiply(a, cos2) } : kind === "tangent" ? {
      x: multiply(a, tan2),
      root: multiply(a, sec),
      dx: multiply(a, power2(sec, number2(2)))
    } : {
      x: multiply(a, sec),
      root: multiply(a, tan2),
      dx: multiply(a, multiply(sec, tan2))
    };
    const withoutRoot = replaceSubtree(node, root2, substitution2.root);
    const inAngle = replaceIdentifier(withoutRoot, variable, substitution2.x);
    const integrand = fold(
      powersOfProducts(fold(multiply(inAngle, substitution2.dx)))
    );
    return {
      integrand,
      name,
      back: (answer) => fold(backSubstitute(answer, name, variable, form))
    };
  }
  function powersOfProducts(node) {
    return mapTree2(node, (child) => {
      if (child.type !== "BinaryOperator" || child.name !== "Exponent")
        return child;
      const base2 = child.left;
      const exponent2 = constantValue(child.right);
      if (exponent2 === void 0 || !Number.isInteger(exponent2) || base2.type !== "BinaryOperator" || base2.name !== "Multiply" && base2.name !== "CrossMultiply") {
        return child;
      }
      return multiply(
        powersOfProducts(power2(base2.left, child.right)),
        powersOfProducts(power2(base2.right, child.right))
      );
    });
  }
  function asRootPowers(node) {
    return mapTree2(node, (child) => {
      if (child.type !== "BinaryOperator" || child.name !== "Exponent")
        return child;
      const exponent2 = fold(child.right);
      if (exponent2.type !== "BinaryOperator" || exponent2.name !== "Divide" || constantValue(exponent2.right) !== 2) {
        return child;
      }
      const top = constantValue(exponent2.left);
      if (top === void 0 || !Number.isInteger(top) || Math.abs(top) % 2 !== 1)
        return child;
      return {
        type: "BinaryOperator",
        name: "Exponent",
        left: call("sqrt", child.left),
        right: { type: "Constant", value: top }
      };
    });
  }
  function firstForm(node, variable) {
    let found;
    visit(node, (child) => {
      if (found !== void 0)
        return;
      const form = asForm(child, variable);
      if (form !== void 0)
        found = form;
    });
    return found;
  }
  function asForm(node, variable) {
    const inside = squareRootArgument(node);
    if (inside === void 0 || !dependsOn(inside, variable))
      return void 0;
    const parts = splitSquare(inside, variable);
    if (parts === void 0)
      return void 0;
    const { constant: constant3, squareSign, constantSign } = parts;
    const value = constantValue(fold(constant3));
    if (value === void 0 || value <= 0)
      return void 0;
    const scale = fold(call("sqrt", number2(value)));
    if (squareSign < 0)
      return { root: node, scale, kind: "sine" };
    if (constantSign > 0)
      return { root: node, scale, kind: "tangent" };
    return { root: node, scale, kind: "secant" };
  }
  function squareRootArgument(node) {
    if (node.type === "FunctionCall" && node.callee.symbol === "sqrt" && node.args.length === 1) {
      return node.args[0];
    }
    if (node.type === "BinaryOperator" && node.name === "Exponent") {
      const exponent2 = fold(node.right);
      if (exponent2.type === "BinaryOperator" && exponent2.name === "Divide" && constantValue(exponent2.left) === 1 && constantValue(exponent2.right) === 2) {
        return node.left;
      }
    }
    return void 0;
  }
  function splitSquare(node, variable) {
    if (node.type !== "BinaryOperator")
      return void 0;
    if (node.name !== "Add" && node.name !== "Subtract")
      return void 0;
    const sign3 = node.name === "Add" ? 1 : -1;
    const leftIsSquare = isBareSquare(node.left, variable);
    const rightIsSquare = isBareSquare(node.right, variable);
    if (leftIsSquare && !dependsOn(node.right, variable)) {
      return { constant: node.right, squareSign: 1, constantSign: sign3 };
    }
    if (rightIsSquare && !dependsOn(node.left, variable)) {
      return { constant: node.left, squareSign: sign3, constantSign: 1 };
    }
    return void 0;
  }
  function isBareSquare(node, variable) {
    return node.type === "BinaryOperator" && node.name === "Exponent" && node.left.type === "Identifier" && node.left.symbol === variable && constantValue(node.right) === 2;
  }
  function backSubstitute(answer, name, variable, form) {
    const x = id3(variable);
    const { scale: a, root: root2, kind } = form;
    const table3 = kind === "sine" ? {
      sin: divide(x, a),
      cos: divide(root2, a),
      tan: divide(x, root2),
      sec: divide(a, root2),
      cot: divide(root2, x),
      csc: divide(a, x)
    } : kind === "tangent" ? {
      sin: divide(x, root2),
      cos: divide(a, root2),
      tan: divide(x, a),
      sec: divide(root2, a),
      cot: divide(a, x),
      csc: divide(root2, x)
    } : {
      sin: divide(root2, x),
      cos: divide(a, x),
      tan: divide(root2, a),
      sec: divide(x, a),
      cot: divide(a, root2),
      csc: divide(x, root2)
    };
    const bare = kind === "sine" ? call("arcsin", divide(x, a)) : kind === "tangent" ? call("arctan", divide(x, a)) : call("arccos", divide(a, x));
    const opened2 = openDoubleAngles(answer, name);
    const replaced = replaceTrigCalls(opened2, name, table3);
    return replaceIdentifier(replaced, name, bare);
  }
  function openDoubleAngles(node, name) {
    return mapTree2(node, (child) => {
      if (child.type !== "FunctionCall" || child.args.length !== 1)
        return child;
      const which = child.callee.symbol;
      if (which !== "sin" && which !== "cos")
        return child;
      const inner = fold(child.args[0]);
      if (inner.type !== "BinaryOperator" || inner.name !== "Multiply" && inner.name !== "CrossMultiply") {
        return child;
      }
      const k = constantValue(inner.left);
      if (k === void 0 || !Number.isInteger(k) || k < 2 || k > 8)
        return child;
      const angle = inner.right;
      if (angle.type !== "Identifier" || angle.symbol !== name)
        return child;
      return fold(expand(multipleAngle(which, k, angle)).node);
    });
  }
  function multipleAngle(which, k, angle) {
    const sin2 = call("sin", angle);
    const cos2 = call("cos", angle);
    if (k === 1)
      return which === "sin" ? sin2 : cos2;
    if (k % 2 === 0) {
      const half = k / 2;
      const s2 = multipleAngle("sin", half, angle);
      const c2 = multipleAngle("cos", half, angle);
      return which === "sin" ? multiply(number2(2), multiply(s2, c2)) : subtract(number2(1), multiply(number2(2), power2(s2, number2(2))));
    }
    const s = multipleAngle("sin", k - 1, angle);
    const c = multipleAngle("cos", k - 1, angle);
    return which === "sin" ? add(multiply(s, cos2), multiply(c, sin2)) : subtract(multiply(c, cos2), multiply(s, sin2));
  }
  function replaceTrigCalls(node, name, table3) {
    return mapTree2(node, (child) => {
      if (child.type !== "FunctionCall" || child.args.length !== 1)
        return child;
      const replacement = table3[child.callee.symbol];
      if (replacement === void 0)
        return child;
      const [argument] = child.args;
      if (argument.type !== "Identifier" || argument.symbol !== name)
        return child;
      return replacement;
    });
  }
  function mapTree2(node, on) {
    const rebuilt = node.type === "Negative" ? { ...node, arg: mapTree2(node.arg, on) } : node.type === "FunctionCall" ? { ...node, args: node.args.map((arg) => mapTree2(arg, on)) } : node.type === "BinaryOperator" ? {
      ...node,
      left: mapTree2(node.left, on),
      right: mapTree2(node.right, on)
    } : node;
    return on(rebuilt);
  }

  // src/plugins/physics-lab/symbolic/rootSubstitution.ts
  var MAX_INDEX = 6;
  function findRootSubstitution(node, variable) {
    const roots = rootsIn(node, variable);
    if (roots.length === 0)
      return void 0;
    const [{ base: base2 }] = roots;
    if (!roots.every((root2) => sameTree(root2.base, base2)))
      return void 0;
    const invert = inverseOf(base2, variable);
    if (invert === void 0)
      return void 0;
    let index = 1;
    for (const root2 of roots)
      index = leastCommonMultiple(index, root2.index);
    if (index < 2 || index > MAX_INDEX)
      return void 0;
    const name = freshName(node, ["u", "w", "s", "v"]);
    const u = id3(name);
    const raised2 = power2(u, number2(index));
    const inverse = invert(raised2);
    let jacobian;
    try {
      jacobian = fold(differentiate(inverse, name));
    } catch (error2) {
      if (error2 instanceof SymbolicError)
        return void 0;
      throw error2;
    }
    let rewritten = node;
    for (const root2 of roots) {
      rewritten = replaceSubtree(
        rewritten,
        root2.node,
        power2(u, number2(root2.numerator * index / root2.index))
      );
    }
    rewritten = replaceSubtree(rewritten, base2, raised2);
    rewritten = replaceIdentifier(rewritten, variable, inverse);
    if (dependsOn(rewritten, variable))
      return void 0;
    return {
      integrand: fold(multiply(rewritten, jacobian)),
      name,
      back: (answer) => fold(
        replaceIdentifier(
          answer,
          name,
          power2(base2, divide(number2(1), number2(index)))
        )
      )
    };
  }
  function inverseOf(base2, variable) {
    const undoLinear = (inside) => {
      const linear2 = linearIn(inside, variable);
      if (linear2 === void 0)
        return void 0;
      const slope = constantValue(fold(linear2.a));
      const intercept = constantValue(fold(linear2.b));
      if (slope === void 0 || slope === 0 || intercept === void 0)
        return void 0;
      return (value) => divide(subtract(value, number2(intercept)), number2(slope));
    };
    const plain = undoLinear(base2);
    if (plain !== void 0)
      return plain;
    const isE = base2.type === "BinaryOperator" && base2.name === "Exponent" && base2.left.type === "Identifier" && base2.left.symbol === "e";
    if (isE) {
      const undo2 = undoLinear(base2.right);
      return undo2 === void 0 ? void 0 : (w) => undo2(call("ln", w));
    }
    if (base2.type !== "FunctionCall" || base2.args.length !== 1)
      return void 0;
    const undo = undoLinear(base2.args[0]);
    if (undo === void 0)
      return void 0;
    switch (base2.callee.symbol) {
      case "tan":
        return (w) => undo(call("arctan", w));
      case "exp":
        return (w) => undo(call("ln", w));
      case "ln":
        return (w) => undo(power2(id3("e"), w));
      default:
        return void 0;
    }
  }
  function rootsIn(node, variable) {
    const found = [];
    visit(node, (child) => {
      const root2 = asRoot(child);
      if (root2 === void 0 || !dependsOn(root2.base, variable))
        return;
      if (found.some((existing) => sameTree(existing.node, root2.node)))
        return;
      found.push(root2);
    });
    return found;
  }
  function asRoot(node) {
    if (node.type === "FunctionCall" && node.callee.symbol === "sqrt" && node.args.length === 1) {
      return { node, base: node.args[0], index: 2, numerator: 1 };
    }
    if (node.type !== "BinaryOperator" || node.name !== "Exponent")
      return void 0;
    const exponent2 = fold(node.right);
    if (exponent2.type !== "BinaryOperator" || exponent2.name !== "Divide") {
      return void 0;
    }
    const numerator = constantValue(exponent2.left);
    const index = constantValue(exponent2.right);
    if (numerator === void 0 || index === void 0 || !Number.isInteger(numerator) || !Number.isInteger(index) || index < 2 || numerator === 0) {
      return void 0;
    }
    return { node, base: node.left, index, numerator };
  }
  function leastCommonMultiple(a, b) {
    return a / greatestCommonDivisor2(a, b) * b;
  }
  function greatestCommonDivisor2(a, b) {
    while (b !== 0)
      [a, b] = [b, a % b];
    return a;
  }

  // src/plugins/physics-lab/symbolic/nonElementary.ts
  var DESCRIPTION = {
    Ei: "the exponential integral Ei",
    li: "the logarithmic integral li",
    Si: "the sine integral Si",
    Ci: "the cosine integral Ci",
    Shi: "the hyperbolic sine integral Shi",
    Chi: "the hyperbolic cosine integral Chi",
    erf: "the error function erf",
    erfi: "the imaginary error function erfi",
    Fresnel: "the Fresnel integrals S and C",
    Li2: "the dilogarithm Li\u2082",
    elliptic: "an elliptic integral"
  };
  function named(name, what = "This integral") {
    if (name === "power tower") {
      return {
        name,
        message: `${what} has no antiderivative in elementary terms, and none in any standard named function either: x^x is not the derivative of anything a calculator has. It has no power series about zero either, because ln x does not.`
      };
    }
    if (name === "liouville") {
      return {
        name,
        message: `${what} has no elementary antiderivative. If it had one, it would be y\xB7e^g with y rational and y\u2032 + g\u2032y equal to the factor in front, and that equation has no rational solution \u2014 a complete search, not a missed rule (Liouville's theorem).`
      };
    }
    if (name === "binomial") {
      return {
        name,
        message: `${what} has no elementary antiderivative. By Chebyshev's theorem, \u222Bx^m(a+bx^n)^p dx is elementary only when p, (m+1)/n or p+(m+1)/n is a whole number, and here none of them is. For a square root of a cubic or quartic like this one, the antiderivative is an elliptic integral.`
      };
    }
    const verb = name === "Fresnel" ? "which are not elementary functions" : "which is not an elementary function";
    return {
      name,
      message: `${what} is written with ${DESCRIPTION[name]}, ${verb} \u2014 no combination of powers, roots, exponentials, logarithms and trigonometric functions differentiates to it. That is a theorem about the function, not a gap here.`
    };
  }
  function nonElementary(node, variable, integrates) {
    const terms = topLevelTerms(node);
    if (terms.length === 1)
      return classifyTerm(node, variable);
    let found;
    for (const { term: term2 } of terms) {
      const which = classifyTerm(term2, variable);
      if (which !== void 0) {
        if (found !== void 0)
          return void 0;
        found = which;
        continue;
      }
      if (!integrates(term2))
        return void 0;
    }
    return found === void 0 ? void 0 : {
      ...found,
      message: found.message.replace(
        /^This integral/,
        "One term of this integral"
      )
    };
  }
  function namedNonElementary(name) {
    return named(name);
  }
  function knownElementary(node, variable) {
    const ratio = asRatio(fold(node));
    const top = coefficientsIn(fold(ratio.numerator), variable, 16);
    const bottom = coefficientsIn(fold(ratio.denominator), variable, 16);
    const numeric = (parts) => parts?.every((part) => constantValue(fold(part)) !== void 0) === true;
    if (numeric(top) && numeric(bottom)) {
      return "Every rational function has an elementary antiderivative, and this one does too \u2014 but its denominator does not factor into pieces this can write exactly: the factors it would need involve cube roots or worse. So it is refused rather than shown in an approximate form.";
    }
    const binomial2 = binomialParts(node, variable);
    if (binomial2 !== void 0 && chebyshevElementary(binomial2)) {
      return "By Chebyshev's theorem this binomial differential has an elementary antiderivative, found by a substitution that makes it rational \u2014 but this could not carry that substitution through, so it is refused rather than guessed.";
    }
    return void 0;
  }
  function factorsOf(node, variable) {
    const all = [];
    quotientFactors(node, true, all);
    return all.filter((factor) => dependsOn(factor.node, variable));
  }
  function isLinear(node, variable) {
    const linear2 = linearIn(node, variable);
    if (linear2 === void 0)
      return false;
    const slope = constantValue(fold(linear2.a));
    return slope !== void 0 ? slope !== 0 : dependsOn(node, variable);
  }
  function quadratic(node, variable) {
    const parts = coefficientsIn(node, variable, 2);
    if (parts === void 0 || parts.length !== 3)
      return void 0;
    const values = parts.map((part) => constantValue(fold(part)));
    if (values.some((value) => value === void 0))
      return void 0;
    return values[2] === 0 ? void 0 : values;
  }
  function exponentOf(node) {
    if (node.type === "BinaryOperator" && node.name === "Exponent" && node.left.type === "Identifier" && node.left.symbol === "e") {
      return node.right;
    }
    if (node.type === "FunctionCall" && node.callee.symbol === "exp" && node.args.length === 1) {
      return node.args[0];
    }
    return void 0;
  }
  function linearPower(node, variable) {
    if (isLinear(node, variable))
      return 1;
    if (node.type !== "BinaryOperator" || node.name !== "Exponent")
      return void 0;
    const k = constantValue(fold(node.right));
    if (k === void 0 || !Number.isInteger(k) || k < 1)
      return void 0;
    return isLinear(node.left, variable) ? k : void 0;
  }
  function monomialPower(node, variable) {
    if (node.type === "Identifier" && node.symbol === variable)
      return 1;
    if (node.type === "BinaryOperator" && node.name === "Exponent" && node.left.type === "Identifier" && node.left.symbol === variable) {
      const m = constantValue(fold(node.right));
      return m !== void 0 && Number.isInteger(m) && m >= 0 ? m : void 0;
    }
    return void 0;
  }
  function classifyTerm(node, variable) {
    const factors = factorsOf(fold(node), variable);
    if (factors.length === 0)
      return void 0;
    if (factors.length === 1 && factors[0].inNumerator) {
      const [{ node: only }] = factors;
      if (only.type === "BinaryOperator" && only.name === "Exponent" && only.left.type === "Identifier" && only.left.symbol === variable && only.right.type === "Identifier" && only.right.symbol === variable) {
        return named("power tower");
      }
    }
    return exponentialOverLinear(factors, variable) ?? waveOverLinear(factors, variable) ?? reciprocalLogarithm(factors, variable) ?? gaussian(factors, variable) ?? fresnel(factors, variable) ?? dilogarithm(factors, variable) ?? binomialDifferential(factors, variable);
  }
  function exponentialOverLinear(factors, variable) {
    if (factors.length !== 2)
      return void 0;
    const top = factors.find((factor) => factor.inNumerator);
    const bottom = factors.find((factor) => !factor.inNumerator);
    if (top === void 0 || bottom === void 0)
      return void 0;
    const exponent2 = exponentOf(top.node);
    if (exponent2 === void 0 || !isLinear(exponent2, variable))
      return void 0;
    if (linearPower(bottom.node, variable) === void 0)
      return void 0;
    return named("Ei");
  }
  function waveOverLinear(factors, variable) {
    if (factors.length !== 2)
      return void 0;
    const top = factors.find((factor) => factor.inNumerator);
    const bottom = factors.find((factor) => !factor.inNumerator);
    if (top === void 0 || bottom === void 0)
      return void 0;
    const wave = top.node;
    if (wave.type !== "FunctionCall" || wave.args.length !== 1)
      return void 0;
    const which = {
      sin: "Si",
      cos: "Ci",
      sinh: "Shi",
      cosh: "Chi"
    };
    const name = which[wave.callee.symbol];
    if (name === void 0 || !isLinear(wave.args[0], variable))
      return void 0;
    if (linearPower(bottom.node, variable) === void 0)
      return void 0;
    return named(name);
  }
  function reciprocalLogarithm(factors, variable) {
    const bottom = factors.filter((factor) => !factor.inNumerator);
    const top = factors.filter((factor) => factor.inNumerator);
    if (bottom.length !== 1 || top.length > 1)
      return void 0;
    const log3 = bottom[0].node;
    if (log3.type !== "FunctionCall" || log3.callee.symbol !== "ln" || log3.args.length !== 1) {
      return void 0;
    }
    const [inside] = log3.args;
    if (top.length === 1) {
      if (inside.type !== "Identifier" || inside.symbol !== variable)
        return void 0;
      if (monomialPower(top[0].node, variable) === void 0)
        return void 0;
      return named("li");
    }
    return isLinear(inside, variable) ? named("li") : void 0;
  }
  function gaussian(factors, variable) {
    let sign3;
    for (const factor of factors) {
      if (!factor.inNumerator)
        return void 0;
      const exponent2 = exponentOf(factor.node);
      if (exponent2 !== void 0) {
        if (sign3 !== void 0)
          return void 0;
        const q = quadratic(exponent2, variable);
        if (q === void 0)
          return void 0;
        sign3 = Math.sign(q[2]);
        continue;
      }
      const m = monomialPower(factor.node, variable);
      if (m === void 0 || m % 2 !== 0)
        return void 0;
    }
    if (sign3 === void 0)
      return void 0;
    return named(sign3 < 0 ? "erf" : "erfi");
  }
  function fresnel(factors, variable) {
    let found = false;
    for (const factor of factors) {
      if (!factor.inNumerator)
        return void 0;
      const { node } = factor;
      if (node.type === "FunctionCall" && (node.callee.symbol === "sin" || node.callee.symbol === "cos") && node.args.length === 1) {
        if (found || quadratic(node.args[0], variable) === void 0)
          return void 0;
        found = true;
        continue;
      }
      const m = monomialPower(node, variable);
      if (m === void 0 || m % 2 !== 0)
        return void 0;
    }
    return found ? named("Fresnel") : void 0;
  }
  function dilogarithm(factors, variable) {
    const top = factors.filter((factor) => factor.inNumerator);
    const bottom = factors.filter((factor) => !factor.inNumerator);
    if (top.length === 1 && bottom.length === 1) {
      const log3 = top[0].node;
      if (log3.type === "FunctionCall" && log3.callee.symbol === "ln" && log3.args.length === 1) {
        const inner = linearIn(log3.args[0], variable);
        const outer = linearIn(bottom[0].node, variable);
        if (inner !== void 0 && outer !== void 0) {
          const a1 = constantValue(fold(inner.a));
          const b1 = constantValue(fold(inner.b));
          const a2 = constantValue(fold(outer.a));
          const b2 = constantValue(fold(outer.b));
          if (a1 !== void 0 && b1 !== void 0 && a2 !== void 0 && b2 !== void 0 && a1 !== 0 && a2 !== 0 && // Different roots. The same root is `ln(L)/L`, which is elementary.
          Math.abs(a1 * b2 - a2 * b1) > 1e-12) {
            return named("Li2");
          }
        }
      }
      const m = monomialPower(top[0].node, variable);
      const sum3 = bottom[0].node;
      if (m !== void 0 && m >= 1 && sum3.type === "BinaryOperator" && (sum3.name === "Add" || sum3.name === "Subtract")) {
        const [expPart, constPart] = dependsOn(sum3.left, variable) ? [sum3.left, sum3.right] : [sum3.right, sum3.left];
        const exponent2 = exponentOf(expPart);
        const c = constantValue(fold(constPart));
        if (exponent2 !== void 0 && isLinear(exponent2, variable) && c !== void 0 && c !== 0) {
          return named("Li2");
        }
      }
    }
    if (top.length === 1 && bottom.length === 0) {
      const [{ node }] = top;
      if (node.type === "BinaryOperator" && node.name === "Exponent" && constantValue(fold(node.right)) === 2 && node.left.type === "FunctionCall" && node.left.callee.symbol === "arctan" && node.left.args.length === 1 && isLinear(node.left.args[0], variable)) {
        return named("Li2");
      }
    }
    return void 0;
  }
  function binomialParts(node, variable) {
    const all = [];
    quotientFactors(fold(node), true, all);
    return readBinomial(
      all.filter((factor) => dependsOn(factor.node, variable)),
      variable
    );
  }
  function exactRational(node) {
    const r = rationalOf(fold(node));
    return r === void 0 ? void 0 : rational(BigInt(r.n), BigInt(r.d));
  }
  function readBinomial(factors, variable) {
    let m = ZERO;
    let found;
    for (const { node, inNumerator } of factors) {
      const sign3 = inNumerator ? ONE : rational(-1n);
      if (node.type === "Identifier" && node.symbol === variable) {
        m = add4(m, sign3);
        continue;
      }
      let base2 = node;
      let exponent2 = ONE;
      if (node.type === "FunctionCall" && node.callee.symbol === "sqrt") {
        if (node.args.length !== 1)
          return void 0;
        [base2] = node.args;
        exponent2 = rational(1n, 2n);
      } else if (node.type === "BinaryOperator" && node.name === "Exponent") {
        const e = exactRational(node.right);
        if (e === void 0)
          return void 0;
        base2 = node.left;
        exponent2 = e;
      }
      if (base2.type === "Identifier" && base2.symbol === variable) {
        m = add4(m, multiply3(sign3, exponent2));
        continue;
      }
      if (found !== void 0)
        return void 0;
      const n = binomialPower(base2, variable);
      if (n === void 0)
        return void 0;
      found = { n, p: multiply3(sign3, exponent2) };
    }
    if (found === void 0)
      return void 0;
    return { m, ...found };
  }
  function binomialPower(base2, variable) {
    const terms = topLevelTerms(base2);
    if (terms.length !== 2)
      return void 0;
    const constant3 = terms.filter(({ term: term2 }) => !dependsOn(term2, variable));
    const varying = terms.filter(({ term: term2 }) => dependsOn(term2, variable));
    if (constant3.length !== 1 || varying.length !== 1)
      return void 0;
    if (constantValue(fold(constant3[0].term)) === 0)
      return void 0;
    const factors = [];
    quotientFactors(varying[0].term, true, factors);
    let n;
    for (const { node, inNumerator } of factors) {
      if (!dependsOn(node, variable))
        continue;
      if (n !== void 0)
        return void 0;
      let power8;
      if (node.type === "Identifier" && node.symbol === variable)
        power8 = ONE;
      else if (node.type === "BinaryOperator" && node.name === "Exponent" && node.left.type === "Identifier" && node.left.symbol === variable)
        power8 = exactRational(node.right);
      if (power8 === void 0)
        return void 0;
      n = inNumerator ? power8 : negate(power8);
    }
    return n === void 0 || isZero(n) ? void 0 : n;
  }
  function chebyshevElementary(parts) {
    const { m, n, p } = parts;
    const k = divide5(add4(m, ONE), n);
    return isInteger(p) || isInteger(k) || isInteger(add4(p, k));
  }
  function binomialDifferential(factors, variable) {
    const parts = readBinomial(factors, variable);
    if (parts === void 0)
      return void 0;
    return chebyshevElementary(parts) ? void 0 : named("binomial");
  }

  // src/plugins/physics-lab/symbolic/expRational.ts
  var MAX_DEGREE2 = 16;
  function trim4(p) {
    const out = [...p];
    while (out.length > 1 && isZero(out[out.length - 1]))
      out.pop();
    return out.length === 0 ? [ZERO] : out;
  }
  var degree2 = (p) => {
    const t = trim4(p);
    return t.length === 1 && isZero(t[0]) ? -Infinity : t.length - 1;
  };
  function mul2(a, b) {
    const out = new Array(a.length + b.length - 1).fill(ZERO);
    for (let i = 0; i < a.length; i += 1)
      for (let j = 0; j < b.length; j += 1)
        out[i + j] = add4(out[i + j], multiply3(a[i], b[j]));
    return trim4(out);
  }
  function addP(a, b, sign3 = 1) {
    const out = [];
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      const right = b[i] ?? ZERO;
      out.push(add4(a[i] ?? ZERO, sign3 < 0 ? negate(right) : right));
    }
    return trim4(out);
  }
  function derivative3(p) {
    const out = p.slice(1).map((c, i) => multiply3(c, rational(BigInt(i + 1))));
    return out.length === 0 ? [ZERO] : trim4(out);
  }
  function powP(p, k) {
    let out = [ONE];
    for (let i = 0; i < k; i += 1)
      out = mul2(out, p);
    return out;
  }
  function asQPoly(node, variable) {
    const parts = coefficientsIn(node, variable, MAX_DEGREE2);
    if (parts === void 0)
      return void 0;
    const out = [];
    for (const part of parts) {
      const value = constantValue(fold(part));
      if (value === void 0)
        return void 0;
      const exact = fromNumber(value);
      if (exact === void 0)
        return void 0;
      out.push(exact);
    }
    return trim4(out);
  }
  function exponentOf2(node) {
    if (node.type === "BinaryOperator" && node.name === "Exponent" && node.left.type === "Identifier" && node.left.symbol === "e")
      return node.right;
    if (node.type === "FunctionCall" && node.callee.symbol === "exp" && node.args.length === 1)
      return node.args[0];
    return void 0;
  }
  function split3(node, variable) {
    let exponential3;
    let g;
    const rests = [];
    for (const { term: term2, negated } of topLevelTerms(node)) {
      const factors = [];
      quotientFactors(term2, true, factors);
      let found = -1;
      factors.forEach((factor, index) => {
        if (!factor.inNumerator)
          return;
        const exponent3 = exponentOf2(factor.node);
        if (exponent3 === void 0 || !dependsOn(exponent3, variable))
          return;
        if (found >= 0)
          found = -2;
        else
          found = index;
      });
      if (found < 0)
        return void 0;
      const exponent2 = exponentOf2(factors[found].node);
      if (exponent2 === void 0)
        return void 0;
      if (g === void 0) {
        g = fold(exponent2);
        exponential3 = factors[found].node;
      } else if (!sameTree(fold(exponent2), g)) {
        return void 0;
      }
      const rest = factors.reduce(
        (product, factor, index) => index === found ? product : factor.inNumerator ? multiply(product, factor.node) : divide(product, factor.node),
        number2(1)
      );
      rests.push({ value: rest, negated });
    }
    if (g === void 0 || exponential3 === void 0)
      return void 0;
    const f = rests.reduce(
      (sum3, { value, negated }) => negated ? subtract(sum3, value) : add(sum3, value),
      number2(0)
    );
    return { f: fold(f), exponential: exponential3, g };
  }
  function solveLinear(rows, unknowns) {
    const m = rows.map((row) => [...row]);
    let r = 0;
    const pivotColumn = [];
    for (let c = 0; c < unknowns && r < m.length; c += 1) {
      const p = m.findIndex((row, i) => i >= r && !isZero(row[c]));
      if (p < 0)
        continue;
      [m[r], m[p]] = [m[p], m[r]];
      const lead = m[r][c];
      m[r] = m[r].map((v) => divide5(v, lead));
      for (let i = 0; i < m.length; i += 1) {
        if (i === r || isZero(m[i][c]))
          continue;
        const factor = m[i][c];
        m[i] = m[i].map((v, j) => subtract3(v, multiply3(factor, m[r][j])));
      }
      pivotColumn.push(c);
      r += 1;
    }
    for (let i = r; i < m.length; i += 1)
      if (!isZero(m[i][unknowns]))
        return void 0;
    const solution = new Array(unknowns).fill(ZERO);
    pivotColumn.forEach((c, i) => solution[c] = m[i][unknowns]);
    return solution;
  }
  function polyNode(p, variable) {
    let total;
    for (let k = p.length - 1; k >= 0; k -= 1) {
      const c = p[k];
      if (isZero(c))
        continue;
      const magnitude = isNegative(c) ? negate(c) : c;
      const monomial = k === 0 ? rationalNode2(magnitude) : isOne(magnitude) ? k === 1 ? id3(variable) : power2(id3(variable), number2(k)) : multiply(
        rationalNode2(magnitude),
        k === 1 ? id3(variable) : power2(id3(variable), number2(k))
      );
      total = total === void 0 ? isNegative(c) ? { type: "Negative", arg: monomial } : monomial : isNegative(c) ? subtract(total, monomial) : add(total, monomial);
    }
    return total ?? number2(0);
  }
  function integrateExpRational(node, variable) {
    const parts = split3(node, variable);
    if (parts === void 0)
      return void 0;
    const g = asQPoly(parts.g, variable);
    if (g === void 0 || degree2(g) < 1)
      return void 0;
    const ratio = asRatio(parts.f);
    const A = asQPoly(fold(ratio.numerator), variable);
    const B = asQPoly(fold(ratio.denominator), variable);
    if (A === void 0 || B === void 0 || degree2(B) < 0)
      return void 0;
    if (degree2(A) < 0)
      return void 0;
    const gPrime = derivative3(g);
    const m = degree2(gPrime);
    let D = [ONE];
    const layers = degree2(B) >= 1 ? squarefree(B) : [];
    for (const [layer, k] of layers)
      D = mul2(D, powP(layer, k - 1));
    const hasPoles = layers.length > 0;
    const fDegree = degree2(A) - degree2(B);
    const yDegree = fDegree - m;
    const nDegree = yDegree + degree2(D);
    if (nDegree < 0 || nDegree > MAX_DEGREE2) {
      return nDegree < 0 ? {
        kind: "non-elementary",
        degree: degree2(g),
        hasPoles,
        grows: !isNegative(g[g.length - 1])
      } : void 0;
    }
    const Dp = derivative3(D);
    const columns = [];
    for (let j = 0; j <= nDegree; j += 1) {
      const xj = [...new Array(j).fill(ZERO), ONE];
      const term2 = addP(
        addP(mul2(derivative3(xj), D), mul2(xj, Dp), -1),
        mul2(mul2(gPrime, xj), D)
      );
      columns.push(mul2(B, term2));
    }
    const rhs = mul2(A, mul2(D, D));
    const height = Math.max(rhs.length, ...columns.map((c) => c.length));
    const rows = [];
    for (let i = 0; i < height; i += 1)
      rows.push([...columns.map((c) => c[i] ?? ZERO), rhs[i] ?? ZERO]);
    const N = solveLinear(rows, nDegree + 1);
    if (N === void 0) {
      return {
        kind: "non-elementary",
        degree: degree2(g),
        hasPoles,
        grows: !isNegative(g[g.length - 1])
      };
    }
    const numerator = polyNode(trim4(N), variable);
    const single2 = trim4(N).filter((c) => !isZero(c)).length <= 1;
    const value = degree2(D) === 0 ? single2 ? multiply(numerator, parts.exponential) : multiply(parts.exponential, numerator) : divide(multiply(parts.exponential, numerator), polyNode(D, variable));
    return { kind: "integrated", value: fold(value) };
  }

  // src/plugins/physics-lab/symbolic/expTrig.ts
  var MAX_DEGREE3 = 10;
  function exactOf(node) {
    const value = fold(node);
    const r = rationalOf(value);
    if (r !== void 0)
      return rational(BigInt(r.n), BigInt(r.d));
    return value.type === "Constant" ? fromNumber(value.value) : void 0;
  }
  function solveSquare(matrix) {
    const n = matrix.length;
    const m = matrix.map((row) => [...row]);
    for (let c = 0; c < n; c += 1) {
      const p = m.findIndex((row, i) => i >= c && !isZero(row[c]));
      if (p < 0)
        return void 0;
      [m[c], m[p]] = [m[p], m[c]];
      const lead = m[c][c];
      m[c] = m[c].map((v) => divide5(v, lead));
      for (let i = 0; i < n; i += 1) {
        if (i === c || isZero(m[i][c]))
          continue;
        const factor = m[i][c];
        m[i] = m[i].map((v, j) => subtract3(v, multiply3(factor, m[c][j])));
      }
    }
    return m.map((row) => row[n]);
  }
  function expTrigPolynomial(node, variable) {
    const factors = [];
    quotientFactors(node, true, factors);
    let exponential3;
    let a;
    let wave;
    let polynomial = number2(1);
    for (const { node: factor, inNumerator } of factors) {
      if (!dependsOn(factor, variable)) {
        polynomial = inNumerator ? multiply(polynomial, factor) : divide(polynomial, factor);
        continue;
      }
      if (!inNumerator)
        return void 0;
      const exponent2 = factor.type === "BinaryOperator" && factor.name === "Exponent" && factor.left.type === "Identifier" && factor.left.symbol === "e" ? factor.right : factor.type === "FunctionCall" && factor.callee.symbol === "exp" && factor.args.length === 1 ? factor.args[0] : void 0;
      if (exponent2 !== void 0) {
        if (exponential3 !== void 0)
          return void 0;
        const linear2 = linearIn(exponent2, variable);
        const slope = linear2 === void 0 ? void 0 : exactOf(linear2.a);
        if (slope === void 0 || isZero(slope))
          return void 0;
        exponential3 = factor;
        a = slope;
        continue;
      }
      if (factor.type === "FunctionCall" && (factor.callee.symbol === "sin" || factor.callee.symbol === "cos") && factor.args.length === 1) {
        if (wave !== void 0)
          return void 0;
        const linear2 = linearIn(factor.args[0], variable);
        const slope = linear2 === void 0 ? void 0 : exactOf(linear2.a);
        if (slope === void 0 || isZero(slope))
          return void 0;
        wave = { name: factor.callee.symbol, argument: factor.args[0], b: slope };
        continue;
      }
      polynomial = multiply(polynomial, factor);
    }
    if (exponential3 === void 0 || a === void 0 || wave === void 0)
      return void 0;
    const parts = coefficientsIn(fold(polynomial), variable, MAX_DEGREE3);
    if (parts === void 0)
      return void 0;
    const P2 = [];
    for (const part of parts) {
      const value = exactOf(part);
      if (value === void 0)
        return void 0;
      P2.push(value);
    }
    while (P2.length > 1 && isZero(P2[P2.length - 1]))
      P2.pop();
    if (P2.length < 2)
      return void 0;
    const d = P2.length - 1;
    const size = 2 * (d + 1);
    const { b } = wave;
    const rows = [];
    const cosine2 = wave.name === "cos";
    for (let equation = 0; equation < 2; equation += 1) {
      for (let k = 0; k <= d; k += 1) {
        const row = new Array(size + 1).fill(ZERO);
        const own = equation === 0 ? 0 : d + 1;
        const other = equation === 0 ? d + 1 : 0;
        if (k + 1 <= d)
          row[own + k + 1] = rational(BigInt(k + 1));
        row[own + k] = add4(row[own + k], a);
        row[other + k] = add4(row[other + k], equation === 0 ? b : negate(b));
        const target = equation === 0 === cosine2 ? P2[k] ?? ZERO : ZERO;
        row[size] = target;
        rows.push(row);
      }
    }
    const solution = solveSquare(rows);
    if (solution === void 0)
      return void 0;
    const U = solution.slice(0, d + 1);
    const V = solution.slice(d + 1);
    let common = 1n;
    for (const c of [...U, ...V])
      common = common / gcd5(common, c.d) * c.d;
    const scale = rational(common);
    const scaled2 = (p) => p.map((c) => multiply3(c, scale));
    const cosTerm = multiply(
      polyNode(scaled2(U), variable),
      callOf("cos", wave.argument)
    );
    const sinTerm = multiply(
      polyNode(scaled2(V), variable),
      callOf("sin", wave.argument)
    );
    const inside = subtractOrAdd(cosTerm, sinTerm);
    const body = multiply(exponential3, inside);
    return fold(common === 1n ? body : divide(body, number2(Number(common))));
  }
  function callOf(name, argument) {
    return {
      type: "FunctionCall",
      callee: { type: "Identifier", symbol: name },
      args: [argument]
    };
  }
  function subtractOrAdd(left, right) {
    if (right.type === "BinaryOperator" && right.name === "Multiply") {
      const lead = right.left;
      if (lead.type === "Negative") {
        return subtract(left, { ...right, left: lead.arg });
      }
    }
    return add(left, right);
  }
  function gcd5(a, b) {
    let x = a < 0n ? -a : a;
    let y = b < 0n ? -b : b;
    while (y !== 0n)
      [x, y] = [y, x % y];
    return x;
  }

  // src/plugins/physics-lab/symbolic/signChanges.ts
  var PLACEHOLDER = "u_{sgn}";
  function rateOf(node, variable) {
    const at1 = evaluate(node, { [variable]: 1 });
    const at0 = evaluate(node, { [variable]: 0 });
    const at2 = evaluate(node, { [variable]: 2 });
    if (!Number.isFinite(at1) || at0 !== 0 || Math.abs(at2 - 2 * at1) > 1e-12)
      return void 0;
    return fromNumber(at1);
  }
  function exponentials(node, variable, out) {
    if (node.type === "BinaryOperator" && node.name === "Exponent" && node.left.type === "Identifier" && node.left.symbol === "e" && dependsOn(node.right, variable)) {
      const rate = rateOf(node.right, variable);
      if (rate === void 0 || isZero(rate))
        return false;
      out.push({ node, rate });
      return true;
    }
    if (node.type === "FunctionCall" && node.callee.symbol === "exp" && node.args.length === 1) {
      const rate = rateOf(node.args[0], variable);
      if (rate === void 0 || isZero(rate))
        return false;
      out.push({ node, rate });
      return true;
    }
    switch (node.type) {
      case "BinaryOperator":
        return exponentials(node.left, variable, out) && exponentials(node.right, variable, out);
      case "Negative":
        return exponentials(node.arg, variable, out);
      case "FunctionCall":
        return node.args.every((arg) => exponentials(arg, variable, out));
      default:
        return true;
    }
  }
  function rationalGcd(a, b) {
    const g = (x, y) => {
      x = x < 0n ? -x : x;
      y = y < 0n ? -y : y;
      while (y !== 0n)
        [x, y] = [y, x % y];
      return x;
    };
    return rational(g(a.n * b.d, b.n * a.d), a.d * b.d);
  }
  function rewrite2(node, swaps) {
    const swapped = swaps.get(node);
    if (swapped !== void 0)
      return swapped;
    switch (node.type) {
      case "BinaryOperator":
        return {
          ...node,
          left: rewrite2(node.left, swaps),
          right: rewrite2(node.right, swaps)
        };
      case "Negative":
        return { ...node, arg: rewrite2(node.arg, swaps) };
      case "FunctionCall":
        return { ...node, args: node.args.map((arg) => rewrite2(arg, swaps)) };
      default:
        return node;
    }
  }
  function basePolynomial(node, variable) {
    const plain = asQPoly(node, variable);
    if (plain !== void 0)
      return { poly: plain, base: id3(variable) };
    const found = [];
    if (!exponentials(node, variable, found) || found.length === 0)
      return void 0;
    const negativeRates = found.filter((f) => isNegative(f.rate)).length;
    if (negativeRates !== 0 && negativeRates !== found.length)
      return void 0;
    let [{ rate }] = found;
    for (const f of found.slice(1))
      rate = rationalGcd(rate, f.rate);
    if (negativeRates > 0)
      rate = negate(rate);
    const swaps = /* @__PURE__ */ new Map();
    for (const f of found) {
      const k = divide5(f.rate, rate);
      if (!isInteger(k))
        return void 0;
      swaps.set(f.node, power2(id3(PLACEHOLDER), number2(Number(k.n))));
    }
    const rewritten = rewrite2(node, swaps);
    if (dependsOn(rewritten, variable))
      return void 0;
    const poly = asQPoly(fold(rewritten), PLACEHOLDER);
    if (poly === void 0)
      return void 0;
    const base2 = isOne(rate) ? power2(id3("e"), id3(variable)) : power2(id3("e"), fold(multiply(rationalNode2(rate), id3(variable))));
    return { poly, base: base2, rate };
  }
  function polynomialNode(poly, base2) {
    let out = number2(0);
    poly.forEach((c, i) => {
      if (isZero(c))
        return;
      const term2 = i === 0 ? rationalNode2(c) : multiply(rationalNode2(c), i === 1 ? base2 : power2(base2, number2(i)));
      out = add(out, term2);
    });
    return fold(out);
  }
  function factorRoots(factor) {
    if (factor.length === 2)
      return [rationalNode2(negate(factor[0]))];
    if (factor.length !== 3)
      return void 0;
    const [c, b] = factor;
    const D = subtract3(multiply3(b, b), multiply3(rational(4n), c));
    if (!(D.n > 0n))
      return [];
    const half = rational(1n, 2n);
    const centre = rationalNode2(multiply3(negate(b), half));
    const spread = divide(power2(rationalNode2(D), rationalNode2(half)), number2(2));
    return [fold(add(centre, negative2(spread))), fold(add(centre, spread))];
  }
  function exactSignChanges(g, variable) {
    const read = basePolynomial(g, variable);
    if (read === void 0 || read.poly.length < 2)
      return void 0;
    const out = [];
    for (const [layer, multiplicity] of squarefree(read.poly)) {
      if (multiplicity % 2 === 0)
        continue;
      const factors = factorOverQ(layer);
      if (factors === void 0)
        return void 0;
      for (const factor of factors) {
        const roots = factorRoots(factor);
        if (roots === void 0)
          return void 0;
        for (const root2 of roots) {
          let node = root2;
          if (read.rate !== void 0) {
            if (!(evaluate(root2, {}) > 0))
              continue;
            node = fold(divide(call("ln", root2), rationalNode2(read.rate)));
          }
          out.push({ node, value: evaluate(node, {}) });
        }
      }
    }
    return out.sort((a, b) => a.value - b.value);
  }
  function exactSquareRootOf(radicand, variable) {
    const read = basePolynomial(radicand, variable);
    if (read === void 0 || read.poly.length < 3)
      return void 0;
    const layers = squarefree(read.poly);
    if (layers.some(([, m]) => m % 2 !== 0))
      return void 0;
    let root2 = [ONE];
    for (const [layer, m] of layers)
      for (let i = 0; i < m / 2; i += 1)
        root2 = multiplyPoly(root2, layer);
    const lead = read.poly[read.poly.length - 1];
    const scale = exactSquareRoot(lead);
    if (scale === void 0)
      return void 0;
    return polynomialNode(
      root2.map((c) => multiply3(c, scale)),
      read.base
    );
  }
  function multiplyPoly(a, b) {
    const out = new Array(a.length + b.length - 1).fill(ZERO);
    for (let i = 0; i < a.length; i += 1)
      for (let j = 0; j < b.length; j += 1)
        out[i + j] = add4(out[i + j], multiply3(a[i], b[j]));
    return out;
  }
  function rootsOfSquares(node, variable) {
    let changed = false;
    const visit2 = (child) => {
      if (child.type === "FunctionCall" && child.callee.symbol === "sqrt" && child.args.length === 1 && dependsOn(child.args[0], variable)) {
        const g = exactSquareRootOf(child.args[0], variable);
        if (g !== void 0) {
          changed = true;
          return call("abs", g);
        }
      }
      switch (child.type) {
        case "BinaryOperator":
          return { ...child, left: visit2(child.left), right: visit2(child.right) };
        case "Negative":
          return { ...child, arg: visit2(child.arg) };
        case "FunctionCall":
          return { ...child, args: child.args.map(visit2) };
        default:
          return child;
      }
    };
    const out = visit2(node);
    return changed ? out : node;
  }

  // src/plugins/physics-lab/symbolic/specialForms.ts
  var SAMPLES = [0.37, 0.81, 1.23, 1.94, 2.71, -0.58, -1.37];
  function hasRoot(node, variable) {
    let found = false;
    visit(node, (child) => {
      if (child.type === "FunctionCall" && child.callee.symbol === "sqrt" && dependsOn(child, variable))
        found = true;
    });
    return found;
  }
  function byConjugate(node, variable) {
    if (node.type !== "BinaryOperator" || node.name !== "Divide")
      return void 0;
    const terms = topLevelTerms(node.right);
    if (terms.length !== 2 || !hasRoot(node.right, variable))
      return void 0;
    const [first, second] = terms.map(
      ({ term: term2, negated }) => negated ? negative2(term2) : term2
    );
    const square4 = fold(
      tidySums(
        expand(subtract(power2(first, number2(2)), power2(second, number2(2)))).node
      )
    );
    if (hasRoot(square4, variable))
      return void 0;
    const value = evaluate(square4, { [variable]: SAMPLES[0] });
    if (!Number.isFinite(value) || value === 0)
      return void 0;
    return fold(divide(multiply(node.left, subtract(first, second)), square4));
  }
  function reciprocalQuartic(node, variable) {
    const factors = [];
    quotientFactors(node, true, factors);
    const top = factors.filter((f) => f.inNumerator);
    const bottom = factors.filter((f) => !f.inNumerator);
    if (top.length !== 1 || bottom.length !== 2)
      return void 0;
    const root2 = bottom.find(
      (f) => f.node.type === "FunctionCall" && f.node.callee.symbol === "sqrt"
    );
    const other = bottom.find((f) => f !== root2);
    if (root2 === void 0 || other === void 0)
      return void 0;
    if (root2.node.type !== "FunctionCall")
      return void 0;
    const numerator = asQPoly(top[0].node, variable);
    const plus = asQPoly(other.node, variable);
    const quartic = asQPoly(root2.node.args[0], variable);
    if (numerator === void 0 || plus === void 0 || quartic === void 0)
      return void 0;
    const shape2 = (p) => p.length === 3 && isZero(p[1]) && isOne(p[2]);
    if (!shape2(numerator) || !shape2(plus))
      return void 0;
    const [c] = plus;
    if (!equals(numerator[0], negate(c)) || !(c.n > 0n))
      return void 0;
    if (quartic.length !== 5 || !isZero(quartic[1]) || !isZero(quartic[3]) || !isOne(quartic[4]) || !equals(quartic[0], multiply3(c, c)))
      return void 0;
    const [, , b] = quartic;
    const k = subtract3(multiply3(rational(2n), c), b);
    const u = divide(root2.node, id3(variable));
    const half = rationalNode2(rational(1n, 2n));
    if (isZero(k))
      return fold(negative2(divide(number2(1), u)));
    const m = power2(rationalNode2(isNegative(k) ? negate(k) : k), half);
    if (!isNegative(k))
      return fold(divide(call("arctan", divide(u, m)), m));
    return fold(
      divide(
        call("ln", call("abs", divide(subtract(u, m), add(u, m)))),
        multiply(number2(2), m)
      )
    );
  }
  function exponentialFactor(node, variable) {
    const factors = [];
    quotientFactors(node, true, factors);
    const index = factors.findIndex(
      (f) => f.inNumerator && f.node.type === "BinaryOperator" && f.node.name === "Exponent" && f.node.left.type === "Identifier" && f.node.left.symbol === "e" && dependsOn(f.node.right, variable)
    );
    if (index < 0)
      return void 0;
    const exponent2 = factors[index].node;
    if (exponent2.type !== "BinaryOperator")
      return void 0;
    const rate = evaluate(exponent2.right, { [variable]: 1 });
    const at0 = evaluate(exponent2.right, { [variable]: 0 });
    if (!Number.isFinite(rate) || at0 !== 0 || rate === 0)
      return void 0;
    const q = fromNumber(rate);
    if (q === void 0)
      return void 0;
    let top = number2(1);
    let below = number2(1);
    factors.forEach((f, i) => {
      if (i === index)
        return;
      if (f.inNumerator)
        top = multiply(top, f.node);
      else
        below = multiply(below, f.node);
    });
    return { rate, rateNode: rationalNode2(q), rest: fold(divide(top, below)) };
  }
  function reversedProductRule(node, variable) {
    const found = exponentialFactor(node, variable);
    if (found === void 0)
      return void 0;
    const { rate, rateNode, rest } = found;
    const candidates2 = [];
    const pushTerms = (sum3, over) => {
      for (const { term: term2, negated } of topLevelTerms(sum3)) {
        const signed = negated ? negative2(term2) : term2;
        candidates2.push(over === void 0 ? signed : divide(signed, over));
      }
    };
    pushTerms(rest);
    if (rest.type === "BinaryOperator" && rest.name === "Divide")
      pushTerms(expand(rest.left).node, rest.right);
    const bindings = SAMPLES.map((x) => ({ [variable]: x }));
    for (const term2 of candidates2) {
      if (!dependsOn(term2, variable))
        continue;
      const H = fold(divide(term2, rateNode));
      let dH;
      try {
        dH = differentiate(H, variable);
      } catch {
        continue;
      }
      const works = agreesOnSamples(
        (b) => rate * evaluate(H, b) + evaluate(dH, b),
        (b) => evaluate(rest, b),
        bindings,
        1e-9
      );
      if (works) {
        const exponential3 = factorsExponential(node, variable);
        if (exponential3 !== void 0)
          return fold(multiply(exponential3, H));
      }
    }
    return void 0;
  }
  function factorsExponential(node, variable) {
    const factors = [];
    quotientFactors(node, true, factors);
    return factors.find(
      (f) => f.inNumerator && f.node.type === "BinaryOperator" && f.node.name === "Exponent" && f.node.left.type === "Identifier" && f.node.left.symbol === "e" && dependsOn(f.node.right, variable)
    )?.node;
  }

  // src/plugins/physics-lab/symbolic/integrate.ts
  var IntegrationError = class extends Error {
  };
  var NonElementaryError = class extends IntegrationError {
    constructor(message, special2) {
      super(message);
      this.special = special2;
    }
  };
  var TECHNIQUES = {
    power: "Power rule",
    table: "Standard integral",
    substitution: "u-substitution",
    parts: "Integration by parts",
    cyclic: "Solving for the integral that reappears",
    partialFractions: "Partial fractions",
    completingSquare: "Completing the square",
    splitNumerator: "Splitting the fraction term by term",
    trigIdentity: "Trigonometric identities",
    reduction: "Reduction formula",
    trigSubstitution: "Trigonometric substitution",
    rootSubstitution: "Rationalising substitution",
    logSubstitution: "Substitution x = e^u",
    expSubstitution: "Substitution u = e^{kx}",
    hyperbolic: "Hyperbolic functions as exponentials",
    absolute: "Splitting at the corner of |u|",
    rootOfSquare: "\u221A(g\xB2) = |g|",
    conjugate: "Multiplying by the conjugate",
    reciprocalQuartic: "Substitution u = \u221A(x\u2074 + bx\xB2 + c\xB2)/x",
    reversedProduct: "The product rule backwards: (e^{ax}H)\u2032 = e^{ax}(aH + H\u2032)",
    halfAngle: "Tangent half-angle substitution",
    liouville: "Solving y\u2032 + g\u2032y = f for y\xB7e^g (Liouville)",
    expTrig: "Undetermined coefficients for e^{ax}(U cos bx + V sin bx)"
  };
  var trace = [];
  function record(technique, run) {
    const mark = trace.length;
    trace.push(technique);
    try {
      const result = run();
      if (result === void 0)
        trace.length = mark;
      return result;
    } catch (error2) {
      trace.length = mark;
      throw error2;
    }
  }
  function recorded(technique, run) {
    return record(technique, run);
  }
  function describeMethod(techniques) {
    const distinct = techniques.filter(
      (technique, index) => techniques.indexOf(technique) === index
    );
    const trivial = [TECHNIQUES.power, TECHNIQUES.table];
    const substantial = distinct.filter(
      (technique) => !trivial.includes(technique)
    );
    const sentence = (list2, joiner) => list2.map(
      (technique, index) => index === 0 || technique.startsWith("u-") ? technique : technique.charAt(0).toLowerCase() + technique.slice(1)
    ).join(joiner);
    if (substantial.length > 0)
      return sentence(substantial, ", then ");
    return sentence(distinct, " and ");
  }
  function linearIn(node, variable) {
    const found = linearParts(node, variable);
    return found === void 0 ? void 0 : { a: fold(found.a), b: fold(found.b) };
  }
  function linearParts(node, variable) {
    if (!dependsOn(node, variable))
      return { a: number2(0), b: node };
    switch (node.type) {
      case "Identifier":
        return node.symbol === variable ? { a: number2(1), b: number2(0) } : void 0;
      case "Negative": {
        const inner = linearParts(node.arg, variable);
        return inner === void 0 ? void 0 : { a: negative2(inner.a), b: negative2(inner.b) };
      }
      case "BinaryOperator": {
        const { left, right } = node;
        switch (node.name) {
          case "Add":
          case "Subtract": {
            const l = linearParts(left, variable);
            const r = linearParts(right, variable);
            if (l === void 0 || r === void 0)
              return void 0;
            const join3 = node.name === "Add" ? add : subtract;
            return { a: join3(l.a, r.a), b: join3(l.b, r.b) };
          }
          case "Multiply":
          case "CrossMultiply": {
            const leftHas = dependsOn(left, variable);
            const rightHas = dependsOn(right, variable);
            if (leftHas && rightHas)
              return void 0;
            const [scalar, rest] = leftHas ? [right, left] : [left, right];
            const inner = linearParts(rest, variable);
            return inner === void 0 ? void 0 : { a: multiply(scalar, inner.a), b: multiply(scalar, inner.b) };
          }
          case "Divide": {
            if (dependsOn(right, variable))
              return void 0;
            const inner = linearParts(left, variable);
            return inner === void 0 ? void 0 : { a: divide(inner.a, right), b: divide(inner.b, right) };
          }
          default:
            return void 0;
        }
      }
      default:
        return void 0;
    }
  }
  function implicitProducts2(node, variable) {
    return implicitProducts(node, /* @__PURE__ */ new Set([variable]));
  }
  var FUNCTION_INTEGRALS = {
    sin: (u) => negative2(call("cos", u)),
    cos: (u) => call("sin", u),
    exp: (u) => call("exp", u),
    // The three that are themselves a logarithm of something trigonometric.
    tan: (u) => negative2(call("ln", call("abs", call("cos", u)))),
    cot: (u) => call("ln", call("abs", call("sin", u))),
    sec: (u) => call("ln", call("abs", add(call("sec", u), call("tan", u)))),
    csc: (u) => negative2(call("ln", call("abs", add(call("csc", u), call("cot", u))))),
    sinh: (u) => call("cosh", u),
    cosh: (u) => call("sinh", u),
    tanh: (u) => call("ln", call("cosh", u)),
    coth: (u) => call("ln", call("abs", call("sinh", u))),
    // Each of these is integration by parts with dv = du, done once and written
    // down rather than rediscovered: the parts rule below only reduces a
    // polynomial factor, and every one of these arrives with no factor at all.
    ln: (u) => subtract(multiply(u, call("ln", u)), u),
    log: (u) => subtract(multiply(u, call("log", u)), divide(u, call("ln", number2(10)))),
    arcsin: (u) => add(
      multiply(u, call("arcsin", u)),
      call("sqrt", subtract(number2(1), square3(u)))
    ),
    arccos: (u) => subtract(
      multiply(u, call("arccos", u)),
      call("sqrt", subtract(number2(1), square3(u)))
    ),
    arctan: (u) => subtract(
      multiply(u, call("arctan", u)),
      divide(call("ln", add(number2(1), square3(u))), number2(2))
    ),
    arcsinh: (u) => subtract(
      multiply(u, call("arcsinh", u)),
      call("sqrt", add(square3(u), number2(1)))
    ),
    arctanh: (u) => add(
      multiply(u, call("arctanh", u)),
      divide(call("ln", call("abs", subtract(number2(1), square3(u)))), number2(2))
    ),
    sqrt: (u) => divide(
      multiply(number2(2), power2(u, divide(number2(3), number2(2)))),
      number2(3)
    )
  };
  var square3 = (node) => power2(node, number2(2));
  function integrate2(node, variable) {
    return integrateWithMethod(node, variable).value;
  }
  function integrateWithMethod(node, variable) {
    const folded = fold(implicitProducts2(node, variable));
    const direct2 = attempt(folded, variable);
    const opened2 = fold(expand(folded).node);
    const worthExpanding = !sameTree(opened2, folded) && (!direct2.ok || polynomialDegree(opened2, variable) !== void 0);
    if (!worthExpanding) {
      if (direct2.ok)
        return direct2;
      return decided(folded, variable, direct2.error);
    }
    const expanded = attempt(opened2, variable);
    if (!expanded.ok) {
      if (direct2.ok)
        return direct2;
      return decided(folded, variable, direct2.error);
    }
    if (!direct2.ok)
      return expanded;
    return nodeCount(expanded.value) < nodeCount(direct2.value) ? expanded : direct2;
  }
  function decided(node, variable, fallback) {
    const result = integrateExpRational(node, variable);
    if (result?.kind === "integrated") {
      return {
        value: tidySigns(fold(tidySums(result.value))),
        techniques: [TECHNIQUES.liouville]
      };
    }
    if (result?.kind === "non-elementary") {
      const special2 = result.degree === 1 ? "Ei" : result.degree === 2 && !result.hasPoles ? result.grows ? "erfi" : "erf" : "liouville";
      const found = namedNonElementary(special2);
      throw new NonElementaryError(found.message, found.name);
    }
    throw refusal(node, variable, fallback);
  }
  function refusal(node, variable, fallback) {
    const unwritten = knownElementary(node, variable);
    if (unwritten !== void 0)
      return new IntegrationError(unwritten);
    const found = nonElementary(
      node,
      variable,
      (term2) => attempt(fold(term2), variable).ok
    );
    return found === void 0 ? fallback : new NonElementaryError(found.message, found.name);
  }
  function attempt(node, variable) {
    const outer = trace;
    trace = [];
    try {
      const tidied = fold(tidySums(fold(antiderivative(node, variable))));
      const opened2 = fold(tidySums(fold(expand(tidied).node)));
      const factored = factorCommonExponential(opened2, variable);
      const shorter = [
        opened2,
        ...factored === void 0 ? [] : [factored]
      ].reduce(
        (best, next) => nodeCount(next) < nodeCount(best) ? next : best,
        tidied
      );
      return {
        ok: true,
        value: tidySigns(dropLogConstants(shorter, variable)),
        techniques: trace
      };
    } catch (error2) {
      if (!(error2 instanceof IntegrationError))
        throw error2;
      return { ok: false, error: error2 };
    } finally {
      trace = outer;
    }
  }
  function dropLogConstants(answer, variable) {
    const terms = topLevelTerms(answer);
    let changed = false;
    const rebuilt = terms.map(({ term: term2, negated }) => {
      const cleaned = cleanLogTerm(term2, variable);
      if (cleaned !== void 0)
        changed = true;
      return { value: cleaned ?? term2, negated };
    });
    return changed ? fold(rebuildSum(rebuilt)) : answer;
  }
  function cleanLogTerm(term2, variable) {
    if (term2.type === "Negative") {
      const inner = cleanLogTerm(term2.arg, variable);
      return inner === void 0 ? void 0 : negative2(inner);
    }
    if (term2.type === "BinaryOperator") {
      if (term2.name === "Multiply" || term2.name === "Divide") {
        const leftHas = dependsOn(term2.left, variable);
        const rightHas = dependsOn(term2.right, variable);
        if (leftHas && !rightHas) {
          const inner = cleanLogTerm(term2.left, variable);
          return inner === void 0 ? void 0 : { ...term2, left: inner };
        }
        if (rightHas && !leftHas && term2.name === "Multiply") {
          const inner = cleanLogTerm(term2.right, variable);
          return inner === void 0 ? void 0 : { ...term2, right: inner };
        }
      }
      return void 0;
    }
    if (term2.type !== "FunctionCall" || term2.callee.symbol !== "ln" || term2.args.length !== 1) {
      return void 0;
    }
    const [argument] = term2.args;
    const bars = argument.type === "FunctionCall" && argument.callee.symbol === "abs" && argument.args.length === 1;
    const inside = bars ? argument.args[0] : argument;
    const stripped = withoutConstantFactor(inside, variable);
    if (stripped === void 0)
      return void 0;
    if (!bars)
      return void 0;
    return call("ln", call("abs", stripped));
  }
  function withoutConstantFactor(node, variable) {
    const factors = [];
    quotientFactors(node, true, factors);
    const kept = factors.filter((factor) => dependsOn(factor.node, variable));
    if (kept.length > 0 && kept.length < factors.length) {
      return fold(
        kept.reduce(
          (product, factor) => factor.inNumerator ? multiply(product, factor.node) : divide(product, factor.node),
          number2(1)
        )
      );
    }
    const coefficients = coefficientsIn(node, variable, 8);
    if (coefficients === void 0 || coefficients.length < 2)
      return void 0;
    const values = coefficients.map((c) => constantValue(fold(c)));
    if (values.some((value) => value === void 0 || !Number.isInteger(value)))
      return void 0;
    let content = 0;
    for (const value of values)
      content = gcdOf(content, Math.abs(value));
    if (content <= 1)
      return void 0;
    let total;
    for (let k = values.length - 1; k >= 0; k -= 1) {
      const c = values[k] / content;
      if (c === 0)
        continue;
      const monomial = k === 0 ? number2(Math.abs(c)) : multiply(
        number2(Math.abs(c)),
        k === 1 ? id3(variable) : power2(id3(variable), number2(k))
      );
      total = total === void 0 ? c < 0 ? negative2(monomial) : monomial : c < 0 ? subtract(total, monomial) : add(total, monomial);
    }
    return total === void 0 ? void 0 : fold(total);
  }
  function gcdOf(a, b) {
    while (b !== 0)
      [a, b] = [b, a % b];
    return a;
  }
  function powersOfPowers(node) {
    switch (node.type) {
      case "Negative":
        return { ...node, arg: powersOfPowers(node.arg) };
      case "FunctionCall":
        return { ...node, args: node.args.map(powersOfPowers) };
      case "BinaryOperator": {
        const left = powersOfPowers(node.left);
        const right = powersOfPowers(node.right);
        if (node.name === "Exponent" && left.type === "BinaryOperator" && left.name === "Exponent") {
          const inner = constantValue(left.right);
          const outer = constantValue(right);
          if (inner !== void 0 && outer !== void 0 && Number.isInteger(inner) && Number.isInteger(outer))
            return power2(left.left, number2(inner * outer));
        }
        return { ...node, left, right };
      }
      default:
        return node;
    }
  }
  function tidySigns(node) {
    const strip = (child) => {
      if (child.type === "Negative")
        return child.arg;
      if (child.type === "BinaryOperator" && (child.name === "Multiply" || child.name === "Divide")) {
        const inner = strip(child.left);
        return inner === void 0 ? void 0 : { ...child, left: inner };
      }
      if (child.type === "Constant" && child.value < 0)
        return number2(-child.value);
      return void 0;
    };
    switch (node.type) {
      case "Negative":
        return { ...node, arg: tidySigns(node.arg) };
      case "FunctionCall":
        return { ...node, args: node.args.map(tidySigns) };
      case "BinaryOperator": {
        const left = tidySigns(node.left);
        const right = tidySigns(node.right);
        if (node.name === "Add" || node.name === "Subtract") {
          const positive3 = strip(right);
          if (positive3 !== void 0)
            return node.name === "Add" ? subtract(left, positive3) : add(left, positive3);
        }
        return { ...node, left, right };
      }
      default:
        return node;
    }
  }
  function joinSums(list2) {
    const parts = [];
    for (const item of list2) {
      const negatedWhole = item.type === "Negative";
      const body = item.type === "Negative" ? item.arg : item;
      for (const { term: term2, negated } of topLevelTerms(body))
        parts.push({ value: term2, negated: negated !== negatedWhole });
    }
    return tidySigns(rebuildSum(parts));
  }
  var MAX_SUBSTITUTION_DEPTH = 4;
  function antiderivative(node, variable, depth2 = 0) {
    const mark = trace.length;
    if (depth2 < MAX_SUBSTITUTION_DEPTH) {
      const unrooted = rootsOfSquares(node, variable);
      if (unrooted !== node) {
        try {
          return recorded(
            TECHNIQUES.rootOfSquare,
            () => antiderivative(unrooted, variable, depth2 + 1)
          );
        } catch (error2) {
          if (!(error2 instanceof IntegrationError))
            throw error2;
          trace.length = mark;
        }
      }
      const signed = bySign(node, variable, depth2);
      if (signed !== void 0)
        return signed;
    }
    try {
      return byRule(node, variable, depth2);
    } catch (error2) {
      if (!(error2 instanceof IntegrationError))
        throw error2;
      trace.length = mark;
      const rewritten = byRewrite(node, variable, depth2);
      if (rewritten !== void 0)
        return rewritten;
      trace.length = mark;
      throw error2;
    }
  }
  function byNumeratorTerms(node, variable, depth2) {
    if (node.type !== "BinaryOperator" || node.name !== "Divide" || !dependsOn(node.right, variable))
      return void 0;
    const terms = topLevelTerms(node.left);
    if (terms.length < 2)
      return void 0;
    const mark = trace.length;
    try {
      return recorded(
        TECHNIQUES.splitNumerator,
        () => joinSums(
          terms.map(({ term: term2, negated }) => {
            const part = antiderivative(
              divide(term2, node.right),
              variable,
              depth2 + 1
            );
            return negated ? negative2(part) : part;
          })
        )
      );
    } catch (error2) {
      if (!(error2 instanceof IntegrationError))
        throw error2;
      trace.length = mark;
      return void 0;
    }
  }
  function byRewrite(node, variable, depth2) {
    if (depth2 >= MAX_SUBSTITUTION_DEPTH)
      return void 0;
    const substituted = bySubstitution(node, variable, depth2);
    if (substituted !== void 0)
      return substituted;
    const shifted = squareCompletingShift(node, variable);
    for (const integrand of shifted?.integrands ?? []) {
      try {
        return recorded(
          TECHNIQUES.completingSquare,
          () => (
            // The radicands multiplied back out on the way home, so the answer
            // says √(x² + 4x + 13), which is what was typed, not √((x+2)² + 9).
            fold(
              expandRadicands(
                replaceIdentifier(
                  antiderivative(integrand, shifted.name, depth2 + 1),
                  shifted.name,
                  shifted.w
                )
              )
            )
          )
        );
      } catch (error2) {
        if (!(error2 instanceof IntegrationError))
          throw error2;
      }
    }
    const split4 = byNumeratorTerms(node, variable, depth2);
    if (split4 !== void 0)
      return split4;
    const product = reversedProductRule(node, variable);
    if (product !== void 0)
      return recorded(TECHNIQUES.reversedProduct, () => product);
    const quartic = reciprocalQuartic(node, variable);
    if (quartic !== void 0)
      return recorded(TECHNIQUES.reciprocalQuartic, () => quartic);
    const trig = findTrigSubstitution(node, variable);
    if (trig !== void 0) {
      try {
        return recorded(
          TECHNIQUES.trigSubstitution,
          () => trig.back(antiderivative(trig.integrand, trig.name, depth2 + 1))
        );
      } catch (error2) {
        if (!(error2 instanceof IntegrationError))
          throw error2;
      }
    }
    const rooted = findRootSubstitution(node, variable);
    if (rooted !== void 0) {
      try {
        return recorded(
          TECHNIQUES.rootSubstitution,
          () => rooted.back(antiderivative(rooted.integrand, rooted.name, depth2 + 1))
        );
      } catch (error2) {
        if (!(error2 instanceof IntegrationError))
          throw error2;
      }
    }
    const stepped = trigReduction(node, variable);
    if (stepped !== void 0) {
      try {
        return recorded(
          TECHNIQUES.reduction,
          () => add(
            stepped.finished,
            antiderivative(stepped.remaining, variable, depth2 + 1)
          )
        );
      } catch (error2) {
        if (!(error2 instanceof IntegrationError))
          throw error2;
      }
    }
    const reduced = trigRewrite(node, variable);
    if (reduced !== void 0) {
      try {
        return recorded(
          TECHNIQUES.trigIdentity,
          () => antiderivative(fold(expand(reduced).node), variable, depth2 + 1)
        );
      } catch (error2) {
        if (!(error2 instanceof IntegrationError))
          throw error2;
      }
    }
    if (node.type === "BinaryOperator" && node.name === "Divide" && dependsOn(node.left, variable) && dependsOn(node.right, variable)) {
      try {
        return binaryIntegral(
          {
            type: "BinaryOperator",
            name: "Multiply",
            left: node.left,
            right: divide(number2(1), node.right)
          },
          variable,
          depth2 + 1
        );
      } catch (error2) {
        if (!(error2 instanceof IntegrationError))
          throw error2;
      }
    }
    if (isInverseOrLog(node)) {
      try {
        const x = id3(variable);
        const derivative4 = fold(differentiate(node, variable));
        return recorded(
          TECHNIQUES.parts,
          () => subtract(
            multiply(x, node),
            antiderivative(fold(multiply(x, derivative4)), variable, depth2 + 1)
          )
        );
      } catch (error2) {
        if (!(error2 instanceof IntegrationError))
          throw error2;
      }
    }
    const logged = findLogSubstitution(node, variable);
    if (logged !== void 0) {
      try {
        return recorded(
          TECHNIQUES.logSubstitution,
          () => logged.back(antiderivative(logged.integrand, logged.name, depth2 + 1))
        );
      } catch (error2) {
        if (!(error2 instanceof IntegrationError))
          throw error2;
      }
    }
    const opened2 = openedDoubleAngles(node, variable);
    if (opened2 !== void 0) {
      try {
        return recorded(
          TECHNIQUES.trigIdentity,
          () => antiderivative(opened2, variable, depth2 + 1)
        );
      } catch (error2) {
        if (!(error2 instanceof IntegrationError))
          throw error2;
      }
    }
    const exponential3 = findExpSubstitution(node, variable);
    for (const candidate of exponential3?.integrands ?? []) {
      try {
        return recorded(
          TECHNIQUES.expSubstitution,
          () => exponential3.back(
            antiderivative(candidate, exponential3.name, depth2 + 1)
          )
        );
      } catch (error2) {
        if (!(error2 instanceof IntegrationError))
          throw error2;
      }
    }
    const hyperbolic = hyperbolicAsExponentials(node, variable);
    const hyperbolicForms = hyperbolic === void 0 ? [] : [fold(expand(hyperbolic).node), hyperbolic].filter(
      (form, i, all) => i === 0 || !sameTree(form, all[0])
    );
    for (const form of hyperbolicForms) {
      try {
        return recorded(
          TECHNIQUES.hyperbolic,
          () => antiderivative(form, variable, depth2 + 1)
        );
      } catch (error2) {
        if (!(error2 instanceof IntegrationError))
          throw error2;
      }
    }
    const plain = asSinesAndCosines(node, variable);
    if (plain !== void 0) {
      try {
        return recorded(
          TECHNIQUES.trigIdentity,
          () => antiderivative(fold(plain), variable, depth2 + 1)
        );
      } catch (error2) {
        if (!(error2 instanceof IntegrationError))
          throw error2;
      }
    }
    const halved = findHalfAngleSubstitution(node, variable);
    if (halved !== void 0) {
      for (const candidate of halved.integrands) {
        try {
          return recorded(
            TECHNIQUES.halfAngle,
            () => halved.back(antiderivative(candidate, halved.name, depth2 + 1))
          );
        } catch (error2) {
          if (!(error2 instanceof IntegrationError))
            throw error2;
        }
      }
    }
    const conjugated = byConjugate(node, variable);
    if (conjugated !== void 0) {
      try {
        return recorded(
          TECHNIQUES.conjugate,
          () => antiderivative(conjugated, variable, depth2 + 1)
        );
      } catch (error2) {
        if (!(error2 instanceof IntegrationError))
          throw error2;
      }
    }
    return void 0;
  }
  function bySign(node, variable, depth2) {
    const factors = [];
    quotientFactors(node, true, factors);
    const marked = factors.filter(
      (f) => f.node.type === "FunctionCall" && (f.node.callee.symbol === "abs" || f.node.callee.symbol === "sign") && f.node.args.length === 1 && dependsOn(f.node.args[0], variable)
    );
    if (marked.length !== 1 || !marked[0].inNumerator)
      return void 0;
    const call0 = marked[0].node;
    const [u] = call0.args;
    const linear2 = linearIn(u, variable);
    let otherBars = false;
    visit(node, (child) => {
      if (child !== call0 && child.type === "FunctionCall" && (child.callee.symbol === "abs" || child.callee.symbol === "sign") && dependsOn(child, variable))
        otherBars = true;
    });
    if (otherBars)
      return void 0;
    if (linear2 === void 0)
      return call0.callee.symbol === "abs" ? byExactSignChanges(node, call0, variable, depth2) : void 0;
    const smooth = replaceSubtree(
      node,
      call0,
      call0.callee.symbol === "abs" ? u : number2(1)
    );
    const root2 = fold(divide(negative2(linear2.b), linear2.a));
    if (!Number.isFinite(evaluate(root2, {})))
      return void 0;
    try {
      return recorded(TECHNIQUES.absolute, () => {
        const G = antiderivative(fold(smooth), variable, depth2 + 1);
        const atRoot = fold(replaceIdentifier(G, variable, root2));
        if (!Number.isFinite(evaluate(atRoot, {})))
          throw new IntegrationError(
            "The antiderivative has no value at the corner."
          );
        const piece = fold(subtract(G, atRoot));
        const signed = fold(multiply(call("sign", u), piece));
        const quotient = dividedByLinear(piece, linear2, variable);
        if (quotient === void 0)
          return signed;
        return fold(multiply(call("abs", u), quotient));
      });
    } catch (error2) {
      if (!(error2 instanceof IntegrationError))
        throw error2;
      return void 0;
    }
  }
  function byExactSignChanges(node, bars, variable, depth2) {
    const [g] = bars.args;
    const changes = exactSignChanges(g, variable);
    if (changes === void 0)
      return void 0;
    const signAt = (x) => Math.sign(evaluate(g, { [variable]: x }));
    try {
      return recorded(TECHNIQUES.absolute, () => {
        const G = antiderivative(
          fold(replaceSubtree(node, bars, g)),
          variable,
          depth2 + 1
        );
        if (changes.length === 0) {
          const sample = [0, 1, 0.5, -1, 2].find(
            (x) => signAt(x) !== 0 && !Number.isNaN(signAt(x))
          );
          if (sample === void 0)
            throw new IntegrationError("The sign inside the bars is unknown.");
          return signAt(sample) > 0 ? G : fold(negative2(G));
        }
        let F = multiply(call("sign", g), G);
        changes.forEach((change, i) => {
          const next = changes[i + 1]?.value ?? change.value + 2;
          const after = signAt((change.value + next) / 2);
          const at2 = fold(replaceIdentifier(G, variable, change.node));
          if (!Number.isFinite(evaluate(at2, {})))
            throw new IntegrationError(
              "The antiderivative has no value where the sign changes."
            );
          F = subtract(
            F,
            multiply(
              multiply(number2(after), at2),
              call("sign", subtract(id3(variable), change.node))
            )
          );
        });
        return fold(F);
      });
    } catch (error2) {
      if (!(error2 instanceof IntegrationError))
        throw error2;
      return void 0;
    }
  }
  function dividedByLinear(piece, linear2, variable) {
    const coefficients = coefficientsIn(fold(expand(piece).node), variable, 12);
    const a = rationalOf(fold(linear2.a));
    const b = rationalOf(fold(linear2.b));
    if (coefficients === void 0 || a === void 0 || b === void 0)
      return void 0;
    const q = coefficients.map((c) => rationalOf(fold(c)));
    if (q.some((c) => c === void 0))
      return void 0;
    const values = q.map((c) => c.n / c.d);
    const root2 = -(b.n / b.d) / (a.n / a.d);
    const degree3 = values.length - 1;
    if (degree3 < 1)
      return void 0;
    const s = new Array(degree3).fill(0);
    let carry = 0;
    for (let k = degree3; k >= 1; k--) {
      carry = values[k] + carry * root2;
      s[k - 1] = carry;
    }
    const remainder = values[0] + carry * root2;
    if (Math.abs(remainder) > 1e-12 * Math.max(1, ...values.map(Math.abs)))
      return void 0;
    const scale = a.d / a.n;
    const nodes = s.map((c) => exactly(c * scale));
    if (nodes.some((n) => n.type === "Constant" && !Number.isInteger(n.value)))
      return void 0;
    return fold(rebuild(nodes, variable));
  }
  function openedDoubleAngles(node, variable) {
    const singles = [];
    visit(node, (child) => {
      if (child.type === "FunctionCall" && child.args.length === 1 && ["sin", "cos", "tan"].includes(child.callee.symbol) && dependsOn(child.args[0], variable))
        singles.push(child.args[0]);
    });
    let changed = false;
    const walk = (n) => {
      switch (n.type) {
        case "Negative":
          return { ...n, arg: walk(n.arg) };
        case "BinaryOperator":
          return { ...n, left: walk(n.left), right: walk(n.right) };
        case "FunctionCall": {
          const name = n.callee.symbol;
          if (n.args.length !== 1 || name !== "sin" && name !== "cos")
            return { ...n, args: n.args.map(walk) };
          const half = fold(divide(n.args[0], number2(2)));
          if (!singles.some((single2) => sameTree(fold(single2), half)))
            return { ...n, args: n.args.map(walk) };
          changed = true;
          const sin2 = call("sin", half);
          const cos2 = call("cos", half);
          return name === "sin" ? multiply(number2(2), multiply(sin2, cos2)) : subtract(power2(cos2, number2(2)), power2(sin2, number2(2)));
        }
        default:
          return n;
      }
    };
    const rewritten = walk(node);
    return changed ? fold(rewritten) : void 0;
  }
  function squareCompletingShift(node, variable) {
    let offset;
    visit(node, (child) => {
      if (offset !== void 0)
        return;
      const radicand = child.type === "FunctionCall" && child.callee.symbol === "sqrt" && child.args.length === 1 ? child.args[0] : child.type === "BinaryOperator" && child.name === "Exponent" && rationalOf(child.right)?.d === 2 ? child.left : void 0;
      if (radicand === void 0 || !dependsOn(radicand, variable))
        return;
      const c = coefficientsIn(fold(expand(radicand).node), variable, 2);
      if (c?.length !== 3)
        return;
      const [, b, a] = c.map((k2) => rationalOf(fold(k2)));
      if (a === void 0 || b === void 0 || a.n === 0 || b.n === 0)
        return;
      const n = b.n * a.d;
      const d = 2 * b.d * a.n;
      const g = gcdOf(Math.abs(n), Math.abs(d));
      offset = { n: Math.sign(d) * n / g, d: Math.abs(d) / g };
    });
    if (offset === void 0)
      return void 0;
    const name = freshName(node, ["w", "u", "s", "v"]);
    const k = rationalNode(offset);
    const moved = fold(
      expandRadicands(replaceIdentifier(node, variable, subtract(id3(name), k)))
    );
    const opened2 = fold(expand(moved).node);
    return {
      integrands: sameTree(opened2, moved) ? [moved] : [opened2, moved],
      name,
      w: add(id3(variable), k)
    };
  }
  function expandRadicands(node) {
    switch (node.type) {
      case "FunctionCall":
        return {
          ...node,
          args: node.args.map(
            (arg) => node.callee.symbol === "sqrt" ? fold(expand(arg).node) : expandRadicands(arg)
          )
        };
      case "BinaryOperator":
        return node.name === "Exponent" && rationalOf(node.right)?.d === 2 ? { ...node, left: fold(expand(node.left).node) } : {
          ...node,
          left: expandRadicands(node.left),
          right: expandRadicands(node.right)
        };
      case "Negative":
        return { ...node, arg: expandRadicands(node.arg) };
      default:
        return node;
    }
  }
  function bySubstitution(node, variable, depth2) {
    if (depth2 >= MAX_SUBSTITUTION_DEPTH)
      return void 0;
    const found = findSubstitution(node, variable);
    if (found === void 0)
      return void 0;
    try {
      return recorded(
        TECHNIQUES.substitution,
        () => fold(
          powersOfPowers(
            replaceIdentifier(
              antiderivative(found.integrand, found.name, depth2 + 1),
              found.name,
              found.u
            )
          )
        )
      );
    } catch (error2) {
      if (!(error2 instanceof IntegrationError))
        throw error2;
      return void 0;
    }
  }
  function byRule(node, variable, depth2) {
    if (!dependsOn(node, variable))
      return recorded(TECHNIQUES.power, () => multiply(node, id3(variable)));
    switch (node.type) {
      case "Identifier":
        return recorded(
          TECHNIQUES.power,
          () => divide(power2(id3(variable), number2(2)), number2(2))
        );
      case "Negative":
        return negative2(antiderivative(node.arg, variable, depth2));
      case "BinaryOperator":
        return binaryIntegral(node, variable, depth2);
      case "FunctionCall":
        return recorded(TECHNIQUES.table, () => functionIntegral(node, variable));
      default:
        throw new IntegrationError(
          `${describe3(node)} cannot be integrated symbolically.`
        );
    }
  }
  function binaryIntegral(node, variable, depth2) {
    const { left, right } = node;
    switch (node.name) {
      case "Add":
        return add(
          antiderivative(left, variable, depth2),
          antiderivative(right, variable, depth2)
        );
      case "Subtract":
        return subtract(
          antiderivative(left, variable, depth2),
          antiderivative(right, variable, depth2)
        );
      case "Multiply":
      case "CrossMultiply": {
        const leftHas = dependsOn(left, variable);
        const rightHas = dependsOn(right, variable);
        if (leftHas && rightHas) {
          const structured = record(
            TECHNIQUES.expTrig,
            () => expTrigPolynomial(node, variable)
          );
          if (structured !== void 0)
            return structured;
          const cyclic = record(
            TECHNIQUES.cyclic,
            () => exponentialTimesWave(left, right, variable)
          );
          if (cyclic !== void 0)
            return cyclic;
          const substituted = bySubstitution(node, variable, depth2);
          if (substituted !== void 0)
            return substituted;
          return recorded(
            TECHNIQUES.parts,
            () => byParts(left, right, variable, depth2)
          );
        }
        return leftHas ? multiply(right, antiderivative(left, variable, depth2)) : multiply(left, antiderivative(right, variable, depth2));
      }
      case "Divide": {
        if (!dependsOn(right, variable)) {
          return divide(antiderivative(left, variable, depth2), right);
        }
        if (dependsOn(left, variable)) {
          const before = trace.length;
          const split5 = record(
            TECHNIQUES.partialFractions,
            () => partialFractionIntegral(left, right, variable)
          );
          if (split5 !== void 0) {
            const between = trace.length;
            const substituted = bySubstitution(node, variable, depth2);
            if (substituted !== void 0 && nodeCount(fold(substituted)) < nodeCount(fold(split5))) {
              trace.splice(before, between - before);
              return substituted;
            }
            trace.length = between;
            return split5;
          }
          const rational3 = record(
            TECHNIQUES.completingSquare,
            () => rationalIntegral(
              left,
              right,
              variable,
              (piece) => antiderivative(piece, variable, depth2)
            )
          );
          if (rational3 !== void 0)
            return rational3;
          throw new IntegrationError(
            "A quotient with the variable above and below the line needs a substitution or partial fractions, which this does not do."
          );
        }
        if (right.type === "BinaryOperator" && right.name === "Exponent" && linearIn(right.left, variable) === void 0) {
          const repeated = record(
            TECHNIQUES.partialFractions,
            () => partialFractionIntegral(left, right, variable)
          ) ?? record(
            TECHNIQUES.reduction,
            () => squaredPowerIntegral(left, right, variable)
          );
          if (repeated !== void 0)
            return repeated;
        }
        if (right.type === "BinaryOperator" && right.name === "Exponent" && right.right.type === "Constant") {
          return antiderivative(
            multiply(left, power2(right.left, number2(-right.right.value))),
            variable,
            depth2
          );
        }
        const split4 = record(
          TECHNIQUES.partialFractions,
          () => partialFractions(right, variable)
        );
        if (split4 !== void 0)
          return multiply(left, split4);
        const rational2 = record(
          TECHNIQUES.completingSquare,
          () => rationalIntegral(
            left,
            right,
            variable,
            (piece) => antiderivative(piece, variable, depth2)
          )
        );
        if (rational2 !== void 0)
          return rational2;
        const decomposed = record(
          TECHNIQUES.partialFractions,
          () => partialFractionIntegral(left, right, variable)
        );
        if (decomposed !== void 0)
          return decomposed;
        const symbolic = record(
          TECHNIQUES.table,
          () => squaredDenominatorIntegral(left, right, variable)
        );
        if (symbolic !== void 0)
          return symbolic;
        const root2 = record(
          TECHNIQUES.table,
          () => rootDenominatorIntegral(left, right, variable)
        );
        if (root2 !== void 0)
          return root2;
        const linear2 = linearIn(right, variable);
        if (linear2 === void 0) {
          throw new IntegrationError(
            "Only a denominator that is linear in the variable can be integrated here."
          );
        }
        return recorded(
          TECHNIQUES.table,
          () => divide(multiply(left, call("ln", call("abs", right))), linear2.a)
        );
      }
      case "Exponent":
        return exponentIntegral(left, right, variable, depth2);
    }
  }
  function partialFractions(denominator, variable) {
    if (denominator.type !== "BinaryOperator" || denominator.name !== "Multiply" && denominator.name !== "CrossMultiply")
      return void 0;
    const first = linearIn(denominator.left, variable);
    const second = linearIn(denominator.right, variable);
    if (first === void 0 || second === void 0)
      return void 0;
    if (isZeroConstant(first.a) || isZeroConstant(second.a))
      return void 0;
    const cross = fold(
      subtract(multiply(first.a, second.b), multiply(second.a, first.b))
    );
    if (isZeroConstant(cross))
      return void 0;
    return divide(
      subtract(
        call("ln", call("abs", denominator.left)),
        call("ln", call("abs", denominator.right))
      ),
      cross
    );
  }
  function oddSecantCube(base2, variable) {
    if (base2.type !== "FunctionCall" || base2.args.length !== 1)
      return void 0;
    const name = base2.callee.symbol;
    if (name !== "sec" && name !== "csc")
      return void 0;
    const [argument] = base2.args;
    const linear2 = linearIn(argument, variable);
    if (linear2 === void 0 || isZeroConstant(linear2.a))
      return void 0;
    if (name === "sec") {
      const inner2 = add(
        multiply(call("sec", argument), call("tan", argument)),
        call("ln", call("abs", add(call("sec", argument), call("tan", argument))))
      );
      return divide(inner2, multiply(number2(2), linear2.a));
    }
    const inner = add(
      multiply(call("csc", argument), call("cot", argument)),
      call("ln", call("abs", add(call("csc", argument), call("cot", argument))))
    );
    return negative2(divide(inner, multiply(number2(2), linear2.a)));
  }
  function exponentialTimesWave(left, right, variable) {
    const pair = (first, second) => {
      const exponential4 = asExponential(first, variable);
      const wave2 = asWave2(second, variable);
      return exponential4 === void 0 || wave2 === void 0 ? void 0 : { exponential: exponential4, wave: wave2 };
    };
    const factors = [];
    quotientFactors(multiply(left, right), true, factors);
    const varying = factors.filter((factor) => dependsOn(factor.node, variable));
    let constantFactor = number2(1);
    for (const factor of factors) {
      if (dependsOn(factor.node, variable))
        continue;
      constantFactor = factor.inNumerator ? multiply(constantFactor, factor.node) : divide(constantFactor, factor.node);
    }
    const found = varying.length === 2 && varying.every((factor) => factor.inNumerator) ? pair(varying[0].node, varying[1].node) ?? pair(varying[1].node, varying[0].node) : pair(left, right) ?? pair(right, left);
    if (found === void 0)
      return void 0;
    if (varying.length !== 2)
      constantFactor = number2(1);
    const { exponential: exponential3, wave } = found;
    const scale = add(square3(exponential3.rate), square3(wave.rate));
    const sine2 = call("sin", wave.argument);
    const cosine2 = call("cos", wave.argument);
    const inner = wave.name === "sin" ? subtract(multiply(exponential3.rate, sine2), multiply(wave.rate, cosine2)) : add(multiply(exponential3.rate, cosine2), multiply(wave.rate, sine2));
    return multiply(
      constantFactor,
      divide(multiply(exponential3.node, inner), scale)
    );
  }
  function asExponential(node, variable) {
    const exponent2 = node.type === "FunctionCall" && node.callee.symbol === "exp" && node.args.length === 1 ? node.args[0] : node.type === "BinaryOperator" && node.name === "Exponent" && node.left.type === "Identifier" && node.left.symbol === "e" ? node.right : void 0;
    if (exponent2 === void 0)
      return void 0;
    const linear2 = linearIn(exponent2, variable);
    if (linear2 === void 0 || isZeroConstant(linear2.a))
      return void 0;
    return { node, rate: linear2.a };
  }
  function asWave2(node, variable) {
    if (node.type !== "FunctionCall" || node.args.length !== 1)
      return void 0;
    const name = node.callee.symbol;
    if (name !== "sin" && name !== "cos")
      return void 0;
    const linear2 = linearIn(node.args[0], variable);
    if (linear2 === void 0 || isZeroConstant(linear2.a))
      return void 0;
    return { name, argument: node.args[0], rate: linear2.a };
  }
  var MAX_PARTS_DEGREE = 8;
  function byParts(left, right, variable, depth2) {
    const leftDegree = polynomialDegree(left, variable);
    const rightDegree = polynomialDegree(right, variable);
    const usePolynomialLeft = leftDegree !== void 0 && (rightDegree === void 0 || leftDegree <= rightDegree);
    const polynomial = usePolynomialLeft ? left : right;
    const rest = usePolynomialLeft ? right : left;
    const degree3 = usePolynomialLeft ? leftDegree : rightDegree;
    if (depth2 >= MAX_SUBSTITUTION_DEPTH) {
      throw new IntegrationError(
        "Integration by parts did not terminate on this product."
      );
    }
    if (leftDegree !== void 0 && rightDegree !== void 0) {
      throw new IntegrationError(
        "A product of two polynomials is multiplied out rather than integrated by parts."
      );
    }
    const tabular = tabularParts(left, right, variable, depth2);
    if (tabular !== void 0)
      return tabular;
    const inverseLeft = isInverseOrLog(left);
    const inverseRight = isInverseOrLog(right);
    if (degree3 === void 0 && (inverseLeft || inverseRight)) {
      const chosen = inverseLeft ? left : right;
      const other = inverseLeft ? right : left;
      const inner = antiderivative(other, variable, depth2 + 1);
      const chosenDerivative = fold(differentiate(chosen, variable));
      return subtract(
        multiply(chosen, inner),
        antiderivative(
          fold(multiply(chosenDerivative, inner)),
          variable,
          depth2 + 1
        )
      );
    }
    if (degree3 === void 0) {
      const flattened = partsOnFactors(left, right, variable, depth2);
      if (flattened !== void 0)
        return flattened;
    }
    if (degree3 === void 0 || degree3 > MAX_PARTS_DEGREE) {
      throw new IntegrationError(
        "A product of two expressions that both contain the variable needs integration by parts, and neither factor is a polynomial this can reduce."
      );
    }
    if (isInverseOrLog(rest)) {
      const inner = antiderivative(polynomial, variable, depth2 + 1);
      const restDerivative = fold(differentiate(rest, variable));
      return subtract(
        multiply(rest, inner),
        antiderivative(fold(multiply(restDerivative, inner)), variable, depth2 + 1)
      );
    }
    if (containsRoot(rest, variable)) {
      throw new IntegrationError(
        "A polynomial times a root is cleared by substitution rather than by parts."
      );
    }
    const restIntegral = antiderivative(rest, variable, depth2 + 1);
    const derivative4 = polynomialDerivative(polynomial, variable);
    if (isZeroConstant(derivative4))
      return multiply(polynomial, restIntegral);
    return subtract(
      multiply(polynomial, restIntegral),
      antiderivative(
        fold(multiply(derivative4, restIntegral)),
        variable,
        depth2 + 1
      )
    );
  }
  function tabularParts(left, right, variable, depth2) {
    const factors = [];
    quotientFactors(multiply(left, right), true, factors);
    let polynomial = number2(1);
    let rest = number2(1);
    let hasPolynomial = false;
    let hasRest = false;
    for (const { node, inNumerator } of factors) {
      if (!dependsOn(node, variable)) {
        polynomial = inNumerator ? multiply(polynomial, node) : divide(polynomial, node);
      } else if (inNumerator && polynomialDegree(node, variable) !== void 0) {
        polynomial = multiply(polynomial, node);
        hasPolynomial = true;
      } else {
        rest = inNumerator ? multiply(rest, node) : divide(rest, node);
        hasRest = true;
      }
    }
    if (!hasPolynomial || !hasRest)
      return void 0;
    rest = fold(rest);
    if (!isTabularFamily(rest, variable))
      return void 0;
    let p = fold(polynomial);
    const degree3 = polynomialDegree(p, variable);
    if (degree3 === void 0 || degree3 > MAX_PARTS_DEGREE)
      return void 0;
    const terms = [];
    let r = rest;
    try {
      for (let k = 0; k <= degree3; k += 1) {
        r = antiderivative(fold(expand(r).node), variable, depth2 + 1);
        terms.push({ value: multiply(p, r), negated: k % 2 === 1 });
        p = fold(polynomialDerivative(p, variable));
        if (isZeroConstant(p))
          break;
      }
    } catch (error2) {
      if (!(error2 instanceof IntegrationError))
        throw error2;
      return void 0;
    }
    return rebuildSum(terms);
  }
  function containsRoot(node, variable) {
    let found = false;
    const nonlinear = (inside) => dependsOn(inside, variable) && linearIn(inside, variable) === void 0;
    visit(node, (child) => {
      if (child.type === "FunctionCall" && child.callee.symbol === "sqrt" && child.args.length === 1 && nonlinear(child.args[0]))
        found = true;
      if (child.type === "BinaryOperator" && child.name === "Exponent") {
        const exponent2 = constantValue(fold(child.right));
        if (exponent2 !== void 0 && !Number.isInteger(exponent2) && nonlinear(child.left))
          found = true;
      }
    });
    return found;
  }
  function factorCommonExponential(node, variable) {
    const terms = topLevelTerms(node);
    if (terms.length < 3)
      return void 0;
    const split4 = terms.map(({ term: term2, negated }) => {
      const factors = [];
      quotientFactors(term2, true, factors);
      return { factors, negated };
    });
    const candidate = split4[0].factors.find(
      (factor) => factor.inNumerator && asExponential(factor.node, variable) !== void 0
    );
    if (candidate === void 0)
      return void 0;
    const rest = [];
    for (const { factors, negated } of split4) {
      const index = factors.findIndex(
        (factor) => factor.inNumerator && sameTree(factor.node, candidate.node)
      );
      if (index < 0)
        return void 0;
      const value = factors.reduce(
        (product, factor, i) => i === index ? product : factor.inNumerator ? multiply(product, factor.node) : divide(product, factor.node),
        number2(1)
      );
      rest.push({ value: fold(value), negated });
    }
    let common = 0;
    for (const { value } of rest) {
      const { coefficient } = splitRationalCoefficient(value);
      common = common === 0 ? coefficient.d : lcmOf(common, coefficient.d);
    }
    const scaled2 = common > 1 ? rest.map(({ value, negated }) => ({
      value: fold(multiply(number2(common), value)),
      negated
    })) : rest;
    const inside = multiply(candidate.node, tidySums(rebuildSum(scaled2)));
    return fold(common > 1 ? divide(inside, number2(common)) : inside);
  }
  function lcmOf(a, b) {
    return a / gcdOf(a, b) * b;
  }
  function isTabularFamily(node, variable) {
    const factors = [];
    quotientFactors(node, true, factors);
    return factors.every(({ node: factor, inNumerator }) => {
      if (!dependsOn(factor, variable))
        return true;
      if (!inNumerator)
        return false;
      if (asExponential(factor, variable) !== void 0)
        return true;
      if (factor.type === "BinaryOperator" && factor.name === "Exponent" && !dependsOn(factor.left, variable)) {
        return linearIn(factor.right, variable) !== void 0;
      }
      return factor.type === "FunctionCall" && ["sin", "cos", "sinh", "cosh"].includes(factor.callee.symbol) && factor.args.length === 1 && linearIn(factor.args[0], variable) !== void 0;
    });
  }
  function partsOnFactors(left, right, variable, depth2) {
    const factors = [];
    quotientFactors(multiply(left, right), true, factors);
    const chosen = factors.findIndex(
      (factor) => factor.inNumerator && isInverseOrLog(factor.node)
    );
    if (chosen < 0)
      return void 0;
    const u = factors[chosen].node;
    let dv = number2(1);
    factors.forEach((factor, index) => {
      if (index === chosen)
        return;
      dv = factor.inNumerator ? multiply(dv, factor.node) : divide(dv, factor.node);
    });
    dv = fold(dv);
    if (!dependsOn(dv, variable))
      return void 0;
    try {
      const v = antiderivative(dv, variable, depth2 + 1);
      const du = fold(differentiate(u, variable));
      return subtract(
        multiply(u, v),
        antiderivative(fold(multiply(du, v)), variable, depth2 + 1)
      );
    } catch (error2) {
      if (!(error2 instanceof IntegrationError))
        throw error2;
      return void 0;
    }
  }
  var INVERSE_OR_LOG = /* @__PURE__ */ new Set([
    "ln",
    "log",
    "arcsin",
    "arccos",
    "arctan",
    "arccot",
    "arcsec",
    "arccsc",
    "arcsinh",
    "arccosh",
    "arctanh"
  ]);
  function isInverseOrLog(node) {
    if (node.type === "FunctionCall")
      return INVERSE_OR_LOG.has(node.callee.symbol);
    if (node.type === "BinaryOperator" && node.name === "Exponent") {
      const exponent2 = constantValue(fold(node.right));
      return exponent2 !== void 0 && Number.isInteger(exponent2) && exponent2 >= 1 && isInverseOrLog(node.left);
    }
    return false;
  }
  function squaredDenominatorIntegral(numerator, denominator, variable) {
    if (dependsOn(numerator, variable))
      return void 0;
    const parts = coefficientsIn(denominator, variable, 2);
    if (parts === void 0 || parts.length !== 3)
      return void 0;
    const linearTerm = constantValue(fold(parts[1]));
    const quadratic2 = constantValue(fold(parts[2]));
    if (linearTerm !== 0 || quadratic2 !== 1)
      return void 0;
    const constant3 = fold(parts[0]);
    if (constant3.type !== "BinaryOperator" || constant3.name !== "Exponent" || constantValue(constant3.right) !== 2 || dependsOn(constant3.left, variable)) {
      return void 0;
    }
    const scale = constant3.left;
    return multiply(
      numerator,
      divide(call("arctan", divide(id3(variable), scale)), scale)
    );
  }
  function squaredPowerIntegral(numerator, denominator, variable) {
    if (dependsOn(numerator, variable))
      return void 0;
    if (denominator.type !== "BinaryOperator" || denominator.name !== "Exponent")
      return void 0;
    const n = constantValue(fold(denominator.right));
    if (n === void 0 || !Number.isInteger(n) || n < 2 || n > 8)
      return void 0;
    const base2 = denominator.left;
    const bottom = squaredDenominatorIntegral(number2(1), base2, variable);
    if (bottom === void 0)
      return void 0;
    const parts = coefficientsIn(base2, variable, 2);
    if (parts === void 0)
      return void 0;
    const squareOfScale = fold(parts[0]);
    const x = id3(variable);
    const level = (k) => {
      if (k === 1)
        return bottom;
      const denominatorOfStep = multiply(
        multiply(number2(2), squareOfScale),
        number2(k - 1)
      );
      return add(
        divide(x, multiply(denominatorOfStep, power2(base2, number2(k - 1)))),
        multiply(divide(number2(2 * k - 3), denominatorOfStep), level(k - 1))
      );
    };
    return multiply(numerator, level(n));
  }
  function rootDenominatorIntegral(numerator, denominator, variable) {
    if (denominator.type !== "FunctionCall" || denominator.callee.symbol !== "sqrt" || denominator.args.length !== 1) {
      return void 0;
    }
    if (dependsOn(numerator, variable))
      return void 0;
    const inside = coefficientsIn(denominator.args[0], variable, 2);
    if (inside === void 0 || inside.length !== 3)
      return void 0;
    const constant3 = constantValue(fold(inside[0]));
    const linearTerm = constantValue(fold(inside[1]));
    const quadratic2 = constantValue(fold(inside[2]));
    if (constant3 === void 0 || linearTerm === void 0 || quadratic2 === void 0 || quadratic2 === 0) {
      return void 0;
    }
    const shift = linearTerm / (2 * quadratic2);
    const remainder = constant3 - linearTerm * linearTerm / (4 * quadratic2);
    const shifted = add(id3(variable), exactly(shift));
    if (remainder === 0)
      return void 0;
    const scale = call("sqrt", exactly(Math.abs(remainder / quadratic2)));
    const argument = divide(shifted, scale);
    const magnitude = call("sqrt", exactly(Math.abs(quadratic2)));
    const named2 = (name) => multiply(numerator, divide(call(name, argument), magnitude));
    if (remainder > 0 && quadratic2 < 0)
      return named2("arcsin");
    if (remainder > 0 && quadratic2 > 0)
      return named2("arcsinh");
    if (remainder < 0 && quadratic2 > 0)
      return named2("arccosh");
    return void 0;
  }
  function exactly(value) {
    if (Number.isInteger(value))
      return number2(value);
    for (let denominator = 1; denominator <= 1e4; denominator += 1) {
      const scaled2 = value * denominator;
      if (Math.abs(scaled2 - Math.round(scaled2)) < 1e-9)
        return divide(number2(Math.round(scaled2)), number2(denominator));
    }
    return number2(value);
  }
  function trigPowerIntegral(base2, exponent2, variable, depth2) {
    if (exponent2.type !== "Constant")
      return void 0;
    if (exponent2.value === 3)
      return oddSecantCube(base2, variable);
    if (exponent2.value !== 2)
      return void 0;
    if (base2.type !== "FunctionCall" || base2.args.length !== 1)
      return void 0;
    const name = base2.callee.symbol;
    const [argument] = base2.args;
    const linear2 = linearIn(argument, variable);
    if (linear2 === void 0 || isZeroConstant(linear2.a))
      return void 0;
    const over = (node) => divide(node, linear2.a);
    const x = id3(variable);
    switch (name) {
      case "sec":
        return over(call("tan", argument));
      case "csc":
        return negative2(over(call("cot", argument)));
      case "sech":
        return over(call("tanh", argument));
      case "csch":
        return negative2(over(call("coth", argument)));
      case "tan":
        return subtract(over(call("tan", argument)), x);
      case "cot":
        return subtract(negative2(over(call("cot", argument))), x);
      case "tanh":
        return subtract(x, over(call("tanh", argument)));
      case "coth":
        return subtract(x, over(call("coth", argument)));
      case "sinh":
      case "cosh": {
        const doubled = call("sinh", multiply(number2(2), argument));
        const half = divide(x, number2(2));
        const wave = divide(doubled, multiply(number2(4), linear2.a));
        return name === "sinh" ? subtract(wave, half) : add(wave, half);
      }
      case "sin":
      case "cos": {
        const doubled = call("sin", multiply(number2(2), argument));
        const half = divide(x, number2(2));
        const wave = divide(doubled, multiply(number2(4), linear2.a));
        return name === "sin" ? subtract(half, wave) : add(half, wave);
      }
      default:
        return void 0;
    }
  }
  function polynomialDegree(node, variable) {
    if (!dependsOn(node, variable))
      return 0;
    switch (node.type) {
      case "Identifier":
        return node.symbol === variable ? 1 : 0;
      case "Negative":
        return polynomialDegree(node.arg, variable);
      case "BinaryOperator": {
        const left = polynomialDegree(node.left, variable);
        const right = polynomialDegree(node.right, variable);
        switch (node.name) {
          case "Add":
          case "Subtract":
            return left === void 0 || right === void 0 ? void 0 : Math.max(left, right);
          case "Multiply":
          case "CrossMultiply":
            return left === void 0 || right === void 0 ? void 0 : left + right;
          case "Divide":
            return right === 0 && left !== void 0 ? left : void 0;
          case "Exponent": {
            if (node.right.type !== "Constant")
              return void 0;
            const exponent2 = node.right.value;
            if (!Number.isInteger(exponent2) || exponent2 < 0)
              return void 0;
            return left === void 0 ? void 0 : left * exponent2;
          }
        }
        return void 0;
      }
      default:
        return void 0;
    }
  }
  function polynomialDerivative(node, variable) {
    if (!dependsOn(node, variable))
      return number2(0);
    switch (node.type) {
      case "Identifier":
        return number2(node.symbol === variable ? 1 : 0);
      case "Negative":
        return negative2(polynomialDerivative(node.arg, variable));
      case "BinaryOperator": {
        const { left, right } = node;
        switch (node.name) {
          case "Add":
            return add(
              polynomialDerivative(left, variable),
              polynomialDerivative(right, variable)
            );
          case "Subtract":
            return subtract(
              polynomialDerivative(left, variable),
              polynomialDerivative(right, variable)
            );
          case "Multiply":
          case "CrossMultiply":
            return add(
              multiply(polynomialDerivative(left, variable), right),
              multiply(left, polynomialDerivative(right, variable))
            );
          case "Divide":
            return divide(polynomialDerivative(left, variable), right);
          case "Exponent": {
            if (right.type !== "Constant") {
              throw new IntegrationError(
                "A symbolic exponent is not a polynomial term."
              );
            }
            return multiply(
              multiply(right, power2(left, number2(right.value - 1))),
              polynomialDerivative(left, variable)
            );
          }
        }
        break;
      }
      default:
        break;
    }
    throw new IntegrationError("That is not a polynomial term.");
  }
  function coefficientsIn(node, variable, maxDegree = 2) {
    if (!dependsOn(node, variable))
      return [node];
    switch (node.type) {
      case "Identifier":
        return node.symbol === variable ? [number2(0), number2(1)] : void 0;
      case "Negative": {
        const inner = coefficientsIn(node.arg, variable, maxDegree);
        return inner?.map((c) => negative2(c));
      }
      case "BinaryOperator": {
        const { left, right } = node;
        switch (node.name) {
          case "Add":
          case "Subtract": {
            const l = coefficientsIn(left, variable, maxDegree);
            const r = coefficientsIn(right, variable, maxDegree);
            if (l === void 0 || r === void 0)
              return void 0;
            const out = [];
            for (let i = 0; i < Math.max(l.length, r.length); i++) {
              const a = l[i] ?? number2(0);
              const b = r[i] ?? number2(0);
              out.push(node.name === "Add" ? add(a, b) : subtract(a, b));
            }
            return out;
          }
          case "Multiply":
          case "CrossMultiply": {
            const l = coefficientsIn(left, variable, maxDegree);
            const r = coefficientsIn(right, variable, maxDegree);
            if (l === void 0 || r === void 0)
              return void 0;
            if (l.length + r.length - 2 > maxDegree)
              return void 0;
            const out = Array.from(
              { length: l.length + r.length - 1 },
              () => number2(0)
            );
            for (let i = 0; i < l.length; i++)
              for (let j = 0; j < r.length; j++)
                out[i + j] = add(out[i + j], multiply(l[i], r[j]));
            return out;
          }
          case "Divide": {
            if (dependsOn(right, variable))
              return void 0;
            const l = coefficientsIn(left, variable, maxDegree);
            return l?.map((c) => divide(c, right));
          }
          case "Exponent": {
            if (right.type !== "Constant")
              return void 0;
            const power8 = right.value;
            if (!Number.isInteger(power8) || power8 < 0 || power8 > maxDegree)
              return void 0;
            let out = [number2(1)];
            for (let i = 0; i < power8; i++) {
              const next = coefficientsIn(
                binop2("Multiply", rebuild(out, variable), left),
                variable,
                maxDegree
              );
              if (next === void 0)
                return void 0;
              out = next.map((coefficient) => fold(coefficient));
            }
            return out;
          }
        }
        return void 0;
      }
      default:
        return void 0;
    }
  }
  function rebuild(coefficients, variable) {
    return coefficients.reduce(
      (sum3, coefficient, index) => index === 0 ? coefficient : add(sum3, multiply(coefficient, power2(id3(variable), number2(index)))),
      number2(0)
    );
  }
  function isZeroConstant(node) {
    const simplified = fold(node);
    return simplified.type === "Constant" && simplified.value === 0;
  }
  function exponentIntegral(base2, exponent2, variable, depth2) {
    const baseHas = dependsOn(base2, variable);
    const exponentHas = dependsOn(exponent2, variable);
    const trigonometric = record(
      exponent2.type === "Constant" && exponent2.value === 3 ? TECHNIQUES.reduction : TECHNIQUES.table,
      () => trigPowerIntegral(base2, exponent2, variable, depth2)
    );
    if (trigonometric !== void 0)
      return trigonometric;
    if (baseHas && !exponentHas) {
      const linear2 = linearIn(base2, variable);
      if (linear2 === void 0) {
        throw new IntegrationError(
          "Only a power of an expression linear in the variable can be integrated here."
        );
      }
      const rational2 = rationalOf(exponent2);
      if (rational2 === void 0) {
        throw new IntegrationError(
          "A symbolic exponent could be -1, where the power rule does not apply, so this is not integrated."
        );
      }
      if (rational2.n === -rational2.d) {
        return recorded(
          TECHNIQUES.table,
          () => divide(call("ln", call("abs", base2)), linear2.a)
        );
      }
      const raised2 = rationalNode({
        n: rational2.n + rational2.d,
        d: rational2.d
      });
      return recorded(
        TECHNIQUES.power,
        () => divide(divide(power2(base2, raised2), raised2), linear2.a)
      );
    }
    if (!baseHas && exponentHas) {
      const linear2 = linearIn(exponent2, variable);
      if (linear2 === void 0) {
        throw new IntegrationError(
          "Only an exponential whose exponent is linear in the variable can be integrated here."
        );
      }
      const isE = base2.type === "Identifier" && base2.symbol === "e";
      const scale = isE ? linear2.a : multiply(linear2.a, call("ln", base2));
      return recorded(
        TECHNIQUES.table,
        () => divide(power2(base2, exponent2), scale)
      );
    }
    throw new IntegrationError(
      "An expression with the variable in both the base and the exponent cannot be integrated here."
    );
  }
  function functionIntegral(node, variable) {
    const name = node.callee.symbol;
    if (node.args.length !== 1) {
      throw new IntegrationError(
        `${name} takes more than one argument, so it cannot be integrated here.`
      );
    }
    const [argument] = node.args;
    const rule2 = FUNCTION_INTEGRALS[name];
    if (rule2 === void 0) {
      throw new IntegrationError(`The integral of ${name} is not known.`);
    }
    const linear2 = linearIn(argument, variable);
    if (linear2 === void 0) {
      throw new IntegrationError(
        `${name} of something that is not linear in the variable cannot be integrated here.`
      );
    }
    return divide(rule2(argument), linear2.a);
  }
  function describe3(node) {
    switch (node.type) {
      case "Integral":
        return "An integral";
      case "Derivative":
      case "Prime":
        return "A derivative";
      case "List":
      case "Range":
      case "ListComprehension":
        return "A list";
      case "Piecewise":
        return "A piecewise";
      case "RepeatedOperator":
        return "A sum or product";
      default:
        return `\`${node.type}\``;
    }
  }

  // src/plugins/physics-lab/symbolic/specialConstants.ts
  var cache = /* @__PURE__ */ new Map();
  function cached(key, digits, run) {
    const id8 = `${key} ${digits}`;
    let value = cache.get(id8);
    if (value === void 0) {
      value = run();
      cache.set(id8, value);
    }
    return value;
  }
  function eulerGamma(digits) {
    return cached("gamma", digits, () => {
      const n = Math.ceil((digits + 5) * Math.LN10 / 4) + 1;
      const terms = Math.ceil(3.5911 * n) + 1;
      const D = decimalContext(digits + Math.ceil(0.87 * n) + 15);
      const n2 = new D(n).pow(2);
      let a = D.ln(n).neg();
      let b = new D(1);
      let u = a;
      let v = b;
      for (let k = 1; k <= terms; k++) {
        b = b.times(n2).div(k * k);
        a = a.times(n2).div(k).plus(b).div(k);
        u = u.plus(a);
        v = v.plus(b);
      }
      return new (decimalContext(digits))(u.div(v));
    });
  }
  function zeta2(s, digits) {
    return cached(`zeta ${s}`, digits, () => {
      const n = Math.ceil((digits + 5) / Math.log10(3 + Math.sqrt(8))) + 1;
      const d = [];
      let term2 = 1n;
      let total = 0n;
      for (let i = 0; i <= n; i++) {
        total += term2;
        d.push(total);
        const N = BigInt(n);
        const I = BigInt(i);
        term2 = term2 * (N + I) * (N - I) * 4n / ((2n * I + 1n) * (2n * I + 2n));
      }
      const D = decimalContext(digits + Math.ceil(0.8 * n) + 15);
      const dn = new D(d[n].toString());
      let sum3 = new D(0);
      for (let k = 0; k < n; k++) {
        const weight = new D((d[k] - d[n]).toString());
        const piece = weight.div(new D(k + 1).pow(s));
        sum3 = k % 2 === 0 ? sum3.plus(piece) : sum3.minus(piece);
      }
      const eta = sum3.neg().div(dn);
      const value = eta.div(new D(1).minus(new D(2).pow(1 - s)));
      return new (decimalContext(digits))(value);
    });
  }
  function catalan(digits) {
    return cached("catalan", digits, () => {
      const D = decimalContext(digits + 15);
      const terms = Math.ceil((digits + 5) * Math.LN10 / Math.log(4)) + 5;
      let sum3 = new D(0);
      let central = 1n;
      for (let k = 0; k <= terms; k++) {
        if (k > 0)
          central = central * BigInt(2 * (2 * k - 1)) / BigInt(k);
        sum3 = sum3.plus(
          new D(1).div(new D(central.toString()).times((2 * k + 1) ** 2))
        );
      }
      const pi = D.acos(-1);
      const value = pi.div(8).times(D.ln(new D(2).plus(D.sqrt(3)))).plus(sum3.times(3).div(8));
      return new (decimalContext(digits))(value);
    });
  }
  function zetaDefinition(s) {
    const rising = s * (s + 1) * (s + 2);
    return `\\zeta_{${s}}=\\sum_{n=1}^{99}\\frac{1}{\\left(100-n\\right)^{${s}}}+\\frac{1}{${s - 1}\\cdot100^{${s - 1}}}+\\frac{1}{2\\cdot100^{${s}}}+\\frac{${s}}{12\\cdot100^{${s + 1}}}-\\frac{${rising}}{720\\cdot100^{${s + 3}}}`;
  }
  var SPECIAL_CONSTANTS = [
    {
      symbol: "gamma",
      name: "Euler's constant \u03B3",
      compute: eulerGamma,
      // H₁₀₀ − ln 100 − 1/200 + 1/(12·100²) − 1/(120·100⁴) + 1/(252·100⁶);
      // the next term is 1/(240·100⁸), about 4·10⁻¹⁹.
      definition: "\\gamma=\\sum_{n=1}^{100}\\frac{1}{n}-\\ln\\left(100\\right)-\\frac{1}{200}+\\frac{1}{120000}-\\frac{1}{12000000000}+\\frac{1}{252000000000000}"
    },
    {
      symbol: "zeta_3",
      name: "Ap\xE9ry's constant \u03B6(3)",
      compute: (digits) => zeta2(3, digits),
      definition: zetaDefinition(3)
    },
    {
      symbol: "zeta_5",
      name: "\u03B6(5)",
      compute: (digits) => zeta2(5, digits),
      definition: zetaDefinition(5)
    },
    {
      symbol: "zeta_7",
      name: "\u03B6(7)",
      compute: (digits) => zeta2(7, digits),
      definition: zetaDefinition(7)
    },
    {
      symbol: "G_c",
      name: "Catalan's constant G",
      compute: catalan,
      // Terms fall by four each time; forty of them reach 10⁻²⁶. Summed from
      // the smallest term up (k = 40 − n), for the same reason as ζ.
      definition: "G_{c}=\\frac{\\pi}{8}\\ln\\left(2+\\sqrt{3}\\right)+\\frac{3}{8}\\sum_{n=0}^{40}\\frac{1}{\\operatorname{nCr}\\left(80-2n,40-n\\right)\\left(81-2n\\right)^{2}}"
    }
  ];
  function specialBindings(digits) {
    const out = {};
    for (const c of SPECIAL_CONSTANTS)
      out[c.symbol] = c.compute(digits);
    return out;
  }
  function constantsIn(symbols) {
    return SPECIAL_CONSTANTS.filter((c) => symbols.includes(c.symbol));
  }

  // src/plugins/physics-lab/symbolic/exact.ts
  var { number: number4, binop: binop4, functionCall: functionCall4, id: id5, negative: negative4 } = augBuilders_exports;
  var PI2 = "pi";
  var E = "e";
  var OPAQUE = /* @__PURE__ */ new Map();
  var isOpaque = (atom) => atom.startsWith("@");
  function opaque(node, value, latex) {
    const key = `@${JSON.stringify(node)}`;
    if (!OPAQUE.has(key))
      OPAQUE.set(key, { node, value, latex });
    return [term(ONE, /* @__PURE__ */ new Map([[key, ONE]]))];
  }
  function lnPrime(p) {
    const key = `@ln:${p}`;
    if (!OPAQUE.has(key)) {
      OPAQUE.set(key, {
        node: functionCall4(id5("ln"), number4(Number(p))),
        value: Math.log(Number(p)),
        latex: `\\ln\\left(${p}\\right)`
      });
    }
    return [term(ONE, /* @__PURE__ */ new Map([[key, ONE]]))];
  }
  function logarithm(q) {
    if (!(q.n > 0n))
      return void 0;
    const top = factorize(q.n);
    const bottom = factorize(q.d);
    if (top === void 0 || bottom === void 0)
      return void 0;
    let total = ZERO2;
    for (const [p, e] of top)
      total = add5(total, multiply5(fromInteger(e), lnPrime(BigInt(p))));
    for (const [p, e] of bottom)
      total = subtract4(total, multiply5(fromInteger(e), lnPrime(BigInt(p))));
    return total;
  }
  function logarithmOfAtom(atom) {
    if (atom === E)
      return fromInteger(1);
    if (atom === PI2)
      return opaque(functionCall4(id5("ln"), id5("pi")), Math.log(Math.PI));
    if (isOpaque(atom))
      return void 0;
    return lnPrime(BigInt(atom));
  }
  function atomsOf(value) {
    return value.length === 1 ? value[0] : void 0;
  }
  var isPiAtom = (atom) => atom === PI2;
  var ZERO2 = [];
  function term(coeff, factors) {
    return { coeff, factors };
  }
  function fromRational(q) {
    return isZero(q) ? ZERO2 : [term(q, /* @__PURE__ */ new Map())];
  }
  var fromInteger = (n) => fromRational(rational(BigInt(n)));
  var PI_VALUE = [term(ONE, /* @__PURE__ */ new Map([[PI2, ONE]]))];
  var E_VALUE = [term(ONE, /* @__PURE__ */ new Map([[E, ONE]]))];
  var TRIAL_DIVISION_LIMIT = 1000000n;
  function factorize(value) {
    const factors = /* @__PURE__ */ new Map();
    let remaining = value;
    const bump = (p, by) => factors.set(String(p), (factors.get(String(p)) ?? 0n) + by);
    for (let p = 2n; p * p <= remaining && p <= TRIAL_DIVISION_LIMIT; p++) {
      while (remaining % p === 0n) {
        bump(p, 1n);
        remaining /= p;
      }
    }
    if (remaining > 1n) {
      if (remaining > TRIAL_DIVISION_LIMIT * TRIAL_DIVISION_LIMIT)
        return void 0;
      bump(remaining, 1n);
    }
    return factors;
  }
  function normalize(coeff, raw) {
    if (isZero(coeff))
      return void 0;
    let scale = ONE;
    const factors = /* @__PURE__ */ new Map();
    for (const [atom, exponent2] of raw) {
      if (isZero(exponent2))
        continue;
      if (atom === PI2 || atom === E || isOpaque(atom)) {
        factors.set(atom, exponent2);
        continue;
      }
      const { whole, frac } = floorSplit(exponent2);
      if (whole !== 0n)
        scale = multiply3(scale, pow2(rational(BigInt(atom)), whole));
      if (!isZero(frac))
        factors.set(atom, frac);
    }
    return term(multiply3(coeff, scale), factors);
  }
  function factorKey(factors) {
    return [...factors].map(([atom, e]) => `${atom}^${e.n}/${e.d}`).sort().join(",");
  }
  function collect(terms) {
    const merged = /* @__PURE__ */ new Map();
    for (const t of terms) {
      if (t === void 0 || isZero(t.coeff))
        continue;
      const key = factorKey(t.factors);
      const existing = merged.get(key);
      merged.set(
        key,
        existing === void 0 ? t : term(add4(existing.coeff, t.coeff), new Map(t.factors))
      );
    }
    return [...merged].filter(([, t]) => !isZero(t.coeff)).sort(
      (a, b) => (a[1].factors.size === 0 ? 1 : 0) - (b[1].factors.size === 0 ? 1 : 0) || a[0].localeCompare(b[0])
    ).map(([, t]) => t);
  }
  var add5 = (a, b) => collect([...a, ...b]);
  var negate2 = (a) => a.map((t) => term(negate(t.coeff), new Map(t.factors)));
  var subtract4 = (a, b) => add5(a, negate2(b));
  function multiplyTerms(a, b) {
    const factors = new Map(a.factors);
    for (const [atom, exponent2] of b.factors)
      factors.set(atom, add4(factors.get(atom) ?? ZERO, exponent2));
    return normalize(multiply3(a.coeff, b.coeff), factors);
  }
  function multiply5(a, b) {
    const products2 = [];
    for (const left of a)
      for (const right of b)
        products2.push(multiplyTerms(left, right));
    return collect(products2);
  }
  function divide7(a, b) {
    if (b.length === 0)
      return void 0;
    if (b.length > 1)
      return void 0;
    const [divisor] = b;
    const inverse = /* @__PURE__ */ new Map();
    for (const [atom, exponent2] of divisor.factors)
      inverse.set(atom, negate(exponent2));
    const reciprocal = normalize(divide5(ONE, divisor.coeff), inverse);
    return reciprocal === void 0 ? void 0 : multiply5(a, [reciprocal]);
  }
  var MAX_EXPANSION = 12n;
  function power5(base2, exponent2) {
    if (isZero(exponent2))
      return fromInteger(1);
    if (base2.length === 0)
      return isNegative(exponent2) ? void 0 : ZERO2;
    if (isInteger(exponent2)) {
      const { n } = exponent2;
      if (n < 0n) {
        const positive3 = power5(base2, negate(exponent2));
        return positive3 === void 0 ? void 0 : divide7(fromInteger(1), positive3);
      }
      if (base2.length > 1 && n > MAX_EXPANSION)
        return void 0;
      let result2 = fromInteger(1);
      for (let i = 0n; i < n; i++)
        result2 = multiply5(result2, base2);
      return result2;
    }
    if (base2.length > 1)
      return void 0;
    const [single2] = base2;
    const negativeBase = isNegative(single2.coeff);
    if (negativeBase && exponent2.d % 2n === 0n)
      return void 0;
    const magnitude = negativeBase ? negate(single2.coeff) : single2.coeff;
    const numerator = factorize(magnitude.n);
    const denominator = factorize(magnitude.d);
    if (numerator === void 0 || denominator === void 0)
      return void 0;
    const factors = /* @__PURE__ */ new Map();
    const contribute = (atom, e) => factors.set(atom, add4(factors.get(atom) ?? ZERO, e));
    for (const [p, e] of numerator)
      contribute(p, rational(e));
    for (const [p, e] of denominator)
      contribute(p, rational(-e));
    for (const [atom, e] of single2.factors)
      contribute(atom, e);
    const raised2 = /* @__PURE__ */ new Map();
    for (const [atom, e] of factors)
      raised2.set(atom, multiply3(e, exponent2));
    const sign3 = negativeBase && exponent2.n % 2n !== 0n ? rational(-1n) : ONE;
    const result = normalize(sign3, raised2);
    return result === void 0 ? ZERO2 : [result];
  }
  function asRational(value) {
    if (value.length === 0)
      return ZERO;
    if (value.length > 1)
      return void 0;
    const [only] = value;
    return only.factors.size === 0 ? only.coeff : void 0;
  }
  function toNumber2(value) {
    let total = 0;
    for (const t of value) {
      let product = toNumber(t.coeff);
      for (const [atom, e] of t.factors) {
        const base2 = atom === PI2 ? Math.PI : atom === E ? Math.E : isOpaque(atom) ? OPAQUE.get(atom)?.value ?? NaN : Number(atom);
        product *= Math.pow(base2, toNumber(e));
      }
      total += product;
    }
    return total;
  }
  function toDecimal(value, digits = WORKING_DIGITS) {
    const D = decimalContext(digits);
    let total = new D(0);
    for (const t of value) {
      let product = new D(t.coeff.n.toString()).div(t.coeff.d.toString());
      for (const [atom, e] of t.factors) {
        const base2 = isOpaque(atom) ? evaluatePrecise(
          OPAQUE.get(atom)?.node ?? number4(NaN),
          specialBindings(digits),
          digits
        ) : atom === PI2 ? D.acos(-1) : atom === E ? D.exp(1) : new D(atom);
        const exponent2 = new D(e.n.toString()).div(e.d.toString());
        const raised2 = base2.isNegative() && e.d % 2n === 1n ? D.pow(base2.neg(), exponent2).times(e.n % 2n === 0n ? 1 : -1) : D.pow(base2, exponent2);
        product = product.times(raised2);
      }
      total = total.plus(product);
    }
    return total;
  }
  function toNode(value) {
    if (value.length === 0)
      return number4(0);
    return value.map((t) => termNode(t)).reduce((sum3, term2) => binop4("Add", sum3, term2));
  }
  function atomsNode(entries) {
    const plain = [];
    const radicals = /* @__PURE__ */ new Map();
    for (const [atom, exponent2] of entries) {
      const base2 = isOpaque(atom) ? OPAQUE.get(atom)?.node ?? number4(NaN) : atom === PI2 ? id5("pi") : atom === E ? id5("e") : number4(Number(atom));
      if (isInteger(exponent2)) {
        plain.push(
          exponent2.n === 1n ? base2 : binop4("Exponent", base2, number4(Number(exponent2.n)))
        );
        continue;
      }
      if (atom === PI2 || atom === E || isOpaque(atom)) {
        plain.push(
          binop4(
            "Exponent",
            base2,
            binop4(
              "Divide",
              number4(Number(exponent2.n)),
              number4(Number(exponent2.d))
            )
          )
        );
        continue;
      }
      const index = exponent2.d;
      const contribution = pow2(rational(BigInt(atom)), exponent2.n);
      radicals.set(index, (radicals.get(index) ?? 1n) * contribution.n);
    }
    for (const [index, radicand] of [...radicals].sort(
      (a, b) => Number(a[0] - b[0])
    )) {
      const inner = number4(Number(radicand));
      plain.push(
        index === 2n ? functionCall4(id5("sqrt"), inner) : binop4(
          "Exponent",
          inner,
          binop4("Divide", number4(1), number4(Number(index)))
        )
      );
    }
    if (plain.length === 0)
      return void 0;
    return plain.reduce((left, right) => binop4("Multiply", left, right));
  }
  function termNode(t) {
    const positive3 = [];
    const negativeExponents = [];
    for (const [atom, exponent2] of t.factors)
      (isNegative(exponent2) ? negativeExponents : positive3).push([
        atom,
        isNegative(exponent2) ? negate(exponent2) : exponent2
      ]);
    const magnitude = isNegative(t.coeff) ? negate(t.coeff) : t.coeff;
    const above = atomsNode(positive3);
    const below = atomsNode(negativeExponents);
    let numerator;
    if (above === void 0)
      numerator = number4(Number(magnitude.n));
    else if (magnitude.n === 1n)
      numerator = above;
    else
      numerator = binop4("Multiply", number4(Number(magnitude.n)), above);
    let denominator;
    if (magnitude.d !== 1n && below !== void 0)
      denominator = binop4("Multiply", number4(Number(magnitude.d)), below);
    else if (magnitude.d !== 1n)
      denominator = number4(Number(magnitude.d));
    else
      denominator = below;
    const body = denominator === void 0 ? numerator : binop4("Divide", numerator, denominator);
    return isNegative(t.coeff) ? negative4(body) : body;
  }
  function evaluateExact(node) {
    switch (node.type) {
      case "Constant": {
        const q = fromNumber(node.value);
        return q === void 0 ? void 0 : fromRational(q);
      }
      case "Identifier":
        if (node.symbol === PI2)
          return PI_VALUE;
        if (node.symbol === E)
          return E_VALUE;
        return void 0;
      case "Negative": {
        const inner = evaluateExact(node.arg);
        return inner === void 0 ? void 0 : negate2(inner);
      }
      case "BinaryOperator":
        return binaryExact(node);
      case "FunctionCall":
        return functionExact(node);
      default:
        return void 0;
    }
  }
  function binaryExact(node) {
    const left = evaluateExact(node.left);
    if (left === void 0)
      return void 0;
    const right = evaluateExact(node.right);
    if (right === void 0)
      return void 0;
    switch (node.name) {
      case "Add":
        return add5(left, right);
      case "Subtract":
        return subtract4(left, right);
      case "Multiply":
      case "CrossMultiply":
        return multiply5(left, right);
      case "Divide":
        return divide7(left, right);
      case "Exponent": {
        const exponent2 = asRational(right);
        return exponent2 === void 0 ? void 0 : power5(left, exponent2);
      }
    }
  }
  function functionExact(node) {
    const name = node.callee.symbol;
    if (node.args.length !== 1)
      return void 0;
    const [argument] = node.args;
    const inner = evaluateExact(argument);
    if (inner === void 0)
      return void 0;
    switch (name) {
      case "sqrt":
        return power5(inner, rational(1n, 2n));
      case "exp": {
        const exponent2 = asRational(inner);
        return exponent2 === void 0 ? void 0 : power5(E_VALUE, exponent2);
      }
      default:
        return void 0;
    }
  }

  // src/plugins/physics-lab/symbolic/powerSeries.ts
  var PowerSeriesError = class extends Error {
  };
  var RATIONALS2 = {
    zero: ZERO,
    one: ONE,
    fromRational: (q) => q,
    add: add4,
    negate,
    multiply: multiply3,
    inverse: (a) => isZero(a) ? void 0 : divide5(ONE, a),
    isZero,
    power: (a, r) => {
      if (isInteger(r)) {
        if (isZero(a) && isNegative(r))
          return void 0;
        return pow2(a, r.n);
      }
      return rationalRoot2(pow2(a, r.n), Number(r.d));
    },
    constant: (node) => rationalOfNode(node),
    // Only the values that are themselves rational: ln 1 = 0.
    apply: (name, c) => name === "ln" && equals(c, ONE) ? ZERO : void 0
  };
  var orderOf = (s) => s.v + s.c.length;
  var Expander = class {
    constructor(F, variable) {
      this.F = F;
      this.variable = variable;
    }
    coefficient(s, exponent2) {
      return exponent2 < s.v ? this.F.zero : s.c[exponent2 - s.v] ?? this.F.zero;
    }
    /** Leading zeros moved into the valuation, and nothing past `cap` kept. */
    normalise(s, cap) {
      let { v } = s;
      let c = s.c.slice(0, Math.max(0, cap - v));
      while (c.length > 0 && this.F.isZero(c[0])) {
        c = c.slice(1);
        v += 1;
      }
      return { v, c };
    }
    constant(value, cap) {
      return this.normalise(
        {
          v: 0,
          c: [value, ...new Array(Math.max(0, cap - 1)).fill(this.F.zero)]
        },
        cap
      );
    }
    scale(s, by) {
      return { v: s.v, c: s.c.map((value) => this.F.multiply(value, by)) };
    }
    add(a, b, cap, sign3 = 1) {
      const order = Math.min(orderOf(a), orderOf(b), cap);
      const v = Math.min(a.v, b.v);
      const c = [];
      for (let e = v; e < order; e += 1) {
        const right = this.coefficient(b, e);
        c.push(
          this.F.add(
            this.coefficient(a, e),
            sign3 < 0 ? this.F.negate(right) : right
          )
        );
      }
      return this.normalise({ v, c }, cap);
    }
    multiply(a, b, cap) {
      const v = a.v + b.v;
      const order = Math.min(a.v + orderOf(b), b.v + orderOf(a), cap);
      const c = [];
      for (let e = v; e < order; e += 1) {
        let total = this.F.zero;
        for (let i = 0; i <= e - v; i += 1)
          total = this.F.add(
            total,
            this.F.multiply(
              this.coefficient(a, a.v + i),
              this.coefficient(b, b.v + e - v - i)
            )
          );
        c.push(total);
      }
      return this.normalise({ v, c }, cap);
    }
    inverse(a, cap) {
      if (a.c.length === 0) {
        throw new PowerSeriesError(
          "A quotient by something that vanishes to every order computed has no series here."
        );
      }
      const lead = this.F.inverse(a.c[0]);
      if (lead === void 0)
        throw new PowerSeriesError(
          "The leading coefficient of a divisor has no exact reciprocal here."
        );
      const n = Math.min(a.c.length, cap + a.v);
      const b = [lead];
      for (let k = 1; k < n; k += 1) {
        let total = this.F.zero;
        for (let j = 1; j <= k; j += 1)
          total = this.F.add(
            total,
            this.F.multiply(a.c[j] ?? this.F.zero, b[k - j])
          );
        b.push(this.F.negate(this.F.multiply(total, lead)));
      }
      return this.normalise({ v: -a.v, c: b }, cap);
    }
    /** `Σ f[k] u^k` for a series `u` that vanishes at zero. */
    compose(f, u, cap) {
      if (u.c.length > 0 && u.v < 1) {
        throw new PowerSeriesError(
          "Only a function of something that is zero at the point is composed directly."
        );
      }
      const valuation = u.c.length === 0 ? cap : u.v;
      const maxK = Math.floor(cap / Math.max(1, valuation)) + 1;
      let total = this.constant(this.F.fromRational(f(0)), cap);
      let raised2 = this.constant(this.F.one, cap);
      for (let k = 1; k <= maxK; k += 1) {
        raised2 = this.multiply(raised2, u, cap);
        const fk = f(k);
        if (isZero(fk))
          continue;
        total = this.add(total, this.scale(raised2, this.F.fromRational(fk)), cap);
      }
      const order = Math.min(orderOf(total), u.c.length === 0 ? cap : orderOf(u));
      return this.normalise(
        { v: total.v, c: total.c.slice(0, Math.max(0, order - total.v)) },
        cap
      );
    }
    /** `s^r` for a rational `r`. */
    power(s, r, cap) {
      if (isInteger(r)) {
        let exponent2 = Number(r.n);
        let base2 = s;
        if (exponent2 < 0) {
          base2 = this.inverse(s, cap);
          exponent2 = -exponent2;
        }
        let total = this.constant(this.F.one, cap);
        for (let i = 0; i < exponent2; i += 1)
          total = this.multiply(total, base2, cap);
        return total;
      }
      if (s.c.length === 0) {
        throw new PowerSeriesError("A fractional power of zero has no series.");
      }
      const shifted = multiply3(rational(BigInt(s.v)), r);
      if (!isInteger(shifted)) {
        throw new PowerSeriesError(
          "A fractional power of x, like \u221Ax, is not a power series; it has no expansion in whole powers about zero."
        );
      }
      const [lead] = s.c;
      const raised2 = this.F.power(lead, r);
      const reciprocal = this.F.inverse(lead);
      if (raised2 === void 0 || reciprocal === void 0) {
        throw new PowerSeriesError(
          "The leading coefficient has no exact root here, so the series would not have exact coefficients."
        );
      }
      const w = this.normalise(
        {
          v: 0,
          c: [
            this.F.zero,
            ...s.c.slice(1).map((value) => this.F.multiply(value, reciprocal))
          ]
        },
        cap - s.v
      );
      const body = this.compose((k) => binomial(r, k), w, cap);
      return this.normalise(
        { v: body.v + Number(shifted.n), c: this.scale(body, raised2).c },
        cap
      );
    }
    series(node, cap) {
      switch (node.type) {
        case "Constant": {
          const value = fromNumber(node.value);
          if (value === void 0)
            throw new PowerSeriesError("That number has no exact value.");
          return this.constant(this.F.fromRational(value), cap);
        }
        case "Identifier": {
          if (node.symbol === this.variable)
            return this.normalise(
              {
                v: 1,
                c: new Array(Math.max(0, cap - 1)).fill(this.F.zero).map((z, i) => i === 0 ? this.F.one : z)
              },
              cap
            );
          const value = this.F.constant(node);
          if (value === void 0)
            throw new PowerSeriesError(
              `${node.symbol} has no exact value here, so a series in it would not have exact coefficients.`
            );
          return this.constant(value, cap);
        }
        case "Negative": {
          const inner = this.series(node.arg, cap);
          return { v: inner.v, c: inner.c.map((c) => this.F.negate(c)) };
        }
        case "BinaryOperator": {
          if (node.name === "Exponent")
            return this.exponent(node.left, node.right, cap);
          const margin = cap + 8;
          const left = this.series(node.left, margin);
          const right = this.series(node.right, margin);
          switch (node.name) {
            case "Add":
              return this.add(left, right, cap);
            case "Subtract":
              return this.add(left, right, cap, -1);
            case "Multiply":
            case "CrossMultiply":
              return this.multiply(left, right, cap);
            case "Divide":
              return this.multiply(left, this.inverse(right, margin), cap);
          }
          throw new PowerSeriesError("That operation has no series here.");
        }
        case "FunctionCall":
          return this.function(node.callee.symbol, node.args, cap);
        default:
          throw new PowerSeriesError(
            "That kind of expression has no series here."
          );
      }
    }
    exponent(base2, exponent2, cap) {
      if (base2.type === "Identifier" && base2.symbol === "e")
        return this.function("exp", [exponent2], cap);
      const exact = rationalOfNode(exponent2);
      if (exact !== void 0)
        return this.power(this.series(base2, cap + 8), exact, cap);
      if (!dependsOn(base2, this.variable) && !(evaluate(base2, {}) > 0))
        throw new PowerSeriesError(
          "A power of a base that is not positive has no real logarithm to expand with."
        );
      return this.function("exp", [multiply(exponent2, call("ln", base2))], cap);
    }
    function(name, args, cap) {
      if (args.length !== 1)
        throw new PowerSeriesError(`${name} takes more than one argument.`);
      const wide = cap + 8;
      const inner = this.series(args[0], wide);
      if (name === "sqrt")
        return this.power(inner, rational(1n, 2n), cap);
      if (inner.v < 0)
        throw new PowerSeriesError(
          `${name} of something that blows up at the point has no power series.`
        );
      const c = this.coefficient(inner, 0);
      const w = this.add(inner, this.constant(c, wide), wide, -1);
      const shifted = !this.F.isZero(c);
      const at2 = (fn) => {
        const value = this.F.apply(fn, c);
        if (value === void 0)
          throw new PowerSeriesError(
            `${fn} of the value there has no exact form, so neither does its series.`
          );
        return value;
      };
      const composed = (fn) => this.compose(MACLAURIN[fn], w, wide);
      const pair = (first, second, a, b, sign3) => this.add(
        this.scale(composed(first), a),
        this.scale(composed(second), b),
        cap,
        sign3
      );
      switch (name) {
        case "exp":
          return shifted ? this.normalise(this.scale(composed("exp"), at2("exp")), cap) : this.compose(MACLAURIN.exp, inner, cap);
        case "sin":
          return shifted ? pair("cos", "sin", at2("sin"), at2("cos"), 1) : this.compose(MACLAURIN.sin, inner, cap);
        case "cos":
          return shifted ? pair("cos", "sin", at2("cos"), at2("sin"), -1) : this.compose(MACLAURIN.cos, inner, cap);
        case "sinh":
          return shifted ? pair("cosh", "sinh", at2("sinh"), at2("cosh"), 1) : this.compose(MACLAURIN.sinh, inner, cap);
        case "cosh":
          return shifted ? pair("cosh", "sinh", at2("cosh"), at2("sinh"), 1) : this.compose(MACLAURIN.cosh, inner, cap);
        case "ln": {
          if (!shifted)
            throw new PowerSeriesError(
              "ln of something that vanishes at the point has no power series; ln x itself has none about zero."
            );
          const reciprocal = this.F.inverse(c);
          if (reciprocal === void 0)
            throw new PowerSeriesError(
              "The logarithm's argument has no exact reciprocal here."
            );
          return this.add(
            this.constant(at2("ln"), cap),
            this.compose(MACLAURIN.ln1p, this.scale(w, reciprocal), wide),
            cap
          );
        }
        case "tan":
          return this.multiply(
            this.function("sin", args, wide),
            this.inverse(this.function("cos", args, wide), wide),
            cap
          );
        case "log": {
          const reciprocal = this.F.constant(
            divide(number2(1), call("ln", number2(10)))
          );
          if (reciprocal === void 0)
            throw new PowerSeriesError("ln 10 has no exact form here.");
          return this.normalise(
            this.scale(this.function("ln", args, cap), reciprocal),
            cap
          );
        }
        case "sec":
          return this.inverse(this.function("cos", args, wide), cap);
        case "csc":
          return this.inverse(this.function("sin", args, wide), cap);
        case "cot":
          return this.multiply(
            this.function("cos", args, wide),
            this.inverse(this.function("sin", args, wide), wide),
            cap
          );
        case "tanh":
          return this.multiply(
            this.function("sinh", args, wide),
            this.inverse(this.function("cosh", args, wide), wide),
            cap
          );
        case "sech":
          return this.inverse(this.function("cosh", args, wide), cap);
        default: {
          const f = MACLAURIN[name];
          if (f === void 0)
            throw new PowerSeriesError(`There is no series here for ${name}.`);
          if (shifted)
            throw new PowerSeriesError(
              `${name} is only expanded where its argument is zero.`
            );
          return this.compose(f, inner, cap);
        }
      }
    }
  };
  var factorialCache = [1n];
  function factorial2(k) {
    for (let i = factorialCache.length; i <= k; i += 1)
      factorialCache.push(factorialCache[i - 1] * BigInt(i));
    return factorialCache[k];
  }
  var alternate = (m) => m % 2 === 0 ? 1n : -1n;
  function binomial(r, k) {
    let total = ONE;
    for (let i = 0; i < k; i += 1)
      total = multiply3(total, subtract3(r, rational(BigInt(i))));
    return divide5(total, rational(factorial2(k)));
  }
  var MACLAURIN = {
    exp: (k) => rational(1n, factorial2(k)),
    sin: (k) => k % 2 === 1 ? rational(alternate((k - 1) / 2), factorial2(k)) : ZERO,
    cos: (k) => k % 2 === 0 ? rational(alternate(k / 2), factorial2(k)) : ZERO,
    sinh: (k) => k % 2 === 1 ? rational(1n, factorial2(k)) : ZERO,
    cosh: (k) => k % 2 === 0 ? rational(1n, factorial2(k)) : ZERO,
    arctan: (k) => k % 2 === 1 ? rational(alternate((k - 1) / 2), BigInt(k)) : ZERO,
    arctanh: (k) => k % 2 === 1 ? rational(1n, BigInt(k)) : ZERO,
    arcsin: (k) => {
      if (k % 2 === 0)
        return ZERO;
      const m = (k - 1) / 2;
      return rational(
        factorial2(2 * m),
        4n ** BigInt(m) * factorial2(m) * factorial2(m) * BigInt(2 * m + 1)
      );
    },
    arcsinh: (k) => {
      if (k % 2 === 0)
        return ZERO;
      const m = (k - 1) / 2;
      return rational(
        alternate(m) * factorial2(2 * m),
        4n ** BigInt(m) * factorial2(m) * factorial2(m) * BigInt(2 * m + 1)
      );
    },
    /** ln(1 + u). */
    ln1p: (k) => k === 0 ? ZERO : rational(alternate(k + 1), BigInt(k))
  };
  function rationalRoot2(value, q) {
    if (q === 1)
      return value;
    const negative6 = isNegative(value);
    if (negative6 && q % 2 === 0)
      return void 0;
    const root2 = (n2) => {
      const guess = BigInt(Math.round(Math.pow(Number(n2), 1 / q)));
      for (const candidate of [guess - 1n, guess, guess + 1n])
        if (candidate >= 0n && candidate ** BigInt(q) === n2)
          return candidate;
      return void 0;
    };
    const magnitude = negative6 ? negate(value) : value;
    const n = root2(magnitude.n);
    const d = root2(magnitude.d);
    if (n === void 0 || d === void 0)
      return void 0;
    return rational(negative6 ? -n : n, d);
  }
  function rationalOfNode(node) {
    const folded = fold(node);
    if (folded.type === "Constant")
      return fromNumber(folded.value);
    if (folded.type === "Negative") {
      const inner = rationalOfNode(folded.arg);
      return inner === void 0 ? void 0 : negate(inner);
    }
    if (folded.type === "BinaryOperator" && folded.name === "Divide") {
      const top = rationalOfNode(folded.left);
      const bottom = rationalOfNode(folded.right);
      if (top === void 0 || bottom === void 0 || isZero(bottom))
        return void 0;
      return divide5(top, bottom);
    }
    return void 0;
  }
  var PARTIAL_TERMS = 4;
  function truncatedAntiderivative(node, variable, terms) {
    const cap = Math.max(4, terms);
    const series = new Expander(RATIONALS2, variable).series(fold(node), cap);
    if (orderOf(series) < Math.min(cap, 2)) {
      throw new PowerSeriesError(
        "Too few terms of this series could be computed."
      );
    }
    const x = id3(variable);
    let logarithm3;
    const pieces = [];
    for (let e = series.v; e < orderOf(series); e += 1) {
      const c = series.c[e - series.v] ?? ZERO;
      if (isZero(c))
        continue;
      if (e === -1) {
        logarithm3 = fold(multiply(rationalNode2(c), call("ln", call("abs", x))));
        continue;
      }
      const raised2 = divide5(c, rational(BigInt(e + 1)));
      pieces.push(fold(multiply(rationalNode2(raised2), power2(x, number2(e + 1)))));
    }
    if (pieces.length === 0 && logarithm3 === void 0) {
      throw new PowerSeriesError("Every computed term of this series is zero.");
    }
    const sum3 = (list2) => list2.reduce(
      (total, piece) => total === void 0 ? piece : add(total, piece),
      void 0
    ) ?? number2(0);
    const withLog = (list2) => logarithm3 === void 0 ? list2 : [logarithm3, ...list2];
    return {
      logarithm: logarithm3,
      polynomial: fold(sum3(withLog(pieces))),
      partial: fold(sum3(withLog(pieces).slice(0, PARTIAL_TERMS))),
      order: orderOf(series) + 1
    };
  }
  function leadingTerm(node, variable, cap = 16) {
    return leadingTermOver(RATIONALS2, node, variable, cap);
  }
  function leadingTermOver(field, node, variable, cap = 16) {
    const series = new Expander(field, variable).series(fold(node), cap);
    if (series.c.length === 0)
      return void 0;
    return { valuation: series.v, coefficient: series.c[0] };
  }

  // src/plugins/physics-lab/symbolic/asymptotic.ts
  var AT_INFINITY = { kind: "infinite", sign: 1 };
  var MAX_DEPTH = 12;
  var depth = 0;
  var inProgress = /* @__PURE__ */ new Set();
  function scaleLimit(node, variable, approach, record2) {
    const t = id3(variable);
    const moved = approach.kind === "infinite" ? approach.sign > 0 ? node : replaceIdentifier(node, variable, multiply(number2(-1), t)) : replaceIdentifier(
      node,
      variable,
      add(approach.node, divide(number2(approach.side), t))
    );
    const key = `${variable} ${JSON.stringify(moved)}`;
    if (inProgress.has(key) || depth >= MAX_DEPTH)
      return void 0;
    inProgress.add(key);
    try {
      const size = sizeOf(moved, variable);
      if (size === void 0)
        return void 0;
      const found = limitOfSize(size, variable);
      if (found !== void 0)
        record2("growth");
      return found;
    } finally {
      inProgress.delete(key);
    }
  }
  var limitAtInfinity = (node, variable) => limitOf(node, variable, AT_INFINITY);
  var sign2 = (value) => Math.sign(toNumber2(value));
  var positive2 = (q) => !isZero(q) && !isNegative(q);
  function limitOfSize(size, variable) {
    const s = sign2(size.c) < 0 ? -1 : 1;
    if (size.E !== void 0) {
      const to = limitAtInfinity(size.E, variable);
      if (to?.kind !== "infinite")
        return void 0;
      return to.sign > 0 ? { kind: "infinite", sign: s } : { kind: "finite", value: ZERO2 };
    }
    const order = isZero(size.a) ? size.b : size.a;
    if (isZero(order))
      return { kind: "finite", value: size.c };
    return isNegative(order) ? { kind: "finite", value: ZERO2 } : { kind: "infinite", sign: s };
  }
  var constant2 = (c) => ({ c, a: ZERO, b: ZERO });
  var ONE2 = () => constant2(fromInteger(1));
  function times(p, q, variable) {
    const size = {
      c: multiply5(p.c, q.c),
      a: add4(p.a, q.a),
      b: add4(p.b, q.b)
    };
    if (p.E === void 0 || q.E === void 0)
      return { ...size, E: p.E ?? q.E };
    return withExponential(size, fold(add(p.E, q.E)), variable);
  }
  function raised(p, r) {
    const c = power5(p.c, r);
    if (c === void 0 || c.length === 0)
      return void 0;
    const size = { c, a: multiply3(p.a, r), b: multiply3(p.b, r) };
    if (p.E === void 0)
      return size;
    return { ...size, E: fold(multiply(toNode(fromRational(r)), p.E)) };
  }
  function withExponential(size, E2, variable) {
    const settle = (value) => {
      const factor = exactConstant(power2(id3("e"), toNode(value)));
      return factor === void 0 ? void 0 : { ...size, c: multiply5(size.c, factor) };
    };
    if (!dependsOn(E2, variable)) {
      const value = exactConstant(E2);
      return value === void 0 ? void 0 : settle(value);
    }
    const to = limitAtInfinity(E2, variable);
    if (to?.kind === "finite")
      return settle(to.value);
    const inner = sizeOf(E2, variable);
    if (inner === void 0)
      return void 0;
    const outgrowsLog = inner.E !== void 0 || positive2(inner.a) || isZero(inner.a) && positive2(subtract3(inner.b, ONE));
    if (outgrowsLog)
      return { ...size, E: size.E === void 0 ? E2 : fold(add(size.E, E2)) };
    if (!isZero(inner.a) || !isOne(inner.b))
      return void 0;
    const k = asRational(inner.c);
    if (k === void 0)
      return void 0;
    const rest = fold(
      subtract(E2, multiply(toNode(inner.c), call("ln", id3(variable))))
    );
    const settled = limitAtInfinity(rest, variable);
    if (settled?.kind !== "finite")
      return void 0;
    const found = settle(settled.value);
    return found && { ...found, a: add4(found.a, k) };
  }
  function sizeOf(node, variable) {
    if (depth >= MAX_DEPTH)
      return void 0;
    depth += 1;
    try {
      return measure(node, variable) ?? bySeries(node, variable);
    } finally {
      depth -= 1;
    }
  }
  function bySeries(node, variable) {
    const moved = replaceIdentifier(
      node,
      variable,
      divide(number2(1), id3(LIMIT_STEP))
    );
    const lead = leadingTermExactly(moved, LIMIT_STEP);
    if (lead === void 0 || certainlyZero(lead.coefficient) !== false)
      return void 0;
    const v = fromNumber(lead.valuation);
    if (v === void 0 || Number(v.n) / Number(v.d) !== lead.valuation)
      return void 0;
    return { c: lead.coefficient, a: negate(v), b: ZERO };
  }
  function measure(node, variable) {
    if (!dependsOn(node, variable)) {
      const value = exactConstant(node);
      return value === void 0 || certainlyZero(value) !== false ? void 0 : constant2(value);
    }
    switch (node.type) {
      case "Identifier":
        return { c: fromInteger(1), a: ONE, b: ZERO };
      case "Negative": {
        const inner = sizeOf(node.arg, variable);
        return inner && { ...inner, c: negate2(inner.c) };
      }
      case "BinaryOperator":
        switch (node.name) {
          case "Multiply":
          case "CrossMultiply": {
            const p = sizeOf(node.left, variable);
            const q = p && sizeOf(node.right, variable);
            return p && q && times(p, q, variable);
          }
          case "Divide": {
            const p = sizeOf(node.left, variable);
            const q = p && sizeOf(node.right, variable);
            const inverse = q && raised(q, rational(-1n));
            return p && inverse && times(p, inverse, variable);
          }
          case "Add":
          case "Subtract":
            return sum2(node.left, node.right, node.name === "Subtract", variable);
          case "Exponent":
            return exponential(node.left, node.right, variable);
          default:
            return void 0;
        }
      case "FunctionCall":
        return functionSize(node, variable);
      default:
        return void 0;
    }
  }
  function sum2(left, right, negated, variable) {
    const lnOf = (n) => n.type === "FunctionCall" && n.callee.symbol === "ln" && n.args.length === 1 ? n.args[0] : void 0;
    const A = lnOf(left);
    const B = lnOf(right);
    if (A !== void 0 && B !== void 0)
      return sizeOf(
        call("ln", negated ? divide(A, B) : multiply(A, B)),
        variable
      );
    const p = sizeOf(left, variable);
    const q0 = sizeOf(right, variable);
    const q = q0 && (negated ? { ...q0, c: negate2(q0.c) } : q0);
    if (p === void 0 || q === void 0) {
      const known = p ?? q;
      const other = p === void 0 ? left : right;
      if (known === void 0 || !isBounded(other))
        return void 0;
      return limitOfSize(known, variable)?.kind === "infinite" ? known : void 0;
    }
    const inverse = raised(q, rational(-1n));
    const ratio = inverse && times(p, inverse, variable);
    if (ratio === void 0)
      return void 0;
    const to = limitOfSize(ratio, variable);
    if (to === void 0)
      return void 0;
    if (to.kind === "infinite")
      return p;
    if (certainlyZero(to.value) === true)
      return q;
    const factor = add5(to.value, fromInteger(1));
    if (certainlyZero(factor) === false)
      return { ...q, c: multiply5(q.c, factor) };
    const opened2 = [left, right].map((side) => openedLogarithm(side, variable));
    if (opened2[0] !== void 0 || opened2[1] !== void 0) {
      const l = opened2[0] ?? left;
      const r = opened2[1] ?? right;
      return sizeOf(
        fold(tidySums(fold(negated ? subtract(l, r) : add(l, r)))),
        variable
      );
    }
    const constantSide = !dependsOn(right, variable) ? { f: left, c: negate2(q.c) } : !dependsOn(left, variable) ? { f: right, c: negate2(p.c), flip: negated } : void 0;
    if (constantSide === void 0 || sign2(constantSide.c) <= 0)
      return void 0;
    const log3 = logNode(constantSide.f);
    if (log3 === void 0)
      return void 0;
    const lnC = call("ln", toNode(constantSide.c));
    const inner = sizeOf(fold(subtract(log3, lnC)), variable);
    if (inner === void 0)
      return void 0;
    const scaled2 = multiply5(inner.c, constantSide.c);
    return {
      ...inner,
      c: "flip" in constantSide && constantSide.flip ? negate2(scaled2) : scaled2
    };
  }
  function openedLogarithm(node, variable) {
    if (node.type !== "FunctionCall" || node.callee.symbol !== "ln" || node.args.length !== 1)
      return void 0;
    const [inside] = node.args;
    if (inside.type !== "BinaryOperator" || inside.name !== "Add" && inside.name !== "Subtract")
      return void 0;
    const p = sizeOf(inside.left, variable);
    const q = sizeOf(inside.right, variable);
    if (p === void 0 || q === void 0)
      return void 0;
    const inverse = raised(q, rational(-1n));
    const ratio = inverse && times(p, inverse, variable);
    const to = ratio && limitOfSize(ratio, variable);
    if (to === void 0)
      return void 0;
    const leftBigger = to.kind === "infinite";
    if (!leftBigger && !(to.kind === "finite" && certainlyZero(to.value) === true))
      return void 0;
    const [big, small] = leftBigger ? [inside.left, inside.right] : [inside.right, inside.left];
    const smallSigned = inside.name === "Subtract" && leftBigger ? multiply(number2(-1), small) : small;
    if (inside.name === "Subtract" && !leftBigger)
      return void 0;
    if (!(evaluate(big, { [variable]: 1e6 }) > 0))
      return void 0;
    const lead = logNode(big) ?? call("ln", big);
    return add(lead, call("ln", add(number2(1), divide(smallSigned, big))));
  }
  function logNode(f) {
    if (f.type === "BinaryOperator") {
      if (f.name === "Exponent")
        return f.left.type === "Identifier" && f.left.symbol === "e" ? f.right : multiply(f.right, call("ln", f.left));
      if (f.name === "Multiply" || f.name === "CrossMultiply")
        return add(call("ln", f.left), call("ln", f.right));
      if (f.name === "Divide")
        return subtract(call("ln", f.left), call("ln", f.right));
    }
    if (f.type === "FunctionCall" && f.callee.symbol === "exp")
      return f.args[0];
    return void 0;
  }
  function exponential(base2, exponent2, variable) {
    if (!dependsOn(exponent2, variable)) {
      const r = asRational(exactConstant(exponent2) ?? []);
      const inner = r && sizeOf(base2, variable);
      return r && inner && raised(inner, r);
    }
    if (base2.type === "Identifier" && base2.symbol === "e")
      return withExponential(ONE2(), exponent2, variable);
    if (!(evaluate(base2, { [variable]: 1e6 }) > 0))
      return void 0;
    return withExponential(
      ONE2(),
      fold(multiply(exponent2, call("ln", base2))),
      variable
    );
  }
  var LIKE_ARGUMENT_AT_ZERO = [
    "sin",
    "tan",
    "arcsin",
    "arctan",
    "sinh",
    "tanh",
    "arcsinh",
    "arctanh"
  ];
  function functionSize(node, variable) {
    if (node.args.length !== 1)
      return void 0;
    const [arg] = node.args;
    const name = node.callee.symbol;
    switch (name) {
      case "exp":
        return withExponential(ONE2(), arg, variable);
      case "sqrt": {
        const inner = sizeOf(arg, variable);
        return inner && raised(inner, rational(1n, 2n));
      }
      case "ln":
        return logarithm2(arg, variable);
      case "log": {
        const inner = logarithm2(arg, variable);
        const ln10 = exactConstant(call("ln", number2(10)));
        const scale = ln10 && divide7(fromInteger(1), ln10);
        return inner && scale && times(inner, constant2(scale), variable);
      }
      case "abs": {
        const inner = sizeOf(arg, variable);
        return inner && {
          ...inner,
          c: sign2(inner.c) < 0 ? negate2(inner.c) : inner.c
        };
      }
      default:
        break;
    }
    const to = limitAtInfinity(arg, variable);
    if (to === void 0)
      return void 0;
    if (to.kind === "finite" && certainlyZero(to.value) === true && LIKE_ARGUMENT_AT_ZERO.includes(name))
      return sizeOf(arg, variable);
    if (to.kind === "infinite" && (name === "sinh" || name === "cosh")) {
      const half = fromRational(
        rational(to.sign > 0 || name === "cosh" ? 1n : -1n, 2n)
      );
      const grows = to.sign > 0 ? arg : fold(multiply(number2(-1), arg));
      return withExponential(constant2(half), grows, variable);
    }
    const whole = limitAtInfinity(node, variable);
    return whole?.kind === "finite" && certainlyZero(whole.value) === false ? constant2(whole.value) : void 0;
  }
  function logarithm2(arg, variable) {
    const isExponential = arg.type === "BinaryOperator" && arg.name === "Exponent" && dependsOn(arg.right, variable) || arg.type === "FunctionCall" && arg.callee.symbol === "exp";
    const written = isExponential ? logNode(arg) : void 0;
    if (written !== void 0)
      return sizeOf(fold(written), variable);
    const inner = sizeOf(arg, variable);
    if (inner === void 0 || sign2(inner.c) <= 0)
      return void 0;
    if (inner.E !== void 0)
      return sizeOf(inner.E, variable);
    if (!isZero(inner.a))
      return { c: fromRational(inner.a), a: ZERO, b: ONE };
    if (!isZero(inner.b))
      return void 0;
    const ln2 = exactConstant(call("ln", toNode(inner.c)));
    if (ln2 === void 0)
      return void 0;
    if (certainlyZero(ln2) === false)
      return constant2(ln2);
    return sizeOf(
      fold(tidySums(fold(subtract(arg, number2(1))))),
      variable
    );
  }

  // src/plugins/physics-lab/symbolic/definite.ts
  var DefiniteError = class extends Error {
  };
  var PI_OVER = (n, d) => multiply5(PI_VALUE, fromRational(rational(BigInt(n), BigInt(d))));
  var root = (n, over, times2 = 1) => multiply5(
    power5(fromInteger(n), rational(1n, 2n)) ?? ZERO2,
    fromRational(rational(BigInt(times2), BigInt(over)))
  );
  function sineAt(twelfths) {
    const k = (twelfths % 24 + 24) % 24;
    const table3 = {
      0: ZERO2,
      2: fromRational(rational(1n, 2n)),
      3: root(2, 2),
      4: root(3, 2),
      6: fromInteger(1)
    };
    const fold180 = k > 12 ? k - 12 : k;
    const sign3 = k > 12 ? -1 : 1;
    const first = fold180 > 6 ? 12 - fold180 : fold180;
    const value = table3[first];
    if (value === void 0)
      return void 0;
    return sign3 < 0 ? negate2(value) : value;
  }
  var equal = (a, b) => subtract4(a, b).length === 0;
  function arcsineOf(value) {
    for (const [twelfths, sine2] of [
      [0, sineAt(0)],
      [2, sineAt(2)],
      [3, sineAt(3)],
      [4, sineAt(4)],
      [6, sineAt(6)]
    ]) {
      if (sine2 === void 0)
        continue;
      if (equal(value, sine2))
        return PI_OVER(twelfths, 12);
      if (equal(value, negate2(sine2)))
        return PI_OVER(-twelfths, 12);
    }
    return void 0;
  }
  function arctangentOf(value) {
    const table3 = [
      [ZERO2, 0],
      [root(3, 3), 2],
      [fromInteger(1), 3],
      [root(3, 1), 4]
    ];
    for (const [tangent, twelfths] of table3) {
      if (equal(value, tangent))
        return PI_OVER(twelfths, 12);
      if (equal(value, negate2(tangent)))
        return PI_OVER(-twelfths, 12);
    }
    return void 0;
  }
  function twelfthsOfPi(value) {
    if (value.length === 0)
      return 0;
    const single2 = atomsOf(value);
    if (single2 === void 0 || single2.factors.size !== 1)
      return void 0;
    const [[atom, exponent2]] = [...single2.factors];
    if (!isPiAtom(atom) || !isOne(exponent2))
      return void 0;
    const twelfths = multiply3(single2.coeff, rational(12n));
    return isInteger(twelfths) ? Number(twelfths.n) : void 0;
  }
  function exactConstant(node) {
    const numeric = evaluate(node, {});
    if (!Number.isFinite(numeric) || Math.abs(numeric) > 1e12)
      return void 0;
    if (containsPole(node))
      return void 0;
    const reduced = reduce(node);
    if (reduced !== void 0) {
      const claimed = toNumber2(reduced);
      if (Math.abs(claimed - numeric) <= 1e-9 * Math.max(1, Math.abs(numeric)))
        return reduced;
    }
    return opaque(fold(node), numeric);
  }
  function containsPole(node) {
    let pole = false;
    visit(node, (child) => {
      if (pole || child.type === "Identifier")
        return;
      const value = evaluate(child, {});
      if (!Number.isFinite(value) || Math.abs(value) > 1e12)
        pole = true;
    });
    return pole;
  }
  function reduce(node) {
    switch (node.type) {
      case "Constant":
      case "Identifier":
        return evaluateExact(node);
      case "Negative": {
        const inner = exactConstant(node.arg);
        return inner === void 0 ? void 0 : negate2(inner);
      }
      case "BinaryOperator": {
        const left = exactConstant(node.left);
        const right = exactConstant(node.right);
        if (left === void 0 || right === void 0)
          return void 0;
        switch (node.name) {
          case "Add":
            return add5(left, right);
          case "Subtract":
            return subtract4(left, right);
          case "Multiply":
          case "CrossMultiply":
            return multiply5(left, right);
          case "Divide":
            return divide7(left, right);
          case "Exponent": {
            if (node.left.type === "Identifier" && node.left.symbol === "e")
              return exponential2(right);
            if (subtract4(left, fromInteger(1)).length === 0)
              return fromInteger(1);
            const r = asRational(right);
            return r === void 0 ? void 0 : power5(left, r);
          }
        }
        return void 0;
      }
      case "FunctionCall": {
        if (node.args.length !== 1)
          return void 0;
        const inner = exactConstant(node.args[0]);
        if (inner === void 0)
          return void 0;
        const name = node.callee.symbol;
        const found = special(name, inner);
        if (found !== void 0)
          return found;
        const parity = PARITY2[name];
        if (parity === void 0 || !(toNumber2(inner) < 0))
          return void 0;
        const mirrored = exactConstant(call(name, toNode(negate2(inner))));
        if (mirrored === void 0)
          return void 0;
        return parity === "odd" ? negate2(mirrored) : mirrored;
      }
      default:
        return void 0;
    }
  }
  var PARITY2 = {
    cos: "even",
    sec: "even",
    cosh: "even",
    sin: "odd",
    tan: "odd",
    csc: "odd",
    cot: "odd",
    sinh: "odd",
    tanh: "odd",
    arcsin: "odd",
    arctan: "odd"
  };
  function exponential2(v) {
    let total = fromInteger(1);
    for (const t of v) {
      if (t.factors.size === 0) {
        const raised3 = power5(E_VALUE, t.coeff);
        if (raised3 === void 0)
          return void 0;
        total = multiply5(total, raised3);
        continue;
      }
      if (t.factors.size !== 1)
        return void 0;
      const [[atom, exponent2]] = [...t.factors];
      const match = /^@ln:(\d+)$/.exec(atom);
      if (match === null || !isOne(exponent2))
        return void 0;
      const raised2 = power5(fromInteger(BigInt(match[1])), t.coeff);
      if (raised2 === void 0)
        return void 0;
      total = multiply5(total, raised2);
    }
    return total;
  }
  function applied(name, arg) {
    return name === "exp" ? power2(id3("e"), arg) : call(name, arg);
  }
  function special(name, v) {
    switch (name) {
      case "sqrt":
        return power5(v, rational(1n, 2n));
      case "abs":
        return toNumber2(v) < 0 ? negate2(v) : v;
      case "exp":
        return exponential2(v);
      case "ln":
        return naturalLog(v);
      case "log": {
        const top = naturalLog(v);
        const ten = naturalLog(fromInteger(10));
        return top === void 0 || ten === void 0 ? void 0 : divide7(top, ten);
      }
      case "sin":
      case "cos":
      case "tan":
      case "sec":
      case "csc":
      case "cot": {
        const k = twelfthsOfPi(v);
        if (k === void 0)
          return void 0;
        const s = sineAt(k);
        const c = sineAt(k + 6);
        if (s === void 0 || c === void 0)
          return void 0;
        const quotient = (a, b) => b.length === 0 ? void 0 : divide7(a, b);
        if (name === "sin")
          return s;
        if (name === "cos")
          return c;
        if (name === "tan")
          return quotient(s, c);
        if (name === "cot")
          return quotient(c, s);
        if (name === "sec")
          return quotient(fromInteger(1), c);
        return quotient(fromInteger(1), s);
      }
      case "arcsin":
        return arcsineOf(v);
      case "arccos": {
        const s = arcsineOf(v);
        return s === void 0 ? void 0 : subtract4(PI_OVER(1, 2), s);
      }
      case "arctan":
        return arctangentOf(v);
      case "sinh":
      case "tanh":
        return v.length === 0 ? ZERO2 : void 0;
      case "cosh":
        return v.length === 0 ? fromInteger(1) : void 0;
      default:
        return void 0;
    }
  }
  function naturalLog(v) {
    const single2 = atomsOf(v);
    if (single2 === void 0 || isNegative(single2.coeff))
      return void 0;
    let total = logarithm(single2.coeff);
    if (total === void 0)
      return void 0;
    for (const [atom, exponent2] of single2.factors) {
      const log3 = logarithmOfAtom(atom);
      if (log3 === void 0)
        return void 0;
      total = add5(total, multiply5(fromRational(exponent2), log3));
    }
    return total;
  }
  var ignore = () => {
  };
  function near(approach, scale = 1) {
    return approach.kind === "infinite" ? approach.sign * 1e6 * scale : approach.value + approach.side * 1e-7 * scale;
  }
  function limitOf(node, variable, approach, record2 = ignore) {
    for (const attempt2 of [limitByRules, seriesLimit, scaleLimit]) {
      const used = [];
      const found = attempt2(node, variable, approach, (t) => used.push(t));
      if (found !== void 0 && decided2(found)) {
        used.forEach(record2);
        return found;
      }
    }
    return void 0;
  }
  function certainlyZero(value) {
    if (value.length === 0)
      return true;
    const sizes = value.map((t) => Math.abs(toNumber2([t])));
    const total = Math.abs(toNumber2(value));
    if (sizes.every((s) => Number.isFinite(s) && s > 0) && total > 1e-12 * Math.max(...sizes))
      return false;
    const precise2 = value.map((t) => toDecimal([t]).abs());
    if (precise2.some((s) => !s.isFinite() || s.isZero()))
      return void 0;
    const largest = precise2.reduce((a, b) => a.gt(b) ? a : b);
    const sum3 = toDecimal(value).abs();
    return sum3.gt(largest.times("1e-45")) ? false : void 0;
  }
  function eventualSign(node, variable, approach) {
    const signOf = (value) => {
      const zero = certainlyZero(value);
      if (zero === void 0)
        return void 0;
      if (zero)
        return 0;
      return toNumber2(value) < 0 ? -1 : 1;
    };
    if (!dependsOn(node, variable)) {
      const value = exactConstant(node);
      return value === void 0 ? void 0 : signOf(value);
    }
    const found = limitOf(node, variable, approach);
    if (found?.kind === "infinite")
      return found.sign;
    if (found !== void 0) {
      const sign4 = signOf(found.value);
      if (sign4 !== 0)
        return sign4;
    }
    const lead = leadingTermExactly(
      movedToZero(node, variable, approach),
      LIMIT_STEP
    );
    if (lead === void 0)
      return void 0;
    const sign3 = signOf(lead.coefficient);
    return sign3 === 0 ? void 0 : sign3;
  }
  var decided2 = (found) => found.kind === "infinite" || certainlyZero(found.value) !== void 0;
  function seriesLimit(node, variable, approach, record2) {
    const moved = movedToZero(node, variable, approach);
    const lead = leadingTermExactly(moved, LIMIT_STEP);
    if (lead === void 0)
      return void 0;
    record2("series");
    if (lead.valuation > 0)
      return { kind: "finite", value: ZERO2 };
    if (lead.valuation === 0)
      return { kind: "finite", value: lead.coefficient };
    return {
      kind: "infinite",
      sign: toNumber2(lead.coefficient) < 0 ? -1 : 1
    };
  }
  var LIMIT_STEP = "limitStep";
  function movedToZero(node, variable, approach) {
    const h = id3(LIMIT_STEP);
    if (approach.kind === "infinite")
      return replaceIdentifier(
        node,
        variable,
        divide(number2(approach.sign), h)
      );
    const at2 = asRational(exactConstant(approach.node) ?? []);
    const centre = at2 === void 0 ? approach.node : toNode(fromRational(at2));
    return replaceIdentifier(
      node,
      variable,
      add(centre, multiply(number2(approach.side), h))
    );
  }
  var EXACT_CONSTANTS = {
    zero: ZERO2,
    one: fromInteger(1),
    fromRational,
    add: add5,
    negate: negate2,
    multiply: multiply5,
    inverse: (a) => divide7(fromInteger(1), a),
    isZero: (a) => {
      const zero = certainlyZero(a);
      if (zero === void 0)
        throw new PowerSeriesError(
          "A coefficient could not be decided to be zero or not."
        );
      return zero;
    },
    power: power5,
    constant: (node) => exactConstant(node),
    apply: (name, c) => exactConstant(applied(name, toNode(c)))
  };
  function leadingTermExactly(node, variable) {
    try {
      const lead = leadingTerm(node, variable);
      if (lead === void 0)
        return void 0;
      return {
        valuation: lead.valuation,
        coefficient: fromRational(lead.coefficient)
      };
    } catch (error2) {
      if (!(error2 instanceof PowerSeriesError))
        throw error2;
    }
    try {
      return leadingTermOver(EXACT_CONSTANTS, node, variable);
    } catch (error2) {
      if (error2 instanceof PowerSeriesError)
        return void 0;
      throw error2;
    }
  }
  function limitByRules(node, variable, approach, record2) {
    if (!dependsOn(node, variable)) {
      const value = exactConstant(node);
      return value === void 0 ? void 0 : { kind: "finite", value };
    }
    if (approach.kind === "point") {
      const at2 = evaluate(node, { [variable]: approach.value });
      const beside = evaluate(node, { [variable]: near(approach) });
      if (Number.isFinite(at2) && Number.isFinite(beside) && Math.abs(at2 - beside) < 1e-4 * Math.max(1, Math.abs(at2))) {
        const substituted = replaceIdentifier(node, variable, approach.node);
        const value = zeroToTheZero(substituted) ? void 0 : exactConstant(substituted);
        if (value !== void 0) {
          record2("substitution");
          return { kind: "finite", value };
        }
      }
    }
    const sign3 = (n) => evaluate(n, { [variable]: near(approach) }) < 0 ? -1 : 1;
    const zero = (l) => l.kind === "finite" && l.value.length === 0;
    const recurse = (n) => limitOf(n, variable, approach, record2);
    switch (node.type) {
      case "Identifier":
        return approach.kind === "infinite" ? { kind: "infinite", sign: approach.sign } : { kind: "finite", value: exactConstant(approach.node) ?? ZERO2 };
      case "Negative": {
        const inner = recurse(node.arg);
        if (inner === void 0)
          return void 0;
        return inner.kind === "finite" ? { kind: "finite", value: negate2(inner.value) } : { kind: "infinite", sign: inner.sign === 1 ? -1 : 1 };
      }
      case "BinaryOperator": {
        if (node.name === "Exponent")
          return powerLimit(node, variable, approach, record2);
        if (node.name === "Divide") {
          const ratio = polynomialRatio(node, variable, approach, record2);
          if (ratio !== void 0)
            return ratio;
        }
        const left = recurse(node.left);
        const right = recurse(node.right);
        switch (node.name) {
          case "Add":
          case "Subtract": {
            if (left === void 0 || right === void 0) {
              const [known, other] = left === void 0 ? [right, node.left] : [left, node.right];
              if (known?.kind !== "infinite" || !isBounded(other))
                return void 0;
              record2("squeeze");
              const negated = left === void 0 && node.name === "Subtract";
              return {
                kind: "infinite",
                sign: negated ? -known.sign : known.sign
              };
            }
            const flip = node.name === "Subtract" ? -1 : 1;
            if (left.kind === "finite" && right.kind === "finite")
              return {
                kind: "finite",
                value: flip === 1 ? add5(left.value, right.value) : subtract4(left.value, right.value)
              };
            const signs = [
              left.kind === "infinite" ? left.sign : 0,
              right.kind === "infinite" ? right.sign * flip : 0
            ].filter((s) => s !== 0);
            if (signs.every((s) => s === signs[0]))
              return { kind: "infinite", sign: signs[0] };
            return dominantTerm(node, variable, approach, record2);
          }
          case "Multiply":
          case "CrossMultiply": {
            if (left === void 0 || right === void 0)
              return squeezed(node, left, right, record2) ?? dominated(node, variable, approach, record2) ?? trapped(node, left, right, record2);
            if (left.kind === "finite" && right.kind === "finite")
              return {
                kind: "finite",
                value: multiply5(left.value, right.value)
              };
            if (zero(left) || zero(right))
              return dominated(node, variable, approach, record2);
            return { kind: "infinite", sign: sign3(node) };
          }
          case "Divide": {
            if (left === void 0 || right === void 0)
              return squeezed(node, left, right, record2) ?? dominated(node, variable, approach, record2);
            if (left.kind === "finite" && right.kind === "finite") {
              if (right.value.length === 0) {
                if (zero(left))
                  return dominated(node, variable, approach, record2);
                record2("one-sided");
                return { kind: "infinite", sign: sign3(node) };
              }
              const value = divide7(left.value, right.value);
              if (value !== void 0)
                return { kind: "finite", value };
              const direct2 = exactConstant(
                divide(toNode(left.value), toNode(right.value))
              );
              return direct2 === void 0 ? void 0 : { kind: "finite", value: direct2 };
            }
            if (left.kind === "finite" && right.kind === "infinite")
              return { kind: "finite", value: ZERO2 };
            if (left.kind === "infinite" && right.kind === "finite") {
              if (right.value.length === 0)
                record2("one-sided");
              return { kind: "infinite", sign: sign3(node) };
            }
            return dominated(node, variable, approach, record2);
          }
        }
        return void 0;
      }
      case "FunctionCall":
        return functionLimit(node, variable, approach, record2);
      default:
        return void 0;
    }
  }
  function expandedLogarithm(node, variable, approach, depth2 = 0) {
    if (depth2 > 3)
      return void 0;
    if (node.type === "BinaryOperator" && node.name === "Exponent") {
      if (node.left.type === "Identifier" && node.left.symbol === "e")
        return node.right;
      if (!dependsOn(node.left, variable) && evaluate(node.left, {}) > 0)
        return multiply(node.right, call("ln", node.left));
    }
    if (node.type === "BinaryOperator" && (node.name === "Add" || node.name === "Subtract")) {
      const other = (dominant, rest, sign3) => {
        const ratio = limitOf(divide(rest, dominant), variable, approach);
        if (ratio?.kind !== "finite" || certainlyZero(ratio.value) !== true)
          return void 0;
        if (!(evaluate(dominant, { [variable]: near(approach) }) > 0))
          return void 0;
        const inner = expandedLogarithm(dominant, variable, approach, depth2 + 1) ?? call("ln", dominant);
        const small = divide(rest, dominant);
        return add(
          inner,
          call(
            "ln",
            add(
              number2(1),
              sign3 > 0 ? small : multiply(number2(-1), small)
            )
          )
        );
      };
      return node.name === "Add" ? other(node.right, node.left, 1) ?? other(node.left, node.right, 1) : other(node.left, node.right, -1);
    }
    return void 0;
  }
  function zeroToTheZero(node) {
    let found = false;
    visit(node, (child) => {
      if (!found && child.type === "BinaryOperator" && child.name === "Exponent" && evaluate(child.left, {}) === 0 && evaluate(child.right, {}) === 0)
        found = true;
    });
    return found;
  }
  function powerLimit(node, variable, approach, record2) {
    const { left, right } = node;
    if (left.type === "Identifier" && left.symbol === "e")
      return functionLimit(call("exp", right), variable, approach, record2);
    if (dependsOn(right, variable)) {
      if (!(evaluate(left, { [variable]: near(approach) }) > 0))
        return void 0;
      const exponent2 = (logarithm3) => functionLimit(
        call(
          "exp",
          topLevelTerms(logarithm3).map(({ term: term2, negated }) => {
            const product = fold(multiply(right, term2));
            return negated ? multiply(number2(-1), product) : product;
          }).reduce((total, term2) => add(total, term2))
        ),
        variable,
        approach,
        record2
      );
      let found = exponent2(call("ln", left));
      if (found === void 0) {
        const expanded = expandedLogarithm(left, variable, approach);
        if (expanded !== void 0) {
          found = exponent2(expanded);
          if (found !== void 0)
            record2("dominant-term");
        }
      }
      if (found !== void 0)
        record2("exp-log");
      return found;
    }
    const r = asRational(exactConstant(right) ?? []);
    if (r === void 0)
      return void 0;
    const base2 = limitOf(left, variable, approach, record2);
    if (base2 === void 0)
      return void 0;
    if (base2.kind === "infinite") {
      if (isNegative(r))
        return { kind: "finite", value: ZERO2 };
      if (base2.sign < 0 && r.d !== 1n)
        return void 0;
      const odd = r.d === 1n && r.n % 2n !== 0n;
      return { kind: "infinite", sign: base2.sign < 0 && odd ? -1 : 1 };
    }
    if (base2.value.length === 0) {
      if (isNegative(r)) {
        const s = evaluate(node, { [variable]: near(approach) }) < 0 ? -1 : 1;
        record2("one-sided");
        return { kind: "infinite", sign: s };
      }
      return { kind: "finite", value: ZERO2 };
    }
    const value = power5(base2.value, r);
    return value === void 0 ? void 0 : { kind: "finite", value };
  }
  function functionLimit(node, variable, approach, record2) {
    if (node.args.length !== 1)
      return void 0;
    const name = node.callee.symbol;
    const inner = limitOf(node.args[0], variable, approach, record2);
    if (inner === void 0)
      return void 0;
    if (inner.kind === "infinite") {
      const s = inner.sign;
      const found = (() => {
        switch (name) {
          case "exp":
            return s > 0 ? { kind: "infinite", sign: 1 } : { kind: "finite", value: ZERO2 };
          case "ln":
          case "sqrt":
            return s > 0 ? { kind: "infinite", sign: 1 } : void 0;
          case "abs":
          case "cosh":
            return { kind: "infinite", sign: 1 };
          case "floor":
          case "ceil":
          case "round":
            return { kind: "infinite", sign: s };
          case "sign":
            return { kind: "finite", value: fromInteger(s) };
          case "sinh":
            return { kind: "infinite", sign: s };
          case "arctan":
            return { kind: "finite", value: PI_OVER(s, 2) };
          case "tanh":
            return { kind: "finite", value: fromInteger(s) };
          default:
            return void 0;
        }
      })();
      if (found !== void 0)
        record2("end-behaviour");
      return found;
    }
    if (["tan", "sec", "cot", "csc"].includes(name)) {
      const k = twelfthsOfPi(inner.value);
      const cosZero = k !== void 0 && (k % 12 + 12) % 12 === 6;
      const sinZero = k !== void 0 && (k % 12 + 12) % 12 === 0;
      const pole = name === "tan" || name === "sec" ? cosZero : sinZero;
      if (pole) {
        const s = evaluate(node, { [variable]: near(approach) }) < 0 ? -1 : 1;
        record2("one-sided");
        return { kind: "infinite", sign: s };
      }
    }
    if (inner.value.length === 0) {
      if (name === "ln") {
        const inside = evaluate(node.args[0], { [variable]: near(approach) });
        if (!(inside > 0))
          return void 0;
        record2("one-sided");
        return { kind: "infinite", sign: -1 };
      }
    }
    const value = exactConstant(applied(name, toNode(inner.value)));
    return value === void 0 ? void 0 : { kind: "finite", value };
  }
  function polynomialRatio(node, variable, approach, record2) {
    if (approach.kind !== "infinite")
      return void 0;
    const top = numericPolynomial(node.left, variable);
    const bottom = numericPolynomial(node.right, variable);
    if (top === void 0 || bottom === void 0)
      return void 0;
    const m = top.length - 1;
    const n = bottom.length - 1;
    record2("leading-terms");
    if (m < n)
      return { kind: "finite", value: ZERO2 };
    if (m === n)
      return {
        kind: "finite",
        value: fromRational(divide5(top[m], bottom[n]))
      };
    const s = evaluate(node, { [variable]: near(approach) }) < 0 ? -1 : 1;
    return { kind: "infinite", sign: s };
  }
  function numericPolynomial(node, variable) {
    const parts = coefficientsIn(node, variable, 12);
    if (parts === void 0)
      return void 0;
    const out = [];
    for (const part of parts) {
      const value = asRational(exactConstant(fold(part)) ?? []);
      if (value === void 0)
        return void 0;
      out.push(value);
    }
    while (out.length > 1 && isZero(out[out.length - 1]))
      out.pop();
    return out;
  }
  function isBounded(node) {
    if (node.type === "Negative")
      return isBounded(node.arg);
    if (node.type === "FunctionCall" && node.args.length === 1)
      return [
        "sin",
        "cos",
        "arctan",
        "arccot",
        "arcsin",
        "arccos",
        "tanh",
        "sign"
      ].includes(node.callee.symbol);
    if (node.type === "BinaryOperator") {
      const constant3 = (n) => Number.isFinite(evaluate(n, {}));
      const bounded = (n) => constant3(n) || isBounded(n);
      switch (node.name) {
        case "Add":
        case "Subtract":
        case "Multiply":
        case "CrossMultiply":
          return bounded(node.left) && bounded(node.right);
        case "Divide":
          return bounded(node.left) && constant3(node.right) && evaluate(node.right, {}) !== 0;
        case "Exponent":
          return isBounded(node.left) && constant3(node.right) && Number.isInteger(evaluate(node.right, {})) && evaluate(node.right, {}) > 0;
        default:
          return false;
      }
    }
    return false;
  }
  function squeezed(node, left, right, record2) {
    const vanishes = (l) => l?.kind === "finite" && l.value.length === 0;
    const product = node.name !== "Divide";
    const other = (side) => product ? vanishes(side) : side?.kind === "infinite";
    if (left === void 0 && isBounded(node.left) && other(right)) {
      record2("squeeze");
      return { kind: "finite", value: ZERO2 };
    }
    if (product && right === void 0 && isBounded(node.right) && vanishes(left)) {
      record2("squeeze");
      return { kind: "finite", value: ZERO2 };
    }
    return void 0;
  }
  function range2(node) {
    const value = evaluate(node, {});
    if (Number.isFinite(value))
      return [value, value];
    switch (node.type) {
      case "Negative": {
        const r = range2(node.arg);
        return r && [-r[1], -r[0]];
      }
      case "FunctionCall": {
        if (node.args.length !== 1)
          return void 0;
        switch (node.callee.symbol) {
          case "sin":
          case "cos":
          case "tanh":
          case "sign":
            return [-1, 1];
          case "arctan":
            return [-Math.PI / 2, Math.PI / 2];
          default:
            return void 0;
        }
      }
      case "BinaryOperator": {
        const l = range2(node.left);
        const r = l && range2(node.right);
        if (l === void 0 || r === void 0)
          return void 0;
        switch (node.name) {
          case "Add":
            return [l[0] + r[0], l[1] + r[1]];
          case "Subtract":
            return [l[0] - r[1], l[1] - r[0]];
          case "Multiply":
          case "CrossMultiply": {
            const p = [l[0] * r[0], l[0] * r[1], l[1] * r[0], l[1] * r[1]];
            return [Math.min(...p), Math.max(...p)];
          }
          case "Divide": {
            if (r[0] !== r[1] || r[0] === 0)
              return void 0;
            const q = [l[0] / r[0], l[1] / r[0]];
            return [Math.min(...q), Math.max(...q)];
          }
          default:
            return void 0;
        }
      }
      default:
        return void 0;
    }
  }
  function trapped(node, left, right, record2) {
    const [known, other] = left === void 0 ? [right, node.left] : [left, node.right];
    if (known?.kind !== "infinite")
      return void 0;
    const bounds = range2(other);
    if (bounds === void 0)
      return void 0;
    const [lo, hi] = bounds;
    if (!(lo > 0 || hi < 0))
      return void 0;
    record2("squeeze");
    return { kind: "infinite", sign: known.sign * (lo > 0 ? 1 : -1) };
  }
  function dominantTerm(node, variable, approach, record2) {
    const flip = node.name === "Subtract" ? -1 : 1;
    const lead = limitOf(node.left, variable, approach, record2);
    if (lead?.kind !== "infinite")
      return void 0;
    const ratio = limitOf(
      divide(node.right, node.left),
      variable,
      approach,
      record2
    );
    if (ratio === void 0)
      return void 0;
    if (ratio.kind === "infinite") {
      const s = evaluate(node, { [variable]: near(approach) }) < 0 ? -1 : 1;
      record2("dominant-term");
      return { kind: "infinite", sign: s };
    }
    const factor = add5(
      fromInteger(1),
      flip === 1 ? ratio.value : negate2(ratio.value)
    );
    if (factor.length === 0)
      return void 0;
    const size = toNumber2(factor);
    if (!Number.isFinite(size) || size === 0)
      return void 0;
    record2("dominant-term");
    return {
      kind: "infinite",
      sign: lead.sign * Math.sign(size)
    };
  }
  function dominated(node, variable, approach, record2) {
    if (node.type === "BinaryOperator" && (node.name === "Add" || node.name === "Subtract")) {
      return void 0;
    }
    const factors = [];
    quotientFactors(node, true, factors);
    let vanishing = false;
    let onlyLogarithmsAbove = true;
    let powerBelow = false;
    let explodingAbove = false;
    let slowBelow = true;
    for (const { node: factor, inNumerator } of factors) {
      if (!dependsOn(factor, variable))
        continue;
      const kind = growth(factor, variable, approach, record2);
      if (kind === void 0)
        return void 0;
      if (kind === "exploding-exponential") {
        if (!inNumerator)
          return void 0;
        explodingAbove = true;
        onlyLogarithmsAbove = false;
        continue;
      }
      if (!inNumerator && kind !== "polynomial" && kind !== "logarithmic")
        slowBelow = false;
      if (inNumerator && kind !== "logarithmic")
        onlyLogarithmsAbove = false;
      if (!inNumerator && kind === "polynomial")
        powerBelow = true;
      if (inNumerator ? kind === "vanishing" : kind === "exploding-power") {
        vanishing = true;
        continue;
      }
      if (kind === "logarithmic" || kind === "polynomial")
        continue;
      return void 0;
    }
    if (approach.kind === "infinite" && onlyLogarithmsAbove && powerBelow)
      vanishing = true;
    if (explodingAbove && slowBelow && !vanishing) {
      const s = evaluate(node, { [variable]: near(approach, 1e-4) }) < 0 ? -1 : 1;
      record2("growth");
      return { kind: "infinite", sign: s };
    }
    if (!vanishing)
      return void 0;
    record2("growth");
    return { kind: "finite", value: ZERO2 };
  }
  function growth(factor, variable, approach, record2) {
    const isLog = (n) => n.type === "FunctionCall" && n.callee.symbol === "ln" || n.type === "BinaryOperator" && n.name === "Exponent" && isLog(n.left);
    if (isLog(factor)) {
      let inside = factor;
      while (inside.type === "BinaryOperator" && inside.name === "Exponent")
        inside = inside.left;
      if (inside.type !== "FunctionCall")
        return void 0;
      const kind = growth(inside.args[0], variable, approach, record2);
      return kind === "polynomial" || kind === "vanishing" || kind === "exploding-power" || kind === "logarithmic" ? "logarithmic" : void 0;
    }
    if (factor.type === "FunctionCall" && factor.callee.symbol === "sqrt")
      return growth(
        power2(factor.args[0], divide(number2(1), number2(2))),
        variable,
        approach,
        record2
      );
    if (approach.kind === "point") {
      const at2 = evaluate(factor, { [variable]: approach.value });
      const exponent3 = factor.type === "BinaryOperator" && factor.name === "Exponent" ? asRational(exactConstant(factor.right) ?? []) : ONE;
      const base2 = factor.type === "BinaryOperator" && factor.name === "Exponent" ? factor.left : factor;
      if (exponent3 === void 0)
        return void 0;
      const baseAt = evaluate(base2, { [variable]: approach.value });
      if (baseAt === 0 && coefficientsIn(base2, variable, 1) !== void 0)
        return isNegative(exponent3) ? "exploding-power" : "vanishing";
      if (!Number.isFinite(at2) || at2 === 0)
        return void 0;
      const settles = limitOf(factor, variable, approach, record2);
      return settles?.kind === "finite" && certainlyZero(settles.value) === false ? "polynomial" : void 0;
    }
    const exponent2 = factor.type === "BinaryOperator" && factor.name === "Exponent" && factor.left.type === "Identifier" && factor.left.symbol === "e" ? factor.right : factor.type === "FunctionCall" && factor.callee.symbol === "exp" ? factor.args[0] : void 0;
    if (exponent2 !== void 0) {
      const inner = limitOf(exponent2, variable, approach, record2);
      if (inner?.kind !== "infinite")
        return void 0;
      const outgrowsLog = limitOf(
        divide(exponent2, call("ln", id3(variable))),
        variable,
        approach
      );
      if (outgrowsLog?.kind !== "infinite")
        return void 0;
      return inner.sign < 0 ? "vanishing" : "exploding-exponential";
    }
    if (coefficientsIn(factor, variable, 12) !== void 0)
      return "polynomial";
    if (factor.type === "BinaryOperator" && factor.name === "Exponent" && coefficientsIn(factor.left, variable, 12) !== void 0)
      return "polynomial";
    return void 0;
  }
  function quadrature(f, lower, upper) {
    let g = f;
    let a = lower;
    let b = upper;
    if (!Number.isFinite(lower) && !Number.isFinite(upper)) {
      const left = quadrature(f, -Infinity, 0);
      const right = quadrature(f, 0, Infinity);
      return left === void 0 || right === void 0 ? void 0 : left + right;
    }
    if (!Number.isFinite(upper)) {
      g = (t) => f(lower + t / (1 - t)) / ((1 - t) * (1 - t));
      a = 0;
      b = 1;
    } else if (!Number.isFinite(lower)) {
      g = (t) => f(upper - t / (1 - t)) / ((1 - t) * (1 - t));
      a = 0;
      b = 1;
    }
    const half = (b - a) / 2;
    const middle = (a + b) / 2;
    let previous;
    for (let level = 0; level <= 7; level += 1) {
      const h = Math.pow(2, -level);
      let total = 0;
      for (let k = -Math.ceil(4 / h); k <= Math.ceil(4 / h); k += 1) {
        const t = k * h;
        const u = Math.PI / 2 * Math.sinh(t);
        const weight = Math.PI / 2 * Math.cosh(t) / Math.pow(Math.cosh(u), 2);
        if (weight < 1e-300)
          continue;
        const x = middle + half * Math.tanh(u);
        if (x <= a || x >= b)
          continue;
        const y = g(x);
        if (!Number.isFinite(y))
          continue;
        total += weight * y;
      }
      const estimate = total * h * half;
      if (previous !== void 0 && Math.abs(estimate - previous) <= 1e-10 * Math.max(1, Math.abs(estimate))) {
        return estimate;
      }
      previous = estimate;
    }
    return void 0;
  }
  function interiorSingularity(f, lower, upper) {
    const map = (t) => Number.isFinite(lower) && Number.isFinite(upper) ? lower + (upper - lower) * t : Number.isFinite(lower) ? lower + t / (1 - t) : Number.isFinite(upper) ? upper - t / (1 - t) : Math.tan(Math.PI * (t - 0.5));
    const count = 2e3;
    let last = f(map(0.5 / count));
    for (let i = 1; i < count; i += 1) {
      const y = f(map((i + 0.5) / count));
      if (!Number.isFinite(y))
        return true;
      if (Math.abs(y) > 1e8 && Math.abs(last) > 1e8 && Math.sign(y) !== Math.sign(last))
        return true;
      last = y;
    }
    return false;
  }
  function definiteIntegral(integrand, antiderivative2, variable, lower, upper) {
    const callees = /* @__PURE__ */ new Set();
    for (const tree of [integrand, antiderivative2])
      visit(tree, (child) => {
        if (child.type === "FunctionCall")
          callees.add(child.callee.symbol);
      });
    const free = [
      ...identifiersIn(integrand),
      ...identifiersIn(antiderivative2)
    ].filter(
      (name) => name !== variable && name !== "e" && name !== "pi" && !callees.has(name)
    );
    if (free.length > 0) {
      throw new DefiniteError(
        `An exact value needs numbers, and ${free[0]} has none here.`
      );
    }
    const f = (x) => evaluate(integrand, { [variable]: x });
    const a = lower.kind === "finite" ? lower.value : lower.sign * Infinity;
    const b = upper.kind === "finite" ? upper.value : upper.sign * Infinity;
    if (a === b)
      return { exact: ZERO2, value: 0, improper: false };
    if (a > b) {
      const swapped = definiteIntegral(
        integrand,
        antiderivative2,
        variable,
        upper,
        lower
      );
      return {
        exact: swapped.exact === void 0 ? void 0 : negate2(swapped.exact),
        value: -swapped.value,
        diverges: swapped.diverges === void 0 || swapped.diverges === 0 ? swapped.diverges : swapped.diverges === 1 ? -1 : 1,
        improper: swapped.improper
      };
    }
    const breaks = breakPoints(integrand, antiderivative2, variable, a, b);
    if (breaks === void 0) {
      throw new DefiniteError(
        "The integrand or its antiderivative has a break inside the interval that this cannot locate exactly, so it is not evaluated."
      );
    }
    const edges = [
      lower,
      ...breaks.map(
        (point) => ({
          kind: "finite",
          node: point.node,
          value: point.value
        })
      ),
      upper
    ];
    const valueOf2 = (bound) => bound.kind === "finite" ? bound.value : bound.sign * Infinity;
    for (let i = 0; i + 1 < edges.length; i += 1) {
      if (interiorSingularity(f, valueOf2(edges[i]), valueOf2(edges[i + 1]))) {
        throw new DefiniteError(
          "The integrand has no value somewhere inside the interval at a point this cannot locate exactly, so it is not evaluated."
        );
      }
    }
    let improper = breaks.length > 0 && breaks.some((point) => !Number.isFinite(f(point.value)));
    const limitAt = (bound, side) => {
      if (bound.kind === "infinite") {
        improper = true;
        return limitOf(antiderivative2, variable, {
          kind: "infinite",
          sign: bound.sign
        });
      }
      if (!Number.isFinite(f(bound.value)))
        improper = true;
      return limitOf(antiderivative2, variable, {
        kind: "point",
        node: bound.node,
        value: bound.value,
        side
      });
    };
    let exact = ZERO2;
    const infinities = [];
    let numeric = 0;
    for (let i = 0; i + 1 < edges.length; i += 1) {
      const left = edges[i];
      const right = edges[i + 1];
      const top = limitAt(right, -1);
      const bottom = limitAt(left, 1);
      if (top === void 0 || bottom === void 0) {
        throw new DefiniteError(
          "The antiderivative has no limit here that this can work out exactly."
        );
      }
      if (top.kind === "infinite")
        infinities.push(top.sign);
      if (bottom.kind === "infinite")
        infinities.push(-bottom.sign);
      if (top.kind === "finite" && bottom.kind === "finite") {
        exact = add5(exact, subtract4(top.value, bottom.value));
        const piece = quadrature(f, valueOf2(left), valueOf2(right));
        if (piece === void 0) {
          throw new DefiniteError(
            "The exact value could not be confirmed numerically, so it is not shown."
          );
        }
        numeric += piece;
      }
    }
    if (infinities.length > 0) {
      const sign3 = infinities.every((s) => s === infinities[0]) ? infinities[0] : 0;
      return {
        value: sign3 === 0 ? NaN : sign3 * Infinity,
        diverges: sign3,
        improper: true
      };
    }
    const value = toNumber2(exact);
    if (Math.abs(numeric - value) > 1e-6 * Math.max(1, Math.abs(value))) {
      throw new DefiniteError(
        "The antiderivative found is not continuous across the whole interval \u2014 it jumps somewhere inside it that this could not locate \u2014 so F(b) \u2212 F(a) would be wrong, and it is not shown."
      );
    }
    return { exact, value, improper };
  }
  var MAX_BREAKS = 40;
  function breakPoints(integrand, antiderivative2, variable, a, b) {
    const found = [];
    const consider = (exact) => {
      const value = toNumber2(exact);
      if (!(value > a && value < b))
        return;
      if (found.some((other) => Math.abs(other.value - value) < 1e-12))
        return;
      found.push({ exact, value });
    };
    for (const tree of [integrand, antiderivative2]) {
      let giveUp = false;
      visit(tree, (child) => {
        if (giveUp || child.type !== "FunctionCall" || child.args.length !== 1)
          return;
        const name = child.callee.symbol;
        const offset = name === "tan" || name === "sec" ? rational(1n, 2n) : name === "cot" || name === "csc" ? ZERO : void 0;
        if (offset === void 0)
          return;
        const linear2 = linearIn(child.args[0], variable);
        if (linear2 === void 0)
          return;
        const slope = asRational(exactConstant(linear2.a) ?? []);
        const shift = exactConstant(linear2.b);
        if (slope === void 0 || isZero(slope) || shift === void 0) {
          giveUp = true;
          return;
        }
        const s = toNumber(slope);
        const shiftValue = toNumber2(shift);
        const u1 = s * a + shiftValue;
        const u2 = s * b + shiftValue;
        const low = Math.min(u1, u2);
        const high = Math.max(u1, u2);
        if (!Number.isFinite(low) || !Number.isFinite(high)) {
          giveUp = true;
          return;
        }
        const o = toNumber(offset);
        const kFrom = Math.ceil(low / Math.PI - o) - 1;
        const kTo = Math.floor(high / Math.PI - o) + 1;
        if (kTo - kFrom > MAX_BREAKS) {
          giveUp = true;
          return;
        }
        for (let k = kFrom; k <= kTo; k += 1) {
          const angle = multiply5(
            PI_VALUE,
            fromRational(add4(offset, rational(BigInt(k))))
          );
          const x = divide7(subtract4(angle, shift), fromRational(slope));
          if (x !== void 0)
            consider(x);
        }
      });
      if (giveUp) {
        break;
      }
    }
    const ratio = asRatio(fold(integrand));
    const bottom = numericPolynomial(fold(ratio.denominator), variable);
    const top = numericPolynomial(fold(ratio.numerator), variable);
    if (bottom !== void 0 && top !== void 0 && bottom.length > 1) {
      const factors = factorOverQ(bottom);
      for (const factor of factors ?? []) {
        if (factor.length !== 2)
          continue;
        consider(fromRational(negate(divide5(factor[0], factor[1]))));
      }
    }
    if (found.length > MAX_BREAKS)
      return void 0;
    return found.sort((p, q) => p.value - q.value).map(({ exact, value }) => ({ node: toNode(exact), value }));
  }

  // src/plugins/physics-lab/symbolic/absolute.ts
  function splitAbsolute(integrand, variable, lower, upper) {
    const insides = [];
    visit(integrand, (child) => {
      if (child.type === "FunctionCall" && child.callee.symbol === "abs" && child.args.length === 1 && dependsOn(child.args[0], variable))
        insides.push(child.args[0]);
    });
    if (insides.length === 0)
      return void 0;
    const a = lower.kind === "finite" ? lower.value : lower.sign * Infinity;
    const b = upper.kind === "finite" ? upper.value : upper.sign * Infinity;
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    const cuts = [];
    for (const inside of insides) {
      const changes = exactSignChanges(inside, variable);
      if (changes === void 0)
        return void 0;
      for (const { node, value } of changes) {
        if (!(value > lo && value < hi))
          continue;
        if (cuts.some((cut) => Math.abs(cut.value - value) < 1e-12))
          continue;
        cuts.push({ node, value });
      }
    }
    cuts.sort((p, q) => p.value - q.value);
    const low = a <= b ? lower : upper;
    const high = a <= b ? upper : lower;
    const points = [
      low,
      ...cuts.map((cut) => ({ kind: "finite", ...cut })),
      high
    ];
    const at2 = (bound) => bound.kind === "finite" ? bound.value : bound.sign * Infinity;
    const pieces = [];
    for (let i = 0; i + 1 < points.length; i += 1) {
      const p = at2(points[i]);
      const q = at2(points[i + 1]);
      const middle = Number.isFinite(p) && Number.isFinite(q) ? (p + q) / 2 : Number.isFinite(p) ? p + 1 : Number.isFinite(q) ? q - 1 : 0;
      let body = integrand;
      for (const inside of insides) {
        const sign3 = evaluate(inside, { [variable]: middle });
        const replaced = sign3 >= 0 ? inside : negative2(inside);
        body = replaceSubtree(body, call("abs", inside), replaced);
      }
      pieces.push({
        lower: a <= b ? points[i] : points[i + 1],
        upper: a <= b ? points[i + 1] : points[i],
        integrand: body
      });
    }
    return a <= b ? pieces : pieces.reverse();
  }
  function absoluteDefinite(integrand, variable, lower, upper) {
    const pieces = splitAbsolute(integrand, variable, lower, upper);
    if (pieces === void 0)
      return void 0;
    let exact = ZERO2;
    let improper = false;
    try {
      for (const piece of pieces) {
        const result = definiteIntegral(
          piece.integrand,
          integrate2(piece.integrand, variable),
          variable,
          piece.lower,
          piece.upper
        );
        if (result.exact === void 0)
          return void 0;
        exact = add5(exact, result.exact);
        improper ||= result.improper;
      }
    } catch {
      return void 0;
    }
    const value = toNumber2(exact);
    const f = (x) => evaluate(integrand, { [variable]: x });
    let check = 0;
    for (const piece of pieces) {
      const p = piece.lower.kind === "finite" ? piece.lower.value : piece.lower.sign * Infinity;
      const q = piece.upper.kind === "finite" ? piece.upper.value : piece.upper.sign * Infinity;
      const part = p <= q ? quadrature(f, p, q) : quadrature(f, q, p);
      if (part === void 0)
        return void 0;
      check += p <= q ? part : -part;
    }
    if (Math.abs(check - value) > 1e-6 * Math.max(1, Math.abs(value)))
      return void 0;
    return { exact, value, improper };
  }

  // src/plugins/physics-lab/symbolic/definiteTheorems.ts
  var SAMPLES2 = 24;
  var at = (b) => b.kind === "finite" ? b.value : b.sign * Infinity;
  function rateIn(node, variable) {
    const at0 = evaluate(node, { [variable]: 0 });
    const at1 = evaluate(node, { [variable]: 1 });
    const at3 = evaluate(node, { [variable]: 3 });
    if (at0 !== 0 || !Number.isFinite(at1) || Math.abs(at3 - 3 * at1) > 1e-12)
      return void 0;
    return fromNumber(at1) === void 0 ? void 0 : at1;
  }
  function rationalNodeOf(value) {
    const q = fromNumber(value);
    if (q === void 0)
      return void 0;
    const magnitude = number2(Math.abs(Number(q.n)));
    const body = q.d === 1n ? magnitude : divide(magnitude, number2(Number(q.d)));
    return q.n < 0n ? negative2(body) : body;
  }
  function factorList(node) {
    const out = [];
    quotientFactors(node, true, out);
    return out;
  }
  var isCall = (node, name) => node.type === "FunctionCall" && node.callee.symbol === name && node.args.length === 1;
  var isVariable2 = (node, variable) => node.type === "Identifier" && node.symbol === variable;
  function exponentOf3(node) {
    if (node.type === "BinaryOperator" && node.name === "Exponent" && node.left.type === "Identifier" && node.left.symbol === "e")
      return node.right;
    if (isCall(node, "exp") && node.type === "FunctionCall")
      return node.args[0];
    return void 0;
  }
  function exactOf2(node) {
    return exactConstant(fold(node));
  }
  var isZeroBound = (b) => b.kind === "finite" && b.value === 0;
  var isOneBound = (b) => b.kind === "finite" && b.value === 1;
  var isPlusInfinity = (b) => b.kind === "infinite" && b.sign === 1;
  var isMultipleOfPi = (b, k) => b.kind === "finite" && Math.abs(b.value - k * Math.PI) < 1e-14;
  var powerOverLog = (f, variable, lower, upper) => {
    if (!isZeroBound(lower) || !isOneBound(upper))
      return void 0;
    if (f.type !== "BinaryOperator" || f.name !== "Divide")
      return void 0;
    if (!isCall(f.right, "ln") || f.right.type !== "FunctionCall")
      return void 0;
    if (!isVariable2(f.right.args[0], variable))
      return void 0;
    const poly = asQPoly(f.left, variable);
    if (poly === void 0)
      return void 0;
    let total = ZERO;
    for (const c of poly)
      total = add4(total, c);
    if (!isZero(total))
      return void 0;
    let value = number2(0);
    poly.forEach((c, p) => {
      if (isZero(c) || p === 0)
        return;
      value = add(
        value,
        multiply(rationalNodeOf(toNumber(c)), call("ln", number2(p + 1)))
      );
    });
    return {
      node: value,
      method: "\u222B\u2080\xB9 (x^p \u2212 1)/ln x dx = ln(p + 1), by differentiating under the integral sign in p; the numerator is a combination of these because its coefficients add up to 0."
    };
  };
  var FRULLANI_TABLE = {
    arctan: { atZero: number2(0), atInfinity: divide(id3("pi"), number2(2)) },
    tanh: { atZero: number2(0), atInfinity: number2(1) }
  };
  var frullani = (f, variable, lower, upper) => {
    if (!isZeroBound(lower) || !isPlusInfinity(upper))
      return void 0;
    if (f.type !== "BinaryOperator" || f.name !== "Divide")
      return void 0;
    if (!isVariable2(f.right, variable))
      return void 0;
    const terms = topLevelTerms(f.left);
    if (terms.length !== 2 || terms[0].negated === terms[1].negated)
      return void 0;
    const [plus, minus] = terms[0].negated ? [terms[1], terms[0]] : terms;
    const read = (term2) => {
      if (term2.type === "FunctionCall" && term2.args.length === 1) {
        const entry = FRULLANI_TABLE[term2.callee.symbol];
        const rate = rateIn(term2.args[0], variable);
        if (entry !== void 0 && rate !== void 0 && rate > 0)
          return { key: term2.callee.symbol, rate, ...entry };
      }
      const exponent2 = exponentOf3(term2);
      if (exponent2 !== void 0) {
        const rate = rateIn(exponent2, variable);
        if (rate !== void 0 && rate < 0)
          return {
            key: "exp",
            rate: -rate,
            atZero: number2(1),
            atInfinity: number2(0)
          };
      }
      return void 0;
    };
    const p = read(plus.term);
    const m = read(minus.term);
    if (p === void 0 || m === void 0 || p.key !== m.key)
      return void 0;
    return {
      node: multiply(
        subtract(p.atZero, p.atInfinity),
        call("ln", divide(rationalNodeOf(m.rate), rationalNodeOf(p.rate)))
      ),
      method: "Frullani's theorem: \u222B\u2080^\u221E (g(ax) \u2212 g(bx))/x dx = (g(0) \u2212 g(\u221E)) ln(b/a), for a, b > 0 and g with limits at 0 and \u221E."
    };
  };
  var logOverSquare = (f, variable, lower, upper) => {
    if (!isZeroBound(lower) || !isPlusInfinity(upper))
      return void 0;
    if (f.type !== "BinaryOperator" || f.name !== "Divide")
      return void 0;
    if (!isCall(f.left, "ln") || f.left.type !== "FunctionCall")
      return void 0;
    const k = rateIn(f.left.args[0], variable);
    const q = asQPoly(f.right, variable);
    if (k === void 0 || !(k > 0) || q === void 0)
      return void 0;
    if (q.length !== 3 || !isZero(q[1]) || !isOne(q[2]))
      return void 0;
    if (!(q[0].n > 0n))
      return void 0;
    const a = power2(
      rationalNodeOf(toNumber(q[0])),
      divide(number2(1), number2(2))
    );
    return {
      node: divide(
        multiply(id3("pi"), call("ln", multiply(rationalNodeOf(k), a))),
        multiply(number2(2), a)
      ),
      method: "\u222B\u2080^\u221E ln(kx)/(x\xB2 + a\xB2) dx = \u03C0 ln(ka)/(2a): substituting x = a\xB2/t sends the integral of ln(x/a) to minus itself, so that part is 0."
    };
  };
  var dampedSine = (f, variable, lower, upper) => {
    if (!isZeroBound(lower) || !isPlusInfinity(upper))
      return void 0;
    const factors = factorList(f);
    if (factors.length !== 3)
      return void 0;
    let s;
    let b;
    let overX = false;
    let scale = 1;
    for (const factor of factors) {
      const exponent2 = exponentOf3(factor.node);
      if (factor.inNumerator && exponent2 !== void 0) {
        const rate = rateIn(exponent2, variable);
        if (rate !== void 0 && rate < 0)
          s = -rate;
      } else if (factor.inNumerator && factor.node.type === "FunctionCall" && factor.node.callee.symbol === "sin")
        b = rateIn(factor.node.args[0], variable);
      else if (!factor.inNumerator && isVariable2(factor.node, variable))
        overX = true;
      else if (!dependsOn(factor.node, variable)) {
        const v = evaluate(factor.node, {});
        scale = factor.inNumerator ? scale * v : scale / v;
      }
    }
    if (s === void 0 || b === void 0 || !overX || scale !== 1)
      return void 0;
    return {
      node: call("arctan", divide(rationalNodeOf(b), rationalNodeOf(s))),
      method: "\u222B\u2080^\u221E e^{\u2212sx} sin(bx)/x dx = arctan(b/s), for s > 0: its derivative in s is \u2212b/(s\xB2 + b\xB2), and it tends to 0 as s \u2192 \u221E."
    };
  };
  var logAffineCosine = (f, variable, lower, upper) => {
    if (!isZeroBound(lower) || !isMultipleOfPi(upper, 1))
      return void 0;
    if (!isCall(f, "ln") || f.type !== "FunctionCall")
      return void 0;
    const [inside] = f.args;
    const cosAt = (x) => evaluate(inside, { [variable]: x });
    const A = cosAt(Math.PI / 2);
    const B = cosAt(0) - A;
    for (const x of [0.3, 1.1, 2.4])
      if (Math.abs(cosAt(x) - (A + B * Math.cos(x))) > 1e-12)
        return void 0;
    const qa = fromNumber(A);
    const qb = fromNumber(B);
    if (qa === void 0 || qb === void 0 || !(A > Math.abs(B)))
      return void 0;
    const root2 = power2(
      rationalNodeOf(A * A - B * B),
      divide(number2(1), number2(2))
    );
    return {
      node: multiply(
        id3("pi"),
        call("ln", divide(add(rationalNodeOf(A), root2), number2(2)))
      ),
      method: "\u222B\u2080^\u03C0 ln(A + B cos x) dx = \u03C0 ln((A + \u221A(A\xB2 \u2212 B\xB2))/2), for A > |B|, by differentiating under the integral sign in A."
    };
  };
  var logOneExp = (f, variable, lower, upper) => {
    if (!isZeroBound(lower) || !isPlusInfinity(upper))
      return void 0;
    if (!isCall(f, "ln") || f.type !== "FunctionCall")
      return void 0;
    const terms = topLevelTerms(f.args[0]);
    if (terms.length !== 2)
      return void 0;
    const one2 = terms.find(
      (t) => !dependsOn(t.term, variable) && evaluate(t.term, {}) === 1 && !t.negated
    );
    const other = terms.find((t) => t !== one2);
    if (one2 === void 0 || other === void 0)
      return void 0;
    const exponent2 = exponentOf3(other.term);
    if (exponent2 === void 0)
      return void 0;
    const rate = rateIn(exponent2, variable);
    if (rate === void 0 || !(rate < 0))
      return void 0;
    const k = rationalNodeOf(-rate);
    const piSquared = power2(id3("pi"), number2(2));
    return {
      node: other.negated ? negative2(divide(piSquared, multiply(number2(6), k))) : divide(piSquared, multiply(number2(12), k)),
      method: other.negated ? "\u222B\u2080^\u221E ln(1 \u2212 e^{\u2212kx}) dx = \u2212Li\u2082(1)/k = \u2212\u03C0\xB2/(6k): expand the logarithm as a series in e^{\u2212kx} and integrate term by term." : "\u222B\u2080^\u221E ln(1 + e^{\u2212kx}) dx = \u2212Li\u2082(\u22121)/k = \u03C0\xB2/(12k): expand the logarithm as a series in e^{\u2212kx} and integrate term by term."
    };
  };
  var logSine = (f, variable, lower, upper) => {
    if (!isZeroBound(lower))
      return void 0;
    if (!isCall(f, "ln") || f.type !== "FunctionCall")
      return void 0;
    const [inside] = f.args;
    const trig = inside.type === "FunctionCall" && (inside.callee.symbol === "sin" || inside.callee.symbol === "cos") && isVariable2(inside.args[0], variable) ? inside.callee.symbol : void 0;
    if (trig === void 0)
      return void 0;
    const half = isMultipleOfPi(upper, 0.5);
    const whole = isMultipleOfPi(upper, 1) && trig === "sin";
    if (!half && !whole)
      return void 0;
    return {
      node: negative2(
        multiply(divide(id3("pi"), number2(half ? 2 : 1)), call("ln", number2(2)))
      ),
      method: "\u222B\u2080^{\u03C0/2} ln sin x dx = \u222B\u2080^{\u03C0/2} ln cos x dx = \u2212(\u03C0/2) ln 2: adding the two gives the integral of ln(sin 2x / 2), which is the same integral again minus (\u03C0/2) ln 2."
    };
  };
  var NAMED = [
    powerOverLog,
    frullani,
    logOverSquare,
    dampedSine,
    logAffineCosine,
    logOneExp,
    logSine
  ];
  function samplesIn(a, b) {
    const out = [];
    for (let i = 1; i <= SAMPLES2; i += 1) {
      const t = (i - 0.5 + 0.37 * Math.sin(i * 7.1)) / SAMPLES2;
      out.push(a + (b - a) * Math.min(0.999, Math.max(1e-3, t)));
    }
    return out;
  }
  function agreeAt(left, right, points) {
    let checked = 0;
    for (const x of points) {
      const l = left(x);
      const r = right(x);
      if (!Number.isFinite(l) || !Number.isFinite(r))
        continue;
      if (Math.abs(l - r) > 1e-9 * Math.max(1, Math.abs(l), Math.abs(r)))
        return false;
      checked += 1;
    }
    return checked >= SAMPLES2 / 2;
  }
  function exactly2(g, variable, lower, upper) {
    try {
      const result = definiteIntegral(
        g,
        integrate2(g, variable),
        variable,
        lower,
        upper
      );
      return result.exact;
    } catch (error2) {
      if (error2 instanceof IntegrationError || error2 instanceof Error)
        return void 0;
      throw error2;
    }
  }
  function bySymmetry(f, variable, lower, upper) {
    if (lower.kind !== "finite" || upper.kind !== "finite")
      return void 0;
    const a = lower.value;
    const b = upper.value;
    const reflected = fold(
      replaceIdentifier(
        f,
        variable,
        subtract(add(lower.node, upper.node), id3(variable))
      )
    );
    const fx = (x) => evaluate(f, { [variable]: x });
    const fr = (x) => evaluate(reflected, { [variable]: x });
    const points = samplesIn(a, b);
    if (agreeAt(fr, (x) => -fx(x), points)) {
      const symbolic = sameTree(reflected, fold(negative2(f)));
      return {
        exact: ZERO2,
        method: `The integrand is odd about the middle of the interval, f(${a + b === 0 ? "\u2212x" : "a + b \u2212 x"}) = \u2212f(x), so the two halves cancel.${symbolic ? "" : " The symmetry was checked at sample points, not proved."}`,
        proved: symbolic
      };
    }
    const sum3 = fold(add(f, reflected));
    const h = (x) => fx(x) + fr(x);
    const half = (v) => multiply5(v, fromRational(rational(1n, 2n)));
    const values = points.map(h).filter(Number.isFinite);
    if (values.length >= SAMPLES2 / 2 && values.every(
      (v) => Math.abs(v - values[0]) < 1e-9 * Math.max(1, Math.abs(v))
    )) {
      for (const point of [
        lower.node,
        upper.node,
        divide(add(lower.node, upper.node), number2(2))
      ]) {
        const K = exactOf2(replaceIdentifier(sum3, variable, point));
        if (K === void 0 || Math.abs(toNumber2(K) - values[0]) > 1e-9)
          continue;
        const width = exactOf2(subtract(upper.node, lower.node));
        if (width === void 0)
          break;
        return {
          exact: half(multiply5(K, width)),
          method: "King's rule: f(x) + f(a + b \u2212 x) is the same constant K everywhere on the interval, and \u222B\u2090\u1D47 f = \xBD\u222B\u2090\u1D47 (f(x) + f(a + b \u2212 x)) dx = K(b \u2212 a)/2. The sum was checked to be constant at sample points, not proved.",
          proved: false
        };
      }
    }
    const candidates2 = [];
    if (f.type === "BinaryOperator" && f.name === "Divide")
      candidates2.push(f.left);
    candidates2.push(sum3);
    for (const candidate of candidates2) {
      if (!agreeAt(h, (x) => evaluate(candidate, { [variable]: x }), points))
        continue;
      const whole = exactly2(candidate, variable, lower, upper);
      if (whole === void 0)
        continue;
      const symbolic = sameTree(fold(candidate), sum3);
      return {
        exact: half(whole),
        method: `Reflection: \u222B\u2090\u1D47 f(x) dx = \xBD\u222B\u2090\u1D47 (f(x) + f(a + b \u2212 x)) dx, and that sum is a function with an antiderivative.${symbolic ? "" : " The sum was matched to it at sample points, not proved."}`,
        proved: symbolic
      };
    }
    return void 0;
  }
  function theoremDefinite(f, variable, lower, upper) {
    const integrand = fold(f);
    let found;
    for (const named2 of NAMED) {
      const hit = named2(integrand, variable, lower, upper);
      if (hit === void 0)
        continue;
      const exact = exactOf2(hit.node);
      if (exact === void 0)
        continue;
      found = { exact, method: hit.method, proved: true };
      break;
    }
    found ??= bySymmetry(integrand, variable, lower, upper);
    if (found === void 0)
      return void 0;
    const value = toNumber2(found.exact);
    const a = at(lower);
    const b = at(upper);
    const numeric = quadrature(
      (x) => evaluate(integrand, { [variable]: x }),
      Math.min(a, b),
      Math.max(a, b)
    );
    if (numeric !== void 0) {
      const signed = a <= b ? numeric : -numeric;
      if (Math.abs(signed - value) > 1e-6 * Math.max(1, Math.abs(value)))
        return void 0;
    } else if (!found.proved)
      return void 0;
    return { ...found, value };
  }

  // src/plugins/physics-lab/symbolic/specialIntegrals.ts
  function linear(node, variable) {
    const b = evaluate(node, { [variable]: 0 });
    const a = evaluate(node, { [variable]: 1 }) - b;
    const check = evaluate(node, { [variable]: 2.5 });
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0)
      return void 0;
    if (Math.abs(check - (a * 2.5 + b)) > 1e-12 * Math.max(1, Math.abs(check)))
      return void 0;
    return { a, b };
  }
  function pureSquare(node, variable) {
    const k = evaluate(node, { [variable]: 1 });
    if (!Number.isFinite(k) || k === 0)
      return void 0;
    for (const x of [0, 2, -1.5])
      if (Math.abs(evaluate(node, { [variable]: x }) - k * x * x) > 1e-12)
        return void 0;
    return k;
  }
  var num = (v) => v < 0 ? negative2(number2(-v)) : number2(v);
  function exponent(node) {
    if (node.type === "BinaryOperator" && node.name === "Exponent" && node.left.type === "Identifier" && node.left.symbol === "e")
      return node.right;
    if (node.type === "FunctionCall" && node.callee.symbol === "exp")
      return node.args[0];
    return void 0;
  }
  function oneTerm(node, variable) {
    const factors = [];
    quotientFactors(fold(node), true, factors);
    let constant3 = number2(1);
    const top = [];
    const bottom = [];
    for (const f of factors) {
      if (!dependsOn(f.node, variable))
        constant3 = f.inNumerator ? multiply(constant3, f.node) : divide(constant3, f.node);
      else
        (f.inNumerator ? top : bottom).push(f.node);
    }
    const shaped = shape(top, bottom, variable);
    if (shaped === void 0)
      return void 0;
    return { value: fold(multiply(constant3, shaped.value)), uses: shaped.uses };
  }
  function shape(top, bottom, variable) {
    const x = id3(variable);
    if (top.length === 1 && bottom.length === 1) {
      const den = linear(bottom[0], variable);
      const [t] = top;
      if (den !== void 0) {
        const { a: p, b: q } = den;
        const ex = exponent(t);
        if (ex !== void 0) {
          const e = linear(ex, variable);
          if (e !== void 0) {
            const shift = e.b - e.a * q / p;
            const frontNode = shift === 0 ? divide(number2(1), num(p)) : divide(power2(id3("e"), num(shift)), num(p));
            return {
              value: multiply(
                frontNode,
                call("Ei", multiply(num(e.a / p), bottom[0]))
              ),
              uses: ["Ei"]
            };
          }
        }
        if (q === 0 && t.type === "FunctionCall" && t.args.length === 1 && ["sin", "cos", "sinh", "cosh"].includes(t.callee.symbol)) {
          const w = linear(t.args[0], variable);
          if (w !== void 0 && w.b === 0) {
            const name = { sin: "Si", cos: "Ci", sinh: "Shi", cosh: "Chi" }[t.callee.symbol];
            const even = t.callee.symbol === "cos" || t.callee.symbol === "cosh";
            const rate = even ? Math.abs(w.a) : w.a;
            return {
              value: divide(call(name, multiply(num(rate), x)), num(p)),
              uses: [name]
            };
          }
        }
        if (q === 0 && t.type === "FunctionCall" && t.callee.symbol === "ln" && t.args.length === 1) {
          const inner = linear(t.args[0], variable);
          if (inner !== void 0 && inner.b === 1)
            return {
              value: negative2(
                divide(call("Li_2", multiply(num(-inner.a), x)), num(p))
              ),
              uses: ["Li_2"]
            };
        }
      }
    }
    if (top.length === 0 && bottom.length === 1) {
      const [l] = bottom;
      if (l.type === "FunctionCall" && l.callee.symbol === "ln") {
        const inner = linear(l.args[0], variable);
        if (inner !== void 0)
          return {
            value: divide(call("li", l.args[0]), num(inner.a)),
            uses: ["li"]
          };
      }
    }
    if (top.length === 1 && bottom.length === 0) {
      const [t] = top;
      const ex = exponent(t);
      if (ex !== void 0) {
        const k = pureSquare(ex, variable);
        if (k !== void 0) {
          const front = divide(
            power2(id3("pi"), divide(number2(1), number2(2))),
            multiply(
              number2(2),
              power2(num(Math.abs(k)), divide(number2(1), number2(2)))
            )
          );
          const name = k < 0 ? "erf" : "erfi";
          return {
            value: multiply(
              front,
              call(
                name,
                multiply(power2(num(Math.abs(k)), divide(number2(1), number2(2))), x)
              )
            ),
            uses: [name]
          };
        }
      }
      if (t.type === "FunctionCall" && (t.callee.symbol === "sin" || t.callee.symbol === "cos") && t.args.length === 1) {
        const k = pureSquare(t.args[0], variable);
        if (k !== void 0 && k > 0) {
          const name = t.callee.symbol === "sin" ? "S" : "C";
          const half = divide(number2(1), number2(2));
          return {
            value: multiply(
              power2(divide(id3("pi"), num(2 * k)), half),
              call(name, multiply(power2(divide(num(2 * k), id3("pi")), half), x))
            ),
            uses: [name]
          };
        }
      }
    }
    return void 0;
  }
  function specialAntiderivative(node, variable, elementary) {
    const terms = topLevelTerms(fold(node));
    let total = number2(0);
    const uses = /* @__PURE__ */ new Set();
    let special2 = false;
    for (const { term: term2, negated } of terms) {
      const found = oneTerm(term2, variable);
      let value;
      if (found !== void 0) {
        special2 = true;
        found.uses.forEach((u) => uses.add(u));
        ({ value } = found);
      } else {
        const plain = elementary(term2);
        if (plain === void 0)
          return void 0;
        value = plain;
      }
      total = add(total, negated ? negative2(value) : value);
    }
    return special2 ? { value: fold(total), uses: [...uses] } : void 0;
  }

  // src/plugins/physics-lab/symbolic/fractional.ts
  var EULER_GAMMA = 0.5772156649015329;
  function shiftLatex(offset, req) {
    const q = fromNumber(req.order);
    const p = fromNumber(offset);
    if (q !== void 0 && p !== void 0 && /^[-\d.\\{}frac\s]*$/.test(req.orderLatex))
      return toLatex2(subtract3(p, q));
    const a = req.orderLatex.trim();
    const negated = a.startsWith("-") ? a.slice(1) : void 0;
    const head = offset === 0 ? "" : formatNumber(offset);
    if (negated !== void 0)
      return offset === 0 ? negated : `${head}+${negated}`;
    return `${head}-${a}`;
  }
  function kShift(offset, req, k = "k") {
    const a = req.orderLatex.trim();
    const o = offset === 0 ? "" : offset > 0 ? `+${formatNumber(offset)}` : formatNumber(offset);
    return `${k}${o}-\\left(${a}\\right)`;
  }
  function formatNumber(v) {
    if (Number.isInteger(v))
      return String(v);
    const q = fromNumber(v);
    return q !== void 0 ? toLatex2(q) : String(v);
  }
  function coefficientLatex(c, cLatex) {
    if (c === 1)
      return "";
    if (c === -1)
      return "-";
    return /^[-\d.]+$/.test(cLatex) || cLatex.startsWith("\\frac") ? cLatex : `\\left(${cLatex}\\right)`;
  }
  function joinTerms(parts) {
    const kept = parts.filter((p) => p !== "" && p !== "0");
    if (kept.length === 0)
      return "0";
    return kept.map((p, i) => i === 0 || p.startsWith("-") ? p : `+${p}`).join("");
  }
  function rateOf2(node, variable) {
    const at0 = evaluate(node, { [variable]: 0 });
    const at1 = evaluate(node, { [variable]: 1 });
    const at3 = evaluate(node, { [variable]: 3 });
    if (at0 !== 0 || !Number.isFinite(at1) || Math.abs(at3 - 3 * at1) > 1e-12)
      return void 0;
    return at1;
  }
  function shapeOf(node, variable, inNumerator) {
    const sign3 = inNumerator ? 1 : -1;
    if (node.type === "Identifier" && node.symbol === variable)
      return { kind: "power", p: sign3 };
    if (node.type === "BinaryOperator" && node.name === "Exponent") {
      if (node.left.type === "Identifier" && node.left.symbol === variable && !dependsOn(node.right, variable))
        return { kind: "power", p: sign3 * evaluate(node.right, {}) };
      if (node.left.type === "Identifier" && node.left.symbol === "e") {
        const b = rateOf2(node.right, variable);
        if (b !== void 0)
          return { kind: "exp", b: sign3 * b };
      }
    }
    if (node.type === "FunctionCall" && node.args.length === 1) {
      const [arg] = node.args;
      const name = node.callee.symbol;
      if (name === "sqrt" && arg.type === "Identifier" && arg.symbol === variable)
        return { kind: "power", p: sign3 * 0.5 };
      if (!inNumerator)
        return void 0;
      if (name === "exp") {
        const b = rateOf2(arg, variable);
        if (b !== void 0)
          return { kind: "exp", b };
      }
      if (name === "sin" || name === "cos") {
        const b = rateOf2(arg, variable);
        if (b !== void 0 && b !== 0)
          return { kind: name, b };
      }
      if (name === "ln" && arg.type === "Identifier" && arg.symbol === variable)
        return { kind: "ln" };
    }
    return void 0;
  }
  function readTerms(f, req) {
    const out = [];
    for (const { term: term2, negated } of topLevelTerms(fold(f))) {
      const factors = [];
      quotientFactors(term2, true, factors);
      let c = negated ? -1 : 1;
      const varying = factors.filter((x) => dependsOn(x.node, req.variable));
      for (const x of factors) {
        if (dependsOn(x.node, req.variable))
          continue;
        const v = evaluate(x.node, {});
        c = x.inNumerator ? c * v : c / v;
      }
      const cNode = fold(
        factors.filter((x) => !dependsOn(x.node, req.variable)).reduce(
          (acc, x) => x.inNumerator ? multiply(acc, x.node) : {
            type: "BinaryOperator",
            name: "Divide",
            left: acc,
            right: x.node
          },
          { type: "Constant", value: negated ? -1 : 1 }
        )
      );
      const cLatex = req.emit(cNode);
      const whole = negated ? { type: "Negative", arg: term2 } : term2;
      if (varying.length === 0) {
        out.push({ c, cLatex, shape: { kind: "constant" }, node: whole });
        continue;
      }
      const shape2 = varying.length === 1 ? shapeOf(varying[0].node, req.variable, varying[0].inNumerator) : void 0;
      out.push({
        c,
        cLatex,
        shape: shape2 ?? { kind: "generic", node: whole },
        node: whole
      });
    }
    return out;
  }
  var derivativeCache = /* @__PURE__ */ new WeakMap();
  function derivatives(f, variable, upTo) {
    const cached2 = derivativeCache.get(f);
    if (cached2 !== void 0 && cached2.length > upTo)
      return cached2;
    const out = [fold(f)];
    for (let k = 1; k <= upTo; k += 1)
      out.push(fold(differentiate(out[k - 1], variable)));
    derivativeCache.set(f, out);
    return out;
  }
  function caputoNumeric(f, req, n, x) {
    const dn = derivatives(f, req.variable, n)[n];
    const beta2 = n - req.order;
    const g = (w) => evaluate(dn, { [req.variable]: x - w ** (1 / beta2) }) / beta2;
    const integral = quadrature(g, 0, (x - req.lower) ** beta2);
    return integral === void 0 ? void 0 : integral / gamma(n - req.order);
  }
  function riemannNumeric(f, req, n, x) {
    const caputo = caputoNumeric(f, req, n, x);
    if (caputo === void 0)
      return void 0;
    const ds = derivatives(f, req.variable, n);
    let total = caputo;
    for (let k = 0; k < n; k += 1) {
      const at2 = evaluate(ds[k], { [req.variable]: req.lower });
      if (!Number.isFinite(at2))
        return void 0;
      total += at2 * (x - req.lower) ** (k - req.order) * reciprocalGamma(k + 1 - req.order);
    }
    return total;
  }
  function grunwaldNumeric(f, req, x) {
    const sum3 = (N) => {
      const h = (x - req.lower) / N;
      let w = 1;
      let total = 0;
      for (let k = 0; k <= N; k += 1) {
        if (k > 0)
          w *= 1 - (req.order + 1) / k;
        const y = evaluate(f, { [req.variable]: x - k * h });
        if (Number.isFinite(y))
          total += w * y;
      }
      return total / h ** req.order;
    };
    let row = [40, 80, 160, 320, 640].map(sum3);
    for (let power8 = 1; row.length > 1; power8 += 1) {
      const factor = 2 ** power8;
      row = row.slice(1).map((fine, i) => (factor * fine - row[i]) / (factor - 1));
    }
    const [value] = row;
    return Number.isFinite(value) ? value : void 0;
  }
  function hadamardOperator(f, variable, n) {
    let g = fold(f);
    for (let k = 0; k < n; k += 1)
      g = fold(multiply(id3(variable), differentiate(g, variable)));
    return g;
  }
  function riemannTerm(t, req) {
    const v = req.variableLatex;
    const a = req.order;
    const A = `\\left(${req.orderLatex}\\right)`;
    const cl = coefficientLatex(t.c, t.cLatex);
    const s = t.shape;
    switch (s.kind) {
      case "constant":
        return {
          latex: `\\frac{${t.cLatex}${v}^{${shiftLatex(0, req)}}}{\\Gamma\\left(${shiftLatex(1, req)}\\right)}`,
          graph: `\\frac{${t.cLatex}${v}^{-${A}}}{\\left(-${A}\\right)!}`,
          value: (x) => t.c * x ** -a * reciprocalGamma(1 - a)
        };
      case "power": {
        if (!(s.p > -1))
          return "undefined";
        return {
          latex: `${cl}\\frac{\\Gamma\\left(${formatNumber(s.p + 1)}\\right)}{\\Gamma\\left(${shiftLatex(s.p + 1, req)}\\right)}${v}^{${shiftLatex(s.p, req)}}`,
          graph: `${cl}\\frac{${formatNumber(s.p)}!}{\\left(${formatNumber(s.p)}-${A}\\right)!}${v}^{${formatNumber(s.p)}-${A}}`,
          value: (x) => t.c * gamma(s.p + 1) * reciprocalGamma(s.p + 1 - a) * x ** (s.p - a)
        };
      }
      case "exp":
        return {
          latex: `${cl}${v}^{${shiftLatex(0, req)}}E_{1,${shiftLatex(1, req)}}\\left(${scaled(s.b, v)}\\right)`,
          graph: `${cl}\\sum_{k=0}^{80}\\frac{\\left(${formatNumber(s.b)}\\right)^{k}${v}^{${kShift(0, req)}}}{\\left(${kShift(0, req)}\\right)!}`,
          value: (x) => t.c * x ** -a * mittagLeffler(1, 1 - a, s.b * x)
        };
      case "cos":
        return {
          latex: `${cl}${v}^{${shiftLatex(0, req)}}E_{2,${shiftLatex(1, req)}}\\left(-${scaled(s.b * s.b, `${v}^{2}`)}\\right)`,
          graph: `${cl}\\sum_{k=0}^{60}\\frac{\\left(-1\\right)^{k}\\left(${formatNumber(s.b)}\\right)^{2k}${v}^{${kShift(0, req, "2k")}}}{\\left(${kShift(0, req, "2k")}\\right)!}`,
          value: (x) => t.c * x ** -a * mittagLeffler(2, 1 - a, -s.b * s.b * x * x)
        };
      case "sin":
        return {
          latex: `${coefficientLatex(t.c * s.b, formatNumber(t.c * s.b))}${v}^{${shiftLatex(1, req)}}E_{2,${shiftLatex(2, req)}}\\left(-${scaled(s.b * s.b, `${v}^{2}`)}\\right)`,
          graph: `${cl}\\sum_{k=0}^{60}\\frac{\\left(-1\\right)^{k}\\left(${formatNumber(s.b)}\\right)^{2k+1}${v}^{${kShift(1, req, "2k")}}}{\\left(${kShift(1, req, "2k")}\\right)!}`,
          value: (x) => t.c * s.b * x ** (1 - a) * mittagLeffler(2, 2 - a, -s.b * s.b * x * x)
        };
      case "ln": {
        const psi = digamma(1 - a);
        return {
          latex: `\\frac{${t.cLatex}${v}^{${shiftLatex(0, req)}}}{\\Gamma\\left(${shiftLatex(1, req)}\\right)}\\left(\\ln ${v}+\\psi\\left(1\\right)-\\psi\\left(${shiftLatex(1, req)}\\right)\\right)`,
          graph: `\\frac{${t.cLatex}${v}^{-${A}}}{\\left(-${A}\\right)!}\\left(\\ln\\left(${v}\\right)-${EULER_GAMMA}-\\left(${psi}\\right)\\right)`,
          value: (x) => t.c * x ** -a * reciprocalGamma(1 - a) * (Math.log(x) - EULER_GAMMA - psi)
        };
      }
      default:
        return void 0;
    }
  }
  function caputoTerm(t, req, n) {
    const v = req.variableLatex;
    const a = req.order;
    const A = `\\left(${req.orderLatex}\\right)`;
    const cl = coefficientLatex(t.c, t.cLatex);
    const s = t.shape;
    if (n === 0)
      return riemannTerm(t, req);
    switch (s.kind) {
      case "constant":
        return { latex: "0", graph: "0", value: () => 0 };
      case "power":
        if (Number.isInteger(s.p) && s.p >= 0 && s.p < n)
          return { latex: "0", graph: "0", value: () => 0 };
        if (!(s.p > n - 1))
          return "undefined";
        return riemannTerm(t, req);
      case "exp":
        return {
          latex: `${coefficientLatex(t.c * s.b ** n, formatNumber(t.c * s.b ** n))}${v}^{${shiftLatex(n, req)}}E_{1,${shiftLatex(n + 1, req)}}\\left(${scaled(s.b, v)}\\right)`,
          graph: `${cl}\\sum_{k=${n}}^{80}\\frac{\\left(${formatNumber(s.b)}\\right)^{k}${v}^{${kShift(0, req)}}}{\\left(${kShift(0, req)}\\right)!}`,
          value: (x) => t.c * s.b ** n * x ** (n - a) * mittagLeffler(1, n + 1 - a, s.b * x)
        };
      case "cos":
      case "sin": {
        const odd = s.kind === "sin" ? 1 : 0;
        const start = Math.ceil((n - odd) / 2);
        const series = (x) => {
          let total = 0;
          for (let k = start; k < start + 200; k += 1) {
            const term2 = (-1) ** k * s.b ** (2 * k + odd) * x ** (2 * k + odd - a) * reciprocalGamma(2 * k + odd + 1 - a);
            total += term2;
            if (Math.abs(term2) < 1e-18 * Math.max(1, Math.abs(total)) && k > start + Math.abs(s.b * x))
              break;
          }
          return total;
        };
        const power8 = odd ? "2k+1" : "2k";
        return {
          latex: `${cl}\\sum_{k=${start}}^{\\infty}\\frac{\\left(-1\\right)^{k}${s.b === 1 ? "" : `${formatNumber(s.b)}^{${power8}}`}${v}^{${power8}-${A}}}{\\Gamma\\left(${power8}+1-${A}\\right)}`,
          graph: `${cl}\\sum_{k=${start}}^{60}\\frac{\\left(-1\\right)^{k}\\left(${formatNumber(s.b)}\\right)^{${power8}}${v}^{${kShift(odd, req, "2k")}}}{\\left(${kShift(odd, req, "2k")}\\right)!}`,
          value: (x) => t.c * series(x)
        };
      }
      case "ln":
        return "undefined";
      default:
        return void 0;
    }
  }
  function weylTerm(t, req) {
    const v = req.variableLatex;
    const A = `\\left(${req.orderLatex}\\right)`;
    const a = req.order;
    const s = t.shape;
    const cl = coefficientLatex(t.c, t.cLatex);
    switch (s.kind) {
      case "exp":
        if (!(s.b > 0))
          return "it does not decay as the variable goes to \u2212\u221E";
        return {
          latex: `${cl}${s.b === 1 ? "" : `${formatNumber(s.b)}^{${req.orderLatex}}`}e^{${s.b === 1 ? "" : formatNumber(s.b)}${v}}`,
          graph: `${cl}\\left(${formatNumber(s.b)}\\right)^{${A}}e^{${formatNumber(s.b)}${v}}`,
          value: (x) => t.c * s.b ** a * Math.exp(s.b * x)
        };
      case "sin":
      case "cos": {
        const b = Math.abs(s.b);
        const c = s.kind === "sin" && s.b < 0 ? -t.c : t.c;
        const cL = coefficientLatex(c, formatNumber(c));
        const phase = halfPiTimesOrder(req);
        return {
          latex: `${cL}${b === 1 ? "" : `${formatNumber(b)}^{${req.orderLatex}}`}\\${s.kind}\\left(${b === 1 ? "" : formatNumber(b)}${v}+${phase}\\right)`,
          graph: `${cL}\\left(${formatNumber(b)}\\right)^{${A}}\\${s.kind}\\left(${formatNumber(b)}${v}+\\frac{${A}\\pi}{2}\\right)`,
          value: (x) => c * b ** a * (s.kind === "sin" ? Math.sin : Math.cos)(b * x + a * Math.PI / 2)
        };
      }
      case "constant":
        return a > 0 && Number.isInteger(a) ? { latex: "0", graph: "0", value: () => 0 } : "a constant does not decay at \u2212\u221E, so its Weyl integral diverges";
      case "power":
        return "a power of the variable does not decay at \u2212\u221E";
      case "ln":
        return "ln is not defined for negative values";
      default:
        return "this term has no Weyl derivative this can find";
    }
  }
  function fractionalDerivatives(req) {
    const a = req.order;
    const v = req.variableLatex;
    const x0 = req.point;
    const A = req.orderLatex;
    const answers = [];
    const show = (node) => req.emit(condense(fold(tidySums(fold(node)))).node);
    const inline = (node) => `\\(${show(node)}\\)`;
    if (Number.isInteger(a) && a >= 0) {
      const d = derivatives(req.f, req.variable, a)[a];
      const latex = show(d);
      return {
        kind: "ordinary",
        n: a,
        answers: [
          {
            key: "riemannLiouville",
            definitions: [],
            name: "Every definition",
            definitionLatex: `\\frac{d^{${a}}}{d${v}^{${a}}}`,
            kind: "closed",
            latex,
            graphLatex: latex,
            value: evaluate(d, { [req.variable]: x0 }),
            notes: [
              "For a whole order, Riemann\u2013Liouville, Caputo, Gr\xFCnwald\u2013Letnikov, conformable and Weyl all give the ordinary derivative."
            ]
          }
        ],
        notes: []
      };
    }
    const n = a > 0 ? Math.ceil(a) : 0;
    const integral = a < 0;
    const dummy = req.variable === "t" ? "s" : "t";
    const terms = readTerms(req.f, req);
    const notes = [];
    const generic = terms.filter((t) => t.shape.kind === "generic").length;
    if (generic > 0)
      notes.push(
        `${generic} term${generic === 1 ? " has" : "s have"} no closed form here; ${generic === 1 ? "it is" : "they are"} answered through the integral representations.`
      );
    const fAt = (node) => show(fold(replaceIdentifier(node, req.variable, id3(dummy))));
    const ds = derivatives(req.f, req.variable, Math.max(n, 1));
    const kernelPower = shiftLatex(n - 1, req);
    const gammaFront = `\\frac{1}{\\Gamma\\left(${shiftLatex(n, req)}\\right)}`;
    const integrandLatex = `${n === 0 ? `\\left(${fAt(req.f)}\\right)` : `\\left(${fAt(ds[n])}\\right)`}\\left(${v}-${dummy}\\right)^{${kernelPower}}`;
    const integralRep = (lower) => `${gammaFront}\\int_{${lower}}^{${v}}${integrandLatex}d${dummy}`;
    const integralGraph = (lower) => `\\frac{1}{\\left(${n - 1}-\\left(${A}\\right)\\right)!}\\int_{${lower}}^{${v}}\\left(${n === 0 ? fAt(req.f) : fAt(ds[n])}\\right)\\left(${v}-${dummy}\\right)^{${n - 1}-\\left(${A}\\right)}d${dummy}`;
    const closed = (piece) => {
      const pieces = [];
      let missing = false;
      for (const t of terms) {
        const p = piece(t);
        if (p === "undefined")
          return { pieces, undefinedTerm: t, missing };
        if (p === void 0)
          missing = true;
        else
          pieces.push(p);
      }
      return { pieces, missing };
    };
    const fromZero = req.lower === 0;
    {
      const name = integral ? "Riemann\u2013Liouville integral" : "Riemann\u2013Liouville";
      const definitionLatex = integral ? `{}_{${req.lowerLatex}}I_{${v}}^{${shiftLatex(0, req)}}f=\\frac{1}{\\Gamma\\left(${shiftLatex(0, req)}\\right)}\\int_{${req.lowerLatex}}^{${v}}f\\left(${dummy}\\right)\\left(${v}-${dummy}\\right)^{${shiftLatex(-1, req)}}d${dummy}` : `{}_{${req.lowerLatex}}D_{${v}}^{${A}}f=\\frac{d^{${n}}}{d${v}^{${n}}}\\frac{1}{\\Gamma\\left(${shiftLatex(n, req)}\\right)}\\int_{${req.lowerLatex}}^{${v}}f\\left(${dummy}\\right)\\left(${v}-${dummy}\\right)^{${kernelPower}}d${dummy}`;
      const c = fromZero ? closed((t) => riemannTerm(t, req)) : void 0;
      if (c !== void 0 && c.undefinedTerm === void 0 && !c.missing) {
        const value = c.pieces.reduce((s, p) => s + p.value(x0), 0);
        answers.push({
          definitions: [],
          key: "riemannLiouville",
          name,
          definitionLatex,
          kind: "closed",
          latex: joinTerms(c.pieces.map((p) => p.latex)),
          graphLatex: joinTerms(c.pieces.map((p) => p.graph)),
          value,
          notes: [
            "Term by term: \u0393(p + 1)/\u0393(p + 1 \u2212 \u03B1)\xB7x^{p\u2212\u03B1} for a power, and the Mittag-Leffler function E_{a,b}(z) = \u03A3 z\u1D4F/\u0393(ak + b) for exponentials, sines and cosines."
          ]
        });
      } else if (c?.undefinedTerm !== void 0) {
        answers.push({
          definitions: [],
          key: "riemannLiouville",
          name,
          definitionLatex,
          kind: "undefined",
          latex: "",
          graphLatex: "",
          notes: [
            `Not defined from ${req.lowerLatex}: the term ${inline(c.undefinedTerm.node)} is not integrable there. Choose a lower limit above 0.`
          ]
        });
      } else {
        const value = riemannNumeric(req.f, req, n, x0);
        const boundary = Array.from({ length: n }, (_, k) => {
          const at2 = req.emit(
            fold(
              replaceIdentifier(ds[k], req.variable, {
                type: "Constant",
                value: req.lower
              })
            )
          );
          return `\\frac{${at2}\\left(${v}-${req.lowerLatex}\\right)^{${shiftLatex(k, req)}}}{\\Gamma\\left(${shiftLatex(k + 1, req)}\\right)}`;
        });
        answers.push({
          definitions: [],
          key: "riemannLiouville",
          name,
          definitionLatex,
          kind: "integral",
          latex: joinTerms([...boundary, integralRep(req.lowerLatex)]),
          graphLatex: joinTerms([
            ...Array.from({ length: n }, (_, k) => {
              const at2 = req.emit(
                fold(
                  replaceIdentifier(ds[k], req.variable, {
                    type: "Constant",
                    value: req.lower
                  })
                )
              );
              return `\\frac{\\left(${at2}\\right)\\left(${v}-${req.lowerLatex}\\right)^{${k}-\\left(${A}\\right)}}{\\left(${k}-\\left(${A}\\right)\\right)!}`;
            }),
            integralGraph(req.lowerLatex)
          ]),
          value,
          notes: [
            "Written as the Caputo integral plus the boundary terms f\u207D\u1D4F\u207E(a)(x \u2212 a)^{k\u2212\u03B1}/\u0393(k + 1 \u2212 \u03B1), which is the same operator and needs no derivative of an integral."
          ]
        });
      }
    }
    if (!integral) {
      const definitionLatex = `{}^{C}_{${req.lowerLatex}}D_{${v}}^{${A}}f=\\frac{1}{\\Gamma\\left(${shiftLatex(n, req)}\\right)}\\int_{${req.lowerLatex}}^{${v}}f^{\\left(${n}\\right)}\\left(${dummy}\\right)\\left(${v}-${dummy}\\right)^{${kernelPower}}d${dummy}`;
      const c = fromZero ? closed((t) => caputoTerm(t, req, n)) : void 0;
      if (c !== void 0 && c.undefinedTerm === void 0 && !c.missing) {
        answers.push({
          definitions: [],
          key: "caputo",
          name: "Caputo",
          definitionLatex,
          kind: "closed",
          latex: joinTerms(c.pieces.map((p) => p.latex)),
          graphLatex: joinTerms(c.pieces.map((p) => p.graph)),
          value: c.pieces.reduce((s, p) => s + p.value(x0), 0),
          notes: [
            `The ordinary ${n}th derivative first, then a fractional integral: whole powers below ${n} and constants give 0.`
          ]
        });
      } else {
        const bad = c?.undefinedTerm;
        const representation = integralRep(
          bad !== void 0 ? "a" : req.lowerLatex
        );
        const value = bad === void 0 ? caputoNumeric(req.f, req, n, x0) : void 0;
        answers.push({
          definitions: [],
          key: "caputo",
          name: "Caputo",
          definitionLatex,
          kind: bad !== void 0 ? "partial" : "integral",
          latex: representation,
          graphLatex: bad === void 0 ? integralGraph(req.lowerLatex) : "",
          value,
          notes: bad !== void 0 ? [
            `From ${req.lowerLatex} it does not exist: the ${n}th derivative of ${inline(bad.node)} is too singular there to integrate. From any a > 0 it is the integral shown; set a lower limit above 0 to evaluate it.`
          ] : [
            "An exact integral representation, with the function's own derivative written in."
          ]
        });
      }
    }
    {
      const definitionLatex = `{}^{GL}_{${req.lowerLatex}}D_{${v}}^{${A}}f=\\lim_{h\\to0^{+}}\\frac{1}{h^{${A}}}\\sum_{k=0}^{\\frac{${v}-${req.lowerLatex}}{h}}\\left(-1\\right)^{k}\\frac{\\Gamma\\left(${A}+1\\right)}{k!\\Gamma\\left(${A}-k+1\\right)}f\\left(${v}-kh\\right)`;
      const value = grunwaldNumeric(req.f, req, x0);
      const riemann = answers.find((x) => x.key === "riemannLiouville");
      const agrees = value !== void 0 && riemann?.value !== void 0 && Math.abs(value - riemann.value) < 1e-4 * Math.max(1, Math.abs(value));
      answers.push({
        definitions: [],
        key: "grunwaldLetnikov",
        name: "Gr\xFCnwald\u2013Letnikov",
        definitionLatex,
        kind: "limit",
        latex: `\\lim_{h\\to0^{+}}\\frac{1}{h^{${A}}}\\sum_{k=0}^{\\frac{${v}-${req.lowerLatex}}{h}}\\left(-1\\right)^{k}\\frac{\\Gamma\\left(${A}+1\\right)}{k!\\Gamma\\left(${A}-k+1\\right)}\\left(${req.emit(fold(replaceIdentifier(req.f, req.variable, { type: "BinaryOperator", name: "Subtract", left: id3(req.variable), right: multiply(id3("k"), id3("h")) })))}\\right)`,
        graphLatex: "",
        value,
        notes: [
          agrees ? `Its value at ${v} = ${x0}, computed from the finite differences with h \u2192 0, matches Riemann\u2013Liouville from the same lower limit, as the theorem says it must for this function.` : "A limit of finite differences; for a function this smooth it equals Riemann\u2013Liouville from the same lower limit."
        ]
      });
    }
    if (!integral) {
      const d = ds[n];
      const body = fold(
        multiply(
          {
            type: "BinaryOperator",
            name: "Exponent",
            left: id3(req.variable),
            right: { type: "Constant", value: n - a }
          },
          d
        )
      );
      const value = evaluate(body, { [req.variable]: x0 });
      answers.push({
        definitions: [],
        key: "conformable",
        name: "Conformable",
        definitionLatex: `T_{${A}}f\\left(${v}\\right)=${v}^{${shiftLatex(n, req)}}f^{\\left(${n}\\right)}\\left(${v}\\right)`,
        kind: "closed",
        latex: `${v}^{${shiftLatex(n, req)}}\\left(${show(d)}\\right)`,
        graphLatex: `${v}^{${n}-\\left(${A}\\right)}\\left(${show(d)}\\right)`,
        value: Number.isFinite(value) ? value : void 0,
        notes: [
          "Always elementary, because it is local: the ordinary derivative times a power. It is a different operator from the classical, nonlocal ones above."
        ]
      });
    }
    {
      const lower = req.lower > 0 ? req.lower : 1;
      const lowerLatex = req.lower > 0 ? req.lowerLatex : "1";
      const G = hadamardOperator(req.f, req.variable, n);
      const Gt = fAt(G);
      const kernel = integral ? shiftLatex(-1, req) : kernelPower;
      const definitionLatex = `{}^{CH}_{${lowerLatex}}D_{${v}}^{${A}}f=\\frac{1}{\\Gamma\\left(${shiftLatex(n, req)}\\right)}\\int_{${lowerLatex}}^{${v}}\\left(\\ln\\frac{${v}}{${dummy}}\\right)^{${kernel}}\\delta^{${n}}f\\left(${dummy}\\right)\\frac{d${dummy}}{${dummy}}`;
      const beta2 = n - a;
      const g = (w) => evaluate(G, { [req.variable]: x0 * Math.exp(-(w ** (1 / beta2))) }) / beta2;
      const integralValue = x0 > lower ? quadrature(g, 0, Math.log(x0 / lower) ** beta2) : void 0;
      answers.push({
        definitions: [],
        key: "caputoHadamard",
        name: integral ? "Hadamard integral" : "Caputo\u2013Hadamard",
        definitionLatex,
        kind: "integral",
        latex: `${gammaFront}\\int_{${lowerLatex}}^{${v}}\\left(\\ln\\frac{${v}}{${dummy}}\\right)^{${kernel}}\\frac{${Gt}}{${dummy}}d${dummy}`,
        graphLatex: `\\frac{1}{\\left(${n - 1}-\\left(${A}\\right)\\right)!}\\int_{${lowerLatex}}^{${v}}\\left(\\ln\\left(\\frac{${v}}{${dummy}}\\right)\\right)^{${n - 1}-\\left(${A}\\right)}\\frac{${Gt}}{${dummy}}d${dummy}`,
        value: integralValue === void 0 ? void 0 : integralValue / gamma(n - a),
        notes: [
          `The kernel uses logarithmic distance, and the derivative is \u03B4 = ${v}\xB7d/d${v}, applied ${n} time${n === 1 ? "" : "s"}: \u03B4${n === 1 ? "" : `^${n}`}f = ${inline(G)}.`,
          ...x0 > lower ? [] : [`Evaluated only for ${v} above the lower limit ${lowerLatex}.`]
        ]
      });
    }
    {
      const pieces = terms.map((t) => ({ t, w: weylTerm(t, req) }));
      const missing = pieces.filter((p) => typeof p.w === "string");
      const found = pieces.filter((p) => typeof p.w !== "string").map((p) => p.w);
      const definitionLatex = `{}_{-\\infty}D_{${v}}^{${A}}f:\\ \\mathcal{F}\\left[D^{${A}}f\\right]\\left(\\omega\\right)=\\left(i\\omega\\right)^{${A}}\\hat{f}\\left(\\omega\\right)`;
      answers.push({
        definitions: [],
        key: "weyl",
        name: "Weyl (from \u2212\u221E)",
        definitionLatex,
        kind: missing.length === 0 ? "closed" : found.length > 0 ? "partial" : "undefined",
        latex: missing.length === 0 ? joinTerms(found.map((p) => p.latex)) : found.length > 0 ? joinTerms(found.map((p) => p.latex)) : "",
        graphLatex: missing.length === 0 ? joinTerms(found.map((p) => p.graph)) : "",
        value: missing.length === 0 ? found.reduce((s, p) => s + p.value(x0), 0) : void 0,
        notes: missing.length === 0 ? [
          "Exponentials scale by b\u1D45 and sines and cosines shift phase by \u03B1\u03C0/2."
        ] : [
          `Not defined for the whole function: ${missing.map((p) => `${inline(p.t.node)} (${p.w})`).join("; ")}.${found.length > 0 ? " Shown: the terms that have one." : ""}`
        ]
      });
    }
    for (const answer of answers) {
      if (answer.latex === "" || answer.kind === "limit" || answer.kind === "undefined" || answer.kind === "partial" && answer.key === "caputo")
        continue;
      answer.graphLatex = desmosForm(answer.latex);
      answer.definitions = desmosDefinitions(
        specialFunctionsIn(answer.graphLatex)
      );
    }
    return { kind: integral ? "integral" : "derivative", n, answers, notes };
  }
  function desmosForm(latex) {
    let out = latex.split("}^{\\infty}").join("}^{60}");
    for (let guard = 0; guard < 50; guard += 1) {
      const at2 = out.indexOf("E_{");
      if (at2 < 0)
        break;
      let depth2 = 0;
      let end = at2 + 2;
      for (; end < out.length; end += 1) {
        if (out[end] === "{")
          depth2 += 1;
        else if (out[end] === "}" && --depth2 === 0)
          break;
      }
      const subscript = out.slice(at2 + 3, end);
      const comma = topLevelComma(subscript);
      const rest = out.slice(end + 1);
      const open = "\\left(";
      if (comma < 0 || !rest.startsWith(open))
        break;
      out = `${out.slice(0, at2)}E${open}${subscript.slice(0, comma)},${subscript.slice(comma + 1)},${rest.slice(open.length)}`;
    }
    return out;
  }
  function topLevelComma(s) {
    let depth2 = 0;
    for (let i = 0; i < s.length; i += 1) {
      if (s[i] === "{" || s[i] === "(")
        depth2 += 1;
      else if (s[i] === "}" || s[i] === ")")
        depth2 -= 1;
      else if (s[i] === "," && depth2 === 0)
        return i;
    }
    return -1;
  }
  function halfPiTimesOrder(req) {
    const a = req.orderLatex.trim();
    if (a === "\\pi")
      return "\\frac{\\pi^{2}}{2}";
    const q = fromNumber(req.order);
    if (q !== void 0 && /^[-\d.\\{}frac\s]*$/.test(a)) {
      const h = multiply3(q, rational(1n, 2n));
      if (isOne(h))
        return "\\pi";
      const top = h.n === 1n ? "" : h.n === -1n ? "-" : String(h.n);
      return h.d === 1n ? `${top}\\pi` : `\\frac{${top}\\pi}{${h.d}}`;
    }
    return `\\frac{${a}\\pi}{2}`;
  }
  function scaled(b, v) {
    return b === 1 ? v : `${formatNumber(b)}${v}`;
  }

  // src/plugins/physics-lab/symbolic/quadrature.ts
  var WORKING = 50;
  var MAX_LEVEL = 8;
  var SMALLEST_GAP_DIGITS = 300;
  function preciseIntegral(node, variable, lower, upper, target = 32) {
    const steps = quadratureSteps(node, variable, lower, upper, target);
    for (; ; ) {
      const next = steps.next();
      if (next.done === true)
        return next.value;
    }
  }
  function* quadratureSteps(node, variable, lower, upper, target = 32) {
    const D = decimalContext(WORKING);
    const valueOf2 = (b, digits) => {
      const Dd = decimalContext(digits);
      if (b.kind === "infinite")
        return new Dd(NaN);
      const exact = exactConstant(b.node);
      return exact === void 0 ? new Dd(b.value) : new Dd(toDecimal(exact, digits));
    };
    const halfPi = D.acos(-1).div(2);
    let rule2;
    let sign3 = 1;
    let lo = lower;
    let hi = upper;
    const order = (b) => b.kind === "infinite" ? b.sign * Infinity : b.value;
    if (order(lo) > order(hi)) {
      [lo, hi] = [hi, lo];
      sign3 = -1;
    }
    if (order(lo) === order(hi))
      return { value: new D(0), digits: target };
    if (lo.kind === "finite" && hi.kind === "finite") {
      const half = valueOf2(hi, WORKING).minus(valueOf2(lo, WORKING)).div(2);
      rule2 = (t) => {
        const u = halfPi.times(sinh3(D, t));
        const gap = half.times(2).div(D.exp(u.abs().times(2)).plus(1));
        const c = cosh3(D, u);
        const weight = half.times(halfPi).times(cosh3(D, t)).div(c.times(c));
        return t.isNegative() ? { from: lo, offset: gap, weight } : { from: hi, offset: gap.neg(), weight };
      };
    } else if (lo.kind === "finite" || hi.kind === "finite") {
      const end = lo.kind === "finite" ? lo : hi;
      const towards = lo.kind === "finite" ? 1 : -1;
      rule2 = (t) => {
        const u = halfPi.times(sinh3(D, t));
        const e = D.exp(u);
        return {
          from: end,
          offset: e.times(towards),
          weight: halfPi.times(cosh3(D, t)).times(e)
        };
      };
    } else {
      rule2 = (t) => {
        const u = halfPi.times(sinh3(D, t));
        return {
          offset: sinh3(D, u),
          weight: halfPi.times(cosh3(D, t)).times(cosh3(D, u))
        };
      };
    }
    const term2 = (t) => {
      const { from, offset, weight } = rule2(t);
      if (!offset.isFinite() || !weight.isFinite() || weight.isZero())
        return new D(0);
      let x;
      let digits = WORKING;
      if (from === void 0)
        x = offset;
      else {
        const below = Math.max(0, -offset.abs().e);
        if (below > SMALLEST_GAP_DIGITS)
          return new D(0);
        digits = WORKING + below;
        x = valueOf2(from, digits).plus(offset);
      }
      let y;
      try {
        y = evaluatePrecise(node, { [variable]: x }, digits);
      } catch {
        return void 0;
      }
      if (!y.isFinite())
        return void 0;
      return new D(y).times(weight);
    };
    const negligible = new D(10).pow(-(WORKING - 5));
    let mass = new D(0);
    function* sideSum(h2, start, step) {
      let total = new D(0);
      for (const direction of [1, -1]) {
        let small = 0;
        for (let k = start; ; k += step) {
          const t = h2.times(k * direction);
          if (t.abs().gt(6.5))
            break;
          const value = term2(t);
          yield;
          if (value === void 0)
            return void 0;
          total = total.plus(value);
          mass = mass.plus(value.abs());
          if (value.abs().lte(negligible.times(total.abs().plus(1)))) {
            small += 1;
            if (small >= 3)
              break;
          } else
            small = 0;
        }
      }
      return total;
    }
    let h = new D(1);
    const centre = term2(new D(0));
    const first = yield* sideSum(h, 1, 1);
    if (centre === void 0 || first === void 0)
      return void 0;
    mass = mass.plus(centre.abs());
    let sum3 = centre.plus(first);
    let estimate = sum3.times(h);
    let previousDifference;
    for (let level = 1; level <= MAX_LEVEL; level++) {
      h = h.div(2);
      const odd = yield* sideSum(h, 1, 2);
      if (odd === void 0)
        return void 0;
      sum3 = sum3.plus(odd);
      const next = sum3.times(h);
      const difference = next.minus(estimate).abs();
      estimate = next;
      const scale = D.max(estimate.abs(), new D(10).pow(-WORKING));
      const relative = difference.div(scale);
      const digits = relative.isZero() ? WORKING - 10 : Math.floor(-relative.log(10).toNumber());
      const converging = previousDifference !== void 0 && difference.lte(previousDifference);
      if (digits >= target && converging)
        return {
          value: sign3 < 0 ? estimate.neg() : estimate,
          digits: Math.min(digits, WORKING - 10)
        };
      const resolution = mass.times(h);
      const settled = difference.isZero() ? WORKING - 10 : Math.floor(-difference.div(resolution).log(10).toNumber());
      if (settled >= target && converging && estimate.abs().lte(resolution.times(new D(10).pow(-target))))
        return { value: new D(0), digits: Math.min(settled, WORKING - 10) };
      previousDifference = difference;
    }
    return void 0;
  }
  function sinh3(D, x) {
    if (x.abs().lt(0.5))
      return D.sinh(x);
    const e = D.exp(x);
    return e.minus(new D(1).div(e)).div(2);
  }
  function cosh3(D, x) {
    const e = D.exp(x.abs());
    return e.plus(new D(1).div(e)).div(2);
  }

  // src/plugins/physics-lab/symbolic/limit.ts
  var LHOPITAL_LIMIT = 4;
  function findLimit(node, variable, at2, side, convention = "bilateral") {
    if (at2.kind === "infinite") {
      const approach = { kind: "infinite", sign: at2.sign };
      return single(oneSided(node, variable, approach), void 0);
    }
    const from = (s) => ({
      kind: "point",
      node: at2.node,
      value: at2.value,
      side: s
    });
    if (side !== "both") {
      const s = side === "right" ? 1 : -1;
      return single(oneSided(node, variable, from(s)), s);
    }
    const right = oneSided(node, variable, from(1));
    const left = oneSided(node, variable, from(-1));
    const form = right.form ?? left.form;
    const r = right.outcome;
    const l = left.outcome;
    if (r.kind === "no-approach" && l.kind === "no-approach")
      return { answer: { kind: "no-approach", reason: r.reason }, form };
    if (r.kind === "no-approach" || l.kind === "no-approach") {
      const [present, s, missing] = r.kind === "no-approach" ? [l, -1, r.reason] : [r, 1, l.reason];
      if (present.kind === "value") {
        if (convention === "domain")
          return {
            answer: { ...present, kind: "value", side: s, withinDomain: true },
            form
          };
        return {
          answer: {
            kind: "one-side-only",
            side: s,
            limit: present.limit,
            method: present.method,
            missing
          },
          form
        };
      }
      if (present.kind === "oscillates")
        return {
          answer: { kind: "oscillates", proof: present.proof, side: s },
          form
        };
      return { answer: { kind: "unknown" }, form };
    }
    if (r.kind === "oscillates")
      return { answer: r, form };
    if (l.kind === "oscillates")
      return { answer: l, form };
    if (r.kind === "value" && l.kind === "value") {
      if (sameLimit(r.limit, l.limit))
        return { answer: r, form };
      return {
        answer: { kind: "sides-differ", left: l.limit, right: r.limit },
        form
      };
    }
    return {
      answer: {
        kind: "unknown",
        left: l.kind === "value" ? l.limit : void 0,
        right: r.kind === "value" ? r.limit : void 0
      },
      form
    };
  }
  function single({ outcome, form }, side) {
    switch (outcome.kind) {
      case "value":
        return { answer: { ...outcome, side }, form };
      case "oscillates":
        return { answer: { ...outcome, side }, form };
      default:
        return { answer: outcome, form };
    }
  }
  function sameLimit(a, b) {
    if (a.kind === "infinite")
      return b.kind === "infinite" && a.sign === b.sign;
    if (b.kind === "infinite")
      return false;
    return certainlyZero(subtract4(a.value, b.value)) === true;
  }
  function oneSided(original, variable, approach) {
    const resolutions = [];
    const node = resolveSide(original, variable, approach, resolutions);
    const domain = domainOnSide(node, variable, approach);
    if (domain !== void 0)
      return { outcome: { kind: "no-approach", reason: domain } };
    const form = formOf(node, variable, approach);
    const oscillation = oscillationOf(node, variable, approach);
    if (oscillation !== void 0)
      return { outcome: { kind: "oscillates", proof: oscillation }, form };
    const techniques = [];
    const direct2 = limitOf(node, variable, approach, (t) => techniques.push(t));
    techniques.reverse();
    const method = (used, lhopital) => ({
      techniques: used,
      lhopital,
      resolutions,
      resolved: node
    });
    const byLeadingTerms = techniques.length > 0 && techniques.every((t) => t === "leading-terms" || t === "substitution");
    if (!byLeadingTerms && (form === "0/0" || form === "inf/inf") && node.type === "BinaryOperator" && node.name === "Divide") {
      const found = lHopital(node, variable, approach);
      const viaRule = found !== void 0 && direct2 !== void 0 && found.techniques.includes("series") ? void 0 : found;
      if (viaRule !== void 0) {
        if (direct2 !== void 0 && !sameLimit(direct2, viaRule.limit))
          return { outcome: { kind: "unknown" }, form };
        return {
          outcome: {
            kind: "value",
            limit: viaRule.limit,
            method: method(viaRule.techniques, viaRule.lhopital)
          },
          form
        };
      }
    }
    if (direct2 === void 0)
      return { outcome: { kind: "unknown" }, form };
    return {
      outcome: { kind: "value", limit: direct2, method: method(techniques, []) },
      form
    };
  }
  function resolveSide(node, variable, approach, out) {
    const again = (n) => resolveSide(n, variable, approach, out);
    const signOf = (n) => eventualSign(n, variable, approach);
    switch (node.type) {
      case "Negative":
        return negative2(again(node.arg));
      case "BinaryOperator": {
        const rebuilt = {
          ...node,
          left: again(node.left),
          right: again(node.right)
        };
        return rebuilt;
      }
      case "Piecewise": {
        if (!dependsOn(node, variable))
          return node;
        const holds = node.condition === true ? true : conditionOnSide(node.condition, variable, approach);
        if (holds === void 0)
          return node;
        const chosen = holds ? node.consequent : node.alternate;
        out.push({ kind: "piecewise", before: node, after: chosen });
        return again(chosen);
      }
      case "FunctionCall": {
        const args = node.args.map(again);
        const rebuilt = { ...node, args };
        if (args.length !== 1 || !dependsOn(args[0], variable))
          return rebuilt;
        const [inner] = args;
        const name = rebuilt.callee.symbol;
        const record2 = (kind, after) => {
          out.push({ kind, before: rebuilt, after });
          return after;
        };
        if (name === "abs") {
          const s = signOf(inner);
          if (s === 1)
            return record2("abs", inner);
          if (s === -1)
            return record2("abs", negative2(inner));
          if (s === 0)
            return record2("abs", number2(0));
          return rebuilt;
        }
        if (name === "sign") {
          const s = signOf(inner);
          return s === void 0 ? rebuilt : record2("sign", number2(s));
        }
        if (name === "floor" || name === "ceil" || name === "round") {
          const step = integerStep(name, inner, variable, approach);
          return step === void 0 ? rebuilt : record2(name, number2(step));
        }
        return rebuilt;
      }
      default:
        return node;
    }
  }
  function integerStep(name, inner, variable, approach) {
    const found = limitOf(inner, variable, approach);
    if (found?.kind !== "finite")
      return void 0;
    const value = toNumber2(found.value);
    const offset = name === "round" ? 0.5 : 0;
    const jump = Math.round(value - offset) + offset;
    const exactJump = fromRational(
      divide5(rational(BigInt(Math.round(2 * jump))), rational(2n))
    );
    const atJump = certainlyZero(subtract4(found.value, exactJump));
    if (atJump === void 0)
      return void 0;
    const fn = { floor: Math.floor, ceil: Math.ceil, round: Math.round }[name];
    if (!atJump) {
      return Math.abs(value - jump) > 1e-9 ? fn(value) : void 0;
    }
    const s = eventualSign(
      subtract(inner, toNode(exactJump)),
      variable,
      approach
    );
    if (s === void 0)
      return void 0;
    if (s === 0)
      return fn(jump);
    const below = jump - 0.5;
    const above = jump + 0.5;
    return fn(s > 0 ? above : below);
  }
  function conditionOnSide(condition, variable, approach) {
    const links = condition.type === "Comparator" ? [[condition.left, condition.operator, condition.right]] : condition.type === "ComparatorChain" ? condition.symbols.map((symbol, i) => [
      condition.args[i],
      symbol,
      condition.args[i + 1]
    ]) : [];
    if (links.length === 0)
      return void 0;
    let all = true;
    for (const [left, operator, right] of links) {
      const s = eventualSign(subtract(left, right), variable, approach);
      if (s === void 0)
        return void 0;
      const holds = {
        "<": s < 0,
        "<=": s <= 0,
        "=": s === 0,
        ">=": s >= 0,
        ">": s > 0
      }[operator];
      if (holds === void 0)
        return void 0;
      all = all && holds;
    }
    return all;
  }
  function domainOnSide(node, variable, approach) {
    let reason;
    visit(node, (child) => {
      if (reason !== void 0)
        return;
      if (child.type === "Constant" && Number.isNaN(child.value)) {
        reason = "the formula in force on this side is undefined";
        return;
      }
      if (child.type !== "FunctionCall" || child.args.length !== 1)
        return;
      const [inner] = child.args;
      if (!dependsOn(inner, variable))
        return;
      const name = child.callee.symbol;
      if (name === "sqrt" && eventualSign(inner, variable, approach) === -1)
        reason = "a square root of a negative number is not real";
      if ((name === "ln" || name === "log") && (eventualSign(inner, variable, approach) ?? 1) <= 0)
        reason = "a logarithm of a number that is not positive is not real";
    });
    return reason;
  }
  function formOf(node, variable, approach) {
    if (node.type === "Negative")
      return formOf(node.arg, variable, approach);
    if (node.type !== "BinaryOperator")
      return void 0;
    const part = (n) => limitOf(n, variable, approach);
    const isZero4 = (l) => l?.kind === "finite" && certainlyZero(l.value) === true;
    const isOne3 = (l) => l?.kind === "finite" && certainlyZero(subtract4(l.value, fromInteger(1))) === true;
    const isInfinite = (l) => l?.kind === "infinite";
    switch (node.name) {
      case "Divide": {
        const top = part(node.left);
        const bottom = part(node.right);
        if (isZero4(top) && isZero4(bottom))
          return "0/0";
        if (isInfinite(top) && isInfinite(bottom))
          return "inf/inf";
        return void 0;
      }
      case "Multiply":
      case "CrossMultiply": {
        const a = part(node.left);
        const b = part(node.right);
        if (isZero4(a) && isInfinite(b) || isInfinite(a) && isZero4(b))
          return "0*inf";
        return void 0;
      }
      case "Add":
      case "Subtract": {
        const a = part(node.left);
        const b = part(node.right);
        if (a?.kind !== "infinite" || b?.kind !== "infinite")
          return void 0;
        const flip = node.name === "Subtract" ? -1 : 1;
        return a.sign !== b.sign * flip ? "inf-inf" : void 0;
      }
      case "Exponent": {
        if (!dependsOn(node.right, variable))
          return void 0;
        const base2 = part(node.left);
        const exponent2 = part(node.right);
        if (isOne3(base2) && isInfinite(exponent2))
          return "1^inf";
        if (isZero4(base2) && isZero4(exponent2))
          return "0^0";
        if (base2?.kind === "infinite" && base2.sign > 0 && isZero4(exponent2))
          return "inf^0";
        return void 0;
      }
    }
    return void 0;
  }
  function lHopital(node, variable, approach) {
    const steps = [];
    const seen = /* @__PURE__ */ new Set([JSON.stringify(node)]);
    const budget = 4 * nodeCount(node);
    let top = node.left;
    let bottom = node.right;
    for (let round2 = 0; round2 < LHOPITAL_LIMIT; round2++) {
      try {
        top = differentiate(top, variable);
        bottom = differentiate(bottom, variable);
      } catch (error2) {
        if (error2 instanceof SymbolicError)
          return void 0;
        throw error2;
      }
      if (eventualSign(bottom, variable, approach) === void 0)
        return void 0;
      if (eventualSign(bottom, variable, approach) === 0)
        return void 0;
      const quotient = divide(top, bottom);
      const print = JSON.stringify(fold(quotient));
      if (seen.has(print) || exceedsNodeCount(quotient, budget))
        return void 0;
      seen.add(print);
      steps.push({ numerator: top, denominator: bottom });
      const form = formOf(quotient, variable, approach);
      if (form === "0/0" || form === "inf/inf")
        continue;
      const techniques = [];
      const limit = limitOf(
        quotient,
        variable,
        approach,
        (t) => techniques.push(t)
      );
      if (limit === void 0)
        return void 0;
      return { limit, techniques: [...techniques].reverse(), lhopital: steps };
    }
    return void 0;
  }
  var JUMPS = ["floor", "ceil", "round", "sign"];
  function oscillationOf(node, variable, approach) {
    let found;
    const rest = [];
    for (const { term: term2, negated } of topLevelTerms(node)) {
      const factors = [];
      quotientFactors(term2, true, factors);
      const oscillating = factors.find(
        ({ node: f, inNumerator }) => inNumerator && f.type === "FunctionCall" && f.args.length === 1 && (f.callee.symbol === "sin" || f.callee.symbol === "cos") && dependsOn(f.args[0], variable)
      );
      const argument2 = oscillating?.node.type === "FunctionCall" ? oscillating.node.args[0] : void 0;
      const unbounded = argument2 !== void 0 && limitOf(argument2, variable, approach)?.kind === "infinite";
      if (oscillating !== void 0 && unbounded) {
        if (found !== void 0)
          return void 0;
        found = { term: term2, negated, factor: oscillating.node };
      } else
        rest.push(negated ? negative2(term2) : term2);
    }
    if (found === void 0 || found.factor.type !== "FunctionCall")
      return void 0;
    const [argument] = found.factor.args;
    let jumps = false;
    visit(argument, (child) => {
      if (child.type === "FunctionCall" && JUMPS.includes(child.callee.symbol) || child.type === "Piecewise")
        jumps = true;
    });
    if (jumps)
      return void 0;
    const argumentLimit = limitOf(argument, variable, approach);
    if (argumentLimit?.kind !== "infinite")
      return void 0;
    const amplitudeNode = fold(
      divide(found.negated ? negative2(found.term) : found.term, found.factor)
    );
    const amplitude = limitOf(amplitudeNode, variable, approach);
    if (amplitude === void 0)
      return void 0;
    if (amplitude.kind === "finite" && certainlyZero(amplitude.value) !== false)
      return void 0;
    const restLimit = rest.length === 0 ? { kind: "finite", value: ZERO2 } : limitOf(
      rest.reduce((total, t) => ({
        type: "BinaryOperator",
        name: "Add",
        left: total,
        right: t
      })),
      variable,
      approach
    ) ?? { kind: "infinite", sign: 1 };
    if (restLimit.kind !== "finite")
      return void 0;
    return {
      fn: found.factor.callee.symbol,
      argument,
      argumentSign: argumentLimit.sign,
      amplitude,
      rest: restLimit
    };
  }
  function describeLimitMethod(method) {
    const names = {
      substitution: "Direct substitution",
      "leading-terms": "Leading terms",
      "exp-log": "Rewritten as an exponential of a logarithm",
      series: "Series expansion",
      growth: "Growth rates",
      squeeze: "Squeeze theorem",
      "dominant-term": "Factoring out the dominant term",
      "one-sided": "Sign of the side it is approached from",
      "end-behaviour": "End behaviour"
    };
    const distinct = method.techniques.filter(
      (t, i) => method.techniques.indexOf(t) === i
    );
    const substantial = distinct.filter((t) => t !== "substitution");
    const listed = (substantial.length > 0 ? substantial : distinct).map(
      (t) => names[t]
    );
    const rounds = method.lhopital.length;
    if (rounds > 0) {
      const times2 = rounds === 1 ? "" : rounds === 2 ? ", applied twice" : `, applied ${rounds} times`;
      listed.unshift(`L'H\xF4pital's rule${times2}`);
      if (substantial.length === 0)
        listed.splice(1);
    }
    const kinds = new Set(method.resolutions.map((r) => r.kind));
    if (kinds.has("piecewise"))
      listed.unshift("The formula in force on this side");
    if (kinds.has("abs") || kinds.has("sign"))
      listed.unshift("Absolute value written out for this side");
    if (kinds.has("floor") || kinds.has("ceil") || kinds.has("round"))
      listed.unshift("The whole-number part is constant on this side");
    return listed.map(
      (name, i) => i === 0 ? name : name.charAt(0).toLowerCase() + name.slice(1)
    ).join(", then ");
  }

  // src/plugins/physics-lab/symbolic/ode.ts
  var { number: number5, binop: binop5, id: id6, negative: negative5 } = augBuilders_exports;
  var add6 = (a, b) => binop5("Add", a, b);
  var multiply6 = (a, b) => binop5("Multiply", a, b);
  var divide8 = (a, b) => binop5("Divide", a, b);
  var power6 = (a, b) => binop5("Exponent", a, b);
  var subtract5 = (a, b) => binop5("Subtract", a, b);
  var CONSTANT = "C";
  var SAMPLE_XS = [-1.7, -0.6, 0.4, 1.3, 2.2, 3.1];
  var SAMPLE_CS = [-1.4, 0.6, 2.3];
  function solveFirstOrder(cfg2, f, independent = "x", dependent = "y") {
    const emit2 = (node) => toLatex(cfg2, node);
    f = resolveImplicitCalls(f, [independent, dependent]);
    const asAffine = linearIn(f, dependent);
    if (asAffine !== void 0 && isZero3(asAffine.a)) {
      return direct(emit2, f, independent, dependent);
    }
    if (asAffine !== void 0) {
      return affine(emit2, f, asAffine, independent, dependent);
    }
    const asLogistic = logistic(emit2, f, independent, dependent);
    if (asLogistic !== void 0)
      return asLogistic;
    const separated = separable(emit2, f, independent, dependent);
    if (separated.ok)
      return separated;
    return bernoulli(cfg2, emit2, f, independent, dependent) ?? homogeneous(emit2, f, independent, dependent) ?? separated;
  }
  function withoutLogBars(node) {
    switch (node.type) {
      case "FunctionCall": {
        const args = node.args.map(withoutLogBars);
        const [inner] = args;
        if (node.callee.symbol === "ln" && args.length === 1 && inner.type === "FunctionCall" && inner.callee.symbol === "abs")
          return { ...node, args: inner.args };
        return { ...node, args };
      }
      case "BinaryOperator":
        return {
          ...node,
          left: withoutLogBars(node.left),
          right: withoutLogBars(node.right)
        };
      case "Negative":
        return { ...node, arg: withoutLogBars(node.arg) };
      default:
        return node;
    }
  }
  function bernoulli(cfg2, emit2, f, independent, dependent) {
    const byPower = /* @__PURE__ */ new Map();
    for (const { term: term2, negated } of topLevelTerms(f)) {
      const split4 = separate(term2, independent, dependent);
      if (split4 === void 0)
        return void 0;
      const h = (y) => 1 / evaluate(split4.hInverse, { [dependent]: y, ...PARAMETER_PROBE });
      const k = Math.log(h(2) / h(1)) / Math.log(2);
      if (!Number.isFinite(k))
        return void 0;
      const rounded = Math.round(k * 12) / 12;
      if (Math.abs(h(3) - h(1) * 3 ** rounded) > 1e-9 * Math.abs(h(3)))
        return void 0;
      const coefficient = fold(
        multiply6(
          split4.g,
          divide8(
            number5(1),
            multiply6(split4.hInverse, power6(id6(dependent), number5(rounded)))
          )
        )
      );
      const signed = negated ? negative5(coefficient) : coefficient;
      byPower.set(rounded, [...byPower.get(rounded) ?? [], signed]);
    }
    if (byPower.size !== 2 || !byPower.has(1))
      return void 0;
    const n = [...byPower.keys()].find((k) => k !== 1);
    if (n === 0)
      return void 0;
    const sum3 = (terms) => terms.reduce((a, b) => add6(a, b));
    const P2 = fold(sum3(byPower.get(1)));
    const Q = fold(sum3(byPower.get(n)));
    if (dependsOn(P2, dependent) || dependsOn(Q, dependent))
      return void 0;
    const v = "v";
    const scale = number5(1 - n);
    const linearInV = fold(multiply6(scale, add6(multiply6(P2, id6(v)), Q)));
    const inV = solveFirstOrder(cfg2, linearInV, independent, v);
    if (!inV.ok || inV.solution.tree === void 0)
      return void 0;
    const root2 = 1 / (1 - n);
    const solution = fold(power6(inV.solution.tree, rationalExponent(root2)));
    const evenRoot = rationalExponent(root2).type !== "Constant" && Math.round(Math.abs(1 - n)) % 2 === 0;
    return verified(
      {
        latex: `${dependent}=${emit2(solution)}`,
        method: `Bernoulli, with v = ${powerWords(dependent, 1 - n)}, which makes it linear${evenRoot ? `; ${dependent} = \u2212(this) is a solution too` : ""}`,
        explicit: true,
        tree: solution
      },
      solution,
      f,
      independent,
      dependent
    );
  }
  var PARAMETER_PROBE = {};
  function rationalExponent(value) {
    for (let d = 1; d <= 12; d++) {
      const n = Math.round(value * d);
      if (Math.abs(n / d - value) < 1e-12)
        return d === 1 ? number5(n) : divide8(number5(n), number5(d));
    }
    return number5(value);
  }
  function powerWords(name, exponent2) {
    const superscripts = {
      "2": "\xB2",
      "3": "\xB3",
      "4": "\u2074",
      "5": "\u2075"
    };
    if (exponent2 === 1)
      return name;
    if (exponent2 === -1)
      return `1/${name}`;
    if (Number.isInteger(exponent2)) {
      const up = superscripts[String(Math.abs(exponent2))];
      const raised2 = up === void 0 ? `${name}^${Math.abs(exponent2)}` : name + up;
      return exponent2 > 0 ? raised2 : `1/${raised2}`;
    }
    const node = rationalExponent(exponent2);
    return node.type === "BinaryOperator" && node.left.type === "Constant" && node.right.type === "Constant" ? `${name}^(${node.left.value}/${node.right.value})` : `${name}^${exponent2}`;
  }
  function homogeneous(emit2, f, independent, dependent) {
    const at2 = (x, y) => evaluate(f, { [independent]: x, [dependent]: y });
    let compared = 0;
    for (const [x, y] of [
      [0.7, 1.3],
      [1.9, -0.4],
      [-1.1, 2.3]
    ])
      for (const t of [2.5, -1.7, 0.3]) {
        const a = at2(x, y);
        const b = at2(t * x, t * y);
        if (!Number.isFinite(a) || !Number.isFinite(b))
          continue;
        compared++;
        if (Math.abs(a - b) > 1e-9 * Math.max(1, Math.abs(a)))
          return void 0;
      }
    if (compared < 4)
      return void 0;
    const v = "v";
    const F = fold(
      replaceName(replaceName(f, dependent, id6(v)), independent, number5(1))
    );
    const denominator = fold(subtract5(F, id6(v)));
    if (isZero3(denominator))
      return void 0;
    const ratio = asRatio(denominator);
    let left;
    try {
      left = integrate2(
        fold(
          divide8(
            fold(tidySums(fold(expand(ratio.denominator).node))),
            fold(tidySums(fold(expand(ratio.numerator).node)))
          )
        ),
        v
      );
    } catch {
      return void 0;
    }
    const quotient = divide8(id6(dependent), id6(independent));
    const leftInY = fold(replaceName(left, v, quotient));
    const right = fold(
      add6(
        {
          type: "FunctionCall",
          callee: id6("ln"),
          args: [
            { type: "FunctionCall", callee: id6("abs"), args: [id6(independent)] }
          ]
        },
        id6(CONSTANT)
      )
    );
    const relation = fold(subtract5(leftInY, right));
    return verifiedImplicit(
      relation,
      {
        latex: `${emit2(leftInY)}=${emit2(right)}`,
        method: `Homogeneous, with v = ${dependent}/${independent}, which separates`,
        explicit: false,
        relation: {
          left: leftInY,
          right: fold(subtract5(right, id6(CONSTANT)))
        }
      },
      f,
      independent,
      dependent
    );
  }
  function replaceName(node, name, value) {
    switch (node.type) {
      case "Identifier":
        return node.symbol === name ? value : node;
      case "FunctionCall":
        return {
          ...node,
          args: node.args.map((a) => replaceName(a, name, value))
        };
      case "BinaryOperator":
        return {
          ...node,
          left: replaceName(node.left, name, value),
          right: replaceName(node.right, name, value)
        };
      case "Negative":
        return { ...node, arg: replaceName(node.arg, name, value) };
      default:
        return node;
    }
  }
  function resolveImplicitCalls(node, variables) {
    switch (node.type) {
      case "FunctionCall": {
        const args = node.args.map((arg) => resolveImplicitCalls(arg, variables));
        if (variables.includes(node.callee.symbol) && args.length === 1)
          return multiply6(id6(node.callee.symbol), args[0]);
        return { ...node, args };
      }
      case "Negative":
        return negative5(resolveImplicitCalls(node.arg, variables));
      case "BinaryOperator":
        return {
          ...node,
          left: resolveImplicitCalls(node.left, variables),
          right: resolveImplicitCalls(node.right, variables)
        };
      default:
        return node;
    }
  }
  function direct(emit2, f, independent, dependent) {
    let antiderivative2;
    try {
      antiderivative2 = integrate2(f, independent);
    } catch (error2) {
      return failed(error2);
    }
    const solution = fold(add6(antiderivative2, id6(CONSTANT)));
    return verified(
      {
        // Written as `+C` on the end rather than emitted from the tree. The
        // simplifier is free to reorder a sum — it turns `-cos(x)+C` into
        // `C-cos(x)`, which is the same number and not the form anybody writes an
        // antiderivative in. The constant of integration goes last, always. The
        // tree keeps it where it is, because the tree is what gets verified.
        latex: `${dependent}=${emit2(fold(antiderivative2))}+${CONSTANT}`,
        method: "Direct antiderivative",
        explicit: true,
        tree: fold(add6(antiderivative2, id6(CONSTANT)))
      },
      solution,
      f,
      independent,
      dependent
    );
  }
  function affine(emit2, f, parts, independent, dependent) {
    const { a, b } = parts;
    const aHasX = dependsOn(a, independent);
    const bIsZero = isZero3(b);
    let antiderivativeOfA;
    try {
      antiderivativeOfA = withoutLogBars(integrate2(a, independent));
    } catch (error2) {
      return failed(error2);
    }
    const growth2 = power6(id6("e"), antiderivativeOfA);
    if (bIsZero) {
      const solution2 = fold(multiply6(id6(CONSTANT), growth2));
      return verified(
        {
          latex: `${dependent}=${emit2(solution2)}`,
          method: aHasX ? "Separable, with y on one side" : "Exponential growth and decay",
          explicit: true,
          tree: solution2
        },
        solution2,
        f,
        independent,
        dependent
      );
    }
    if (!aHasX && !dependsOn(b, independent)) {
      const equilibrium = divide8(negative5(b), a);
      const solution2 = fold(add6(equilibrium, multiply6(id6(CONSTANT), growth2)));
      return verified(
        {
          latex: `${dependent}=${emit2(solution2)}`,
          method: `Approaches the equilibrium ${emit2(fold(equilibrium))}`,
          explicit: true,
          tree: solution2
        },
        solution2,
        f,
        independent,
        dependent
      );
    }
    let particular;
    try {
      const factor = power6(id6("e"), fold(negative5(antiderivativeOfA)));
      particular = integrate2(fold(multiply6(b, factor)), independent);
    } catch (error2) {
      return failed(error2);
    }
    const solution = fold(
      add6(distribute2(growth2, particular), multiply6(id6(CONSTANT), growth2))
    );
    return verified(
      {
        latex: `${dependent}=${emit2(solution)}`,
        method: "Linear, solved with an integrating factor",
        explicit: true,
        tree: solution
      },
      solution,
      f,
      independent,
      dependent
    );
  }
  function logistic(emit2, f, independent, dependent) {
    const coefficients = coefficientsIn(f, dependent, 2);
    if (coefficients === void 0 || coefficients.length !== 3)
      return void 0;
    const [constant3, linear2, quadratic2] = coefficients.map((c) => fold(c));
    if (!isZero3(constant3))
      return void 0;
    if (isZero3(quadratic2))
      return void 0;
    if (isZero3(linear2))
      return void 0;
    if (dependsOn(linear2, independent) || dependsOn(quadratic2, independent))
      return void 0;
    const capacity = fold(divide8(negative5(linear2), quadratic2));
    const solution = fold(
      divide8(
        capacity,
        add6(
          number5(1),
          multiply6(
            id6(CONSTANT),
            power6(id6("e"), fold(multiply6(negative5(linear2), id6(independent))))
          )
        )
      )
    );
    return verified(
      {
        latex: `${dependent}=${emit2(solution)}`,
        method: `Logistic, carrying capacity ${emit2(capacity)}`,
        explicit: true,
        tree: solution
      },
      solution,
      f,
      independent,
      dependent
    );
  }
  function separable(emit2, f, independent, dependent) {
    const split4 = separate(f, independent, dependent);
    if (split4 === void 0) {
      return {
        ok: false,
        error: "This is not separable into a function of x times a function of y, and no other method is available here."
      };
    }
    let left;
    let right;
    try {
      left = fold(integrate2(split4.hInverse, dependent));
      right = fold(integrate2(split4.g, independent));
    } catch (error2) {
      return failed(error2);
    }
    if (!separationHolds(split4, left, right, f, independent, dependent)) {
      return {
        ok: false,
        error: "A candidate relation was found but does not satisfy the equation, so it has not been reported."
      };
    }
    const implicit = {
      ok: true,
      solution: {
        latex: `${emit2(left)}=${emit2(fold(add6(right, id6(CONSTANT))))}`,
        method: "Separable, left as a relation between x and y",
        explicit: false,
        relation: { left, right }
      }
    };
    const solved = invertedPower(left, right, dependent);
    if (solved === void 0)
      return implicit;
    const explicit = verified(
      {
        latex: `${dependent}=${emit2(solved)}`,
        method: "Separable, then solved for y",
        explicit: true,
        tree: solved
      },
      solved,
      f,
      independent,
      dependent
    );
    return explicit.ok ? explicit : implicit;
  }
  function separationHolds(split4, left, right, f, independent, dependent) {
    const parameters = parameterBindings(
      [f, left, right],
      [independent, dependent, CONSTANT]
    );
    const points = SAMPLE_XS.flatMap(
      (x) => [0.7, 1.4, 2.5].map((y) => ({
        ...parameters,
        [independent]: x,
        [dependent]: y
      }))
    );
    return agreesOnSamples(
      (bindings) => evaluate(split4.g, bindings) / evaluate(split4.hInverse, bindings),
      (bindings) => evaluate(f, bindings),
      points
    ) && agreesOnSamples(
      (bindings) => numericDerivative(left, dependent, bindings),
      (bindings) => evaluate(split4.hInverse, bindings),
      points
    ) && agreesOnSamples(
      (bindings) => numericDerivative(right, independent, bindings),
      (bindings) => evaluate(split4.g, bindings),
      points
    );
  }
  function invertedPower(left, right, dependent) {
    const parameters = parameterBindings([left], [dependent, CONSTANT]);
    const at2 = (y) => evaluate(left, { ...parameters, [dependent]: y });
    const n = Math.round(Math.log(at2(2) / at2(1)) / Math.log(2));
    if (!Number.isFinite(n) || n === 0 || n % 2 === 0)
      return void 0;
    for (const y of [0.5, 3]) {
      const expected = at2(1) * y ** n;
      if (!(Math.abs(at2(y) - expected) <= 1e-9 * Math.abs(expected)))
        return void 0;
    }
    const coefficient = fold(divide8(left, power6(id6(dependent), number5(n))));
    if (dependsOn(coefficient, dependent))
      return void 0;
    const negativeK = evaluate(coefficient, parameters) < 0;
    const base2 = negativeK ? divide8(
      add6(fold(negative5(right)), id6(CONSTANT)),
      fold(negative5(coefficient))
    ) : divide8(add6(right, id6(CONSTANT)), coefficient);
    return fold(power6(base2, divide8(number5(1), number5(n))));
  }
  function separate(f, independent, dependent) {
    const collected = [];
    collect2(f, true, collected);
    const gNumerator = [];
    const gDenominator = [];
    const inverseNumerator = [];
    const inverseDenominator = [];
    for (const { node, inNumerator } of collected) {
      const hasX = dependsOn(node, independent);
      const hasY = dependsOn(node, dependent);
      if (hasX && hasY)
        return void 0;
      if (hasY) {
        (inNumerator ? inverseDenominator : inverseNumerator).push(node);
      } else {
        (inNumerator ? gNumerator : gDenominator).push(node);
      }
    }
    return {
      g: fold(assemble2(gNumerator, gDenominator)),
      hInverse: fold(assemble2(inverseNumerator, inverseDenominator))
    };
  }
  function assemble2(numerator, denominator) {
    const product = (factors) => factors.length === 0 ? number5(1) : factors.reduce((left, right) => multiply6(left, right));
    if (denominator.length === 0)
      return product(numerator);
    return divide8(product(numerator), product(denominator));
  }
  function collect2(node, inNumerator, out) {
    if (node.type === "BinaryOperator") {
      if (node.name === "Multiply" || node.name === "CrossMultiply") {
        collect2(node.left, inNumerator, out);
        collect2(node.right, inNumerator, out);
        return;
      }
      if (node.name === "Divide") {
        collect2(node.left, inNumerator, out);
        collect2(node.right, !inNumerator, out);
        return;
      }
    }
    if (node.type === "BinaryOperator" && node.name === "Exponent" && node.left.type === "Identifier" && node.left.symbol === "e" && node.right.type === "BinaryOperator" && (node.right.name === "Add" || node.right.name === "Subtract")) {
      const second = node.right.name === "Add" ? node.right.right : negative5(node.right.right);
      collect2(power6(node.left, node.right.left), inNumerator, out);
      collect2(power6(node.left, second), inNumerator, out);
      return;
    }
    if (node.type === "Negative") {
      out.push({ node: number5(-1), inNumerator });
      collect2(node.arg, inNumerator, out);
      return;
    }
    out.push({ node, inNumerator });
  }
  function parameterBindings(nodes, exclude) {
    const names = [];
    for (const node of nodes) {
      visit(node, (child) => {
        if (child.type === "Identifier" && !exclude.includes(child.symbol) && child.symbol !== "pi" && child.symbol !== "e" && !names.includes(child.symbol))
          names.push(child.symbol);
      });
    }
    const bindings = {};
    names.forEach((name, index) => {
      bindings[name] = [1.3, 0.7, 2.1, 0.4, 1.9][index % 5];
    });
    return bindings;
  }
  var samples = (independent, dependent, parameters) => SAMPLE_XS.flatMap(
    (x) => SAMPLE_CS.map((c) => ({
      ...parameters,
      [independent]: x,
      [CONSTANT]: c,
      [dependent]: 0
    }))
  );
  function verified(solution, candidate, f, independent, dependent) {
    if (!dependsOn(candidate, CONSTANT))
      return {
        ok: false,
        error: "Only a single solution was found, not the family of them, so it has not been reported."
      };
    const parameters = parameterBindings(
      [f, candidate],
      [independent, dependent, CONSTANT]
    );
    const ok = agreesOnSamples(
      (bindings) => numericDerivative(candidate, independent, bindings),
      (bindings) => evaluate(f, { ...bindings, [dependent]: evaluate(candidate, bindings) }),
      samples(independent, dependent, parameters)
    );
    return ok ? { ok: true, solution } : {
      ok: false,
      error: "A candidate solution was found but does not satisfy the equation, so it has not been reported."
    };
  }
  function verifiedImplicit(relation, solution, f, independent, dependent) {
    const parameters = parameterBindings(
      [f, relation],
      [independent, dependent, CONSTANT]
    );
    const points = SAMPLE_XS.flatMap(
      (x) => [0.7, 1.4, 2.5].map((y) => ({
        ...parameters,
        [independent]: x,
        [dependent]: y,
        [CONSTANT]: 0
      }))
    );
    const ok = agreesOnSamples(
      (bindings) => -numericDerivative(relation, independent, bindings) / numericDerivative(relation, dependent, bindings),
      (bindings) => evaluate(f, bindings),
      points
    );
    return ok ? { ok: true, solution } : {
      ok: false,
      error: "A candidate relation was found but does not satisfy the equation, so it has not been reported."
    };
  }
  function failed(error2) {
    if (error2 instanceof IntegrationError)
      return { ok: false, error: error2.message };
    throw error2;
  }
  function isZero3(node) {
    return node.type === "Constant" && node.value === 0;
  }
  function distribute2(factor, sum3) {
    if (sum3.type === "BinaryOperator") {
      if (sum3.name === "Add")
        return add6(distribute2(factor, sum3.left), distribute2(factor, sum3.right));
      if (sum3.name === "Subtract")
        return subtract5(
          distribute2(factor, sum3.left),
          distribute2(factor, sum3.right)
        );
    }
    return fold(multiply6(factor, sum3));
  }

  // src/plugins/physics-lab/symbolic/secondOrder.ts
  var { binop: binop6, functionCall: functionCall5, id: id7 } = augBuilders_exports;
  var add7 = (a, b) => binop6("Add", a, b);
  var multiply7 = (a, b) => binop6("Multiply", a, b);
  var power7 = (a, b) => binop6("Exponent", a, b);
  var call3 = (name, arg) => functionCall5(id7(name), arg);
  var FIRST = "C_1";
  var SECOND = "C_2";
  var VELOCITY = "v";
  function resolvePrimes(latex, dependent = "y") {
    return latex.split(`${dependent}'`).join(VELOCITY);
  }
  var SAMPLE_XS2 = [-1.3, -0.4, 0.5, 1.2, 2.1, 2.9];
  var SAMPLE_PAIRS = [
    [1.3, -0.7],
    [-0.6, 1.9],
    [2.2, 0.8]
  ];
  function solveSecondOrder(cfg2, f, independent = "x", dependent = "y") {
    const emit2 = (node) => toLatex(cfg2, node);
    const inVelocity = linearIn(f, VELOCITY);
    if (inVelocity === void 0)
      return notLinear("dy/dx", dependent, independent);
    const inPosition = linearIn(inVelocity.b, dependent);
    if (inPosition === void 0)
      return notLinear(dependent, dependent, independent);
    const p = exactCoefficient(inVelocity.a);
    const q = exactCoefficient(inPosition.a);
    const r = exactCoefficient(inPosition.b);
    if (p === void 0 || q === void 0 || r === void 0) {
      return {
        ok: false,
        error: "The coefficients have to be exact numbers. Which of the three solution shapes is right depends on the sign of the discriminant, and a symbolic coefficient does not have one."
      };
    }
    const discriminant = add4(multiply3(p, p), multiply3(rational(4n), q));
    const half = rational(1n, 2n);
    const halfP = multiply3(p, half);
    let equilibrium;
    if (!isZero(r)) {
      if (isZero(q)) {
        return {
          ok: false,
          error: "A constant term with no y to balance it makes this non-homogeneous in a way this does not solve."
        };
      }
      equilibrium = toNode(fromRational(negate(divide5(r, q))));
    }
    const built = isZero(discriminant) ? repeatedRoot(halfP) : compare(discriminant, ZERO) > 0 ? distinctRealRoots(halfP, discriminant, half) : complexRoots(halfP, discriminant, half);
    if (built === void 0) {
      return {
        ok: false,
        error: "The characteristic roots are not exact constants this can represent."
      };
    }
    const solution = fold(
      equilibrium === void 0 ? built.tree : add7(equilibrium, built.tree)
    );
    return verifiedSecondOrder(
      {
        latex: `${dependent}=${emit2(solution)}`,
        method: built.method,
        explicit: true
      },
      solution,
      f,
      independent,
      dependent
    );
  }
  function distinctRealRoots(halfP, discriminant, half) {
    const root2 = power5(fromRational(discriminant), half);
    if (root2 === void 0)
      return void 0;
    const spread = multiply5(fromRational(half), root2);
    const centre = fromRational(halfP);
    const first = toNode(add5(centre, spread));
    const second = toNode(subtract4(centre, spread));
    return {
      tree: add7(
        multiply7(id7(FIRST), power7(id7("e"), multiply7(first, id7("x")))),
        multiply7(id7(SECOND), power7(id7("e"), multiply7(second, id7("x"))))
      ),
      method: "Two real characteristic roots"
    };
  }
  function repeatedRoot(halfP) {
    const root2 = toNode(fromRational(halfP));
    return {
      tree: multiply7(
        add7(id7(FIRST), multiply7(id7(SECOND), id7("x"))),
        power7(id7("e"), multiply7(root2, id7("x")))
      ),
      method: "A repeated characteristic root, critically damped"
    };
  }
  function complexRoots(halfP, discriminant, half) {
    const magnitude = power5(fromRational(negate(discriminant)), half);
    if (magnitude === void 0)
      return void 0;
    const beta2 = toNode(multiply5(fromRational(half), magnitude));
    const oscillation = add7(
      multiply7(id7(FIRST), call3("cos", multiply7(beta2, id7("x")))),
      multiply7(id7(SECOND), call3("sin", multiply7(beta2, id7("x"))))
    );
    if (isZero(halfP)) {
      return { tree: oscillation, method: "Simple harmonic motion" };
    }
    return {
      tree: multiply7(
        power7(id7("e"), multiply7(toNode(fromRational(halfP)), id7("x"))),
        oscillation
      ),
      method: "Complex characteristic roots, a damped oscillation"
    };
  }
  function exactCoefficient(node) {
    const value = evaluateExact(node);
    if (value === void 0)
      return void 0;
    return asRational(value);
  }
  function notLinear(what, dependent, independent) {
    return {
      ok: false,
      error: `This has to be linear in ${dependent} and ${what}, with coefficients that do not depend on ${independent}. Write dy/dx as ${VELOCITY}.`
    };
  }
  function verifiedSecondOrder(solution, candidate, f, independent, dependent) {
    const samples2 = SAMPLE_XS2.flatMap(
      (x) => SAMPLE_PAIRS.map(([c1, c2]) => ({
        [independent]: x,
        [FIRST]: c1,
        [SECOND]: c2
      }))
    );
    const ok = agreesOnSamples(
      (bindings) => numericSecondDerivative(candidate, independent, bindings),
      (bindings) => evaluate(f, {
        ...bindings,
        [dependent]: evaluate(candidate, bindings),
        [VELOCITY]: numericDerivative(candidate, independent, bindings)
      }),
      samples2,
      // Looser than the first-order check, and it has to be: a second difference
      // divides by h², so it carries roughly the square root of the precision the
      // first derivative does. Tightening this rejects correct answers.
      2e-3
    );
    return ok ? { ok: true, solution } : {
      ok: false,
      error: "A candidate solution was found but does not satisfy the equation, so it has not been reported."
    };
  }

  // src/plugins/physics-lab/symbolic/series.ts
  var SeriesError = class extends Error {
  };
  var factorial3 = (arg) => ({ type: "Factorial", arg });
  var alternating = (n) => power2(number2(-1), n);
  var twice = (n) => multiply(number2(2), n);
  var twicePlusOne = (n) => add(twice(n), number2(1));
  var SERIES = {
    exp: {
      coefficient: (n) => divide(number2(1), factorial3(n)),
      exponent: (n) => n,
      from: 0,
      interval: "every x"
    },
    sin: {
      coefficient: (n) => divide(alternating(n), factorial3(twicePlusOne(n))),
      exponent: twicePlusOne,
      from: 0,
      interval: "every x"
    },
    cos: {
      coefficient: (n) => divide(alternating(n), factorial3(twice(n))),
      exponent: twice,
      from: 0,
      interval: "every x"
    },
    sinh: {
      coefficient: (n) => divide(number2(1), factorial3(twicePlusOne(n))),
      exponent: twicePlusOne,
      from: 0,
      interval: "every x"
    },
    cosh: {
      coefficient: (n) => divide(number2(1), factorial3(twice(n))),
      exponent: twice,
      from: 0,
      interval: "every x"
    },
    arctan: {
      coefficient: (n) => divide(alternating(n), twicePlusOne(n)),
      exponent: twicePlusOne,
      from: 0,
      interval: "|x| <= 1"
    },
    // ln(1+u) rather than ln(u), which has no Maclaurin series at all: it is
    // undefined at zero, and every term of a series about zero would be one.
    ln1p: {
      coefficient: (n) => divide(alternating(add(n, number2(1))), n),
      exponent: (n) => n,
      from: 1,
      interval: "-1 < x <= 1"
    },
    /** 1/(1-u), the geometric series, which is where most of the others start. */
    geometric: {
      coefficient: () => number2(1),
      exponent: (n) => n,
      from: 0,
      interval: "|x| < 1"
    }
  };
  var DEFAULT_SERIES_TERMS = 20;
  var PARTIAL_TERMS2 = 4;
  function seriesAntiderivative(node, variable, terms = DEFAULT_SERIES_TERMS) {
    const shape2 = readIntegrand(fold(node), variable);
    const entry = SERIES[shape2.series];
    const index = freshName(node, ["n", "k", "j"]);
    const n = id3(index);
    const innerExponent = entry.exponent(n);
    const xPower = add(
      add(
        multiply(number2(shape2.monomialPower), innerExponent),
        number2(shape2.outerPower)
      ),
      number2(1)
    );
    const raisedScale = power2(shape2.scale, innerExponent);
    const degree3 = fold(expand(xPower).node);
    const zeros = vanishingIndices(degree3, index, entry.from, terms);
    let { from } = entry;
    let logarithm3;
    if (zeros.length === 1 && zeros[0] === entry.from) {
      const at2 = number2(entry.from);
      logarithm3 = fold(
        multiply(
          replaceIdentifier(
            fold(
              multiply(
                multiply(shape2.constant, entry.coefficient(n)),
                raisedScale
              )
            ),
            index,
            at2
          ),
          call("ln", call("abs", id3(variable)))
        )
      );
      from = entry.from + 1;
    } else if (zeros.length > 0) {
      throw new SeriesError(
        "A term in the middle of this series is a multiple of 1/x, whose integral is a logarithm rather than a power, so no single general term covers every index."
      );
    }
    const coefficient = fold(
      divide(
        multiply(multiply(shape2.constant, entry.coefficient(n)), raisedScale),
        degree3
      )
    );
    const term2 = fold(multiply(coefficient, power2(id3(variable), degree3)));
    const sum3 = {
      type: "RepeatedOperator",
      name: "Sum",
      index: { type: "Identifier", symbol: index },
      start: number2(from),
      end: number2(from + terms - 1),
      expression: term2
    };
    const partial = writtenOut(term2, index, from);
    return {
      term: term2,
      index,
      from,
      logarithm: logarithm3,
      sum: logarithm3 === void 0 ? sum3 : add(logarithm3, sum3),
      // Not folded: the fold orders a sum by its own rules, and a series read
      // out of order is harder to recognise than one with a stray bracket.
      partial: logarithm3 === void 0 ? partial : joinSums([logarithm3, partial]),
      interval: logarithm3 === void 0 ? entry.interval : `${entry.interval} except 0`,
      source: shape2.series
    };
  }
  function writtenOut(term2, index, from) {
    let total;
    for (let i = from; i < from + PARTIAL_TERMS2; i += 1) {
      const value = fold(replaceIdentifier(term2, index, number2(i)));
      total = total === void 0 ? value : fold(add(total, value));
    }
    return total ?? number2(0);
  }
  function vanishingIndices(degree3, index, from, terms) {
    const out = [];
    for (let i = from; i < from + terms; i += 1) {
      const value = constantValue(
        fold(replaceIdentifier(degree3, index, number2(i)))
      );
      if (value === 0)
        out.push(i);
    }
    return out;
  }
  function readIntegrand(node, variable) {
    const factors = [];
    quotientFactors(node, true, factors);
    let constant3 = number2(1);
    let outerPower = 0;
    let inner;
    for (const { node: factor, inNumerator } of factors) {
      const sign3 = inNumerator ? 1 : -1;
      if (!dependsOn(factor, variable)) {
        constant3 = inNumerator ? multiply(constant3, factor) : divide(constant3, factor);
        continue;
      }
      const monomial = asMonomialPower(factor, variable);
      if (monomial !== void 0) {
        outerPower += sign3 * monomial;
        continue;
      }
      if (inner !== void 0) {
        throw new SeriesError(
          "A series is only built for one known function of a power of the variable, times a constant and a power."
        );
      }
      if (!inNumerator) {
        const geometric = asOneMinus(factor);
        const monomial2 = geometric === void 0 ? void 0 : asScaledMonomial(geometric, variable);
        if (monomial2 === void 0) {
          throw new SeriesError(
            "A series is only built for one known function of a power of the variable, times a constant and a power."
          );
        }
        inner = { series: "geometric", ...monomial2 };
        continue;
      }
      inner = asKnownSeries(factor, variable);
    }
    if (inner === void 0) {
      throw new SeriesError(
        "Nothing in this integrand is a function with a series this knows."
      );
    }
    return { constant: fold(constant3), outerPower, ...inner };
  }
  function asMonomialPower(node, variable) {
    if (node.type === "Identifier")
      return node.symbol === variable ? 1 : void 0;
    if (node.type === "BinaryOperator" && node.name === "Exponent") {
      if (node.left.type !== "Identifier" || node.left.symbol !== variable)
        return void 0;
      const exponent2 = constantValue(fold(node.right));
      return exponent2 !== void 0 && Number.isInteger(exponent2) ? exponent2 : void 0;
    }
    return void 0;
  }
  function asKnownSeries(node, variable) {
    const argument = seriesArgument(node);
    if (argument === void 0) {
      throw new SeriesError(
        "A series is only built around one of the standard functions."
      );
    }
    const monomial = asScaledMonomial(argument.inside, variable);
    if (monomial === void 0) {
      throw new SeriesError(
        "The function's argument has to be a constant times a power of the variable."
      );
    }
    return { series: argument.series, ...monomial };
  }
  function seriesArgument(node) {
    if (node.type === "BinaryOperator" && node.name === "Exponent" && node.left.type === "Identifier" && node.left.symbol === "e") {
      return { series: "exp", inside: node.right };
    }
    if (node.type !== "FunctionCall" || node.args.length !== 1)
      return void 0;
    const name = node.callee.symbol;
    const [inside] = node.args;
    if (SERIES[name] !== void 0)
      return { series: name, inside };
    if (name === "ln") {
      const shifted = asOnePlus(inside);
      return shifted === void 0 ? void 0 : { series: "ln1p", inside: shifted };
    }
    return void 0;
  }
  function asOneMinus(node) {
    if (node.type !== "BinaryOperator")
      return void 0;
    if (node.name === "Subtract" && constantValue(node.left) === 1)
      return node.right;
    if (node.name === "Add") {
      if (constantValue(node.left) === 1)
        return fold({ type: "Negative", arg: node.right });
      if (constantValue(node.right) === 1)
        return fold({ type: "Negative", arg: node.left });
    }
    return void 0;
  }
  function asOnePlus(node) {
    if (node.type !== "BinaryOperator")
      return void 0;
    if (node.name === "Add") {
      if (constantValue(node.left) === 1)
        return node.right;
      if (constantValue(node.right) === 1)
        return node.left;
    }
    if (node.name === "Subtract" && constantValue(node.left) === 1) {
      return fold({ type: "Negative", arg: node.right });
    }
    return void 0;
  }
  function asScaledMonomial(node, variable) {
    const factors = [];
    quotientFactors(node, true, factors);
    let scale = number2(1);
    let monomialPower2;
    for (const { node: factor, inNumerator } of factors) {
      if (!dependsOn(factor, variable)) {
        scale = inNumerator ? multiply(scale, factor) : divide(scale, factor);
        continue;
      }
      const power8 = asMonomialPower(factor, variable);
      if (power8 === void 0 || monomialPower2 !== void 0)
        return void 0;
      monomialPower2 = inNumerator ? power8 : -power8;
    }
    if (monomialPower2 === void 0 || monomialPower2 <= 0)
      return void 0;
    return { scale: fold(scale), monomialPower: monomialPower2 };
  }

  // src/plugins/physics-lab/symbolic/seriesSum.ts
  function seriesFallback(node, variable, terms) {
    const signed = topLevelTerms(fold(node));
    const parts = [];
    const sums2 = [];
    const partials = [];
    const general = [];
    const intervals = /* @__PURE__ */ new Set();
    let order;
    for (const { term: term2, negated } of signed) {
      const sign3 = (value) => negated ? { type: "Negative", arg: value } : value;
      const closed = tryClosed(term2, variable);
      if (closed !== void 0) {
        parts.push({ integrand: term2, kind: "closed" });
        sums2.push(sign3(closed));
        partials.push(sign3(closed));
        continue;
      }
      const series = tryGeneral(term2, variable, terms);
      if (series !== void 0) {
        parts.push({ integrand: term2, kind: "series" });
        sums2.push(sign3(series.sum));
        partials.push(sign3(series.partial));
        general.push(series);
        intervals.add(series.interval);
        continue;
      }
      const truncated = tryTruncated(term2, variable, terms);
      if (truncated === void 0)
        return void 0;
      parts.push({ integrand: term2, kind: "truncated" });
      sums2.push(sign3(truncated.polynomial));
      partials.push(sign3(truncated.partial));
      order = order === void 0 ? truncated.order : Math.min(order, truncated.order);
      intervals.add("x near 0 (the radius is not worked out here)");
    }
    if (parts.every((part) => part.kind === "closed"))
      return void 0;
    return {
      // Added rather than folded, so the parts stay in the order the integrand
      // was written in.
      sum: joinSums(sums2),
      partial: joinSums(partials),
      term: general.length === 1 && order === void 0 ? general[0].term : void 0,
      parts,
      interval: [...intervals].join("; "),
      order
    };
  }
  function tryClosed(term2, variable) {
    try {
      return integrate2(term2, variable);
    } catch (error2) {
      if (error2 instanceof IntegrationError)
        return void 0;
      throw error2;
    }
  }
  function tryGeneral(term2, variable, terms) {
    try {
      return seriesAntiderivative(term2, variable, terms);
    } catch (error2) {
      if (error2 instanceof SeriesError)
        return void 0;
      throw error2;
    }
  }
  function tryTruncated(term2, variable, terms) {
    try {
      return truncatedAntiderivative(term2, variable, terms);
    } catch (error2) {
      if (error2 instanceof PowerSeriesError)
        return void 0;
      throw error2;
    }
  }

  // src/plugins/physics-lab/symbolic/pslq.ts
  function integerRelation(xs, { digits, maxCoefficient, maxIterations = 250 }) {
    const n = xs.length;
    if (n < 2)
      return void 0;
    const D = decimalContext(digits + 12);
    const x = xs.map((v) => new D(v));
    if (x.some((v) => !v.isFinite()) || x.every((v) => v.isZero()))
      return void 0;
    const threshold = new D(10).pow(-(digits - 3));
    const gamma2 = new D(4).div(3).sqrt();
    const s = new Array(n);
    let tail = new D(0);
    for (let k = n - 1; k >= 0; k--) {
      tail = tail.plus(x[k].times(x[k]));
      s[k] = tail.sqrt();
    }
    const [t] = s;
    const y = x.map((v) => v.div(t));
    for (let k = 0; k < n; k++)
      s[k] = s[k].div(t);
    if (s.slice(0, n - 1).some((v) => v.isZero()))
      return void 0;
    const H = [];
    for (let i = 0; i < n; i++) {
      H.push([]);
      for (let j = 0; j < n - 1; j++) {
        if (i < j)
          H[i].push(new D(0));
        else if (i === j)
          H[i].push(s[j + 1].div(s[j]));
        else
          H[i].push(
            y[i].times(y[j]).neg().div(s[j].times(s[j + 1]))
          );
      }
    }
    const identity = () => Array.from(
      { length: n },
      (_, i) => Array.from({ length: n }, (__, j) => i === j ? 1n : 0n)
    );
    const A = identity();
    const B = identity();
    const reduceRow = (i, j) => {
      if (H[j][j].isZero())
        return;
      const q = H[i][j].div(H[j][j]).toDecimalPlaces(0, D.ROUND_HALF_EVEN);
      if (q.isZero())
        return;
      const qi = BigInt(q.toFixed(0));
      y[j] = y[j].plus(q.times(y[i]));
      for (let k = 0; k <= j; k++)
        H[i][k] = H[i][k].minus(q.times(H[j][k]));
      for (let k = 0; k < n; k++) {
        A[i][k] -= qi * A[j][k];
        B[k][j] += qi * B[k][i];
      }
    };
    for (let i = 1; i < n; i++)
      for (let j = i - 1; j >= 0; j--)
        reduceRow(i, j);
    const bound = BigInt(Math.ceil(maxCoefficient));
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let m = 0;
      let best = new D(-1);
      let weight = gamma2;
      for (let i = 0; i < n - 1; i++) {
        const size = weight.times(H[i][i].abs());
        if (size.gt(best)) {
          best = size;
          m = i;
        }
        weight = weight.times(gamma2);
      }
      [y[m], y[m + 1]] = [y[m + 1], y[m]];
      [A[m], A[m + 1]] = [A[m + 1], A[m]];
      [H[m], H[m + 1]] = [H[m + 1], H[m]];
      for (let k = 0; k < n; k++)
        [B[k][m], B[k][m + 1]] = [B[k][m + 1], B[k][m]];
      if (m < n - 2) {
        const t0 = H[m][m].times(H[m][m]).plus(H[m][m + 1].times(H[m][m + 1])).sqrt();
        if (t0.isZero())
          return void 0;
        const t1 = H[m][m].div(t0);
        const t2 = H[m][m + 1].div(t0);
        for (let i = m; i < n; i++) {
          const t3 = H[i][m];
          const t4 = H[i][m + 1];
          H[i][m] = t1.times(t3).plus(t2.times(t4));
          H[i][m + 1] = t2.neg().times(t3).plus(t1.times(t4));
        }
      }
      for (let i = m + 1; i < n; i++)
        for (let j = Math.min(i - 1, m + 1); j >= 0; j--)
          reduceRow(i, j);
      for (let j = 0; j < n; j++) {
        if (y[j].abs().lt(threshold)) {
          const relation = B.map((row) => row[j]);
          const largest = relation.reduce(
            (a, b) => (b < 0n ? -b : b) > a ? b < 0n ? -b : b : a,
            0n
          );
          if (largest === 0n || largest > bound)
            return void 0;
          const first = relation.find((c) => c !== 0n) ?? 1n;
          return first < 0n ? relation.map((c) => -c) : relation;
        }
      }
      let largestDiagonal = new D(0);
      for (let j = 0; j < n - 1; j++)
        if (H[j][j].abs().gt(largestDiagonal))
          largestDiagonal = H[j][j].abs();
      if (largestDiagonal.isZero())
        return void 0;
      if (new D(1).div(largestDiagonal).gt(maxCoefficient * n))
        return void 0;
    }
    return void 0;
  }

  // src/plugins/physics-lab/symbolic/recognize.ts
  var MAX_DENOMINATOR = 10000n;
  var DIGITS_FOR_IRRATIONAL = 6;
  var MARGIN = 8;
  var PLAIN_MARGIN = 4;
  var PSLQ_DIGITS = 50;
  var DIGITS_FOR_SPECIAL = 15;
  var log102 = (n) => Math.log10(Math.abs(Number(n)) + 1);
  function significantDigits(text3) {
    const match = /^-?0*(\d*)(?:\.(\d*))?$/.exec(text3.trim());
    if (!match)
      return 0;
    const [, whole, decimals = ""] = match;
    if (whole === "" || whole === "0") {
      const stripped = decimals.replace(/^0+/, "");
      return stripped.length;
    }
    return whole.length + decimals.length;
  }
  function recognizeDecimal(text3) {
    const trimmed = text3.trim();
    if (!/^-?\d*\.?\d+$/.test(trimmed) && !/^-?\d+\.$/.test(trimmed))
      return void 0;
    const digits = significantDigits(trimmed);
    if (digits === 0)
      return void 0;
    const precision = Math.max(60, 2 * digits + 30);
    const D = decimalContext(precision);
    const value = new D(trimmed);
    if (!value.isFinite() || value.isZero())
      return void 0;
    const tolerance = new D(10).pow(value.e - digits + 1).times(0.5);
    const found = identify(value, tolerance, digits, precision, true);
    if (found === void 0)
      return void 0;
    const node = fold(found.node);
    const exact = evaluateExact(node) ?? opaque(
      node,
      evaluatePrecise(node, specialBindings(precision), precision).toNumber()
    );
    return {
      value: exact,
      node: found.node,
      digits,
      spare: Math.max(0, Math.floor(digits - found.cost)),
      definitions: constantsIn(identifiersIn(found.node))
    };
  }
  function identify(value, tolerance, digits, precision, towers) {
    const sign3 = value.isNegative() ? -1 : 1;
    const size = value.abs();
    const matches = (candidate) => {
      const got = valueAt(candidate.node, precision);
      const again = valueAt(candidate.node, precision + 20);
      return got.isFinite() && got.minus(size).abs().lte(tolerance) && got.minus(again).abs().lte(tolerance.div(100));
    };
    const found = [];
    for (const candidate of multiples(size, digits, precision))
      if ((candidate.plain === true || candidate.cost <= digits - PLAIN_MARGIN) && matches(candidate))
        found.push(candidate);
    const earned = (candidate) => candidate.cost <= digits - MARGIN && matches(candidate);
    if (towers && digits >= 12) {
      for (const candidate of sums(size, digits, precision))
        if (earned(candidate))
          found.push(candidate);
    }
    if (digits >= 15) {
      const product = products(size, digits, precision);
      if (product !== void 0 && earned(product))
        found.push(product);
    }
    if (digits >= 30) {
      const product = products(size, digits, precision, SPECIAL_PRODUCT_BASES);
      if (product !== void 0 && earned(product))
        found.push(product);
    }
    if (towers && digits >= 12 && found.length === 0) {
      for (const candidate of towersOf(size, tolerance, precision))
        if (earned(candidate))
          found.push(candidate);
    }
    if (found.length === 0)
      return void 0;
    const best = found.reduce((a, b) => b.cost < a.cost ? b : a);
    return sign3 < 0 ? { ...best, node: negative2(best.node) } : best;
  }
  function atoms() {
    const pi = id3("pi");
    const e = id3("e");
    const list2 = [
      { node: number2(1), cost: 0 }
    ];
    list2.push({ node: pi, cost: 1 });
    for (const k of [2, 3])
      list2.push({ node: power2(pi, number2(k)), cost: 1.5 });
    for (const k of [1, 2])
      list2.push({
        node: divide(number2(1), k === 1 ? pi : power2(pi, number2(k))),
        cost: 1.5
      });
    list2.push({ node: e, cost: 1 });
    list2.push({ node: power2(e, number2(2)), cost: 1.5 });
    list2.push({ node: divide(number2(1), e), cost: 1.5 });
    for (const n of [2, 3, 5, 10])
      list2.push({ node: call("ln", number2(n)), cost: 1.5 });
    for (let n = 2; n <= 50; n++)
      if (isSquarefree(n))
        list2.push({ node: call("sqrt", number2(n)), cost: 1 + log102(n) / 2 });
    for (const n of [2, 3, 5, 6, 10])
      list2.push({ node: multiply(pi, call("sqrt", number2(n))), cost: 2 });
    for (const { symbol } of SPECIAL_CONSTANTS) {
      list2.push({ node: id3(symbol), cost: 1.5, special: true });
      list2.push({ node: divide(number2(1), id3(symbol)), cost: 2, special: true });
    }
    return list2;
  }
  function isSquarefree(n) {
    for (let d = 2; d * d <= n; d++)
      if (n % (d * d) === 0)
        return false;
    return true;
  }
  var ATOMS = atoms();
  function* multiples(size, digits, precision) {
    for (const atom of ATOMS) {
      const plain = atom.cost === 0;
      if (!plain && digits < DIGITS_FOR_IRRATIONAL)
        continue;
      if (atom.special === true && digits < DIGITS_FOR_SPECIAL)
        continue;
      const base2 = valueOf(atom.node, precision);
      const ratio = bestRational(size.div(base2), digits);
      if (ratio === void 0 || isZero(ratio))
        continue;
      const top = ratio.n === 1n ? atom.node : multiply(number2(Number(ratio.n)), atom.node);
      const scaled2 = plain ? rationalNode2(ratio) : ratio.d === 1n ? top : divide(top, number2(Number(ratio.d)));
      yield {
        node: scaled2,
        cost: log102(ratio.n) + log102(ratio.d) + atom.cost,
        plain
      };
    }
  }
  function bestRational(value, digits) {
    if (!value.isFinite())
      return void 0;
    const D = decimalContext(Math.max(60, 2 * digits + 30));
    let x = new D(value.abs());
    const enough = new D(10).pow(-digits - 2);
    let [p0, p1] = [0n, 1n];
    let [q0, q1] = [1n, 0n];
    for (let i = 0; i < 60; i++) {
      const whole = x.floor();
      if (whole.gt(1e15))
        break;
      const a = BigInt(whole.toFixed(0));
      const [p, q] = [a * p1 + p0, a * q1 + q0];
      if (q > MAX_DENOMINATOR)
        break;
      [p0, p1] = [p1, p];
      [q0, q1] = [q1, q];
      const remainder = x.minus(whole);
      if (remainder.lt(enough))
        break;
      x = new D(1).div(remainder);
    }
    if (q1 === 0n)
      return void 0;
    return rational(value.isNegative() ? -p1 : p1, q1);
  }
  function sumBases(digits) {
    const pi = id3("pi");
    const e = id3("e");
    const one2 = number2(1);
    const root2 = (n) => call("sqrt", number2(n));
    const bases = [
      ...[2, 3, 5, 6, 7].map((n) => [one2, root2(n)]),
      [one2, pi],
      [one2, power2(pi, number2(2))],
      [one2, e],
      [one2, call("ln", number2(2))],
      [one2, call("ln", number2(3))],
      [pi, power2(pi, number2(2))]
    ];
    if (digits >= 20) {
      bases.push(
        [one2, root2(2), root2(3)],
        [one2, pi, power2(pi, number2(2))],
        [one2, e, power2(e, number2(2))],
        [one2, pi, e]
      );
      for (const { symbol } of SPECIAL_CONSTANTS)
        bases.push([one2, id3(symbol)]);
      bases.push(
        [one2, id3("gamma"), call("ln", number2(2))],
        [one2, id3("gamma"), power2(pi, number2(2))],
        [one2, id3("zeta_3"), power2(pi, number2(3))],
        [one2, id3("G_c"), pi]
      );
    }
    return bases;
  }
  function* sums(size, digits, precision) {
    for (const basis of sumBases(digits)) {
      const values = basis.map((node) => valueOf(node, precision));
      const relation = integerRelation([size, ...values], {
        digits: Math.min(digits, PSLQ_DIGITS),
        maxCoefficient: 10 ** Math.min(6, digits - MARGIN)
      });
      if (relation === void 0 || relation[0] === 0n)
        continue;
      const [a0, ...rest] = relation;
      const used = rest.filter((a) => a !== 0n).length;
      if (used < 2)
        continue;
      yield {
        node: sumNode(a0, rest, basis),
        cost: relation.reduce((total, a) => total + log102(a), 0) + used
      };
    }
  }
  function sumNode(a0, rest, basis) {
    const gcd6 = (a, b) => b === 0n ? a : gcd6(b, a % b);
    const abs2 = (a) => a < 0n ? -a : a;
    let divisor = a0;
    let top = rest.map((a) => -a);
    const common = top.reduce((g, a) => gcd6(g, abs2(a)), abs2(divisor));
    divisor /= common;
    top = top.map((a) => a / common);
    const isOne3 = (n) => n.type === "Constant" && n.value === 1;
    const order = basis.map((node, i) => ({ node, coefficient: top[i] })).filter((t) => t.coefficient !== 0n).sort((a, b) => Number(isOne3(b.node)) - Number(isOne3(a.node)));
    const termOf = (coefficient, node) => isOne3(node) ? number2(Number(abs2(coefficient))) : abs2(coefficient) === 1n ? node : multiply(number2(Number(abs2(coefficient))), node);
    const join3 = (terms) => terms.reduce((total, { node, coefficient }) => {
      const term2 = termOf(coefficient, node);
      if (total === void 0)
        return coefficient < 0n ? negative2(term2) : term2;
      return coefficient < 0n ? subtract(total, term2) : add(total, term2);
    }, void 0);
    const whole = order.filter(
      (t) => divisor !== 1n && t.coefficient % divisor === 0n
    );
    if (whole.length > 0 && whole.length < order.length) {
      const front = join3(
        whole.map((t) => ({ ...t, coefficient: t.coefficient / divisor }))
      );
      const others = join3(order.filter((t) => !whole.includes(t)));
      if (front !== void 0 && others !== void 0) {
        const fraction = divide(
          others.type === "Negative" ? others.arg : others,
          number2(Number(divisor))
        );
        return others.type === "Negative" ? subtract(front, fraction) : add(front, fraction);
      }
    }
    const numerator = join3(order) ?? number2(0);
    return divisor === 1n ? numerator : divide(numerator, number2(Number(divisor)));
  }
  var PRODUCT_BASES = [
    { node: id3("pi") },
    { node: id3("e") },
    { node: number2(2), prime: 2n },
    { node: number2(3), prime: 3n },
    { node: number2(5), prime: 5n },
    { node: number2(7), prime: 7n }
  ];
  var SPECIAL_PRODUCT_BASES = [
    ...PRODUCT_BASES,
    ...SPECIAL_CONSTANTS.map(({ symbol }) => ({ node: id3(symbol) }))
  ];
  function products(size, digits, precision, bases = PRODUCT_BASES) {
    const D = decimalContext(precision);
    const logs = bases.map(
      ({ node }) => node.type === "Identifier" && node.symbol === "e" ? new D(1) : D.ln(valueOf(node, precision))
    );
    const relation = integerRelation([D.ln(size), ...logs], {
      digits: Math.min(digits - 1, PSLQ_DIGITS),
      maxCoefficient: 10 ** Math.min(4, (digits - MARGIN) / 2)
    });
    if (relation === void 0 || relation[0] === 0n)
      return void 0;
    const [a0, ...rest] = relation;
    const exponents = rest.map((a) => rational(-a, a0));
    const used = exponents.filter((q) => !isZero(q));
    if (used.length === 0)
      return void 0;
    if (used.length === 1 && isOne(isNegative(used[0]) ? negate(used[0]) : used[0]))
      return void 0;
    return {
      node: productNode(exponents, bases),
      cost: relation.reduce((total, a) => total + log102(a), 0) + used.length
    };
  }
  function productNode(exponents, bases = PRODUCT_BASES) {
    const above = [];
    const below = [];
    let coefficient = ONE;
    let rootAbove = 1n;
    let rootBelow = 1n;
    exponents.forEach((q, i) => {
      if (isZero(q))
        return;
      const { node, prime } = bases[i];
      const side = isNegative(q) ? below : above;
      const size = isNegative(q) ? negate(q) : q;
      if (prime === void 0) {
        side.push(
          equals(size, ONE) ? node : equals(size, rational(1n, 2n)) ? call("sqrt", node) : power2(node, rationalNode2(size))
        );
        return;
      }
      const whole = size.n / size.d;
      const part = subtract3(size, rational(whole));
      const raised2 = rational(prime ** whole);
      coefficient = isNegative(q) ? divide5(coefficient, raised2) : multiply3(coefficient, raised2);
      if (isZero(part))
        return;
      if (equals(part, rational(1n, 2n))) {
        if (isNegative(q))
          rootBelow *= prime;
        else
          rootAbove *= prime;
        return;
      }
      side.push(power2(node, rationalNode2(part)));
    });
    if (coefficient.n !== 1n)
      above.unshift(number2(Number(coefficient.n)));
    if (coefficient.d !== 1n)
      below.unshift(number2(Number(coefficient.d)));
    if (rootAbove !== 1n)
      above.push(call("sqrt", number2(Number(rootAbove))));
    if (rootBelow !== 1n)
      below.push(call("sqrt", number2(Number(rootBelow))));
    const product = (list2) => list2.length === 0 ? number2(1) : list2.reduce((t, f) => multiply(t, f));
    return below.length === 0 ? product(above) : divide(product(above), product(below));
  }
  function* towersOf(size, tolerance, precision) {
    const D = decimalContext(precision);
    const logOfValue = D.ln(size);
    for (const base2 of [id3("pi"), id3("e"), number2(2), number2(3), number2(10)]) {
      const logOfBase = D.ln(valueOf(base2, precision));
      const exponent2 = logOfValue.div(logOfBase);
      if (exponent2.abs().lt("1e-6"))
        continue;
      const exponentTolerance = tolerance.div(size).div(logOfBase.abs());
      const exponentDigits = Math.floor(
        exponent2.abs().div(exponentTolerance).log(10).toNumber()
      );
      if (exponentDigits < 10)
        continue;
      const inner = identify(
        exponent2,
        exponentTolerance,
        exponentDigits,
        precision,
        false
      );
      if (inner === void 0)
        continue;
      if (isRational(inner.node))
        continue;
      yield { node: power2(base2, inner.node), cost: inner.cost + 1.5 };
    }
  }
  function isRational(node) {
    if (node.type === "Constant")
      return true;
    if (node.type === "Negative")
      return isRational(node.arg);
    return node.type === "BinaryOperator" && node.name === "Divide" && isRational(node.left) && isRational(node.right);
  }
  var cache2 = /* @__PURE__ */ new Map();
  function valueOf(node, precision) {
    const key = `${precision} ${JSON.stringify(node)}`;
    let value = cache2.get(key);
    if (value === void 0) {
      value = valueAt(node, precision);
      cache2.set(key, value);
    }
    return value;
  }
  function valueAt(node, precision) {
    return evaluatePrecise(node, specialBindings(precision), precision);
  }

  // src/field-rendering/identifiers.ts
  var IDENTIFIER_SOURCE = String.raw`[A-Za-z](?:_(?:\{[A-Za-z0-9]*\}|[A-Za-z0-9]))?`;
  var IDENTIFIER_AT_START = new RegExp(`^${IDENTIFIER_SOURCE}`);
  var COMMAND_AT_START = /^\\([A-Za-z]+)/;
  var canonicalIdentifier = (name) => name.replace(/_\{([A-Za-z0-9]*)\}/, "_$1");
  function skipBraceGroup(latex, open) {
    let depth2 = 0;
    for (let i = open; i < latex.length; i++) {
      if (latex[i] === "{")
        depth2++;
      else if (latex[i] === "}") {
        depth2--;
        if (depth2 === 0)
          return i + 1;
      }
    }
    return open;
  }
  function scanIdentifiers(latex) {
    const found = [];
    let i = 0;
    while (i < latex.length) {
      if (latex[i] === "\\") {
        const command = COMMAND_AT_START.exec(latex.slice(i));
        if (command === null) {
          i += 2;
          continue;
        }
        i += command[0].length;
        if (command[1] === "operatorname" && latex[i] === "{") {
          i = skipBraceGroup(latex, i);
        }
        continue;
      }
      if (/[A-Za-z]/.test(latex[i])) {
        const [text3] = IDENTIFIER_AT_START.exec(latex.slice(i));
        found.push({
          name: canonicalIdentifier(text3),
          start: i,
          end: i + text3.length
        });
        i += text3.length;
        continue;
      }
      i++;
    }
    return found;
  }
  function renameIdentifier(latex, from, to) {
    const wanted = canonicalIdentifier(from);
    const occurrences = scanIdentifiers(latex).filter(
      (found) => found.name === wanted
    );
    if (occurrences.length === 0)
      return latex;
    let out = "";
    let cursor2 = 0;
    for (const occurrence of occurrences) {
      out += latex.slice(cursor2, occurrence.start) + to;
      cursor2 = occurrence.end;
    }
    return out + latex.slice(cursor2);
  }

  // docs/mockups/calculus-tab/engine.ts
  var cfg;
  function init(Desmos, calc) {
    cfg = buildConfigFromGlobals(Desmos, calc);
  }
  var emit = (node) => toLatex(cfg, node);
  var NAME = String.raw`(?:[a-zA-Z]|\\[a-zA-Z]+)(?:_\{[a-zA-Z0-9]+\}|_[a-zA-Z0-9])?`;
  function canonical(latexName) {
    try {
      const node = parseLatex(cfg, latexName);
      return node.type === "Identifier" ? node.symbol : void 0;
    } catch {
      return void 0;
    }
  }
  function readGraph(latexList) {
    const constants = /* @__PURE__ */ new Map();
    const functions = /* @__PURE__ */ new Map();
    for (const latex of latexList) {
      const fn = new RegExp(
        String.raw`^(${NAME})\\left\((.+?)\\right\)=(.+)$`
      ).exec(latex);
      if (fn) {
        const name = canonical(fn[1]);
        const params = fn[2].split(",").map((p) => canonical(p.trim()));
        if (name && params.every((p) => p !== void 0)) {
          try {
            functions.set(name, {
              params,
              body: parseLatex(cfg, fn[3]),
              latex: fn[1]
            });
          } catch {
          }
        }
        continue;
      }
      const constant3 = new RegExp(String.raw`^(${NAME})=(.+)$`).exec(latex);
      if (constant3) {
        const name = canonical(constant3[1]);
        try {
          const value = evaluate(parseLatex(cfg, constant3[2]), {});
          if (name && Number.isFinite(value))
            constants.set(name, { value, latex: constant3[1] });
        } catch {
        }
      }
    }
    return { constants, functions };
  }
  function substitute(node, values, functions, depth2 = 0) {
    if (depth2 > 20)
      throw new Error("A graph function refers to itself.");
    const walk = (value) => {
      if (Array.isArray(value))
        return value.map(walk);
      if (value === null || typeof value !== "object")
        return value;
      const n = value;
      if (n.type === "Identifier" && values.has(n.symbol))
        return values.get(n.symbol);
      if (n.type === "FunctionCall" && n.callee.type === "Identifier" && functions.has(n.callee.symbol)) {
        const fn = functions.get(n.callee.symbol);
        const args = n.args.map((a) => walk(a));
        if (args.length === fn.params.length) {
          const bound = new Map(values);
          fn.params.forEach((p, i) => bound.set(p, args[i]));
          return substitute(fn.body, bound, functions, depth2 + 1);
        }
      }
      const out = {};
      for (const [k, v] of Object.entries(n))
        out[k] = walk(v);
      return out;
    };
    return walk(node);
  }
  var OPERATION_LABELS = {
    derivative: "Differentiate",
    fractional: "Fractional derivative",
    integral: "Integrate",
    definite: "Definite integral",
    limit: "Limit",
    ode: "Solve the ODE",
    sum: "Sum the series",
    none: ""
  };
  function closing(s, open) {
    let depth2 = 0;
    for (let i = open; i < s.length; i++) {
      if (s[i] === "{")
        depth2++;
      else if (s[i] === "}" && --depth2 === 0)
        return i;
    }
    return -1;
  }
  function group3(s, i) {
    if (s[i] === "{") {
      const end = closing(s, i);
      return { text: s.slice(i + 1, end), end: end + 1 };
    }
    return { text: s[i] ?? "", end: i + 1 };
  }
  function derivativeHead(s) {
    const opening = String.raw`\frac{d`;
    if (!s.startsWith(opening))
      return void 0;
    let i = opening.length;
    let order = "";
    if (s[i] === "^") {
      const g = group3(s, i + 1);
      order = g.text.trim();
      i = g.end;
    }
    if (s[i] !== "}" || s[i + 1] !== "{" || s[i + 2] !== "d")
      return void 0;
    const below = closing(s, i + 1);
    if (below < 0)
      return void 0;
    const inside = s.slice(i + 3, below);
    const hat = inside.indexOf("^");
    const binder = (hat < 0 ? inside : inside.slice(0, hat)).trim();
    if (binder === "")
      return void 0;
    return { order, binder, body: s.slice(below + 1) };
  }
  function readRequest(raw) {
    const s = raw.replace(/\\ /g, " ").trim();
    const head = derivativeHead(s);
    if (head !== void 0) {
      const whole = head.order === "" || /^\d+$/.test(head.order);
      return whole ? {
        operation: "derivative",
        order: head.order === "" ? 1 : Number(head.order),
        binder: head.binder,
        bodyLatex: head.body
      } : {
        operation: "fractional",
        orderLatex: head.order,
        binder: head.binder,
        bodyLatex: head.body
      };
    }
    if (s.startsWith("\\int")) {
      let i = 4;
      let lower;
      let upper;
      if (s[i] === "_") {
        const g = group3(s, i + 1);
        lower = g.text;
        i = g.end;
      }
      if (s[i] === "^") {
        const g = group3(s, i + 1);
        upper = g.text;
        i = g.end;
      }
      const rest = s.slice(i);
      const d = new RegExp(String.raw`d(${NAME})\s*$`).exec(rest);
      const blank = (b) => b === void 0 || b.trim() === "";
      if (blank(lower) && blank(upper))
        lower = upper = void 0;
      return {
        operation: lower !== void 0 ? "definite" : "integral",
        binder: d?.[1],
        bodyLatex: d ? rest.slice(0, d.index) : rest,
        lowerLatex: lower,
        upperLatex: upper
      };
    }
    let m = /^\\(?:lim|operatorname\{lim\})_\{/.exec(s);
    if (m) {
      const g = group3(s, m[0].length - 1);
      const arrow = /^(.+?)\\(?:to|rightarrow)(.+)$/.exec(g.text);
      let point = arrow?.[2].trim() ?? "";
      let side = "both";
      const sided = /^(.+)\^\{?([+-])\}?$/.exec(point);
      if (sided) {
        point = sided[1];
        side = sided[2] === "+" ? "right" : "left";
      }
      return {
        operation: "limit",
        binder: arrow?.[1].trim(),
        pointLatex: point,
        side,
        bodyLatex: s.slice(g.end)
      };
    }
    m = /^\\sum_\{([^=}]+)=([^}]*)\}\^/.exec(s);
    if (m) {
      const g = group3(s, m[0].length);
      return {
        operation: "sum",
        binder: m[1].trim(),
        lowerLatex: m[2],
        upperLatex: g.text,
        bodyLatex: s.slice(g.end)
      };
    }
    m = new RegExp(String.raw`^(${NAME})('{1,2})=(.+)$`).exec(s);
    if (m)
      return {
        operation: "ode",
        dependent: m[1],
        order: m[2].length,
        bodyLatex: m[3]
      };
    m = new RegExp(String.raw`^\\frac\{d(${NAME})\}\{d(${NAME})\}=(.+)$`).exec(s);
    if (m)
      return {
        operation: "ode",
        dependent: m[1],
        binder: m[2],
        order: 1,
        bodyLatex: m[3]
      };
    return { operation: "none", bodyLatex: s };
  }
  var SPECIAL = /* @__PURE__ */ new Set(["pi", "e", "tau", "infty"]);
  var GREEK = new Set(
    "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega Gamma Delta Theta Lambda Xi Pi Sigma Upsilon Phi Psi Omega varphi vartheta".split(
      " "
    )
  );
  function latexOfName(name) {
    const at2 = name.indexOf("_");
    const base2 = at2 < 0 ? name : name.slice(0, at2);
    const head = GREEK.has(base2) ? `\\${base2}` : base2;
    return at2 < 0 ? head : `${head}_{${name.slice(at2 + 1)}}`;
  }
  function readBound(latex) {
    const t = latex.trim().replace(/\\left|\\right/g, "");
    if (/^\+?\\infty$/.test(t))
      return { kind: "infinite", sign: 1 };
    if (/^-\\infty$/.test(t))
      return { kind: "infinite", sign: -1 };
    try {
      const node = parseLatex(cfg, latex);
      const value = evaluate(node, {});
      return Number.isFinite(value) ? { kind: "finite", node, value } : void 0;
    } catch {
      return void 0;
    }
  }
  var limitLatex = (l) => l.kind === "infinite" ? l.sign > 0 ? "\\infty" : "-\\infty" : emit(tidySigns(toNode(l.value)));
  var limitDecimal = (l) => l.kind === "finite" ? fmt(toNumber2(l.value)) : void 0;
  function fmt(x) {
    if (!Number.isFinite(x))
      return String(x);
    return Number(x.toPrecision(15)).toString();
  }
  function analyze(latex, defs, options) {
    const base2 = {
      status: "empty",
      operation: "none",
      summary: "",
      candidates: [],
      sliders: [],
      inlined: [],
      parameters: []
    };
    if (latex.trim() === "")
      return base2;
    const request = readRequest(latex);
    let operation = request.operation;
    if (operation === "none" && options.operation)
      operation = options.operation;
    base2.operation = operation;
    let body;
    try {
      body = parseLatex(
        cfg,
        operation === "ode" && request.order === 2 ? resolvePrimes(request.bodyLatex, request.dependent) : request.bodyLatex
      );
    } catch {
      return {
        ...base2,
        status: "error",
        error: "This doesn't read as maths yet."
      };
    }
    const used = identifiersIn(body);
    const calls = /* @__PURE__ */ new Set();
    const collectCalls = (value) => {
      if (Array.isArray(value))
        return value.forEach(collectCalls);
      if (value === null || typeof value !== "object")
        return;
      const n = value;
      if (n.type === "FunctionCall" && n.callee.type === "Identifier")
        calls.add(n.callee.symbol);
      Object.values(n).forEach(collectCalls);
    };
    collectCalls(body);
    base2.inlined = [...calls].filter((c) => defs.functions.has(c)).map((c) => defs.functions.get(c).latex);
    const binderName = request.binder !== void 0 ? canonical(request.binder) : void 0;
    const dependentName = request.dependent !== void 0 ? canonical(request.dependent) : void 0;
    base2.sliders = used.filter((n) => defs.constants.has(n) && n !== binderName).map((n) => ({ name: n, ...defs.constants.get(n) }));
    const values = /* @__PURE__ */ new Map();
    if (options.useSliderValues)
      for (const s of base2.sliders)
        values.set(s.name, augBuilders_exports.number(s.value));
    try {
      body = substitute(body, values, defs.functions);
    } catch (error2) {
      return { ...base2, status: "error", error: String(error2) };
    }
    const plain = /* @__PURE__ */ new Set();
    const sortNames = (value) => {
      if (Array.isArray(value))
        return value.forEach(sortNames);
      if (value === null || typeof value !== "object")
        return;
      const n = value;
      if (n.type === "Identifier")
        plain.add(n.symbol);
      if (n.type === "FunctionCall")
        return sortNames(n.args);
      Object.values(n).forEach(sortNames);
    };
    sortNames(body);
    const free = identifiersIn(body).filter(
      (n) => plain.has(n) && !SPECIAL.has(n) && !defs.constants.has(n) && !defs.functions.has(n) && n !== dependentName && !(operation === "ode" && n === "v")
    );
    base2.candidates = free.map((name) => ({ name, latex: latexOfName(name) }));
    let variable = options.variable ?? binderName;
    if (variable === void 0 && operation === "ode")
      variable = "x";
    if (variable === void 0 && free.length === 1)
      variable = free[0];
    if (variable === void 0 && operation === "none") {
      return {
        ...base2,
        status: "choose",
        summary: free.length === 0 ? "A constant. Pick what to do with it, or give it a variable." : "Pick what to do with this expression."
      };
    }
    if (variable === void 0) {
      return {
        ...base2,
        status: "choose",
        summary: `${OPERATION_LABELS[operation]} with respect to which letter?`
      };
    }
    base2.variable = variable;
    base2.variableLatex = latexOfName(variable);
    base2.parameters = free.filter((n) => n !== variable).map((n) => latexOfName(n));
    const v = base2.variableLatex;
    const treat = base2.parameters.length === 0 ? "" : ` Treating ${base2.parameters.map((p) => `\\(${p}\\)`).join(", ")} as constant${base2.parameters.length > 1 ? "s" : ""}.`;
    const sliderWords = base2.sliders.length === 0 ? "" : options.useSliderValues ? ` Using the slider value${base2.sliders.length > 1 ? "s" : ""} ${base2.sliders.map((s) => `\\(${s.latex}=${fmt(s.value)}\\)`).join(", ")}.` : ` Keeping the slider${base2.sliders.length > 1 ? "s" : ""} ${base2.sliders.map((s) => `\\(${s.latex}\\)`).join(", ")} as ${base2.sliders.length > 1 ? "symbols" : "a symbol"}.`;
    const inlinedWords = base2.inlined.length === 0 ? "" : ` Writing in the graph's ${base2.inlined.map((f) => `\\(${f}\\)`).join(", ")}.`;
    try {
      switch (operation) {
        case "derivative": {
          const n = request.order ?? 1;
          base2.summary = `Differentiate${n > 1 ? ` ${n} times` : ""} with respect to \\(${v}\\).${treat}${sliderWords}${inlinedWords}`;
          base2.answer = derivativeAnswer(body, variable, n, options.depth);
          break;
        }
        case "fractional": {
          const orderLatex = request.orderLatex ?? "";
          const order = readBound(orderLatex);
          if (order === void 0 || order.kind !== "finite")
            throw new Error(
              "The order has to be a number, such as \u03C0, 1/2 or \u22120.5."
            );
          const lowerLatex = options.lowerLatex?.trim() || "0";
          const lower = readBound(lowerLatex);
          const pointLatex = options.pointLatex?.trim() || "2";
          const point = readBound(pointLatex);
          if (lower?.kind !== "finite" || point?.kind !== "finite")
            throw new Error("The lower limit and the point have to be numbers.");
          const result = fractionalDerivatives({
            f: implicitProducts2(normsToAbs(body), variable),
            variable,
            variableLatex: v,
            order: order.value,
            orderLatex,
            lower: lower.value,
            lowerLatex,
            point: point.value,
            emit
          });
          base2.fractional = result;
          const what = result.kind === "integral" ? `The fractional integral of order \\(${orderLatex.replace(/^-/, "")}\\)` : `The derivative of order \\(${orderLatex}\\)`;
          base2.summary = `${what} with respect to \\(${v}\\), under every definition that gives a different answer, from \\(${lowerLatex}\\) and evaluated at \\(${v}=${pointLatex}\\).${treat}${sliderWords}${inlinedWords}`;
          const head = result.answers[0];
          base2.answer = {
            latex: head.latex,
            decimal: head.value === void 0 ? void 0 : fmt(head.value),
            verdict: "Proved",
            method: head.name,
            steps: [],
            notes: result.notes,
            graph: [
              ...head.definitions.map((d) => ({ latex: d })),
              ...head.graphLatex ? [{ latex: `y=${head.graphLatex}` }] : []
            ]
          };
          break;
        }
        case "integral":
          base2.summary = `Integrate with respect to \\(${v}\\).${treat}${sliderWords}${inlinedWords}`;
          base2.answer = integralAnswer(body, variable, options);
          break;
        case "definite": {
          const lo = request.lowerLatex ?? options.lowerLatex ?? "";
          const hi = request.upperLatex ?? options.upperLatex ?? "";
          base2.summary = `Integrate with respect to \\(${v}\\) from \\(${lo || "?"}\\) to \\(${hi || "?"}\\).${treat}${sliderWords}${inlinedWords}`;
          base2.answer = definiteAnswer(body, variable, lo, hi);
          break;
        }
        case "limit": {
          const point = request.pointLatex ?? options.pointLatex ?? "";
          const side = request.side ?? "both";
          const sideWords = side === "both" ? "" : side === "right" ? " from the right" : " from the left";
          base2.summary = `The limit as \\(${v}\\to ${point || "?"}\\)${sideWords}.${treat}${sliderWords}${inlinedWords}`;
          base2.answer = limitAnswer(body, variable, point, side);
          break;
        }
        case "ode": {
          const dep = request.dependent ?? "y";
          base2.summary = `Solve the ${request.order === 2 ? "second" : "first"}-order equation for \\(${dep}\\) as a function of \\(${v}\\).${treat}${sliderWords}`;
          base2.answer = odeAnswer(request, variable);
          break;
        }
        case "sum": {
          base2.summary = `Sum over \\(${v}\\) from \\(${request.lowerLatex}\\) to \\(${request.upperLatex}\\).${treat}${sliderWords}`;
          base2.answer = sumAnswer(body, variable, request);
          break;
        }
        case "none":
          return {
            ...base2,
            status: "choose",
            summary: `Pick what to do with this expression in \\(${v}\\).`
          };
      }
    } catch (error2) {
      return {
        ...base2,
        status: "error",
        error: error2 instanceof Error ? error2.message : String(error2)
      };
    }
    return { ...base2, status: "ok" };
  }
  function derivativeAnswer(body, variable, order, depth2) {
    let tree = implicitProducts2(body, variable);
    const steps = [];
    for (let k = 0; k < order; k++) {
      const d = differentiate2(cfg, tree, variable);
      if (k === 0 && depth2 !== "simple") {
        for (const { step, depth: level } of stepsOf(d.root)) {
          if (depth2 === "standard" && step.importance !== "major")
            continue;
          steps.push({
            title: step.title,
            detail: step.recognition + (step.detail ? ` ${step.detail}` : ""),
            latex: step.intermediate ? emit(step.intermediate) : void 0,
            depth: level
          });
        }
      }
      tree = d.result;
    }
    const result = emit(tree);
    const shorter = condense(tree);
    const factored = emit(shorter.node);
    return {
      latex: result,
      verdict: "Proved",
      method: order > 1 ? `The differentiation rules, applied ${order} times.` : "The differentiation rules, each step one rule.",
      steps,
      notes: shorter.notes.length > 0 && factored !== result ? [`Also: \\(${factored}\\)`] : [],
      graph: [{ latex: `y=${result}` }]
    };
  }
  function checkAntiderivative(F, f, variable) {
    return agreesOnSamples(
      (b) => (evaluate(F, { ...b, [variable]: b[variable] + 1e-5 }) - evaluate(F, { ...b, [variable]: b[variable] - 1e-5 })) / 2e-5,
      (b) => evaluate(f, b),
      [0.31, 0.77, 1.4, 2.3, 3.7, -0.6].map((x) => ({
        [variable]: x,
        ...Object.fromEntries(
          identifiersIn(f).filter((n) => n !== variable && !SPECIAL.has(n)).map((n, i) => [n, 1.3 + 0.4 * i])
        )
      })),
      1e-3
    );
  }
  function integralAnswer(body, variable, options) {
    const integrand = normsToAbs(implicitProducts2(body, variable));
    try {
      const found = integrateWithMethod(integrand, variable);
      const constant3 = freshName(integrand, ["C", "K", "D"]);
      const latex = emit(add(found.value, id3(constant3)));
      const checked = checkAntiderivative(found.value, integrand, variable);
      return {
        latex,
        verdict: checked ? "Proved, checked by differentiating back" : "Checked numerically, not proved",
        method: describeMethod(found.techniques),
        steps: [],
        notes: [],
        graph: [{ latex: `y=${latex}`, slider: `${constant3}=0` }]
      };
    } catch (error2) {
      if (!(error2 instanceof IntegrationError))
        throw error2;
      const special2 = error2 instanceof NonElementaryError ? error2.special : "";
      const named2 = specialAntiderivative(integrand, variable, (term2) => {
        try {
          return integrateWithMethod(term2, variable).value;
        } catch {
          return void 0;
        }
      });
      if (named2 !== void 0 && checkAntiderivative(named2.value, integrand, variable)) {
        const constant3 = freshName(integrand, ["C", "K", "D"]);
        const latex = emit(add(named2.value, id3(constant3)));
        const definitions = desmosDefinitions(named2.uses);
        return {
          latex,
          verdict: "Proved, checked by differentiating back",
          method: `No elementary antiderivative${special2 ? ` (${special2})` : ""}, so it is written with ${named2.uses.map((u) => specialFunction(u)?.name ?? u).join(" and ")}.`,
          steps: [],
          notes: named2.uses.map((u) => specialFunction(u)).filter((f) => f?.domain !== void 0).map((f) => `${f.name}: defined in Desmos for ${f.domain}.`),
          graph: [
            ...definitions.map((d) => ({ latex: d })),
            { latex: `y=${latex}`, slider: `${constant3}=0` }
          ]
        };
      }
      const series = seriesFallback(integrand, variable, options.seriesTerms);
      if (series === void 0)
        return {
          latex: "",
          verdict: "Not decided",
          method: error2.message,
          steps: [],
          notes: [],
          graph: []
        };
      const partial = emit(series.partial);
      const sum3 = emit(series.sum);
      return {
        latex: `${partial}+C`,
        verdict: "Series answer",
        method: (special2 ? `No elementary antiderivative (${special2}). ` : "No closed form found. ") + "Integrated term by term as an infinite series instead.",
        steps: series.term ? [
          {
            title: "General term",
            detail: "Each term of the series, before summing:",
            latex: emit(series.term),
            depth: 0
          }
        ] : [],
        notes: [
          // The engine words the interval in x whatever the variable was.
          `Converges ${series.interval.replace(/\bx\b/g, `\\(${latexOfName(variable)}\\)`)}.`,
          series.order ? `Shown to ${options.seriesTerms} terms; exact below \\(${latexOfName(variable)}^{${series.order}}\\).` : `Shown to ${options.seriesTerms} terms.`
        ],
        graph: [{ latex: `y=${sum3}` }]
      };
    }
  }
  function definiteAnswer(body, variable, lowerLatex, upperLatex) {
    const lower = readBound(lowerLatex);
    const upper = readBound(upperLatex);
    if (!lower || !upper)
      throw new Error(
        "Each bound has to be a number, an expression in numbers, or \u221E."
      );
    const integrand = normsToAbs(implicitProducts2(body, variable));
    const statement = `\\int_{${lowerLatex}}^{${upperLatex}}`;
    try {
      const F = integrateWithMethod(integrand, variable);
      const result = definiteIntegral(integrand, F.value, variable, lower, upper);
      if (result.diverges !== void 0)
        return {
          latex: result.diverges === 0 ? "" : result.diverges > 0 ? "\\infty" : "-\\infty",
          verdict: "Proved",
          method: result.diverges === 0 ? "The integral diverges, to different infinities on either side of a point inside the interval." : "The integral diverges.",
          steps: [],
          notes: [],
          graph: []
        };
      const latex = result.exact ? emit(toNode(result.exact)) : fmt(result.value);
      return {
        latex,
        decimal: fmt(result.value),
        verdict: "Proved",
        method: `Antiderivative by ${describeMethod(F.techniques).toLowerCase()}, then F(upper) \u2212 F(lower)${result.improper ? ", as a limit at an improper bound" : ""}.`,
        steps: [
          {
            title: "Antiderivative",
            detail: "",
            latex: emit(F.value),
            depth: 0
          }
        ],
        notes: [],
        graph: [
          { latex: `${statement}${emit(integrand)}d${latexOfName(variable)}` }
        ]
      };
    } catch (error2) {
      if (!(error2 instanceof IntegrationError) && !(error2 instanceof DefiniteError))
        throw error2;
      const cut = absoluteDefinite(integrand, variable, lower, upper);
      if (cut?.exact !== void 0)
        return {
          latex: emit(toNode(cut.exact)),
          decimal: fmt(cut.value),
          verdict: "Proved",
          method: "The absolute value has no single antiderivative, so the interval was cut where what is inside it changes sign, and each piece integrated exactly.",
          steps: [],
          notes: [],
          graph: [
            { latex: `${statement}${emit(integrand)}d${latexOfName(variable)}` }
          ]
        };
      const theorem = theoremDefinite(integrand, variable, lower, upper);
      if (theorem !== void 0)
        return {
          latex: emit(toNode(theorem.exact)),
          decimal: fmt(theorem.value),
          verdict: theorem.proved ? "Proved" : "Checked numerically, not proved",
          method: `No antiderivative to evaluate. ${theorem.method}`,
          steps: [],
          notes: theorem.proved ? [] : [
            "The exact form is right if the identity it rests on holds everywhere; that was checked at sample points."
          ],
          graph: [
            { latex: `${statement}${emit(integrand)}d${latexOfName(variable)}` }
          ]
        };
      const refuse = (why) => ({
        latex: "",
        verdict: "Not decided",
        method: `${error2.message} ${why}`,
        steps: [],
        notes: [],
        graph: []
      });
      const a = lower.kind === "finite" ? lower.value : lower.sign * Infinity;
      const b = upper.kind === "finite" ? upper.value : upper.sign * Infinity;
      if (interiorSingularity(
        (x) => evaluate(integrand, { [variable]: x }),
        Math.min(a, b),
        Math.max(a, b)
      ))
        return refuse(
          "There is a point inside the interval where the integrand has no value, so it was not integrated numerically."
        );
      let found;
      try {
        found = preciseIntegral(integrand, variable, lower, upper);
      } catch {
        found = void 0;
      }
      if (found === void 0 || !found.value.isFinite())
        return refuse(
          "Integrating numerically did not settle: it may diverge, or oscillate out to infinity in a way this cannot follow."
        );
      const value = found.value.toNumber();
      const digits = Math.min(found.digits, 30);
      const recognized = recognizeDecimal(
        found.value.toSignificantDigits(digits).toFixed()
      );
      return {
        latex: recognized ? emit(recognized.node) : fmt(value),
        decimal: fmt(value),
        verdict: "Checked numerically, not proved",
        method: `${error2 instanceof NonElementaryError ? `No elementary antiderivative (${error2.special}), so it` : "It"} was integrated numerically, to ${found.digits} digits.${recognized ? " The digits match the closed form shown." : ""}`,
        steps: [],
        notes: recognized ? [
          `Matches to ${recognized.digits} significant digits; a match is evidence, not a proof.`
        ] : [],
        graph: [
          { latex: `${statement}${emit(integrand)}d${latexOfName(variable)}` }
        ]
      };
    }
  }
  function limitAnswer(body, variable, pointLatex, side) {
    const at2 = readBound(pointLatex);
    if (!at2)
      throw new Error(
        "The point has to be a number, an expression in numbers, or \u221E."
      );
    const node = normsToAbs(implicitProducts2(body, variable));
    const found = findLimit(node, variable, at2, side);
    const a = found.answer;
    const base2 = { steps: [], notes: [], graph: [] };
    switch (a.kind) {
      case "value":
        return {
          ...base2,
          latex: limitLatex(a.limit),
          decimal: limitDecimal(a.limit),
          verdict: "Proved",
          method: describeLimitMethod(a.method)
        };
      case "one-side-only":
        return {
          ...base2,
          latex: limitLatex(a.limit),
          decimal: limitDecimal(a.limit),
          verdict: "Proved",
          method: `${describeLimitMethod(a.method)} Only the ${a.side > 0 ? "right" : "left"} side exists: ${a.missing}`
        };
      case "sides-differ":
        return {
          ...base2,
          latex: "\\text{does not exist}",
          verdict: "Proved",
          method: `The sides differ: from the left \\(${limitLatex(a.left)}\\), from the right \\(${limitLatex(a.right)}\\).`
        };
      case "oscillates":
        return {
          ...base2,
          latex: "\\text{does not exist}",
          verdict: "Proved",
          method: "It oscillates without settling."
        };
      case "no-approach":
        return { ...base2, latex: "", verdict: "Refused", method: a.reason };
      case "unknown":
        return {
          ...base2,
          latex: "",
          verdict: "Not decided",
          method: "None of the methods could decide it."
        };
    }
  }
  function odeAnswer(request, variable) {
    const dep = request.dependent ?? "y";
    const indep = latexOfName(variable);
    let rhs = request.bodyLatex;
    const ownNames = (latex2) => {
      let out = latex2;
      if (dep !== "y")
        out = renameIdentifier(out, dep, "y");
      if (indep !== "x")
        out = renameIdentifier(out, indep, "x");
      return out;
    };
    const theirNames = (latex2) => {
      let out = latex2;
      if (indep !== "x")
        out = renameIdentifier(out, "x", indep);
      if (dep !== "y")
        out = renameIdentifier(out, "y", dep);
      return out;
    };
    rhs = ownNames(rhs);
    const tree = parseLatex(cfg, request.order === 2 ? resolvePrimes(rhs) : rhs);
    const result = request.order === 2 ? solveSecondOrder(cfg, tree) : solveFirstOrder(cfg, tree);
    if (!result.ok)
      return {
        latex: "",
        verdict: "Not decided",
        method: result.error || "No method here solves it.",
        steps: [],
        notes: [],
        graph: []
      };
    const latex = theirNames(result.solution.latex);
    const sliders = ["C", "C_{1}", "C_{2}"].filter((c) => latex.includes(c));
    return {
      latex,
      verdict: "Proved",
      method: result.solution.method,
      steps: [],
      notes: [
        ...result.solution.explicit ? [] : ["An implicit solution: a relation, not an explicit formula."],
        ...indep === "x" && dep === "y" ? [] : [
          `Graphed as y against x, since Desmos's axes are x and y: \\(${dep}\\) is drawn as y and \\(${indep}\\) as x.`
        ]
      ],
      graph: [
        // Desmos plots y against x, so the graphed copy keeps the solver's names.
        { latex: result.solution.latex },
        ...sliders.map((c) => ({ latex: "", slider: `${c}=1` }))
      ]
    };
  }
  function wynn(s) {
    let prev = new Array(s.length + 1).fill(0);
    let cur = s.slice();
    let best = s[s.length - 1];
    for (let k = 1; cur.length > 1; k++) {
      const next = [];
      for (let i = 0; i + 1 < cur.length; i++) {
        const d = cur[i + 1] - cur[i];
        if (d === 0)
          return cur[i + 1];
        next.push(prev[i + 1] + 1 / d);
      }
      prev = cur;
      cur = next;
      if (k % 2 === 0 && cur.length > 0 && Number.isFinite(cur[cur.length - 1]))
        best = cur[cur.length - 1];
    }
    return best;
  }
  function richardson(values) {
    let table3 = values.slice();
    const estimates = [table3[table3.length - 1]];
    for (let k = 1; table3.length > 1; k++) {
      const factor = 2 ** k;
      table3 = table3.slice(1).map((v, i) => (factor * v - table3[i]) / (factor - 1));
      estimates.push(table3[table3.length - 1]);
    }
    return estimates;
  }
  function digitsAgreeing(a, b) {
    if (a === b)
      return 15;
    const rel = Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-300);
    return Math.max(0, Math.min(15, Math.floor(-Math.log10(rel))));
  }
  function sumAnswer(body, variable, request) {
    const r = preciseSum(
      body,
      variable,
      request.lowerLatex ?? "1",
      request.upperLatex ?? "\\infty"
    );
    if (r.status !== "ok")
      throw new Error(r.error);
    return {
      latex: r.closedLatex ?? r.rows[r.rows.length - 1]?.latex ?? "",
      verdict: r.closedLatex ? "Checked numerically, not proved" : "Not decided",
      method: r.verdict,
      steps: r.rows.map((row) => ({
        title: row.label,
        detail: row.note ?? "",
        latex: row.latex,
        depth: 0
      })),
      notes: [],
      graph: []
    };
  }
  function preciseSum(body, variable, lowerLatex, upperLatex) {
    const start = readBound(lowerLatex);
    if (!start || start.kind !== "finite" || !Number.isInteger(start.value))
      return {
        status: "error",
        error: "The sum has to start at a whole number.",
        rows: [],
        verdict: ""
      };
    const term2 = (n2) => evaluate(body, { [variable]: n2 });
    const rows = [];
    try {
      const tail = findLimit(
        normsToAbs(body),
        variable,
        { kind: "infinite", sign: 1 },
        "both"
      );
      const a = tail.answer;
      if (a.kind === "value" && (a.limit.kind === "infinite" || toNumber2(a.limit.value) !== 0) || a.kind === "oscillates")
        return {
          status: "ok",
          rows: [
            {
              label: "Terms",
              latex: `\\lim_{${latexOfName(variable)}\\to\\infty}a_{${latexOfName(variable)}}${a.kind === "value" ? `=${limitLatex(a.limit)}` : "\\text{ does not exist}"}`
            }
          ],
          verdict: "Diverges, proved: the terms do not go to 0 (the nth-term test)."
        };
    } catch {
    }
    const finite = readBound(upperLatex);
    if (finite && finite.kind === "finite") {
      let s2 = 0;
      for (let n2 = start.value; n2 <= finite.value && n2 - start.value < 1e7; n2++)
        s2 += term2(n2);
      const recognized2 = recognizeDecimal(s2.toPrecision(14));
      return {
        status: "ok",
        rows: [{ label: "Sum", latex: fmt(s2) }],
        verdict: "A finite sum, added up.",
        closedLatex: recognized2 ? emit(recognized2.node) : fmt(s2)
      };
    }
    const partials = [];
    let s = 0;
    let carry = 0;
    let n = start.value;
    for (let N = 64; N <= 2 ** 17; N *= 2) {
      for (; n < start.value + N; n++) {
        const y = term2(n) - carry;
        const t = s + y;
        carry = t - s - y;
        s = t;
      }
      partials.push(s);
    }
    if (!partials.every(Number.isFinite))
      return {
        status: "error",
        error: "A term is undefined.",
        rows: [],
        verdict: ""
      };
    const raw = partials[partials.length - 1];
    const rich = richardson(partials);
    const eps = wynn(partials.slice(-9));
    const richBest = rich[Math.min(rich.length - 1, 6)];
    const richPrev = rich[Math.min(rich.length - 2, 5)];
    const richAgree = digitsAgreeing(richBest, richPrev);
    const epsPrev = wynn(partials.slice(-10, -1));
    const epsAgree = digitsAgreeing(eps, epsPrev);
    const [estimate, agree, how] = epsAgree >= richAgree ? [eps, epsAgree, "Wynn's \u03B5 algorithm"] : [richBest, richAgree, "Richardson extrapolation"];
    rows.push({
      label: `Partial sum, ${(2 ** 17).toLocaleString()} terms`,
      latex: fmt(raw),
      note: `Agrees with the estimate to ${digitsAgreeing(raw, estimate)} digits.`
    });
    rows.push({
      label: "Accelerated estimate",
      latex: estimate.toPrecision(Math.max(4, agree)),
      note: `${how}; ${agree} digits stable between the last two estimates.`
    });
    const recognized = (
      // One digit fewer than looked stable, and never more than 12: an
      // accelerator's sense of its own error is optimistic, and double
      // precision runs out about there.
      agree >= 8 ? recognizeDecimal(estimate.toPrecision(Math.min(agree - 1, 12))) : void 0
    );
    return {
      status: "ok",
      rows,
      verdict: recognized ? `Appears to converge to the constant below: the estimate matches it to ${recognized.digits} digits. Numerical evidence, not a proof of either convergence or the value.` : agree >= 6 ? "Appears to converge, but the estimate matches no constant this search knows." : "The partial sums are not settling quickly enough to say.",
      closedLatex: recognized ? emit(recognized.node) : void 0
    };
  }
  function precise(latex, mode, defs) {
    if (latex.trim() === "")
      return { status: "empty", rows: [], verdict: "" };
    if (mode === "value") {
      let value;
      let text3 = latex.trim();
      try {
        value = evaluate(
          substitute(parseLatex(cfg, latex), /* @__PURE__ */ new Map(), defs.functions),
          {}
        );
        if (!/^-?[\d.]+$/.test(text3))
          text3 = value.toPrecision(15);
      } catch {
        return {
          status: "error",
          error: "This doesn't read as a number.",
          rows: [],
          verdict: ""
        };
      }
      const recognized = recognizeDecimal(text3);
      return {
        status: "ok",
        rows: [{ label: "Value", latex: text3 }],
        verdict: recognized ? `Matches the constant below to all ${recognized.digits} significant digits given (${recognized.spare} to spare beyond what the formula costs). That is evidence, not a proof: a lone decimal can't say what sequence it came from.` : "No constant this search knows matches all the digits given.",
        closedLatex: recognized ? emit(recognized.node) : void 0
      };
    }
    const request = readRequest(latex);
    if (request.operation !== "sum")
      return {
        status: "error",
        error: "Write a sum: \\sum_{n=1}^{\\infty}\u2026",
        rows: [],
        verdict: ""
      };
    let body;
    try {
      body = substitute(
        parseLatex(cfg, request.bodyLatex),
        /* @__PURE__ */ new Map(),
        defs.functions
      );
    } catch {
      return {
        status: "error",
        error: "The summand doesn't read as maths yet.",
        rows: [],
        verdict: ""
      };
    }
    const variable = canonical(request.binder ?? "n") ?? "n";
    return preciseSum(
      body,
      variable,
      request.lowerLatex ?? "1",
      request.upperLatex ?? "\\infty"
    );
  }
  return __toCommonJS(engine_exports);
})();
