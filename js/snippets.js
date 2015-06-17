$('head').append('<link rel="stylesheet" href="/static/pages/resource-center/css/battery-finder.min.css" />')
         .append('<link rel="stylesheet" href="//cdn.jsdelivr.net/qtip2/2.2.1/jquery.qtip.min.css"/>');
$('[data-parts-finder]').parent().parent().parent().parent().replaceWith('<div id="batteryfinder"><div class="row"> <div class="battery-glam"> <img src="http://s7d5.scene7.com/is/image/horizonhobby/battery%2Dfinder%2Dglam?$Default$" alt=""/> <div> <div> <iframe width="560" height="315" src="https://www.youtube.com/embed/PaPpRaJrzyI" frameborder="0" allowfullscreen></iframe> </div></div></div></div><div class="row battery-filters"> </div><div class="row"> <div class="small-12 columns text-center results-count"> </div><div class="small-12 columns socket"></div></div></div>')
$.when(
  $.getScript( "//cdn.jsdelivr.net/lodash/2.2.1/lodash.compat.js" ),
  $.getScript( "/static/pages/resource-center/js/jquery.qtip.min.js" ),
  $.getScript( "/static/pages/resource-center/js/jquery.dataTables.min.js" ),
  $.getScript( "/static/pages/resource-center/js/minimongo.min.js" ),
  $.Deferred(function( deferred ){
    $( deferred.resolve );
  })
).done(function(){
  $.getScript( "/static/pages/resource-center/js/battery-finder.min.js" )
});