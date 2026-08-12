/**
 * Fixed jhaddix-style endpoint bookmarklet.
 * - Waits for all script fetches (no 3s race)
 * - Capture-group regex (no flaky lookbehinds)
 * - Renders overlay after Promise.allSettled
 * Credit: https://gist.github.com/jhaddix/daba27d11fdd97d9077d610dccbe91df
 */
const BOOKMARKLET_BODY = `(function(){
  var pathRe=/["'\`](\\/[A-Za-z0-9_?&=\\/\\-#.%]*(?:\\?[A-Za-z0-9_&=%.-]*)?)["'\`]/g;
  var jsRe=/["'\`]((?:https?:\\/\\/|\\/)[^"'\`\\s]+\\.js(?:\\?[^"'\`]*)?)["'\`]/gi;
  var endpoints=new Set();
  var jsFiles=new Set();
  var paramMap=new Map();
  function remember(ep,src){
    var q=ep.split("?")[1];
    if(!q)return;
    q.split("&").forEach(function(p){
      var k=p.split("=")[0];
      if(!k)return;
      if(!paramMap.has(k))paramMap.set(k,new Set());
      paramMap.get(k).add(src);
    });
  }
  function process(t,src){
    var m,a=new RegExp(pathRe.source,"g"),b=new RegExp(jsRe.source,"gi");
    while((m=a.exec(t))){endpoints.add(m[1]);remember(m[1],src);}
    while((m=b.exec(t)))jsFiles.add(m[1]);
  }
  var jobs=Array.prototype.slice.call(document.scripts).map(function(s){
    if(s.src){
      jsFiles.add(s.src);
      return fetch(s.src).then(function(r){return r.text();}).then(function(text){
        process(text,s.src);
      }).catch(function(err){console.warn("js-endpoint fetch failed",s.src,err);});
    }
    if(s.textContent)process(s.textContent,"inline");
    return Promise.resolve();
  });
  process(document.documentElement.outerHTML,"page");
  Promise.allSettled(jobs).then(function(){
    var div=document.createElement("div");
    div.style.cssText="position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#0b1020;color:#e8ecf8;padding:24px;font:14px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
    function card(v){return '<div style="margin:8px 0;padding:10px 12px;border-left:3px solid #7c8cff;background:#151b2f;border-radius:8px">'+v+"</div>";}
    var html='<h1 style="font:600 20px system-ui;margin:0 0 12px">Endpoints '+endpoints.size+'</h1><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    Array.from(endpoints).sort().forEach(function(ep){
      var full=ep.indexOf("http")===0?ep:location.origin+ep;
      html+=card("<div>"+ep+'</div><a href="'+full+'" target="_blank" rel="noreferrer" style="color:#9db0ff">'+full+"</a>");
    });
    html+='</div><h2 style="font:600 16px system-ui;margin:20px 0 8px">Parameters '+paramMap.size+"</h2>";
    Array.from(paramMap.entries()).sort(function(a,b){return a[0].localeCompare(b[0]);}).forEach(function(entry){
      html+=card("<b>"+entry[0]+'</b><div style="opacity:.7;font-size:12px">'+Array.from(entry[1]).join(", ")+"</div>");
    });
    html+='<h2 style="font:600 16px system-ui;margin:20px 0 8px">JS files '+jsFiles.size+"</h2>";
    Array.from(jsFiles).sort().forEach(function(f){
      var full=(f.indexOf("http")===0||f.indexOf("//")===0)?f:location.origin+f;
      html+=card('<a href="'+full+'" target="_blank" rel="noreferrer" style="color:#9db0ff">'+f+"</a>");
    });
    div.innerHTML=html;
    var btn=document.createElement("button");
    btn.textContent="Close";
    btn.style.cssText="position:fixed;top:12px;right:12px;background:#7c8cff;color:#0b1020;border:0;border-radius:8px;padding:10px 16px;font:600 13px system-ui;cursor:pointer";
    btn.onclick=function(){div.remove();};
    document.body.appendChild(div);
    div.appendChild(btn);
  });
})();`;

export function jsEndpointBookmarklet() {
  return `javascript:${BOOKMARKLET_BODY.replace(/\s+/g, " ").trim()}`;
}
