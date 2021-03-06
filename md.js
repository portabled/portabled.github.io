bootME();

function bootME() {

  var scriptRootPath = 'https://portabled.github.io/';
  scriptRootPath = '';

  // avoiding double insertion
  if (window.bootME_completed) return;
  window.bootME_completed = true;

  var loadedOnce = false;

  window.onerror = function () {
    var dump = [];
    for (var i = 0; i < arguments.length;i++) dump.push(arguments[i]+(arguments[i] && arguments[i].stack ? ' '+arguments[i].stack : ''));
    alert(dump.join('\n'));
  };

  var ifr;
  var thisScript = document.scripts[document.scripts.length-1];

  var renderDIV;
  var markdownText;
  var markdownRenderHTML;

  earlyBoot();
  define_marked();
  window.onload = onload;


  function earlyBoot() {
    if (document.body) {
      elem(document.body, {
        margin: 0, padding: 0,
        height: '100%',
        overflow: 'hidden',
        border: 'none'
      });
      elem(document.documentElement, {
        margin: 0, padding: 0
      });
      ifr = createIFR();

      elem(ifr.document.body, {
        background: 'white'
      });
    }
    else {
      // injecting open comment is best to capture whitespace correctly
      // (but it will fail on a closing comment)
      //
      // the alternative is to inject opening script tag
      // (but that simply fails in Chrome altogether)
      document.write('<'+'body'+'><'+'!--');

      // hide everything if possible
      try { document.documentElement.style.color = 'white'; }
      catch (err) { }
      try { document.documentElement.style.overflow = 'hidden'; }
      catch (err) { }
    }
  }

  function onload() {

    if (loadedOnce) return;
    loadedOnce = true;

    if (!ifr) earlyBoot();

    setTimeout(function() {
      // ensure script is embedded in DOM
      if (thisScript.src) {
        var expandedScript = elem('script', document.body);
        elem(expandedScript, {
          text: makeExpandedScriptText()
        });
        thisScript.parentElement.removeChild(thisScript);
        thisScript = expandedScript;
      }

      if (!window.codemirrorPAK)
        setTimeout(function() {
          if (window.codemirrorPAK || ifr.window.codemirrorPAK) return;
          if (!ifr.window.oncodemirrorPAK) ifr.window.oncodemirrorPAK = function() {
            setText(thisScript, makeExpandedScriptText());
            ifr.window.oncodemirrorPAK = null;
          };
          beginDownloadCodeMirror();
        }, 1000);

    }, 200);

    removeUnexpectedScriptInjections();
    removeUnneededFrames();



    markdownText = markdownFromDOM();

    markdownRenderHTML = marked(markdownText);
    renderDIV = ifr.window.elem('div', {
      className: 'render',
      innerHTML: markdownRenderHTML
    }, ifr.document.body);

    // DEBUG
    window['ifr_debug'] = ifr;

    addTitle();

  }





  function addTitle() {
    var findH1 = ifr.document.getElementsByTagName('h1')[0] || ifr.document.getElementsByTagName('h2')[0];
    var titleText = findH1 ? getText(findH1) : 'Markdown document';
    document.title = titleText;

    var domTitle = ifr.window.elem('div', {
      position: window.ActiveXObject ? 'absolute' : 'fixed',
      top: 0, left: 0,
      width: '100%',
      zIndex: 1000,
      opacity: 0,
      className: 'title-bar',
      innerHTML:
        '<table style="width:100%;margin:0;padding:0;" cellspacing=0 cellpadding=0>'+
        '<tr style="margin:0;padding:0;"><td style="margin:0;padding:0;" width=99% rowspan=3></td><td width=1 valign=top></td></tr>'+
        '<tr style="margin:0;padding:0;"><td style="margin:0;padding:0;" valign=center></td></tr>'+
        '<tr style="margin:0;padding:0;"><td style="margin:0;padding:0;" valign=bottom></td></tr>'+
        '</table>'
    }, ifr.document.body);

    var cells = domTitle.getElementsByTagName('td');
    var cellTitle = cells[0];
    var cellRightTop = cells[1];
    var cellRightMid = cells[2];
    var cellRightBottom = cells[3];

    var domTitleText = ifr.window.elem('h1', {
      text: titleText,
      className: 'title-bar-title',
      whiteSpace: 'nowrap',
      overflowX: 'auto',
      overflowY: 'hidden'
    }, cellTitle);

    var forceTitle = false;

    ifr.window.onscroll = onscroll;
    window.onscroll = onscroll;
    ifr.iframe.onscroll = onscroll;
    renderDIV.onclick = onclick;
    updateTitleVisibility();

    domTitle.onclick = wrapTitleClick();


    domTitleText.onclick = wrapTitleClick(titleTextClick);

    cellRightMid.innerHTML =
      '<table><tr><td><button> Edit </button></td>'+
      '<td><button> Download </button></td>'+
      '<td><button> Upload </button></td></tr></table>';
    var editButton = cellRightMid.getElementsByTagName('button')[0];
    editButton.onclick = wrapTitleClick(editClick);
    var downloadButton = cellRightMid.getElementsByTagName('button')[1];
    downloadButton.onclick = wrapTitleClick(downloadClick);
    var uploadButton = cellRightMid.getElementsByTagName('button')[2];
    uploadButton.onclick = wrapTitleClick(uploadClick);

    var versionBar = ifr.window.elem('div', {
      innerHTML: 'Markdown&nbsp;v0.1',
      fontSize: '75%'
    }, cellRightBottom);
    // TODO: about box on versionBar click (plus licenses for CodeMirror and marked)
    



    function wrapTitleClick(handler) {
      return function (e) {
        if (!e) e = ifr.window.event;

        if (typeof e.preventDefault === 'function')
          e.preventDefault();
        if ('cancelBubble' in e)
          e.cancelBubble = true;

        if (typeof handler === 'function') return handler() || false;

        return handler || false;
      };
    }


    function titleTextClick() {
      // TODO: pop document navigation
    }

    function downloadClick() {
      var filename = 'index.md.html';
      downloadText(
        filename,
        [
          '<'+'script'+' src="'+scriptRootPath+'/md.js"'+'><'+'/'+'script'+'>\n',
          markdownText
        ]);
    }

    function downloadText(filename, textChunks) {
      try {
        var blob = new Blob(textChunks, { type: 'application/octet-stream' });
      }
      catch (blobError) {
        var win = document.createElement('iframe');
        win.style.width = '100px';
        win.style.height = '100px';
        win.style.display = 'none';
        document.body.appendChild(win);

        setTimeout(function() {
          var doc = win.document;
          doc.open();
          doc.write(content);
          doc.close();

          doc.execCommand('SaveAs', null, filename);
        }, 200);

        return;
      }

      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', filename);
      try {
        // safer save method, supposed to work with FireFox
        var evt = document.createEvent("MouseEvents");
        evt.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        a.dispatchEvent(evt);
      }
      catch (e) {
        a.click();
      }

    }

    function uploadClick() {
      // TODO: upload
      alert('upload!');
    }

    function editClick() {

      if (editDIV && editDIV.style.display === 'block') {
        applyEditsClick();
        return;
      }

      renderDIV.style.display = 'none';
      if (editDIV) {
        editDIV.style.display = 'block';
      }
      else {
        editDIV = ifr.window.elem('div', {
          position: 'absolute',
          top: '5em', bottom: 0, left: 0,
          width: '100%'
        }, ifr.document.body);
      }

      if (window.codemirrorPAK) {
        ifr.window.codemirrorPAK = window.codemirrorPAK;
        completeSwitchingToEdit();
      }
      else {
        if (ifr.window.oncodemirrorPAK) return; // already queued

        ifr.window.oncodemirrorPAK = function() {

          // embed CodeMirror into DOM
          if (!thisScript.src) {
            setText(thisScript, makeExpandedScriptText());
          }

          completeSwitchingToEdit();
        };

        beginDownloadCodeMirror();
      }
    }

    function applyEditsClick() {

      markdownRenderHTML = marked(editCM.getValue());
      renderDIV.innerHTML = markdownRenderHTML;

      renderDIV.style.display = 'block';
      editDIV.style.display = 'none';
    }

    var editDIV;
    var editCM;

    function completeSwitchingToEdit() {
      if (!editCM) {
        ifr.window.codemirrorPAK(ifr.window, ifr.document, getText, setText);
        editCM = ifr.window.CodeMirror(editDIV, { value: markdownText, mode: 'markdown' });
        editCM.getWrapperElement().style.height = '100%';
        setTimeout(function() {
          editCM.refresh();
        }, 1);
      }
      else {
        // nothing, it's already good
      }


    }

    function switchToView() {
      // TODO: hide editDIV, reapply markdown and show renderDIV
    }

    function onclick() {
      forceTitle = !forceTitle;
      updateTitleVisibility();
    }

    function onscroll() {
      if (window.ActiveXObject) {
        var top = ifr.document.body.scrollTop || ifr.window.pageYOffset || 0;
        domTitle.style.top = top+'px';
      }

      updateTitleVisibility();
    }

    function updateTitleVisibility() {
      if (forceTitle) {
        setVisibility(1);
        return;
      }

      var top = ifr.document.body.scrollTop || ifr.window.pageYOffset || 0;

      if (!top) {
        setVisibility(0);
      }
      else if (top > domTitle.offsetHeight) {
        setVisibility(1);
      }
      else {
        var v = top / domTitle.offsetHeight;
        setVisibility(v);
      }
    }

    function setVisibility(v) {
      domTitle.style.opacity = v;
    }
  }


  function beginDownloadCodeMirror() {
    var cmpakScript = ifr.document.createElement('script')
    cmpakScript.src = scriptRootPath + 'codemirror-pak.js';
    ifr.document.body.appendChild(cmpakScript);
  }

  function makeExpandedScriptText() {
    var codemirrorPAK = window.codemirrorPAK || (ifr ? ifr.window.codemirrorPAK : null);
    return 'bootME()\n\n'+bootME+
      (codemirrorPAK ? '\n\n'+codemirrorPAK : '')
  }




  function removeUnexpectedScriptInjections() {
    // ensure MITM-injected scripts are removed from DOM
    for (var i = 0; i < document.scripts.length; i++) {
      var s = document.scripts[i];
      if (s!==thisScript) {
        s.parentElement.removeChild(s);
        i--;
      }
    }
  }

  function removeUnneededFrames() {
    var iframes = document.getElementsByTagName('iframe');
    for (var i = 0; i < iframes.length; i++) {
      var f = iframes[i];
      if (f!==ifr.iframe) {
        f.parentElement.removeChild(f);
        i--;
      }
    }
  }



  function markdownFromDOM() {
    var nodes = [];
    var elementCount = 0;
    var firstPRE = null;
    for (var child = document.body.firstChild; child; child = child.nextSibling) {
      if (child.tagName) {
        if(/^(STYLE|SCRIPT|IFRAME)$/i.test(child.tagName||'')
          && (child.getAttribute('type')||'').indexOf('markdown')<0) continue;
        elementCount++;
        if (!firstPRE && /^PRE$/i.test(child.tagName))
          firstPRE = child;
      }
      nodes.push(child);
    }

    if (elementCount===1 && firstPRE)
      return firstPRE.innerHTML;

    var lines = [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (/^SCRIPT$/i.test(n.tagName||''))
        lines.push(getText(n));
      else if ('outerHTML' in n)
        lines.push(n.outerHTML);
      else if (((n.nodeType>=3 && n.nodeType<=6) || n.nodeType === 8) && n.nodeValue)
        lines.push(n.nodeValue);
    }

    return lines.join('\n');
  }


  function getText(obj) {

    if (typeof obj === 'function') {
      var result = /\/\*(\*(?!\/)|[^*])*\*\//m.exec(obj+'')[0];
      if (result) result = result.slice(2, result.length-2);
      return result;
    }
    else if (/^SCRIPT$/i.test(obj.tagName)) {
      if ('text' in obj)
        return obj.text;
      else
        return obj.innerHTML;
    }
    else if (/^STYLE$/i.test(obj.tagName)) {
      if ('text' in obj)
        return obj.text;
      else if (obj.styleSheet)
        return obj.styleSheet.cssText;
      else
        return obj.innerHTML;
    }
    else if ('textContent' in obj) {
      return obj.textContent;
    }
    else if (/^INPUT$/i.test(obj.tagName)) {
      return obj.value;
    }
    else {
      var result = obj.innerText;
      if (result) {
        // IE fixes
        result = result.replace(/\<BR\s*\>/g, '\n').replace(/\r\n/g, '\n');
      }
      return result || '';
    }
  }

  function setText(obj, text) {

    if (/^SCRIPT$/i.test(obj.tagName)) {
      if ('text' in obj)
        obj.text = text;
      else
        obj.innerHTML = text;
    }
    else if (/^STYLE$/i.test(obj.tagName)) {
      if ('text' in obj)
        obj.text = text;
      else if (obj.styleSheet)
        obj.styleSheet.cssText = text;
      else
        obj.innerHTML = text;
    }
    else if ('textContent' in obj) {
      obj.textContent = text;
    }
    else if (/^INPUT$/i.test(obj.tagName)) {
      obj.value = text;
    }
    else {
      obj.innerText = text;
    }
  }

  function elem(tag, style, parent) {
    var e = tag.tagName ? tag : this.document.createElement(tag);

    if (!parent && style && style.tagName) {
      parent = style;
      style = null;
    }

    if (style) {
      if (typeof style === 'string') {
        setText(e, style);
      }
      else {
        for (var k in style) if (style.hasOwnProperty(k)) {
          if (k === 'text') {
            setText(e, style[k]);
          }
          else if (k === 'className') {
            e.className = style[k];
          }
          else if (!(k in e.style) && k in e) {
            e[k] = style[k];
          }
          else {
            try {
              e.style[k] = style[k];
            }
            catch (err) {
              try {
                if (typeof console !== 'undefined' && typeof console.error === 'function')
                  console.error(e.tagName+'.style.'+k+'='+style[k]+': '+err.message);
              }
              catch (whatevs) {
                alert(e.tagName+'.style.'+k+'='+style[k]+': '+err.message);
              }
            }
          }
        }
      }
    }

    if (parent) {
      try {
        parent.appendChild(e);
      }
      catch (error) {
        throw new Error(error.message+' adding '+e.tagName+' to '+parent.tagName);
      }
    }

    return e;
  }

  function createIFR() {

    var ifr = elem('iframe', {
      position: 'absolute',
      left: 0, top: 0,
      width: '100%', height: '100%',
      border: 'none',
      src: 'about:blank'
    },
    this.document.body);

    var ifrwin = ifr.contentWindow || ifr.window;
    var ifrdoc = ifrwin.document;

    if (ifrdoc.open) ifrdoc.open();
    ifrdoc.write(
      '<'+'head'+'><'+'style'+'>'+getText(renderCSS)+'</'+'style'+'>\n'+
      '<'+'body'+'><'+'body'+'>');
    if (ifrdoc.close) ifrdoc.close();

    ifrwin.elem = elem;

    return {
      document: ifrdoc,
      window: ifrwin,
      iframe: ifr
    };
  }



  function renderCSS(){/*
    body {
      border: none;
      background: white;
      color: black;
      overflow: auto;
      margin: 10px;
    }

    h1,.cm-header-1 {
      font-size: 2em;
    }

    h1 {
      margin-top: 20px;
      margin-bottom: 10px;
    }

    h2,.cm-header-2 {
      font-size: 1.5em;
    }

    .render table {
      width: 100%;
      margin-top: 1em;
      margin-bottom: 1em;
    }

    .render table tr {
      background: silver;
      background: argb(0.2,0,0,0);
    }

    .title-bar {
      border-bottom: solid 1px silver;

      box-shadow: 0 0 30px 5px #DDD;
      -moz-box-shadow: 0 0 30px 5px #DDD;
      -webkit-box-shadow: 0 0 30px 5px #DDD;

      background: white;
    }

    .title-bar-title {
      margin-left: 10px;
    }

  */}


  function define_marked() {

    /**
     * marked - a markdown parser
     * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
     * https://github.com/chjj/marked
     */
    (function(){var block={newline:/^\n+/,code:/^( {4}[^\n]+\n*)+/,fences:noop,hr:/^( *[-*_]){3,} *(?:\n+|$)/,heading:/^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,nptable:noop,lheading:/^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,blockquote:/^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,list:/^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,html:/^ *(?:comment|closed|closing) *(?:\n{2,}|\s*$)/,def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,table:noop,paragraph:/^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,text:/^[^\n]+/};block.bullet=/(?:[*+-]|\d+\.)/;block.item=/^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;block.item=replace(block.item,"gm")(/bull/g,block.bullet)();block.list=replace(block.list)(/bull/g,block.bullet)("hr","\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))")("def","\\n+(?="+block.def.source+")")();block.blockquote=replace(block.blockquote)("def",block.def)();block._tag="(?!(?:"+"a|em|strong|small|s|cite|q|dfn|abbr|data|time|code"+"|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo"+"|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b";block.html=replace(block.html)("comment",/<!--[\s\S]*?-->/)("closed",/<(tag)[\s\S]+?<\/\1>/)("closing",/<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)(/tag/g,block._tag)();block.paragraph=replace(block.paragraph)("hr",block.hr)("heading",block.heading)("lheading",block.lheading)("blockquote",block.blockquote)("tag","<"+block._tag)("def",block.def)();block.normal=merge({},block);block.gfm=merge({},block.normal,{fences:/^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/,paragraph:/^/});block.gfm.paragraph=replace(block.paragraph)("(?!","(?!"+block.gfm.fences.source.replace("\\1","\\2")+"|"+block.list.source.replace("\\1","\\3")+"|")();block.tables=merge({},block.gfm,{nptable:/^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,table:/^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/});function Lexer(options){this.tokens=[];this.tokens.links={};this.options=options||marked.defaults;this.rules=block.normal;if(this.options.gfm){if(this.options.tables){this.rules=block.tables}else{this.rules=block.gfm}}}Lexer.rules=block;Lexer.lex=function(src,options){var lexer=new Lexer(options);return lexer.lex(src)};Lexer.prototype.lex=function(src){src=src.replace(/\r\n|\r/g,"\n").replace(/\t/g,"    ").replace(/\u00a0/g," ").replace(/\u2424/g,"\n");return this.token(src,true)};Lexer.prototype.token=function(src,top,bq){var src=src.replace(/^ +$/gm,""),next,loose,cap,bull,b,item,space,i,l;while(src){if(cap=this.rules.newline.exec(src)){src=src.substring(cap[0].length);if(cap[0].length>1){this.tokens.push({type:"space"})}}if(cap=this.rules.code.exec(src)){src=src.substring(cap[0].length);cap=cap[0].replace(/^ {4}/gm,"");this.tokens.push({type:"code",text:!this.options.pedantic?cap.replace(/\n+$/,""):cap});continue}if(cap=this.rules.fences.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"code",lang:cap[2],text:cap[3]});continue}if(cap=this.rules.heading.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"heading",depth:cap[1].length,text:cap[2]});continue}if(top&&(cap=this.rules.nptable.exec(src))){src=src.substring(cap[0].length);item={type:"table",header:cap[1].replace(/^ *| *\| *$/g,"").split(/ *\| */),align:cap[2].replace(/^ *|\| *$/g,"").split(/ *\| */),cells:cap[3].replace(/\n$/,"").split("\n")};for(i=0;i<item.align.length;i++){if(/^ *-+: *$/.test(item.align[i])){item.align[i]="right"}else if(/^ *:-+: *$/.test(item.align[i])){item.align[i]="center"}else if(/^ *:-+ *$/.test(item.align[i])){item.align[i]="left"}else{item.align[i]=null}}for(i=0;i<item.cells.length;i++){item.cells[i]=item.cells[i].split(/ *\| */)}this.tokens.push(item);continue}if(cap=this.rules.lheading.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"heading",depth:cap[2]==="="?1:2,text:cap[1]});continue}if(cap=this.rules.hr.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"hr"});continue}if(cap=this.rules.blockquote.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"blockquote_start"});cap=cap[0].replace(/^ *> ?/gm,"");this.token(cap,top,true);this.tokens.push({type:"blockquote_end"});continue}if(cap=this.rules.list.exec(src)){src=src.substring(cap[0].length);bull=cap[2];this.tokens.push({type:"list_start",ordered:bull.length>1});cap=cap[0].match(this.rules.item);next=false;l=cap.length;i=0;for(;i<l;i++){item=cap[i];space=item.length;item=item.replace(/^ *([*+-]|\d+\.) +/,"");if(~item.indexOf("\n ")){space-=item.length;item=!this.options.pedantic?item.replace(new RegExp("^ {1,"+space+"}","gm"),""):item.replace(/^ {1,4}/gm,"")}if(this.options.smartLists&&i!==l-1){b=block.bullet.exec(cap[i+1])[0];if(bull!==b&&!(bull.length>1&&b.length>1)){src=cap.slice(i+1).join("\n")+src;i=l-1}}loose=next||/\n\n(?!\s*$)/.test(item);if(i!==l-1){next=item.charAt(item.length-1)==="\n";if(!loose)loose=next}this.tokens.push({type:loose?"loose_item_start":"list_item_start"});this.token(item,false,bq);this.tokens.push({type:"list_item_end"})}this.tokens.push({type:"list_end"});continue}if(cap=this.rules.html.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:this.options.sanitize?"paragraph":"html",pre:cap[1]==="pre"||cap[1]==="script"||cap[1]==="style",text:cap[0]});continue}if(!bq&&top&&(cap=this.rules.def.exec(src))){src=src.substring(cap[0].length);this.tokens.links[cap[1].toLowerCase()]={href:cap[2],title:cap[3]};continue}if(top&&(cap=this.rules.table.exec(src))){src=src.substring(cap[0].length);item={type:"table",header:cap[1].replace(/^ *| *\| *$/g,"").split(/ *\| */),align:cap[2].replace(/^ *|\| *$/g,"").split(/ *\| */),cells:cap[3].replace(/(?: *\| *)?\n$/,"").split("\n")};for(i=0;i<item.align.length;i++){if(/^ *-+: *$/.test(item.align[i])){item.align[i]="right"}else if(/^ *:-+: *$/.test(item.align[i])){item.align[i]="center"}else if(/^ *:-+ *$/.test(item.align[i])){item.align[i]="left"}else{item.align[i]=null}}for(i=0;i<item.cells.length;i++){item.cells[i]=item.cells[i].replace(/^ *\| *| *\| *$/g,"").split(/ *\| */)}this.tokens.push(item);continue}if(top&&(cap=this.rules.paragraph.exec(src))){src=src.substring(cap[0].length);this.tokens.push({type:"paragraph",text:cap[1].charAt(cap[1].length-1)==="\n"?cap[1].slice(0,-1):cap[1]});continue}if(cap=this.rules.text.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"text",text:cap[0]});continue}if(src){throw new Error("Infinite loop on byte: "+src.charCodeAt(0))}}return this.tokens};var inline={escape:/^\\([\\`*{}\[\]()#+\-.!_>])/,autolink:/^<([^ >]+(@|:\/)[^ >]+)>/,url:noop,tag:/^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,link:/^!?\[(inside)\]\(href\)/,reflink:/^!?\[(inside)\]\s*\[([^\]]*)\]/,nolink:/^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,strong:/^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,em:/^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,code:/^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,br:/^ {2,}\n(?!\s*$)/,del:noop,text:/^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/};inline._inside=/(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;inline._href=/\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;inline.link=replace(inline.link)("inside",inline._inside)("href",inline._href)();inline.reflink=replace(inline.reflink)("inside",inline._inside)();inline.normal=merge({},inline);inline.pedantic=merge({},inline.normal,{strong:/^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,em:/^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/});inline.gfm=merge({},inline.normal,{escape:replace(inline.escape)("])","~|])")(),url:/^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,del:/^~~(?=\S)([\s\S]*?\S)~~/,text:replace(inline.text)("]|","~]|")("|","|https?://|")()});inline.breaks=merge({},inline.gfm,{br:replace(inline.br)("{2,}","*")(),text:replace(inline.gfm.text)("{2,}","*")()});function InlineLexer(links,options){this.options=options||marked.defaults;this.links=links;this.rules=inline.normal;this.renderer=this.options.renderer||new Renderer;this.renderer.options=this.options;if(!this.links){throw new Error("Tokens array requires a `links` property.")}if(this.options.gfm){if(this.options.breaks){this.rules=inline.breaks}else{this.rules=inline.gfm}}else if(this.options.pedantic){this.rules=inline.pedantic}}InlineLexer.rules=inline;InlineLexer.output=function(src,links,options){var inline=new InlineLexer(links,options);return inline.output(src)};InlineLexer.prototype.output=function(src){var out="",link,text,href,cap;while(src){if(cap=this.rules.escape.exec(src)){src=src.substring(cap[0].length);out+=cap[1];continue}if(cap=this.rules.autolink.exec(src)){src=src.substring(cap[0].length);if(cap[2]==="@"){text=cap[1].charAt(6)===":"?this.mangle(cap[1].substring(7)):this.mangle(cap[1]);href=this.mangle("mailto:")+text}else{text=escape(cap[1]);href=text}out+=this.renderer.link(href,null,text);continue}if(!this.inLink&&(cap=this.rules.url.exec(src))){src=src.substring(cap[0].length);text=escape(cap[1]);href=text;out+=this.renderer.link(href,null,text);continue}if(cap=this.rules.tag.exec(src)){if(!this.inLink&&/^<a /i.test(cap[0])){this.inLink=true}else if(this.inLink&&/^<\/a>/i.test(cap[0])){this.inLink=false}src=src.substring(cap[0].length);out+=this.options.sanitize?escape(cap[0]):cap[0];continue}if(cap=this.rules.link.exec(src)){src=src.substring(cap[0].length);this.inLink=true;out+=this.outputLink(cap,{href:cap[2],title:cap[3]});this.inLink=false;continue}if((cap=this.rules.reflink.exec(src))||(cap=this.rules.nolink.exec(src))){src=src.substring(cap[0].length);link=(cap[2]||cap[1]).replace(/\s+/g," ");link=this.links[link.toLowerCase()];if(!link||!link.href){out+=cap[0].charAt(0);src=cap[0].substring(1)+src;continue}this.inLink=true;out+=this.outputLink(cap,link);this.inLink=false;continue}if(cap=this.rules.strong.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.strong(this.output(cap[2]||cap[1]));continue}if(cap=this.rules.em.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.em(this.output(cap[2]||cap[1]));continue}if(cap=this.rules.code.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.codespan(escape(cap[2],true));continue}if(cap=this.rules.br.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.br();continue}if(cap=this.rules.del.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.del(this.output(cap[1]));continue}if(cap=this.rules.text.exec(src)){src=src.substring(cap[0].length);out+=escape(this.smartypants(cap[0]));continue}if(src){throw new Error("Infinite loop on byte: "+src.charCodeAt(0))}}return out};InlineLexer.prototype.outputLink=function(cap,link){var href=escape(link.href),title=link.title?escape(link.title):null;return cap[0].charAt(0)!=="!"?this.renderer.link(href,title,this.output(cap[1])):this.renderer.image(href,title,escape(cap[1]))};InlineLexer.prototype.smartypants=function(text){if(!this.options.smartypants)return text;return text.replace(/--/g,"—").replace(/(^|[-\u2014/(\[{"\s])'/g,"$1‘").replace(/'/g,"’").replace(/(^|[-\u2014/(\[{\u2018\s])"/g,"$1“").replace(/"/g,"”").replace(/\.{3}/g,"…")};InlineLexer.prototype.mangle=function(text){var out="",l=text.length,i=0,ch;for(;i<l;i++){ch=text.charCodeAt(i);if(Math.random()>.5){ch="x"+ch.toString(16)}out+="&#"+ch+";"}return out};function Renderer(options){this.options=options||{}}Renderer.prototype.code=function(code,lang,escaped){if(this.options.highlight){var out=this.options.highlight(code,lang);if(out!=null&&out!==code){escaped=true;code=out}}if(!lang){return"<pre><code>"+(escaped?code:escape(code,true))+"\n</code></pre>"}return'<pre><code class="'+this.options.langPrefix+escape(lang,true)+'">'+(escaped?code:escape(code,true))+"\n</code></pre>\n"};Renderer.prototype.blockquote=function(quote){return"<blockquote>\n"+quote+"</blockquote>\n"};Renderer.prototype.html=function(html){return html};Renderer.prototype.heading=function(text,level,raw){return"<h"+level+' id="'+this.options.headerPrefix+raw.toLowerCase().replace(/[^\w]+/g,"-")+'">'+text+"</h"+level+">\n"};Renderer.prototype.hr=function(){return this.options.xhtml?"<hr/>\n":"<hr>\n"};Renderer.prototype.list=function(body,ordered){var type=ordered?"ol":"ul";return"<"+type+">\n"+body+"</"+type+">\n"};Renderer.prototype.listitem=function(text){return"<li>"+text+"</li>\n"};Renderer.prototype.paragraph=function(text){return"<p>"+text+"</p>\n"};Renderer.prototype.table=function(header,body){return"<table>\n"+"<thead>\n"+header+"</thead>\n"+"<tbody>\n"+body+"</tbody>\n"+"</table>\n"};Renderer.prototype.tablerow=function(content){return"<tr>\n"+content+"</tr>\n"};Renderer.prototype.tablecell=function(content,flags){var type=flags.header?"th":"td";var tag=flags.align?"<"+type+' style="text-align:'+flags.align+'">':"<"+type+">";return tag+content+"</"+type+">\n"};Renderer.prototype.strong=function(text){return"<strong>"+text+"</strong>"};Renderer.prototype.em=function(text){return"<em>"+text+"</em>"};Renderer.prototype.codespan=function(text){return"<code>"+text+"</code>"};Renderer.prototype.br=function(){return this.options.xhtml?"<br/>":"<br>"};Renderer.prototype.del=function(text){return"<del>"+text+"</del>"};Renderer.prototype.link=function(href,title,text){if(this.options.sanitize){try{var prot=decodeURIComponent(unescape(href)).replace(/[^\w:]/g,"").toLowerCase()}catch(e){return""}if(prot.indexOf("javascript:")===0){return""}}var out='<a href="'+href+'"';if(title){out+=' title="'+title+'"'}out+=">"+text+"</a>";return out};Renderer.prototype.image=function(href,title,text){var out='<img src="'+href+'" alt="'+text+'"';if(title){out+=' title="'+title+'"'}out+=this.options.xhtml?"/>":">";return out};function Parser(options){this.tokens=[];this.token=null;this.options=options||marked.defaults;this.options.renderer=this.options.renderer||new Renderer;this.renderer=this.options.renderer;this.renderer.options=this.options}Parser.parse=function(src,options,renderer){var parser=new Parser(options,renderer);return parser.parse(src)};Parser.prototype.parse=function(src){this.inline=new InlineLexer(src.links,this.options,this.renderer);this.tokens=src.reverse();var out="";while(this.next()){out+=this.tok()}return out};Parser.prototype.next=function(){return this.token=this.tokens.pop()};Parser.prototype.peek=function(){return this.tokens[this.tokens.length-1]||0};Parser.prototype.parseText=function(){var body=this.token.text;while(this.peek().type==="text"){body+="\n"+this.next().text}return this.inline.output(body)};Parser.prototype.tok=function(){switch(this.token.type){case"space":{return""}case"hr":{return this.renderer.hr()}case"heading":{return this.renderer.heading(this.inline.output(this.token.text),this.token.depth,this.token.text)}case"code":{return this.renderer.code(this.token.text,this.token.lang,this.token.escaped)}case"table":{var header="",body="",i,row,cell,flags,j;cell="";for(i=0;i<this.token.header.length;i++){flags={header:true,align:this.token.align[i]};cell+=this.renderer.tablecell(this.inline.output(this.token.header[i]),{header:true,align:this.token.align[i]})}header+=this.renderer.tablerow(cell);for(i=0;i<this.token.cells.length;i++){row=this.token.cells[i];cell="";for(j=0;j<row.length;j++){cell+=this.renderer.tablecell(this.inline.output(row[j]),{header:false,align:this.token.align[j]})}body+=this.renderer.tablerow(cell)}return this.renderer.table(header,body)}case"blockquote_start":{var body="";while(this.next().type!=="blockquote_end"){body+=this.tok()}return this.renderer.blockquote(body)}case"list_start":{var body="",ordered=this.token.ordered;while(this.next().type!=="list_end"){body+=this.tok()}return this.renderer.list(body,ordered)}case"list_item_start":{var body="";while(this.next().type!=="list_item_end"){body+=this.token.type==="text"?this.parseText():this.tok()}return this.renderer.listitem(body)}case"loose_item_start":{var body="";while(this.next().type!=="list_item_end"){body+=this.tok()}return this.renderer.listitem(body)}case"html":{var html=!this.token.pre&&!this.options.pedantic?this.inline.output(this.token.text):this.token.text;return this.renderer.html(html)}case"paragraph":{return this.renderer.paragraph(this.inline.output(this.token.text))}case"text":{return this.renderer.paragraph(this.parseText())}}};function escape(html,encode){return html.replace(!encode?/&(?!#?\w+;)/g:/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function unescape(html){return html.replace(/&([#\w]+);/g,function(_,n){n=n.toLowerCase();if(n==="colon")return":";if(n.charAt(0)==="#"){return n.charAt(1)==="x"?String.fromCharCode(parseInt(n.substring(2),16)):String.fromCharCode(+n.substring(1))}return""})}function replace(regex,opt){regex=regex.source;opt=opt||"";return function self(name,val){if(!name)return new RegExp(regex,opt);val=val.source||val;val=val.replace(/(^|[^\[])\^/g,"$1");regex=regex.replace(name,val);return self}}function noop(){}noop.exec=noop;function merge(obj){var i=1,target,key;for(;i<arguments.length;i++){target=arguments[i];for(key in target){if(Object.prototype.hasOwnProperty.call(target,key)){obj[key]=target[key]}}}return obj}function marked(src,opt,callback){if(callback||typeof opt==="function"){if(!callback){callback=opt;opt=null}opt=merge({},marked.defaults,opt||{});var highlight=opt.highlight,tokens,pending,i=0;try{tokens=Lexer.lex(src,opt)}catch(e){return callback(e)}pending=tokens.length;var done=function(err){if(err){opt.highlight=highlight;return callback(err)}var out;try{out=Parser.parse(tokens,opt)}catch(e){err=e}opt.highlight=highlight;return err?callback(err):callback(null,out)};if(!highlight||highlight.length<3){return done()}delete opt.highlight;if(!pending)return done();for(;i<tokens.length;i++){(function(token){if(token.type!=="code"){return--pending||done()}return highlight(token.text,token.lang,function(err,code){if(err)return done(err);if(code==null||code===token.text){return--pending||done()}token.text=code;token.escaped=true;--pending||done()})})(tokens[i])}return}try{if(opt)opt=merge({},marked.defaults,opt);return Parser.parse(Lexer.lex(src,opt),opt)}catch(e){e.message+="\nPlease report this to https://github.com/chjj/marked.";if((opt||marked.defaults).silent){return"<p>An error occured:</p><pre>"+escape(e.message+"",true)+"</pre>"}throw e}}marked.options=marked.setOptions=function(opt){merge(marked.defaults,opt);return marked};marked.defaults={gfm:true,tables:true,breaks:false,pedantic:false,sanitize:false,smartLists:false,silent:false,highlight:null,langPrefix:"lang-",smartypants:false,headerPrefix:"",renderer:new Renderer,xhtml:false};marked.Parser=Parser;marked.parser=Parser.parse;marked.Renderer=Renderer;marked.Lexer=Lexer;marked.lexer=Lexer.lex;marked.InlineLexer=InlineLexer;marked.inlineLexer=InlineLexer.output;marked.parse=marked;if(typeof module!=="undefined"&&typeof exports==="object"){module.exports=marked}else if(typeof define==="function"&&define.amd){define(function(){return marked})}else{this.marked=marked}}).call(function(){return this||(typeof window!=="undefined"?window:global)}());

  }


}
