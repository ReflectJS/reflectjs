import { loadClientPage } from "./client-impl";
import { PAGE_JS_ID, PAGE_READY_CB } from "../runtime/page";

(window as any)[PAGE_JS_ID] = loadClientPage(window);
(window as any)[PAGE_READY_CB] && (window as any)[PAGE_READY_CB]();
