$(document).ready(function() {
  var $body = $('body');
  var $pages = $('#multi > div');
  var $container = $('#page');
  var $pager = $('<div id="pager">').appendTo($body);
  var $next = $('<a>').attr({id: 'next', href: '#'}).click(nextPage).append('<span>').appendTo($body);
  var $prev = $('<a>').attr({id: 'prev', href: '#'}).click(previousPage).append('<span>').appendTo($body);
  multi = {current: null, count: $pages.length};
  
  
  $.address.strict(false);
  $.address.externalChange(function(e) {
      var page = parseInt(e.value);
      var isDefault = isNaN(page);
      if (isDefault) { page = 1; }
      loadPage(page, isDefault);
      multi.current = page;
    });
    
  $(document).keydown(function(e) {
    var code = e.keyCode;
    if (code == 39 || code == 32) {
      return nextPage();
    }
    if (code == 37) {
      return previousPage();
    }
  }).delegate('[data-page]', 'click', function(){
    loadPage(parseInt($(this).attr('data-page')));
  });
  
  function nextPage() {
    loadPage(multi.current + 1);
    return false;
  }
  
  function previousPage() {
    loadPage(multi.current - 1);
    return false;
  }
  
  function loadPage(index, isDefault) {
    if (index > multi.count || index < 1) { return; }
    
    $body.removeClass('first last')
    $prev.show();
    $next.show();
    if (index == 1) { $body.addClass('first'); $prev.hide(); }
    if (index == multi.count) { $body.addClass('last'); $next.hide(); }
    
    $container.empty().append($pages.eq(index-1));
    var text = index + ' of ' + multi.count;
    $pager.text(text);
    if (!isDefault) { 
      $.address.value(index);
    }
    multi.current = index;
  }
});



