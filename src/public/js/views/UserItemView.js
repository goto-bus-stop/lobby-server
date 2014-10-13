define(function (require, exports, module) {

  var Ember = require('ember')
    , debug = require('debug')('aocmulti:view:user-item')

  module.exports = Ember.View.extend({
    templateName: 'user-item'

  , didInsertElement: function () {
      var el = this.$()
        , tooltip = el.find('.user-tooltip')
      el.on('mousemove', function (e) {
        var p = $(tooltip[0].offsetParent).offset()
        tooltip.css({
          position: 'absolute'
        , top: (e.clientY - p.top + 3) + 'px'
        , left: (e.clientX - p.left + 13) + 'px'
        })
      })
      el.on('mouseenter', function () { tooltip.removeClass('hide') })
      el.on('mouseleave', function () { tooltip.addClass('hide') })
    }

  , showContextMenu: function (e) {
      e.preventDefault()
      $('#context-menu').show().css({ top: e.pageY + 'px', left: e.pageX + 'px' })
      $(document).one('click', function () {
        $('#context-menu').hide()
      })
    }.on('contextMenu')

  })

})
