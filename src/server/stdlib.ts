import { HIDDEN_CLASS, DOM_ID_ATTR } from "../runtime/page";

export const TEMPLATE_ID_ATTR = 'data-refjs-template';

export const STDLIB = `<lib>

<style>
  .${HIDDEN_CLASS} {
    display: none !important;
  }
</style>

<!--- https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch -->
<:define tag=":data-source:script" type="text/json"
    :url=""
    :method="get"
    :params=[[null]]
    :headers=[[null]]
    :autoGet=[[true]]
    :content=[[null]]
    :trigger=[[() => {
      if (url) {
        _lastUrl = url;
        doRequest(url);
      }
    }]]

    :_lastUrl=""
    :_okCount=[[0]]
    :_errCount=[[0]]
    :_dataCount=[[0]]

    :handle-url=[[
      var s;
      if (url && url !== _lastUrl && autoGet) {
        _lastUrl = url;
        if (!isServer && !!(s = __dom.text)) {
          __dom.text = '';
          content = window.JSON.parse(s);
          _dataCount++;
        } else {
          doRequest(url);
        }
      }
    ]]

    :doRequest=[[(url, options, resCB, errCB) => {
        url || (url = this.url);
        resCB || (resCB = (res) => res.json());
        window.fetch && window.fetch(url, options)
          .then(resCB)
          .then(v => {
            __dom.text = isServer ? window.JSON.stringify(v) : '';
            content = v;
            _dataCount++;
            _okCount++;
          })
          .catch(e => {
            errCB
              ? errCB(e)
              : window.console.log('<:data-source>', url, e);
            _errCount++;
          });
    }]]
/>

<:define tag=":on-off:template"
    :on=[[false]]

    :handle-on=[[
      if (on) {
        ensureDomLinked();
        ensureScopeInited();
      } else {
        ensureScopeDisposed();
        ensureDomUnlinked();
      }
    ]]

    :ensureDomLinked=[[() => {
      let e = __dom.previousElementSibling;
      if (e && e.getAttribute('${TEMPLATE_ID_ATTR}') === __id) {
        return;
      }
      ` + // we need to link template dom
      `if (isServer) {
        const r = __dom.ownerDocument.createElement('div');
        r.innerHTML = __dom.content.textContent.trim();
        e = r.firstElementChild;
        __dom.innerHTML = '';
      } else {
        e = __dom.content.firstElementChild;
      }
      if (e) {
        e.remove();
        e.setAttribute('${TEMPLATE_ID_ATTR}', __id);
        __dom.parentElement.insertBefore(e, __dom);
      }
    }]]

    :ensureDomUnlinked=[[() => {
      let e;
      if (isServer) {
        ` + // happy-dom bug: previousSibling doesn't work on HTMLTemplateElement
        `const cc = window.Array.from(__dom.parentElement.children);
        const i = cc.indexOf(__dom);
        e = (i > 0 ? cc[i - 1] : null);
      } else {
        e = __dom.previousElementSibling;
      }
      if (!e || e.getAttribute('${TEMPLATE_ID_ATTR}') !== __id) {
        return;
      }
      ` + // we need to unlink template dom
      `e.remove();
      __dom.appendChild(e);
    }]]

    :ensureScopeInited=[[() => {
      if (isServer) {

      } else {

      }
    }]]

    :ensureScopeDisposed=[[() => {

    }]]
/>

</lib>`;
