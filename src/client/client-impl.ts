import { PAGE_LOADED_EVENT, PROPS_SCRIPT_ID, Page, PageProps } from "../runtime/page";

export function loadClientPage(win: any, cb?: () => void): Page {
  const e = win.document.getElementById(PROPS_SCRIPT_ID) as Element;
  const json = e.textContent;
  const props = win.eval(`(${json})`) as PageProps;
  const page = new Page(win as any, win.document.documentElement as any, props);
  page.refresh();
  cb && cb();
  return page;
}
