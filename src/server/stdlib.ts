import { HIDDEN_CLASS } from "../runtime/page";

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

</lib>`;
