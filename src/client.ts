import { loadClientPage } from "./client/client-impl";
import { PAGE_JS_ID, PAGE_LOADED_EVENT } from "./runtime/page";

(window as any)[PAGE_JS_ID] = loadClientPage(window);
