import type { PipelineInput, PipelineOutput } from '../services/pipeline/pipelineOrchestrator';
import { runPrivacyPipeline } from '../services/pipeline/pipelineOrchestrator';

self.onmessage = (event: MessageEvent<{ requestId: string; input: PipelineInput }>) => {
  const { requestId, input } = event.data;
  try {
    const result: PipelineOutput = runPrivacyPipeline(input);
    self.postMessage({ requestId, ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Worker processing failed';
    self.postMessage({ requestId, ok: false, error: message });
  }
};
