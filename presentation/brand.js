/* ZOODMALL prezentatsiya — brend theming engine (rang + logo).
   Brend manbai: localStorage['zood-brand'] -> ?brand= -> subdomen /api/brand.
   Config bo'lmasa HECH NARSA qilmaydi (standart ZOOD saqlanadi).
   Parent (asosiy sahifa) o'zini VA barcha same-origin iframe'larni ranglaydi. */
(function(){
  var isTop = (window.self === window.top);

  function subdomain(){
    var h = location.hostname, parts = h.split('.');
    if(parts.length < 3) return null;
    var s = parts[0];
    if(['zoodprez','www','paperco','api','admin','superadmin'].indexOf(s) >= 0) return null;
    return s;
  }
  function fromLocal(){ try { var c = JSON.parse(localStorage.getItem('zood-brand')||'null'); return (c && c.color) ? c : null; } catch(e){ return null; } }
  function getConfig(cb){
    var c = fromLocal(); if(c) return cb(c);
    var m=(location.search.match(/[?&]brand=([0-9a-fA-F]{6})/)||[])[1]; if(m) return cb({color:'#'+m});
    var sub = subdomain();
    if(!sub){ if(isTop){ try{localStorage.removeItem('zood-brand');}catch(e){} } return cb(null); }
    fetch('/api/brand?sub='+encodeURIComponent(sub)).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
      if(d && d.color){ try{ localStorage.setItem('zood-brand', JSON.stringify(d)); }catch(e){} cb(d); }
      else { if(isTop){ try{localStorage.removeItem('zood-brand');}catch(e){} } cb(null); }
    }).catch(function(){ cb(fromLocal()); });
  }

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

  function marketCSS(P){
    var sh=['50','100','200','300','400','500','600','700','800','900','950'], css='';
    sh.forEach(function(s){ var c=P[s];
      css+='.bg-brand-'+s+'{background-color:'+c+' !important}.text-brand-'+s+'{color:'+c+' !important}.border-brand-'+s+'{border-color:'+c+' !important}.ring-brand-'+s+'{--tw-ring-color:'+c+' !important}.accent-brand-'+s+'{accent-color:'+c+' !important}.fill-brand-'+s+'{fill:'+c+' !important}.stroke-brand-'+s+'{stroke:'+c+' !important}';
      css+='.from-brand-'+s+'{--tw-gradient-from:'+c+' !important;--tw-gradient-to:'+c+'00 !important;--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to) !important}';
      css+='.via-brand-'+s+'{--tw-gradient-to:'+c+'00 !important;--tw-gradient-stops:var(--tw-gradient-from),'+c+',var(--tw-gradient-to) !important}';
      css+='.to-brand-'+s+'{--tw-gradient-to:'+c+' !important}';
    });
    css+='.bg-brand-deep{background-image:radial-gradient(120% 120% at 15% 0%,'+P['700']+','+P['800']+' 45%,'+P['950']+') !important}';
    // text-iridescent = to'q hero fonidagi SARLAVHA matni -> OCH soyalar (aks holda qizil fonда qizil matn ko'rinmaydi)
    css+='.text-iridescent{background-image:linear-gradient(115deg,'+P['200']+','+P['100']+','+P['200']+' 52%,'+P['300']+' 74%,'+P['100']+') !important}';
    // bg-iridescent = to'ldirilган fon (pill/badge) -> o'rta soyalar
    css+='.bg-iridescent{background-image:linear-gradient(115deg,'+P['400']+','+P['300']+','+P['500']+') !important}';
    css+='.bg-iris-lav\\/30{background-color:'+P['200']+'4d !important}.bg-iris-mint\\/20{background-color:'+P['200']+'33 !important}.bg-iris-mint\\/30{background-color:'+P['200']+'4d !important}.bg-iris-peri\\/25{background-color:'+P['300']+'40 !important}';
    css+='.glowen-bullet-active{background:linear-gradient(115deg,'+P['400']+','+P['300']+') !important}';
    css+='.text-brand-900\\/50{color:'+P['800']+'99 !important}.border-brand-400\\/20{border-color:'+P['400']+'33 !important}.hover\\:border-brand-200\\/80:hover{border-color:'+P['200']+'cc !important}';
    return css;
  }

  function apply(C){
    if(!C) return;
    var P = palette(C.color), BASE = C.color, ACC2 = C.color2 || P['500'];
    var mcss = marketCSS(P);
    var NAME = (C.name||'').trim();

    function setVars(rootEl){
      var r=rootEl.style;
      r.setProperty('--accent', BASE); r.setProperty('--accent-2', ACC2);
      r.setProperty('--accent-press', P['700']); r.setProperty('--accent-soft', P['50']); r.setProperty('--accent-ink', P['700']);
      r.setProperty('--soft', P['50']);
      r.setProperty('--teal', BASE); r.setProperty('--teal2', ACC2); r.setProperty('--teald', P['700']);
      // --brand konvensiyasi (Investor/Mijoz: var(--brand) + color-mix tuslamalar)
      r.setProperty('--brand', BASE);
      // to'q brend fonlari (gradientlar)
      r.setProperty('--brand-d1', P['800']); r.setProperty('--brand-d2', P['950']); r.setProperty('--brand-d0', P['700']);
    }
    function injectStyle(doc, id, css){ try{ var el=doc.getElementById(id); if(!el){ el=doc.createElement('style'); el.id=id; (doc.head||doc.documentElement).appendChild(el); } if(el.textContent!==css) el.textContent=css; }catch(e){} }
    function isMarketDoc(doc){ try{ return !!doc.querySelector('[class*="brand-"]'); }catch(e){ return false; } }
    // fon yorug'ligini (luminance) hisoblash -> och/to'q logoni tanlash
    function lumOf(c){ var m=(c||'').match(/(\d+(?:\.\d+)?)/g); if(!m||m.length<3) return 1; var a=(m.length>3)?parseFloat(m[3]):1; if(a===0) return -1; return (0.2126*m[0]+0.7152*m[1]+0.0722*m[2])/255; }
    function bgLumBehind(el, doc){ var node=el, vw=doc.defaultView||window; while(node && node.nodeType===1){ try{ var L=lumOf(vw.getComputedStyle(node).backgroundColor); if(L>=0) return L; }catch(e){} node=node.parentNode; } return 1; }
    function pickLogo(el, doc){ var L=bgLumBehind(el.parentNode||el, doc); if(L<0.5) return (C.logoWhite||C.logo); return (C.logo||C.logoWhite); }
    function mkLogoImg(doc, src, h){ var im=doc.createElement('img'); im.src=src; im.setAttribute('data-zbrandlogo','1'); im.style.cssText='height:'+h+'px;width:auto;max-width:170px;object-fit:contain;display:inline-block;vertical-align:middle'; return im; }
    // ---- LOGO AUTOFIT: shaffof (transparent) padding kompensatsiyasi + mobil o'lcham ----
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
    function zFitOne(img){
      try{
        var cdoc=img.ownerDocument||document;
        // bbox (shaffof chegara) — bir marta o'lchaymiz, keshlaymiz
        if(!img.__zbb || img.__zbbsrc!==img.src){ img.__zbb=zAlphaBBox(img); img.__zbbsrc=img.src; }
        var bb=img.__zbb; if(!bb) return;
        // Logo hamma app'da bir xil VIZUAL o'lchamda ko'rinishi uchun iframe scale'ini kompensatsiya qilamiz.
        var scale=zDocScale(cdoc);
        // Prezentatsiyaning O'ZIDA (iframe ichida emas) logoga kattaroq budjet
        // beriladi: nav balandligi 70px, joy bor. Tik (belgi + yozuv ustma-ust)
        // logolar balandligi bo'yicha cheklanadi, shuning uchun 33px budjetda
        // yonidagi matnga nisbatan juda kichkina chiqardi. Iframe ichidagi app
        // header'lari ixcham bo'lgani uchun ular avvalgi o'lchamda qoladi.
        var inFrame=false; try{ inFrame=!!((cdoc.defaultView||window).frameElement); }catch(e){}
        var TH=inFrame?33:48, TW=inFrame?150:200;
        var H=Math.round(Math.max(22, Math.min(220, TH/scale)));
        var MW=Math.round(Math.max(80, Math.min(600, TW/scale))), FILL=0.9;
        var slot=img.parentNode, wrapped=(slot&&slot.getAttribute&&slot.getAttribute('data-zlogoslot')==='1');
        if(!wrapped){ slot=cdoc.createElement('span'); slot.setAttribute('data-zlogoslot','1'); img.parentNode.insertBefore(slot,img); slot.appendChild(img); }
        var k=(H*FILL)/bb.h; if(bb.w*k>MW) k=MW/bb.w;
        var cw=bb.w*k, ch=bb.h*k, sw=Math.min(Math.ceil(cw+(H-ch)),MW); if(sw<cw) sw=Math.ceil(cw);
        slot.style.cssText='position:relative;display:inline-block;flex:0 0 auto;height:'+H+'px;width:'+sw+'px;overflow:hidden;vertical-align:middle';
        img.style.cssText='position:absolute;width:'+(bb.nW*k)+'px;height:'+(bb.nH*k)+'px;max-width:none;left:'+(-(bb.x*k)+(sw-cw)/2)+'px;top:'+(-(bb.y*k)+(H-ch)/2)+'px';
        try{ img.style.setProperty('opacity','1','important'); }catch(e){}
      }catch(e){}
    }
    function fitBrandLogos(doc){
      try{ var vw=doc.defaultView||window; var ims=doc.querySelectorAll('img[data-zbrandlogo],img[data-zfitlogo]');
        for(var i=0;i<ims.length;i++){ (function(im){
          var slot=(im.parentNode&&im.parentNode.getAttribute&&im.parentNode.getAttribute('data-zlogoslot')==='1')?im.parentNode:null;
          var hidden=false; try{ hidden=(vw.getComputedStyle(im).display==='none'); }catch(e){}
          // Yashirin variant (masalan to'q fon uchun OQ logo) — slot joy egallamasligi kerak, aks holda yozuv siqilib qoladi
          if(hidden){ if(slot) slot.style.display='none'; return; }
          if(slot && slot.style.display==='none') slot.style.display='inline-block';
          if(im.complete&&im.naturalWidth) zFitOne(im);              // har passda qayta moslaymiz (scale barqarorlashadi)
          else if(!im.__zlisten){ im.__zlisten=1; im.addEventListener('load',function(){ zFitOne(im); },{once:true}); }
        })(ims[i]); }
      }catch(e){}
    }
    // Mobil header'da tenant NOMI (matn) juda katta bo'lmasligi uchun — logo rasm bo'lmaganda ishlaydi
    // Logo (rasm) bo'lmaganda header'da chiqadigan tenant NOMI (matn) juda katta bo'lmasin —
    // viewport'ga bog'liq emas (iframe/scale bo'lsa ham), barcha app'larda bir xil.
    function capBrandText(doc){
      try{
        if(!NAME) return;
        var vw=(doc.defaultView||window);
        function capEl(el){
          try{
            if(!el) return;
            if(el.querySelector && el.querySelector('img,svg,[data-zlogoslot]')) return; // ichida logo/rasm bor
            if(el.children && el.children.length>0) return;                                // faqat barg matn
            var t=(el.textContent||'').trim(); if(!t || t.length>(NAME.length+6)) return;
            var fs=parseFloat(vw.getComputedStyle(el).fontSize)||0;
            if(fs>24){ el.style.setProperty('font-size','22px','important'); el.style.setProperty('line-height','1.2','important'); el.style.setProperty('letter-spacing','normal','important'); }
          }catch(e){}
        }
        // 1) brand/logo/wordmark klassli qutilar
        var els=doc.querySelectorAll('[class~="logo"],[class*="brandmark"],[class*="logomark"],[class*="applogo"],[class*="brand-logo"],[class*="navbar-brand"],[class*="wordmark"],[class*="brand-name"]');
        for(var i=0;i<els.length;i++) capEl(els[i]);
        // 2) tepadagi (header) katta "NOM" matni — klassiz bo'lsa ham
        var heads=doc.querySelectorAll('h1,h2,h3,a,span,div,b,strong,p');
        for(var j=0;j<heads.length;j++){ var el=heads[j];
          if(el.children.length) continue;
          if((el.textContent||'').trim()!==NAME) continue;
          var r; try{ r=el.getBoundingClientRect(); }catch(e){ continue; }
          if(r.top>170) continue; // faqat header (sahifa tepasi)
          capEl(el);
        }
      }catch(e){}
    }
    function swapLogos(doc){
      if(!C.logo && !C.logoWhite) return;
      try{
        // 1) <img> logolar -> tenant logosi (kattaroq: 40px)
        var imgs=doc.querySelectorAll('img');
        for(var i=0;i<imgs.length;i++){ var im=imgs[i]; if(im.getAttribute('data-zbrandlogo')) continue;
          if(im.getAttribute('data-nobrand')) continue; // ICAN logosi kabi — hech qachon almashtirilmaydi
          // market desktop hero grafikasi (h-72 w-72 place-items-center) — bu logo emas, savat ikonkasi bo'ladi
          if(im.closest && im.closest('[class*="h-72"][class*="place-items"]')) continue;
          var src=(im.getAttribute('src')||''); var t=null;
          if(/white/i.test(src)) t=(C.logoWhite||C.logo);
          else if(/zood-logo|zood-mark|logo|brand/i.test(src) || im.getAttribute('alt')==='ZOOD' || im.getAttribute('alt')==='ZOODMALL' || (NAME && im.getAttribute('alt')===NAME)) t=(C.logo||C.logoWhite);
          if(t && im.src!==t){ im.src=t; im.style.objectFit='contain'; im.style.setProperty('opacity','1','important'); // FOUC yashirishdan keyin ko'rsatamiz
            // BARCHA brend logolari (brandlogo ham) autofit qilinadi — o'lchamни zFitOne (scale + padding) boshqaradi.
            im.setAttribute('data-zfitlogo','1');
          }
        }
        // 2) CSS wordmark/monogramm qutilari (rangli fon + qisqa matn) -> logo rasm; fon shaffof qilinadi (bg bor/yo'q logoga moslashadi)
        var boxes=doc.querySelectorAll('[class~="logo"],[class*="brandmark"],[class*="logomark"],[class*="applogo"],[class*="brand-logo"],[class*="navbar-brand"]');
        for(var k=0;k<boxes.length;k++){ var el=boxes[k];
          // shu quti yonida (konteynerda) allaqachon HAQIQIY <img> logo bormi? bo'lsa -> dublikat: kichik qutini yashiramiz
          var container=el.parentElement, sibImg=false;
          if(container){ var cims=container.querySelectorAll('img'); for(var s=0;s<cims.length;s++){ if(!el.contains(cims[s]) && !cims[s].getAttribute('data-zbrandlogo')){ sibImg=true; break; } } }
          var ex = el.querySelector ? el.querySelector('img[data-zbrandlogo]') : null;
          if(sibImg){ if(ex){ try{ el.removeChild(ex); }catch(e){} } el.style.display='none'; continue; }
          if(ex){ var t2=pickLogo(el,doc); if(t2 && ex.src!==t2) ex.src=t2; continue; }
          if(el.querySelector && el.querySelector('img')) continue;
          if(el.children && el.children.length>0) continue; // faqat barg (leaf) matn-qutilar; konteynerlarni buzmaymiz
          var txt=(el.textContent||'').trim(); if(!txt || txt.length>(NAME?NAME.length+6:14)) continue;
          var target=pickLogo(el,doc); if(!target) continue;
          // wordmark-quti logosini kattaroq qilamiz: quti balandligiga (yoki konteynerga) moslab
          var boxH=el.clientHeight||0; try{ if((!boxH||boxH<10)&&el.parentElement) boxH=el.parentElement.clientHeight||0; }catch(e){}
          var h=Math.round(boxH>10 ? Math.max(26, Math.min(36, boxH*0.8)) : 36);
          el.textContent='';
          el.style.background='transparent'; el.style.backgroundColor='transparent'; el.style.padding='0'; el.style.minWidth='0'; el.style.borderRadius='0'; el.style.boxShadow='none';
          el.appendChild(mkLogoImg(doc, target, h));
        }
        // 3) barcha brend logolarini vizual jihatdan bir xil o'lchamga moslaymiz (shaffof padding kompensatsiyasi)
        fitBrandLogos(doc);
      }catch(e){}
    }
    // Market desktop hero doirasiga katta savat (cart) ikonkasini qo'yish (logo o'rniga)
    var CART='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="width:62%;max-width:190px;height:auto;color:#fff;opacity:.92"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg>';
    function marketHeroCart(doc){
      try{
        var circles=doc.querySelectorAll('[class*="h-72"][class*="place-items"]');
        for(var i=0;i<circles.length;i++){ var c=circles[i];
          var r=c.getBoundingClientRect(); if(r.width<120) continue;             // faqat katta grafik doira
          // ichidagi almashtirilgan logolarni yashiramiz
          var lg=c.querySelectorAll('img'); for(var j=0;j<lg.length;j++){ lg[j].style.display='none'; }
          if(c.querySelector('[data-zcart]')) continue;                          // allaqachon savat bor
          var wrap=doc.createElement('div'); wrap.setAttribute('data-zcart','1');
          wrap.style.cssText='display:grid;place-items:center;width:100%;height:100%';
          wrap.innerHTML=CART;
          c.appendChild(wrap);
        }
      }catch(e){}
    }
    // ---- matn (wordmark) almashtirish: "ZOODMALL"/"ZOOD" -> tashkilot nomi ----
    function reword(s){ if(!s) return s; return s.replace(/ZOODMALL/gi, NAME).replace(/ZOOD\s*MALL/gi, NAME).replace(/ZOOD/gi, NAME); }
    function renameDoc(doc){
      if(!NAME) return;
      try{
        // 1) matn tugunlari (script/style'dan tashqari)
        var w=doc.createTreeWalker(doc.body||doc.documentElement, NodeFilter.SHOW_TEXT, null, false), n, list=[];
        while(n=w.nextNode()){ var p=n.parentNode; if(!p) continue; var tg=p.nodeName; if(tg==='SCRIPT'||tg==='STYLE'||tg==='NOSCRIPT'||tg==='TEXTAREA') continue; list.push(n); }
        for(var i=0;i<list.length;i++){ var v=list[i].nodeValue; if(v && /ZOOD/i.test(v)){ var nv=reword(v); if(nv!==v) list[i].nodeValue=nv; } }
        // 2) xavfsiz atributlar
        ['alt','title','aria-label','placeholder'].forEach(function(a){
          var els=doc.querySelectorAll('['+a+']'); for(var j=0;j<els.length;j++){ var av=els[j].getAttribute(a); if(av && /ZOOD/i.test(av)){ var nav=reword(av); if(nav!==av) els[j].setAttribute(a,nav); } }
        });
        // 3) yakka "Z" monogramm qutilari (logo) -> nom bosh harfi — OG'IR skan, har hujjat uchun BIR marta
        if(doc.documentElement && !doc.documentElement.__zmono){ doc.documentElement.__zmono=1;
          var mono=NAME.charAt(0).toUpperCase();
          var leafs=doc.querySelectorAll('div,span,b,strong,a,p,h1,h2,h3,h4,em,i');
          for(var k=0;k<leafs.length;k++){ var el=leafs[k]; if(el.children.length===0 && (el.textContent||'').trim()==='Z'){ el.textContent=mono; } }
        }
      }catch(e){}
    }
    var svgcss = '[fill="#2E3192"],[fill="#2e3192"]{fill:'+BASE+' !important}[stroke="#2E3192"],[stroke="#2e3192"]{stroke:'+BASE+' !important}'
      + '[fill="#4A4FC4"],[fill="#4a4fc4"]{fill:'+ACC2+' !important}[stroke="#4A4FC4"],[stroke="#4a4fc4"]{stroke:'+ACC2+' !important}'
      + '[fill="#262878"]{fill:'+P['700']+' !important}[stroke="#262878"]{stroke:'+P['700']+' !important}'
      + '[fill="#242373"],[fill="#242373"]{fill:'+P['700']+' !important}[stroke="#242373"]{stroke:'+P['700']+' !important}';
    var HEXMAP={'#2e3192':BASE,'#4a4fc4':ACC2,'#262878':P['700'],'#242373':P['700'],'#23276f':P['700'],'#282c7d':P['700']};
    // --brand konvensiyasi (Investor/Mijoz bundler ilovalari): .app'ga inline injektsiya bo'lsa ham !important bilan ustidan yozamiz.
    // color-mix tuslamalar (--brand-600/700/soft/tint) --brand'dan avtomatik qayta hisoblanadi.
    // Faqat --brand va --accent'ni majburlaymiz; --brand-600/700/soft/tint ilovaning o'z color-mix'idan --brand asosida qayta hisoblanadi.
    var brandVarCSS = ':root,.app{--brand:'+BASE+' !important;--accent:'+BASE+' !important}';
    function svgAttr(doc){
      try{
        ['fill','stroke'].forEach(function(a){
          var els=doc.querySelectorAll('['+a+']');
          for(var i=0;i<els.length;i++){ var v=(els[i].getAttribute(a)||'').toLowerCase(); if(HEXMAP[v] && els[i].getAttribute(a)!==HEXMAP[v]) els[i].setAttribute(a, HEXMAP[v]); }
        });
      }catch(e){}
    }
    var HEAVY_CAP = 12;   // OG'IR skanlar (svgAttr/swapLogos/rename/cart) faqat dastlabki N passda; keyin ranglash CSS orqali avtomatik
    function themeDoc(doc){
      if(!doc || !doc.documentElement) return;
      var el = doc.documentElement;
      // ARZON qism (har doim): CSS o'zgaruvchilari + uslublar — yangi elementlar avtomatik ranglanadi
      setVars(el);
      injectStyle(doc, 'zood-brand-svg', svgcss);
      injectStyle(doc, 'zood-brand-var', brandVarCSS);
      var market = isMarketDoc(doc);
      if(market) injectStyle(doc, 'zood-brand-market', mcss);
      // OG'IR qism (faqat dastlabki passlarда — DOM to'lguncha): keyin CSS yetarli
      var n = (el.__zpass = (el.__zpass||0) + 1);
      if(n <= HEAVY_CAP){
        svgAttr(doc);
        swapLogos(doc);
        marketHeroCart(doc);
        renameDoc(doc);
        capBrandText(doc); // mobil header'da tenant nomi (matn) juda katta bo'lib ketmasin
      }
      try{ el.__zthemed=1; }catch(e){}
    }
    // Har hujjatga DEBOUNCE'langan kuzatuvchi — DOM o'zgarganда qayta rangla, SOZLANGACH (settling) kuzatuvni TO'XTATADI (animatsiyа-og'ir market sekinlashmaydi)
    function observeDoc(doc){
      try{
        var el=doc.documentElement; if(!el || el.__zobs) return; el.__zobs=1;
        var timer=null;
        var mo=new MutationObserver(function(){ if(timer) return; timer=setTimeout(function(){ timer=null; themeDoc(doc);
          if((doc.documentElement.__zpass||0) > HEAVY_CAP+3){ try{ mo.disconnect(); }catch(e){} } // settling tugadi -> kuzatishni to'xtatamiz
        }, 250); });
        mo.observe(el,{childList:true,subtree:true});
      }catch(e){}
    }

    // ---- BO'LIMLAR (modullar): yoqilmagan bo'limlarni yashirish (faqat asosiy sahifa) ----
    function setModStyle(mods){
      if(!isTop) return;
      try{
        var ex=document.getElementById('zmodhide');
        if(!Array.isArray(mods)){ if(ex&&ex.parentNode) ex.parentNode.removeChild(ex); return; } // konfiguratsiyada modul yo'q -> hammasi ko'rinadi
        var css='[data-mod]{display:none!important}';
        for(var i=0;i<mods.length;i++){ css+='[data-mod~="'+String(mods[i]).replace(/[^a-z0-9_]/gi,'')+'"]{display:revert!important}'; }
        if(!ex){ ex=document.createElement('style'); ex.id='zmodhide'; (document.head||document.documentElement).appendChild(ex); }
        if(ex.textContent!==css) ex.textContent=css;
      }catch(e){}
    }
    setModStyle(C.modules);

    // ---- NARX (pricing) havolasi: pastda qotirilgan (fixed) to'liq kenglikdagi panel ----
    // Fixed pozitsiya sahifa tuzilishiga bog'liq emas — har qanday layoutda to'g'ri, siqilmaydi.
    function addPricingBar(color){
      try{
        if(!isTop) return;
        if(window.__zpbDismissed) return;
        if(!document.body){ document.addEventListener('DOMContentLoaded', function(){ addPricingBar(color); }); return; }
        var id='zpricing-bar', href='/pricing.html';
        var el=document.getElementById(id);
        if(!el){
          el=document.createElement('div');
          el.id=id;
          el.setAttribute('data-zbrand-ui','1');
          el.innerHTML='<div style="max-width:1120px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:14px;padding:12px 46px 12px 20px;text-align:center">'
            +'<span style="font-weight:700;font-size:14.5px;color:#fff;line-height:1.35">Platforma modullari va narxlari bilan tanishing</span>'
            +'<a href="'+href+'" style="display:inline-flex;align-items:center;gap:7px;font-weight:800;font-size:14.5px;text-decoration:none;padding:10px 20px;border-radius:11px;background:#fff">Narxlar va tariflar &rarr;</a>'
            +'</div>'
            +'<button type="button" aria-label="Yopish" style="position:absolute;top:50%;right:14px;transform:translateY(-50%);width:28px;height:28px;border:none;border-radius:50%;background:rgba(255,255,255,.2);color:#fff;font:700 17px/1 system-ui;cursor:pointer">&times;</button>';
          var b=el.querySelector('button'); if(b) b.onclick=function(){ window.__zpbDismissed=true; try{ el.parentNode&&el.parentNode.removeChild(el); }catch(e){} };
        }
        el.style.cssText='position:fixed;left:0;right:0;bottom:0;width:100%;box-sizing:border-box;z-index:2147483000;background:'+color+';box-shadow:0 -6px 20px -8px rgba(0,0,0,.35)';
        var a=el.querySelector('a'); if(a) a.style.color=color;
        if(el.parentElement!==document.body || document.body.lastElementChild!==el){ document.body.appendChild(el); }
      }catch(e){}
    }
    addPricingBar(BASE);
    // kontent kech render bo'lsa (SPA) — bir necha marta qayta joylashtiramiz
    [400,1200,2500,4000].forEach(function(t){ setTimeout(function(){ try{ addPricingBar(BASE); }catch(e){} }, t); });

    // o'z hujjatini rangla + kuzat
    themeDoc(document); observeDoc(document);

    // PARENT: barcha same-origin iframe'larni ham rangla (o'z skriptiga bog'liq emas)
    if(isTop){
      function themeFrame(fr){ try{ var d=fr.contentDocument; if(!d) return; themeDoc(d); observeDoc(d); }catch(e){} }
      function hook(fr){ themeFrame(fr); if(!fr.__zbrand){ fr.__zbrand=1; fr.addEventListener('load', function(){ [0,150,350,700,1200].forEach(function(t){ setTimeout(function(){themeFrame(fr);}, t); }); }); } }
      function hookAll(){ var fs=document.querySelectorAll('iframe'); for(var i=0;i<fs.length;i++) hook(fs[i]); }
      function start(){ hookAll();
        // iframe src o'zgarishi (til almashganда reload) -> qayta ranglash
        try{ new MutationObserver(hookAll).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']}); }catch(e){}
        // SEKIN (har 3s) va ARZON tekshiruv: yangi iframe'lar + bundler qayta yozgan hujjatlar (marker yo'qolgan bo'lsa) — to'liq skan faqat kerak bo'lganda
        setInterval(function(){
          var fs=document.querySelectorAll('iframe');
          for(var i=0;i<fs.length;i++){ var fr=fs[i]; hook(fr);
            try{ var d=fr.contentDocument; if(d && d.documentElement && !d.documentElement.__zthemed){ themeDoc(d); observeDoc(d); } }catch(e){}
          }
        }, 3000);
      }
      if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();
    }
  }

  getConfig(apply);
})();