/*
 * jQuery Address Plugin v${version}
 * http://www.asual.com/jquery/address/
 *
 * Copyright (c) 2009-2010 Rostislav Hristov
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 */
(function(c){c.address=function(){var n=function(a){c(c.address).trigger(c.extend(c.Event(a),function(){for(var a={},d=c.address.parameterNames(),e=0,f=d.length;e<f;e++)a[d[e]]=c.address.parameter(d[e]);return{value:c.address.value(),path:c.address.path(),pathNames:c.address.pathNames(),parameterNames:d,parameters:a,queryString:c.address.queryString()}}.call(c.address)))},p=function(a){return Array.prototype.slice.call(a)},h=function(a,b,d){c().bind.apply(c(c.address),Array.prototype.slice.call(arguments));
return c.address},B=function(){return u.pushState&&d.state!==k},N=function(){return("/"+i.pathname.replace(RegExp(d.state),"")+i.search+(C()?"#"+C():"")).replace(M,"/")},C=function(){var a=i.href.indexOf("#");return a!=-1?s(i.href.substr(a+1),j):""},q=function(){return B()?N():C()},I=function(a){a=a.toString();return(d.strict&&a.substr(0,1)!="/"?"/":"")+a},s=function(a,b){return d.crawlable&&b?(a!==""?"!":"")+a:a.replace(/^\!/,"")},r=function(a,b){return parseInt(a.css(b),10)},y=function(){if(!D){var a=
q();e!=a&&(v&&w<7?i.reload():(v&&!E&&d.history&&o(J,50),e=a,x(j)))}},x=function(a){n(O);n(a?P:Q);o(Y,10)},Y=function(){if(d.tracker!=="null"&&d.tracker!==null){var a=c.isFunction(d.tracker)?d.tracker:f[d.tracker],b=(i.pathname+i.search+(c.address&&!B()?c.address.value():"")).replace(/\/\//,"/").replace(/^\/$/,"");c.isFunction(a)?a(b):c.isFunction(f.urchinTracker)?f.urchinTracker(b):f.pageTracker!==k&&c.isFunction(f.pageTracker._trackPageview)?f.pageTracker._trackPageview(b):f._gaq!==k&&c.isFunction(f._gaq.push)&&
f._gaq.push(["_trackPageview",decodeURI(b)])}},J=function(){var a="javascript:"+j+";document.open();document.writeln('<html><head><title>"+l.title.replace("'","\\'")+"</title><script>var "+t+' = "'+q()+(l.domain!=i.hostname?'";document.domain="'+l.domain:"")+"\";<\/script></head></html>');document.close();";w<7?g.src=a:g.contentWindow.location.replace(a)},S=function(){if(z&&R!=-1){var a,b,c=z.substr(R+1).split("&");for(a=0;a<c.length;a++)b=c[a].split("="),/^(autoUpdate|crawlable|history|strict|wrap)$/.test(b[0])&&
(d[b[0]]=isNaN(b[1])?/^(true|yes)$/i.test(b[1]):parseInt(b[1],10)!==0),/^(state|tracker)$/.test(b[0])&&(d[b[0]]=b[1]);z=null}e=q()},U=function(){if(!T){T=m;S();var a=function(){Z.call(this);$.call(this)},b=c("body").ajaxComplete(a);a();d.wrap&&(c("body > *").wrapAll('<div style="padding:'+(r(b,"marginTop")+r(b,"paddingTop"))+"px "+(r(b,"marginRight")+r(b,"paddingRight"))+"px "+(r(b,"marginBottom")+r(b,"paddingBottom"))+"px "+(r(b,"marginLeft")+r(b,"paddingLeft"))+'px;" />').parent().wrap('<div id="'+
t+'" style="height:100%;overflow:auto;position:relative;'+(F&&!window.statusbar.visible?"resize:both;":"")+'" />'),c("html, body").css({height:"100%",margin:0,padding:0,overflow:"hidden"}),F&&c('<style type="text/css" />').appendTo("head").text("#"+t+"::-webkit-resizer { background-color: #fff; }"));if(v&&!E)a=l.getElementsByTagName("frameset")[0],g=l.createElement((a?"":"i")+"frame"),g.src="javascript:"+j,a?(a.insertAdjacentElement("beforeEnd",g),a[a.cols?"cols":"rows"]+=",0",g.noResize=m,g.frameBorder=
g.frameSpacing=0):(g.style.display="none",g.style.width=g.style.height=0,g.tabIndex=-1,l.body.insertAdjacentElement("afterBegin",g)),o(function(){c(g).bind("load",function(){var a=g.contentWindow;e=a[t]!==k?a[t]:"";if(e!=q())x(j),i.hash=s(e,m)});g.contentWindow[t]===k&&J()},50);o(function(){n("init");x(j)},1);B()||(E?f.addEventListener?f.addEventListener(A,y,j):f.attachEvent&&f.attachEvent("on"+A,y):aa(y,50))}},Z=function(){var a,b=c("a"),d=b.size(),e=-1,f=function(){++e!=d&&(a=c(b.get(e)),a.is('[rel*="address:"]')&&
a.address('[rel*="address:"]'),o(f,1))};o(f,1)},$=function(){if(d.crawlable){var a=i.pathname.replace(/\/$/,"");c("body").html().indexOf("_escaped_fragment_")!=-1&&c('a[href]:not([href^=http]), a[href*="'+document.domain+'"]').each(function(){var b=c(this).attr("href").replace(/^http:/,"").replace(RegExp(a+"/?$"),"");(b===""||b.indexOf("_escaped_fragment_")!=-1)&&c(this).attr("href","#"+b.replace(/\/(.*)\?_escaped_fragment_=(.*)$/,"!$2"))})}},k,t="jQueryAddress",A="hashchange",O="change",P="internalChange",
Q="externalChange",m=true,j=false,d={autoUpdate:m,crawlable:j,history:m,strict:m,wrap:j},G=c.browser,w=parseFloat(G.version),v=!c.support.opacity,F=G.webkit||G.safari,f;try{f=top.document!==k?top:window}catch(ca){f=window}var l=f.document,u=f.history,i=f.location,aa=setInterval,o=setTimeout,M=/\/{2,9}/g,V=navigator.userAgent,E="on"+A in f,g,z=c("script:last").attr("src"),R=z?z.indexOf("?"):-1,K=l.title,D=j,T=j,L=m,W=m,H=j,e=q();if(v){w=parseFloat(V.substr(V.indexOf("MSIE")+4));l.documentMode&&l.documentMode!=
w&&(w=l.documentMode!=8?7:8);var X=l.onpropertychange;l.onpropertychange=function(){X&&X.call(l);if(l.title!=K&&l.title.indexOf("#"+q())!=-1)l.title=K}}if(u.navigationMode)u.navigationMode="compatible";if(document.readyState=="complete")var ba=setInterval(function(){c.address&&(U(),clearInterval(ba))},50);else S(),c(U);c(window).bind("popstate",function(){e!=q()&&(e=q(),x(j))}).bind("unload",function(){f.removeEventListener?f.removeEventListener(A,y,j):f.detachEvent&&f.detachEvent("on"+A,y)});return{bind:function(a,
b,c){return h.apply(this,p(arguments))},init:function(a,b){return h.apply(this,["init"].concat(p(arguments)))},change:function(a,b){return h.apply(this,[O].concat(p(arguments)))},internalChange:function(a,b){return h.apply(this,[P].concat(p(arguments)))},externalChange:function(a,b){return h.apply(this,[Q].concat(p(arguments)))},baseURL:function(){var a=i.href;a.indexOf("#")!=-1&&(a=a.substr(0,a.indexOf("#")));/\/$/.test(a)&&(a=a.substr(0,a.length-1));return a},autoUpdate:function(a){return a!==k?
(d.autoUpdate=a,this):d.autoUpdate},crawlable:function(a){return a!==k?(d.crawlable=a,this):d.crawlable},history:function(a){return a!==k?(d.history=a,this):d.history},state:function(a){if(a!==k){d.state=a;var b=N();d.state!==k&&(u.pushState?b.substr(0,3)=="/#/"&&i.replace(d.state.replace(/^\/$/,"")+b.substr(2)):b!="/"&&b.replace(/^\/#/,"")!=C()&&o(function(){i.replace(d.state.replace(/^\/$/,"")+"/#"+b)},1));return this}return d.state},strict:function(a){return a!==k?(d.strict=a,this):d.strict},tracker:function(a){return a!==
k?(d.tracker=a,this):d.tracker},wrap:function(a){return a!==k?(d.wrap=a,this):d.wrap},update:function(){H=m;this.value(e);H=j;return this},title:function(a){return a!==k?(o(function(){K=l.title=a;if(W&&g&&g.contentWindow&&g.contentWindow.document)g.contentWindow.document.title=a,W=j;!L&&G.mozilla&&i.replace(i.href.indexOf("#")!=-1?i.href:i.href+"#");L=j},50),this):l.title},value:function(a){if(a!==k){a=I(a);a=="/"&&(a="");if(e==a&&!H)return;L=m;e=a;if(d.autoUpdate||H)if(x(m),B())u[d.history?"pushState":
"replaceState"]({},"",d.state.replace(/\/$/,"")+(e===""?"/":e));else{D=m;if(F)d.history?i.hash="#"+s(e,m):i.replace("#"+s(e,m));else if(e!=q())d.history?i.hash="#"+s(e,m):i.replace("#"+s(e,m));v&&!E&&d.history&&o(J,50);F?o(function(){D=j},1):D=j}return this}return I(e)},path:function(a){if(a!==k){var b=this.queryString(),c=this.hash();this.value(a+(b?"?"+b:"")+(c?"#"+c:""));return this}return I(e).split("#")[0].split("?")[0]},pathNames:function(){var a=this.path(),b=a.replace(M,"/").split("/");(a.substr(0,
1)=="/"||a.length===0)&&b.splice(0,1);a.substr(a.length-1,1)=="/"&&b.splice(b.length-1,1);return b},queryString:function(a){if(a!==k){var b=this.hash();this.value(this.path()+(a?"?"+a:"")+(b?"#"+b:""));return this}a=e.split("?");return a.slice(1,a.length).join("?").split("#")[0]},parameter:function(a,b,d){var e,f;if(b!==k){var h=this.parameterNames();f=[];b=b?b.toString():"";for(e=0;e<h.length;e++){var i=h[e],g=this.parameter(i);typeof g=="string"&&(g=[g]);i==a&&(g=b===null||b===""?[]:d?g.concat([b]):
[b]);for(var j=0;j<g.length;j++)f.push(i+"="+g[j])}c.inArray(a,h)==-1&&b!==null&&b!==""&&f.push(a+"="+b);this.queryString(f.join("&"));return this}if(b=this.queryString()){d=[];f=b.split("&");for(e=0;e<f.length;e++)b=f[e].split("="),b[0]==a&&d.push(b.slice(1).join("="));if(d.length!==0)return d.length!=1?d:d[0]}},parameterNames:function(){var a=this.queryString(),b=[];if(a&&a.indexOf("=")!=-1)for(var a=a.split("&"),d=0;d<a.length;d++){var e=a[d].split("=")[0];c.inArray(e,b)==-1&&b.push(e)}return b},
hash:function(a){if(a!==k)return this.value(e.split("#")[0]+(a?"#"+a:"")),this;a=e.split("#");return a.slice(1,a.length).join("#")}}}();c.fn.address=function(n){var p;typeof n=="string"&&(p=n,n=void 0);c(this).attr("address")||c(p?p:this).live("click",function(h){if(h.shiftKey||h.ctrlKey||h.metaKey||h.which==2)return true;c(this).is("a")&&(h.preventDefault(),h=n?n.call(this):/address:/.test(c(this).attr("rel"))?c(this).attr("rel").split("address:")[1].split(" ")[0]:c.address.state()!==void 0&&c.address.state()!=
"/"?c(this).attr("href").replace(RegExp("^(.*"+c.address.state()+"|\\.)"),""):c(this).attr("href").replace(/^(#\!?|\.)/,""),c.address.value(h))}).live("submit",function(h){c(this).is("form")&&(h.preventDefault(),h=c(this).attr("action"),h=n?n.call(this):(h.indexOf("?")!=-1?h.replace(/&$/,""):h+"?")+c(this).serialize(),c.address.value(h))}).attr("address",true);return this}})(jQuery);