var debugF = debug('aocmulti:component:filter-query')
  , get = Ember.get

// helpers
var getOffsetWithPrevElements = function (selectionContainer, extraOffset) {
  return selectionContainer.closest('span, div').prevAll().toArray().reduce(function (l, el) {
    return l + el.textContent.length
  }, extraOffset)
}
var makeSpan = function (tok) {
  return '<span class="tok-' + tok.type + '">' + tok.value + '</span>'
}
var preventEnter = function (e) {
  // no newlining.
  if (e.keyCode === 13) e.preventDefault()
}

App.FilterQueryComponent = Ember.Component.extend({
  lastText: ''
, showPlaceholder: true
, presets: [
    { name: 'Random Map', expr: 'AoC and RM' }
  , { name: 'Age of Heroes', expr: 'mod="Age of Heroes"' }
  , { name: 'Team Games', expr: 'TG' }
  ]

, didInsertElement: function () {
    var el = this.$('.filter-query')
    el.on('keypress', preventEnter)
    el.on('keyup', this.rehighlight.bind(this))
    
    var presets = this.$('.dropdown-menu ul')
    presets.on('click', function (e) {
      el.html($(e.target).closest('li').data('preset'))
      this.rehighlight(true)
    }.bind(this))
  }

  /**
   * Syntax highlights the input box while keeping the cursor position etc.
   * @param {?boolean} force Whether to force rehighlighting, even if the content hasn't changed.
   */
, rehighlight: function (force) {
    var el = this.$('.filter-query')
      , text = el.text()
      , startOffset
      , endOffset
    
    if (force !== true && text.trim() === this.lastText.trim()) {
      return
    }
    
    this.lastText = text
    
    // good grief this is ugly!
    // selections across elements are hard >.<
    var selection = document.getSelection()
      , range = selection.getRangeAt(0)
      , endC = $(range.endContainer)
      , startC = $(range.startContainer)
      , startOffset = getOffsetWithPrevElements(startC, range.startOffset)
      , endOffset = getOffsetWithPrevElements(endC, range.endOffset)

    var tokens = lex(text)
    el.html(tokens.map(makeSpan).join(''))
    
    if (endOffset !== 0 || startOffset !== 0) {
      selection.removeAllRanges()
      var children = el.children().toArray()
        // total offset from start of the query box
        , offs = 0
        , i , l, elCont
      range = document.createRange()
      for (i = 0, l = children.length; i < l; i++) {
        elCont = children[i]
        if (offs <= startOffset && offs + elCont.textContent.length >= startOffset) {
          range.setStart(elCont.firstChild, startOffset - offs)
        }
        if (offs <= endOffset && offs + elCont.textContent.length >= endOffset) {
          range.setEnd(elCont.firstChild, endOffset - offs)
          // done.
          break
        }
        offs += elCont.textContent.length
      }
      selection.addRange(range)
    }
  }  
})

