/* Prezentatsiya — tashkilot brendi (nom, rang, logo, bo'limlar).
   Tashkilot manzili: https://commercial.icanbusiness.uz/<slug>/ (slug = tashkilot "subdomain" maydoni).

   Ishlash tartibi (deterministik — DOM'dagi matnni keyin almashtirish YO'Q):
   1) Konfiguratsiya SINXRON olinadi: localStorage keshi (faqat shu slug uchun) yoki /api/brand?sub=<slug>.
      Shuning uchun ilovalar chizilishidan OLDIN window.BRAND_NAME / BRAND_LOGO tayyor bo'ladi.
   2) Ilovalar nomni o'zi window.BRAND_NAME'dan o'qiydi; logolar neytral /brand-*.svg fayllariga ishora qiladi —
      bu skript ularni tashkilot logosiga almashtiradi (yangi chizilgan ekranlarda ham, doimiy kuzatuv bilan).
   3) Ranglar bitta <style> orqali beriladi; bundler ilovalar <html>'ni almashtirsa — qayta qo'yiladi. */
(function(){
  if(window.__brandInit) return; window.__brandInit = 1;
  var isTop = (window.self === window.top);
  var KEY = 'icb-brand';
  var DEFAULT_NAME = 'iCAN';
  // neytral logo fayllari (manbada boshqa brend logosi yo'q): /brand-logo.svg, /brand-mark.svg va ularning -white variantlari
  var PLACEHOLDER_RE = /(?:^|\/)brand-(logo-white|mark-white|logo|mark)\.svg(?:[?#]|$)/;

  // ---- slug: ENG YUQORI oyna manzilining birinchi segmenti (iframe'lar o'z URL'ini o'zgartirishi mumkin) ----
  var NOT_SLUG = ['market','superadmin','uploads','api','assets','static'];
  function slug(){
    var path; try { path = window.top.location.pathname; } catch(e){ path = location.pathname; }
    var s = (path.split('/')[1]||'').toLowerCase();
    if(!/^[a-z0-9][a-z0-9-]*$/.test(s) || NOT_SLUG.indexOf(s) >= 0) return null;
    return s;
  }
  var SLUG = slug();

  function readCache(){ try { var c = JSON.parse(localStorage.getItem(KEY)||'null'); return (c && c.color && c._slug === SLUG) ? c : null; } catch(e){ return null; } }
  function writeCache(c){ try { if(c){ c._slug = SLUG; localStorage.setItem(KEY, JSON.stringify(c)); } else localStorage.removeItem(KEY); } catch(e){} }
  function fetchSync(){
    try {
      var x = new XMLHttpRequest(); x.open('GET', '/api/brand?sub='+encodeURIComponent(SLUG), false); x.send(null);
      if(x.status === 200){ var d = JSON.parse(x.responseText); return (d && d.color) ? d : null; }
    } catch(e){}
    return null;
  }
  function loadConfig(){
    var m = (location.search.match(/[?&]brand=([0-9a-fA-F]{6})/)||[])[1];
    if(m) return { color:'#'+m };
    if(!SLUG){ if(isTop) writeCache(null); return null; }
    var c = readCache();
    if(c){
      // keshdan darhol ishlaymiz; fonda yangilab qo'yamiz (admin o'zgartirsa — keyingi ochilishda)
      if(isTop && window.fetch) fetch('/api/brand?sub='+encodeURIComponent(SLUG)).then(function(r){ return r.ok ? r.json() : null; })
        .then(function(d){ if(d && d.color) writeCache(d); }).catch(function(){});
      return c;
    }
    c = fetchSync(); writeCache(c); return c;
  }

  var C = loadConfig();
  var NAME = (C && (C.name||'').trim()) || DEFAULT_NAME;
  // Ilovalar uchun global qiymatlar — sahifa skriptlaridan OLDIN tayyor
  window.BRAND = C;
  window.BRAND_NAME = NAME;
  window.BRAND_DOMAIN = NAME.toLowerCase().replace(/[^a-z0-9]+/g,'') + '.uz';
  window.BRAND_LOGO = (C && (C.logo||C.logoWhite)) || '/brand-logo.svg';
  window.BRAND_LOGO_WHITE = (C && (C.logoWhite||C.logo)) || '/brand-logo-white.svg';
  window.BRAND_MARK = (C && (C.logo||C.logoWhite)) || '/brand-mark.svg';

  // ---- rang yordamchilari ----
  function hex2rgb(h){ h=h.replace('#',''); if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
  function rgb2hex(r){ return '#'+r.map(function(x){x=Math.max(0,Math.min(255,Math.round(x)));return (x<16?'0':'')+x.toString(16);}).join(''); }
  function rgb2hsl(r,g,b){ r/=255;g/=255;b/=255; var mx=Math.max(r,g,b),mn=Math.min(r,g,b),h,s,l=(mx+mn)/2; if(mx===mn){h=s=0;} else { var d=mx-mn; s=l>0.5?d/(2-mx-mn):d/(mx+mn); switch(mx){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;} h/=6; } return [h*360,s*100,l*100]; }
  function hsl2hex(h,s,l){ h/=360;s/=100;l/=100; function hue(p,q,t){ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; } var r,g,b; if(s===0){r=g=b=l;} else { var q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q; r=hue(p,q,h+1/3); g=hue(p,q,h); b=hue(p,q,h-1/3); } return rgb2hex([r*255,g*255,b*255]); }
  function palette(baseHex){
    var rgb=hex2rgb(baseHex), hsl=rgb2hsl(rgb[0],rgb[1],rgb[2]);
    var H=hsl[0], S=Math.max(hsl[1],28), L0=hsl[2];
    var Lmap={50:96,100:91,200:83,300:73,400:63,500:Math.min(L0+16,58),600:L0,700:Math.max(L0-7,30),800:Math.max(L0-14,23),900:Math.max(L0-21,16),950:Math.max(L0-27,12)};
    var p={}; for(var k in Lmap){ p[k]=(k==='600')?baseHex:hsl2hex(H,S,Lmap[k]); } return p;
  }

  // Market (Tailwind) brend klasslari
  function marketCSS(P){
    var sh=['50','100','200','300','400','500','600','700','800','900','950'], css='';
    sh.forEach(function(s){ var c=P[s];
      css+='.bg-brand-'+s+'{background-color:'+c+' !important}.text-brand-'+s+'{color:'+c+' !important}.border-brand-'+s+'{border-color:'+c+' !important}.ring-brand-'+s+'{--tw-ring-color:'+c+' !important}.accent-brand-'+s+'{accent-color:'+c+' !important}.fill-brand-'+s+'{fill:'+c+' !important}.stroke-brand-'+s+'{stroke:'+c+' !important}';
      css+='.from-brand-'+s+'{--tw-gradient-from:'+c+' !important;--tw-gradient-to:'+c+'00 !important;--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to) !important}';
      css+='.via-brand-'+s+'{--tw-gradient-to:'+c+'00 !important;--tw-gradient-stops:var(--tw-gradient-from),'+c+',var(--tw-gradient-to) !important}';
      css+='.to-brand-'+s+'{--tw-gradient-to:'+c+' !important}';
    });
    css+='.bg-brand-deep{background-image:radial-gradient(120% 120% at 15% 0%,'+P['700']+','+P['800']+' 45%,'+P['950']+') !important}';
    // text-iridescent = to'q hero fonidagi SARLAVHA matni -> OCH soyalar
    css+='.text-iridescent{background-image:linear-gradient(115deg,'+P['200']+','+P['100']+','+P['200']+' 52%,'+P['300']+' 74%,'+P['100']+') !important}';
    // bg-iridescent = to'ldirilgan fon (pill/badge) -> o'rta soyalar
    css+='.bg-iridescent{background-image:linear-gradient(115deg,'+P['400']+','+P['300']+','+P['500']+') !important}';
    css+='.bg-iris-lav\\/30{background-color:'+P['200']+'4d !important}.bg-iris-mint\\/20{background-color:'+P['200']+'33 !important}.bg-iris-mint\\/30{background-color:'+P['200']+'4d !important}.bg-iris-peri\\/25{background-color:'+P['300']+'40 !important}';
    css+='.glowen-bullet-active{background:linear-gradient(115deg,'+P['400']+','+P['300']+') !important}';
    css+='.text-brand-900\\/50{color:'+P['800']+'99 !important}.border-brand-400\\/20{border-color:'+P['400']+'33 !important}.hover\\:border-brand-200\\/80:hover{border-color:'+P['200']+'cc !important}';
    return css;
  }

  // ---- ranglar: bitta <style> ----
  var STYLE_ID = 'icb-brand-style', CSS = '';
  if(C){
    var P = palette(C.color), BASE = C.color, ACC2 = C.color2 || P['500'];
    CSS = ':root,.app{--accent:'+BASE+' !important;--accent-2:'+ACC2+' !important;--accent-press:'+P['700']+' !important;--accent-soft:'+P['50']+' !important;--accent-ink:'+P['700']+' !important;'
      + '--soft:'+P['50']+' !important;--teal:'+BASE+' !important;--teal2:'+ACC2+' !important;--teald:'+P['700']+' !important;'
      + '--brand:'+BASE+' !important;--brand-d0:'+P['700']+' !important;--brand-d1:'+P['800']+' !important;--brand-d2:'+P['950']+' !important}'
      // standart (binafsha) SVG ranglari -> brend
      + '[fill="#2E3192"],[fill="#2e3192"]{fill:'+BASE+' !important}[stroke="#2E3192"],[stroke="#2e3192"]{stroke:'+BASE+' !important}'
      + '[fill="#4A4FC4"],[fill="#4a4fc4"]{fill:'+ACC2+' !important}[stroke="#4A4FC4"],[stroke="#4a4fc4"]{stroke:'+ACC2+' !important}'
      + '[fill="#262878"],[fill="#242373"]{fill:'+P['700']+' !important}[stroke="#262878"],[stroke="#242373"]{stroke:'+P['700']+' !important}'
      + marketCSS(P);
  }
  function injectStyle(doc){
    if(!CSS) return;
    try{ var el=doc.getElementById(STYLE_ID); if(!el){ el=doc.createElement('style'); el.id=STYLE_ID; (doc.head||doc.documentElement).appendChild(el); } if(el.textContent!==CSS) el.textContent=CSS; }catch(e){}
  }

  // ---- logolar: neytral /brand-*.svg -> tashkilot logosi + shaffof chetlarni hisobga olib moslash ----
  function zAlphaBBox(img){
    try{ var nW=img.naturalWidth,nH=img.naturalHeight; if(!nW||!nH) return null;
      var cdoc=img.ownerDocument||document; var S=Math.min(1,120/Math.max(nW,nH));
      var w=Math.max(1,Math.round(nW*S)),h=Math.max(1,Math.round(nH*S));
      var c=cdoc.createElement('canvas'); c.width=w; c.height=h;
      var x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(img,0,0,w,h);
      var d; try{ d=x.getImageData(0,0,w,h).data; }catch(e){ return null; }
      var minx=w,miny=h,maxx=-1,maxy=-1,op=0;
      for(var yy=0;yy<h;yy++)for(var xx=0;xx<w;xx++){ if(d[(yy*w+xx)*4+3]>12){op++; if(xx<minx)minx=xx; if(xx>maxx)maxx=xx; if(yy<miny)miny=yy; if(yy>maxy)maxy=yy; } }
      if(maxx<0) return null; if(op/(w*h)>0.985) return null;
      return {x:minx/S,y:miny/S,w:(maxx-minx+1)/S,h:(maxy-miny+1)/S,nW:nW,nH:nH};
    }catch(e){ return null; }
  }
  // iframe masshtabi (prezentatsiyada app'lar har xil scale bilan ko'rsatiladi)
  function zDocScale(doc){
    try{ var w=doc.defaultView||window; var fe=w.frameElement; if(fe){ var rw=fe.getBoundingClientRect().width, iw=w.innerWidth||rw; if(rw>0&&iw>0){ var s=rw/iw; if(s>0.05&&s<20) return s; } } }catch(e){}
    return 1;
  }
  function fitLogo(img){
    try{
      var cdoc=img.ownerDocument||document, vw=cdoc.defaultView||window;
      var slot=(img.parentNode&&img.parentNode.getAttribute&&img.parentNode.getAttribute('data-zlogoslot')==='1')?img.parentNode:null;
      // yashirin variant (masalan to'q fon uchun OQ logo) — slot joy egallamasin
      if(vw.getComputedStyle(img).display==='none'){ if(slot) slot.style.display='none'; return; }
      if(!img.__zbb || img.__zbbsrc!==img.src){ img.__zbb=zAlphaBBox(img); img.__zbbsrc=img.src; }
      var bb=img.__zbb; if(!bb) return;
      var scale=zDocScale(cdoc);
      // asosiy sahifada (iframe emas) logoga kattaroq joy; iframe ichidagi app header'lari ixcham
      var inFrame=false; try{ inFrame=!!vw.frameElement; }catch(e){}
      var TH=inFrame?33:48, TW=inFrame?150:200;
      var H=Math.round(Math.max(22, Math.min(220, TH/scale)));
      var MW=Math.round(Math.max(80, Math.min(600, TW/scale))), FILL=0.9;
      if(!slot){ slot=cdoc.createElement('span'); slot.setAttribute('data-zlogoslot','1'); img.parentNode.insertBefore(slot,img); slot.appendChild(img); }
      var k=(H*FILL)/bb.h; if(bb.w*k>MW) k=MW/bb.w;
      var cw=bb.w*k, ch=bb.h*k, sw=Math.min(Math.ceil(cw+(H-ch)),MW); if(sw<cw) sw=Math.ceil(cw);
      slot.style.cssText='position:relative;display:inline-block;flex:0 0 auto;height:'+H+'px;width:'+sw+'px;overflow:hidden;vertical-align:middle';
      img.style.cssText='position:absolute;width:'+(bb.nW*k)+'px;height:'+(bb.nH*k)+'px;max-width:none;left:'+(-(bb.x*k)+(sw-cw)/2)+'px;top:'+(-(bb.y*k)+(H-ch)/2)+'px';
    }catch(e){}
  }
  function placeholderKind(img){
    var a=img.getAttribute('data-brand-logo');
    if(a!==null) return a==='white' ? 'logoWhite' : 'logo';
    var m=(img.getAttribute('src')||'').match(PLACEHOLDER_RE);
    return m ? (/-white$/.test(m[1]) ? 'logoWhite' : 'logo') : null;
  }
  function brandImg(img){
    if(!C || !(C.logo||C.logoWhite)) return;
    var kind=placeholderKind(img); if(!kind) return;
    var t = kind==='logoWhite' ? (C.logoWhite||C.logo) : (C.logo||C.logoWhite);
    if(img.getAttribute('src')!==t){ img.setAttribute('src', t); img.__zbb=null; }
    img.setAttribute('data-brand-logo', kind==='logoWhite' ? 'white' : '');
    if(img.complete && img.naturalWidth) fitLogo(img);
    else if(!img.__zlisten){ img.__zlisten=1; img.addEventListener('load', function(){ fitLogo(img); }); }
  }
  // Market desktop hero doirasi — logo o'rniga savat ikonkasi
  var CART='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="width:62%;max-width:190px;height:auto;color:#fff;opacity:.92"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg>';
  function heroCart(img){
    try{
      var c=img.closest && img.closest('[class*="h-72"][class*="place-items"]'); if(!c) return false;
      img.style.display='none';
      if(!c.querySelector('[data-zcart]')){ var w=c.ownerDocument.createElement('div'); w.setAttribute('data-zcart','1'); w.style.cssText='display:grid;place-items:center;width:100%;height:100%'; w.innerHTML=CART; c.appendChild(w); }
      return true;
    }catch(e){ return false; }
  }
  function brandNode(n){
    if(!n || n.nodeType!==1) return;
    if(n.hasAttribute('data-brand-name') && n.textContent!==NAME) n.textContent=NAME;
    var names=n.querySelectorAll('[data-brand-name]'); for(var i=0;i<names.length;i++){ if(names[i].textContent!==NAME) names[i].textContent=NAME; }
    var imgs = n.nodeName==='IMG' ? [n] : n.querySelectorAll('img');
    for(var j=0;j<imgs.length;j++){ if(placeholderKind(imgs[j]) && !heroCart(imgs[j])) brandImg(imgs[j]); }
  }

  function setTitle(doc){
    try{ if(C && doc.title && doc.title.indexOf(NAME)!==0) doc.title = NAME+' · '+doc.title; }catch(e){}
  }

  // ---- hujjatni brendlash + doimiy kuzatuv (faqat o'zgargan tugunlar; arzon, idempotent) ----
  function watch(doc){
    injectStyle(doc);
    var root=doc.documentElement; if(!root || root.__icbWatch) return; root.__icbWatch=1;
    brandNode(root); setTitle(doc);
    new MutationObserver(function(recs){
      for(var i=0;i<recs.length;i++){ var r=recs[i];
        if(r.type==='attributes') brandNode(r.target);
        else for(var j=0;j<r.addedNodes.length;j++) brandNode(r.addedNodes[j]);
      }
    }).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  }
  watch(document);
  // Bundler ilovalar (Mijoz/Investor/Agent) <html>'ni butunlay almashtiradi — yangi ildizni ham brendlaymiz.
  new MutationObserver(function(){
    if(document.documentElement && !document.documentElement.__icbWatch){ watch(document); addPricingBar(); }
  }).observe(document,{childList:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ brandNode(document.documentElement); setTitle(document); });

  // ---- ESKI KESH: brauzer eski (ZOOD'li) HTML/JS nusxasini keshdan bergan bo'lsa — fayllarni keshni chetlab
  // qayta yuklab, sahifani bir marta yangilaymiz (sessiyada bir marta; brand.js o'zi hech qachon keshlanmaydi) ----
  var STALE_RE = /zood-(logo|mark|brand|prez)|ZOODMALL|panel\.zood\.uz/;
  function healStale(){
    try{
      // har bir sahifa (iframe'lar ham) o'zini alohida tuzatadi — sessionStorage bir saytdagi oynalar uchun umumiy
      // (bir xil manzilli iframe bir sahifada bir necha marta bo'lishi mumkin — tartib raqami ham kalitda)
      var fi = -1; try { if(window.frameElement) fi = [].indexOf.call(window.parent.document.querySelectorAll('iframe'), window.frameElement); } catch(e){}
      var key = 'icb-heal:' + location.pathname + location.search + '#' + fi;
      if(sessionStorage.getItem(key)) return;
      var html = document.documentElement ? document.documentElement.outerHTML : '';
      var text = document.body ? document.body.innerText : '';
      if(!STALE_RE.test(html) && !/\bZOOD\b/.test(text)) return;
      sessionStorage.setItem(key, '1');
      var urls = [location.href];
      var els = document.querySelectorAll('script[src],link[rel="stylesheet"][href],link[rel="modulepreload"][href],iframe[src]');
      for(var i=0;i<els.length;i++){ var u = els[i].src || els[i].href; if(u && u.indexOf(location.origin)===0) urls.push(u); }
      Promise.all(urls.map(function(u){ return fetch(u, { cache:'reload', credentials:'same-origin' }).catch(function(){}); }))
        .then(function(){ location.reload(); });
    }catch(e){}
  }
  window.addEventListener('load', function(){ healStale(); setTimeout(healStale, 2500); });

  // ---- BO'LIMLAR (modullar): yoqilmagan bo'limlarni yashirish (faqat asosiy sahifa) ----
  if(isTop){
    try{
      var mods = C && C.modules, ex=document.getElementById('zmodhide');
      if(Array.isArray(mods)){
        var css='[data-mod]{display:none!important}';
        for(var i=0;i<mods.length;i++){ css+='[data-mod~="'+String(mods[i]).replace(/[^a-z0-9_]/gi,'')+'"]{display:revert!important}'; }
        if(!ex){ ex=document.createElement('style'); ex.id='zmodhide'; (document.head||document.documentElement).appendChild(ex); }
        ex.textContent=css;
      } else if(ex && ex.parentNode) ex.parentNode.removeChild(ex);
    }catch(e){}
  }

  // ---- NARX (pricing) paneli: pastda qotirilgan (faqat tashkilot sahifalarida) ----
  function addPricingBar(){
    try{
      if(!isTop || !C || window.__zpbDismissed) return;
      if(!document.body){ document.addEventListener('DOMContentLoaded', addPricingBar); return; }
      var color=C.color, el=document.getElementById('zpricing-bar');
      if(!el){
        el=document.createElement('div'); el.id='zpricing-bar';
        el.innerHTML='<div style="max-width:1120px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:14px;padding:12px 46px 12px 20px;text-align:center">'
          +'<span style="font-weight:700;font-size:14.5px;color:#fff;line-height:1.35">Platforma modullari va narxlari bilan tanishing</span>'
          +'<a href="/pricing.html" style="display:inline-flex;align-items:center;gap:7px;font-weight:800;font-size:14.5px;text-decoration:none;padding:10px 20px;border-radius:11px;background:#fff">Narxlar va tariflar &rarr;</a>'
          +'</div>'
          +'<button type="button" aria-label="Yopish" style="position:absolute;top:50%;right:14px;transform:translateY(-50%);width:28px;height:28px;border:none;border-radius:50%;background:rgba(255,255,255,.2);color:#fff;font:700 17px/1 system-ui;cursor:pointer">&times;</button>';
        el.querySelector('button').onclick=function(){ window.__zpbDismissed=true; try{ el.parentNode&&el.parentNode.removeChild(el); }catch(e){} };
      }
      el.style.cssText='position:fixed;left:0;right:0;bottom:0;width:100%;box-sizing:border-box;z-index:2147483000;background:'+color+';box-shadow:0 -6px 20px -8px rgba(0,0,0,.35)';
      el.querySelector('a').style.color=color;
      if(el.parentElement!==document.body || document.body.lastElementChild!==el) document.body.appendChild(el);
    }catch(e){}
  }
  addPricingBar();
  // kontent kech render bo'lsa (SPA) — bir necha marta qayta joylashtiramiz
  [400,1200,2500,4000].forEach(function(t){ setTimeout(addPricingBar, t); });
})();
