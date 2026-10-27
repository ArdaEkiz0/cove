import { computeTabTriage } from '../background/triage-core';
import type { BrowserTabItem } from '../lib/types';

export interface TriageWorkerRequest {
  requestId: number;
  tabs: BrowserTabItem[];
  staleHoursThreshold: number;
}

self.onmessage = (event: MessageEvent<TriageWorkerRequest>) => {
  const { requestId, tabs, staleHoursThreshold } = event.data;
  const summary = computeTabTriage(tabs, staleHoursThreshold, Date.now());
  self.postMessage({ requestId, summary });
};