function lex(src) {
  var c
    , i = 0
    , oldI = 0
    , tokens = []
    , match
    , prev
  
  var pushT = function (type, val) {
    prev = new Token(type, val)
    tokens.push(prev)
  }
  
  while (c = src.slice(i)) {
    oldI = i
    if (match = /^(&|and\b)/.exec(c)) {
      pushT('and', match[0])
      i += match[0].length
    }
    else if (match = /^(\||or\b)/.exec(c)) {
      pushT('or', match[0])
      i += match[0].length
    }
    else if (match = /^(\[|\(|\{)/.exec(c)) {
      pushT('parenOpen', match[0])
      i += 1
    }
    else if (match = /^(\]|\)|\})/.exec(c)) {
      pushT('parenClose', match[0])
      i += 1
    }
    else if (match = /^\s+/.exec(c)) {
      pushT('whitespace', match[0])
      i += match[0].length
    }
    else if (match = /^\d+(\.\d+)?(k?\+|x{1,3})?/.exec(c)) {
      pushT('num', match[0])
      i += match[0].length
    }
    else if (match = /^[a-zA-Z_][a-zA-Z_0-9\-]*(?=(=|\())/.exec(c)) {
      pushT('key', match[0])
      i += match[0].length
    }
    else if (match = /^(spectate|TG|RM|DM|aoc|aoh|alpha|yes|no)\b/i.exec(c)) {
      pushT('word', match[0])
      i += match[0].length
    }
    else if (match = /^[a-zA-Z_][a-zA-Z_0-9\-]*/.exec(c)) {
      pushT('player', match[0])
      i += match[0].length
    }
    else if (match = /^(=|>=?|<=?|!=|=?\/?=|≠)/.exec(c)) {
      pushT('compare', match[0])
      i += match[0].length
    }
    else if (match = /^(\-|\.\.\.?|…)/.exec(c)) {
      pushT('range', match[0])
      i += match[0].length
    }
    else {
      if (prev && prev.type === 'generic') {
        prev.value += c.charAt(0)
      }
      else {
        pushT('generic', c.charAt(0))
      }
      i += 1
    }
    if (oldI === i) {
      throw new Error('i unchanged at ' + src.slice(i - 10, 20) + ' with match ' + JSON.stringify(match))
    }
  }
  
  return tokens
}

function deflatten_(tokens, isSub, startOffset) {
  var deflattened = []
    , i, l, tok, sub
  for (i = 0, l = tokens.length; i < l; i++) {
    tok = tokens[i]
    if (tok.type === 'parenOpen') {
      sub = deflatten_(tokens.slice(i + 1), true, startOffset + i)
      deflattened.push(sub.def)
      i += sub.len
    }
    else if (tok.type === 'parenClose') {
      if (i < l && !isSub) {
        throw new Error('Mismatched ' + tok.value + ' at position ' + (startOffset + i))
      }
      return { def: deflattened, len: i + 1 }
    }
    else {
      deflattened.push(tok)
    }
  }
  return { def: deflattened, len: i }
}
function deflatten(tokens) {
  return deflatten_(tokens, false, 0).def
}

function indexOfType(tokens, type) {
  for (var i = 0, l = tokens.length; i< l; i++) {
    if (tokens[i].type === type) {
      return i
    }
  }
  return -1
}
function maybeList(match) {
  if (match.type === 'or') {
    return {
      type: 'list'
    , values: match
    }
  }
  return match
}
function parse(tokens) {
  var split
    , left, right
    , first = tokens[0]
  
  if ((split = indexOfType(tokens, 'or')) !== -1) {
    left = tokens.slice(0, split)
    right = tokens.slice(split + 1)
    return {
      type: 'or'
    , left: parse(left)
    , right: parse(right)
    }
  }
  else if ((split = indexOfType(tokens, 'and')) !== -1) {
    left = tokens.slice(0, split)
    right = tokens.slice(split + 1)
    return {
      type: 'and'
    , left: parse(left)
    , right: parse(right)
    }
  }
  else if ((split = indexOfType(tokens, 'compare')) !== -1) {
    left = parse(tokens.slice(0, split))
    right = parse(tokens.slice(split + 1))
    return {
      type: 'compare'
    , op: [ '≠', '=/=', '/=', '!=' ].indexOf(tokens[split].value) !== -1 ? '!=' : tokens[split].value
    , left: maybeList(left)
    , right: maybeList(right) 
    }
  }
  else if (Array.isArray(first)) {
    return parse(first)
  }
  else if (first.type === 'key') {
    return {
      type: 'key'
    , key: first.value.replace(/\-\_/g, '').toLowerCase()
    // , match: parse(tokens.slice(1))
    }
  }
  else if ((split = indexOfType(tokens, 'range')) !== -1) {
    left = tokens.slice(0, split)
    right = tokens.slice(split + 1)
    return {
      type: 'range'
    , left: parse(left)
    , right: parse(right)
    }
  }
  else if (first.type === 'player') {
    return {
      type: 'player'
    , name: first.value
    }
  }
  else if (first.type === 'num') {
    return {
      type: 'num'
    , value: first.value
    }
  }
  else if (first.type === 'word') {
    if (first.value.toUpperCase() === 'RM' || first.value.toUpperCase() === 'DM') {
      return {
        type: 'gametype'
      , value: first.value.toUpperCase()
      }
    }
    return {
      type: 'word'
    , value: first.value
    }
  }
  else if (first.type === 'whitespace') {
    // skip
    return parse(tokens.slice(1))
  }
  else {
    throw new Error('No parse rule for ' + first.type)
  }
}

/**
 * Turns a word or list into a regular expression.
 * @param {Token|Array.<Token>} match Word token, or list of word tokens.
 * @param {string} sub Property of tokens to use in the regex.
 * @return {RegExp}
 */
function makeRegExp(match, sub) {
  var rx = function (t) { return t[sub].replace('*', '.*?') }
    , regex

  if (Array.isArray(match)) {
    regex = '(' + match.map(rx).join('|') + ')'
  }
  else {
    regex = rx(match)
  }
  return RegExp(regex, 'i')
}
var comparers = {
  player: function matchPlayer(op, match, obj) {
    match = makeRegExp(match, 'name')
    switch (op) {
      case '=': case '!=':
        return get(obj, 'players').any(function (player) {
          var res = match.test(get(player, 'username'))
          return op === '=' ? res : !res
        })
      default: return false
    }
  }
  
, gametype: function matchGameType(op, match, obj) {
    match = makeRegExp(match, 'value')
    switch (op) {
      case '=': case '!=':
        var res = match.test(get(obj, 'gameType'))
        return op === '=' ? res : !res
      default: return false
    }
  }
}
/**
 * Runs a filter AST.
 */
function run(ast, obj, cb) {
  var p
  switch (ast.type) {
    case 'and': return run(ast.left, obj) && run(ast.right, obj)
    case 'or': return run(ast.left, obj) && run(ast.right, obj)
    case 'list':
      var list = []
      ast = ast.values
      while (ast.type === 'or') {
        list.push(ast.left)
        ast = ast.right
      }
      list.push(ast)
      return list
    case 'compare':
      if (comparers[ast.left.key]) {
        return comparers[ast.left.key](ast.op, run(ast.right), obj)
      }
      else {
        throw new Error('no idea how to compare ' + JSON.stringify(ast.left) + ' with anything')
      }
  }
}

function wrap(str) { return '(' + str + ')' }
function compile_(ast, parent) {
  var res
  if (typeof ast !== 'object') {
    return JSON.stringify(ast)
  }
  
  switch (ast.type) {
    case 'and': res = 'lib.and(' + wrap(compile_(ast.left, ast)) + ', ' + wrap(compile_(ast.right, ast)) + ')'; break
    case 'or': res = 'lib.or(' + wrap(compile_(ast.left, ast)) + ', ' + wrap(compile_(ast.right, ast)) + ')'; break
    case 'compare':
      res = 'lib.comparison(lib.comparers[' + JSON.stringify(ast.op) + '], ' + wrap(compile_(ast.value, ast)) + ')'
      break
    case 'player':
      res = parent.type === 'compare'
          ? JSON.stringify(ast.value)
          : compile_({ type: 'match', key: 'player', match: { type: 'compare', op: '=', value: ast } }, ast)
      break
    case 'range':
      res = 'lib.range([' + wrap(compile_(ast.left, ast)) + ', ' + wrap(compile_(ast.right, ast)) + '])'
      break
    case 'gametype':
      res = parent.type === 'compare'
          ? JSON.stringify(ast.value)
          : compile_({ type: 'match', key: 'gametype', match: { type: 'compare', op: '=', value: ast } }, ast)
      break
    case 'match':
      res = 'lib.matchers[' + JSON.stringify(ast.key) + '](' + wrap(compile_(ast.match, ast)) + ')'
      break
    default:
      res = {}
      Object.keys(ast).forEach(function (key) {
        if (typeof ast[key] === 'object') {
          res[key] = compile_(ast[key], ast)
        }
        else {
          res[key] = ast[key]
        }
      })
      res = JSON.stringify(res)
  }
  
  return res
}
function compile(ast) {
  return Function('lib', 'return ' + compile_(ast, {}) + '()')
}

function Token(type, value) {
  this.type = type
  this.value = value
}

// DEBUG
window.lex = function (x) { return deflatten(lex(x)) }
window.parse = parse
window.run = run