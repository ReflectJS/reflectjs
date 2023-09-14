import { PROPS_SCRIPT_ID, Page, PageProps } from "../runtime/page";

export function loadClientPage(win: any): Page | undefined {
  const e = win.document.getElementById(PROPS_SCRIPT_ID) as Element;
  if (!e) {
    return undefined;
  }
  try {
    const json = e.textContent;
    const props = win.eval(`(${json})`) as PageProps;
    const page = new Page(win as any, win.document.documentElement as any, props);
    page.refresh();
    return page;
  } catch (ignored) {}
}
