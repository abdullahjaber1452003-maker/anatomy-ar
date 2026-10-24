(function(){
  var b=document.querySelector('.menu-btn'),n=document.getElementById('nav');
  if(b&&n){b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');});}
  function openHash(){var h=decodeURIComponent(location.hash.slice(1));if(!h)return;var el=document.getElementById(h);if(el&&el.tagName==='DETAILS'){el.open=true;setTimeout(function(){el.scrollIntoView({block:'start'});},60);}}
  window.addEventListener('hashchange',openHash);openHash();
  var all=document.getElementById('toggle-all');
  if(all){all.addEventListener('click',function(){var ds=document.querySelectorAll('details.topic');var open=all.getAttribute('aria-pressed')!=='true';ds.forEach(function(d){d.open=open;});all.setAttribute('aria-pressed',open?'true':'false');all.textContent=open?'سكّر الكل':'افتح الكل';});}
})();