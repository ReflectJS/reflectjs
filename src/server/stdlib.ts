export const STDLIB = `<lib>

<!--- https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch -->
<:define tag=":data-source:script"
    :url=""
    :method="get"
    :params=[[null]]
    :headers=[[null]]
    :autoGet=[[true]]
    :content=[[null]]

    :_lastUrl=""

    :handle-url=[[
      if (url && url !== _lastUrl && autoGet) {
        _lastUrl = url;
        doRequest(url);
      }
    ]]

    :doRequest=[[(url, options, resCB, errCB) => {
        url || (url = this.url);
        resCB || (resCB = (res) => res.json());
        window.fetch(url, options)
          .then(resCB)
          .then(v => content = v)
          .catch(e => {
            errCB
              ? errCB(e)
              : window.console.log('<:data-source>', url, e);
          });
    }]]
/>

</lib>`;
