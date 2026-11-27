import type { PipelineInput, PipelineOutput } from '../services/pipeline/pipelineOrchestrator';
import { runPrivacyPipeline } from '../services/pipeline/pipelineOrchestrator';

self.onmessage = (event: MessageEvent<{ requestId: string; input: PipelineInput }>) => {
  // Dedicated workers receive empty-string origin per HTML spec; reject unexpected cross-origin senders.
  if (event.origin !== '' && event.origin !== self.location.origin) {
    return;
  }
  if (!event.data || typeof event.data.requestId !== 'string' || !event.data.input) {
    return;
  }
  const { requestId, input } = event.data;
  try {
    const result: PipelineOutput = runPrivacyPipeline(input);
    self.postMessage({ requestId, ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Worker processing failed';
    self.postMessage({ requestId, ok: false, error: message });
  }
};
