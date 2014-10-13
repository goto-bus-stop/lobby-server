var jQuery = require('jquery')

jQuery.Element = function (selector) {
  var tag = selector.match(/^\w+/)
    , element = jQuery('<' + (tag ? tag[0] : 'div') + '>')
    , id = selector.match(/#([\w-]+)/)
    , classes = selector.match(/\.[\w-]+/g)

  id && element.attr('id', id[1])
  classes && element.attr('class', classes.join(' ').replace(/\./g, ''))

  return element
}