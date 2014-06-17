App.UserItemView = Ember.View.extend({
  templateName: 'user-item',
  didInsertElement: function () {
    var el = this.$();
    el.on('mousemove', function (e) {
      var tooltip = el.find('.user-tooltip'),
        p = $(tooltip[0].offsetParent).offset();
      tooltip.css({
        position: 'absolute',
        top: (e.clientY - p.top) + 'px',
        left: (e.clientX - p.left) + 'px'
      });
    });
    el.on('mouseenter', function() { el.find('.user-tooltip').removeClass('hide') });
    el.on('mouseleave', function() { el.find('.user-tooltip').addClass('hide') });
  }
});