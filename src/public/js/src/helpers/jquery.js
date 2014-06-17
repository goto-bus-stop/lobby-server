jQuery.Element = function (selector) {
  var tag = selector.match(/^\w+/),
      element = jQuery('<' + (tag ? tag[0] : 'div') + '>'),
      id, classNames;

  if (id = selector.match(/#([\w-]+)/)) {
    element.attr('id', id[1]);
  }
  if (classNames = selector.match(/\.[\w-]+/g)) {
    element.attr('class', classNames.join(' ').replace(/\./g, ''));
  }

  return element;
};