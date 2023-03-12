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
    :on="[[false]]"
    :_instanceDom="[[null]]"

    :will-init=[[
      if (!isServer) {
        _instanceDom = __dom.parentElement.querySelector('[data-reflectjs-from="' + __id + '"]');
      }
    ]]

    :did_init="[[
      if (!isServer && _instanceDom && __scope.props.children) {
        const s = __scope.page.load(__scope, __scope.props.children[0]);
        __scope.page.refresh(s);
      }
    ]]"

    :handle-on="[[
      if (isServer) {
        if (on) {
          const div = __dom.ownerDocument.createElement('div');
          div.innerHTML = __dom.innerHTML.trim();
          let e = div.firstElementChild;
          if (e) {
            e.remove();
            e.setAttribute('data-reflectjs-from', __id);
            __dom.parentElement.insertBefore(e, __dom);
            __dom.innerHTML = '';
            if (__scope.props.children) {
              const s = __scope.page.load(__scope, __scope.props.children[0]);
              __scope.page.refresh(s);
            }
          }
        }
      } else {
        if (on && !_instanceDom) {
          const e = __dom.content.firstElementChild;
          if (e) {
            _instanceDom = e;
            e.remove();
            e.setAttribute('data-reflectjs-from', __id);
            __dom.parentElement.insertBefore(e, __dom);
            if (__scope.props.children) {
              const s = __scope.page.load(__scope, __scope.props.children[0]);
              __scope.page.refresh(s);
            }
          }
        } else if (!on && _instanceDom) {
          while (__scope.children.length > 0) {
            __scope.children[0].dispose();
          }
          __dom.content.appendChild(_instanceDom);
          _instanceDom = null;
        }
      }
    ]]"
/>

</lib>`;
