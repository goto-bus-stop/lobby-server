var debugU = debug('aocmulti:view:user-item')

App.UserItemView = Ember.View.extend({
  templateName: 'user-item'
, rating: function () {
    var ratings = this.get('context.ratings')
      , ladder = this.get('ladder.id')
    
    if (ratings[ladder]) return ratings[ladder].elo
    return 'null'
  }.property('ladder')
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
})