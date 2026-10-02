// Loaded only through a dynamic import() so Session Replay (rrweb) stays out of the initial chunks.
import { addIntegration, replayIntegration } from "@sentry/nextjs";

export const addReplayIntegration = () => {
  addIntegration(
    replayIntegration({
      // SECURITY: Mask all input fields to prevent capturing passwords/keys in session replays
      maskAllInputs: true,
    })
  );
};
