$(document).ready(function() {
  //footer code
  var $footer = $('#footer');  
  var $leaf = $('#leaf').click(function() {
    if ($footer.visible()) { hideFooter(); }
    else { showFooter(); }
  });
  function hideFooter() {
     $footer.slideUp();
     $leaf.animate({bottom: '0px'}, 'normal');
  }
  function showFooter() {
     $footer.slideDown();
     $leaf.animate({bottom: '45px'}, 'normal');
  }
  $(document).keydown(function(e) {
     if (e.keyCode == 27 && $footer.visible()) { 
       hideFooter();
     }
  });
  
  $('pre').each(function(i, pre) {
    var $pre = $(pre);
    $pre.html($pre.html().replace(/( *\/\/.*)/g, '<span class="comment">$1</span>'))
  })
});

$.fn.visible = function() {
  return this.is(':visible');
};