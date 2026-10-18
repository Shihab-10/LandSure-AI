/**
 * LandSure AI — Phase 5B Integration Boundary
 * Connects the Lovable public landing page callbacks to the REAL LandSure AI application.
 */

export const APP_CONFIG = {
  /** Set to a real URL (mp4/webm or YouTube embed) to enable the demo video. */
  demoVideoUrl: "" as string,
  /** Replace with the official logo image URL to swap the temporary SVG mark. */
  logoUrl: "" as string,
};

type ActionHandler = () => void;

let _onLogin: ActionHandler | null = null;
let _onStartDemo: ActionHandler | null = null;
let _onStartVerification: ActionHandler | null = null;
let _onOpenParcelExplorer: ActionHandler | null = null;

export function registerLandingAdapters(handlers: {
  onLoginClick?: ActionHandler;
  onStartDemoClick?: ActionHandler;
  onStartVerificationClick?: ActionHandler;
  onOpenParcelExplorer?: ActionHandler;
}) {
  if (handlers.onLoginClick) _onLogin = handlers.onLoginClick;
  if (handlers.onStartDemoClick) _onStartDemo = handlers.onStartDemoClick;
  if (handlers.onStartVerificationClick) _onStartVerification = handlers.onStartVerificationClick;
  if (handlers.onOpenParcelExplorer) _onOpenParcelExplorer = handlers.onOpenParcelExplorer;
}

export function onLoginClick() {
  if (_onLogin) {
    _onLogin();
  } else {
    window.dispatchEvent(new CustomEvent("landsure:open-login"));
  }
}

export function onStartDemoClick() {
  if (_onStartDemo) {
    _onStartDemo();
  } else {
    window.dispatchEvent(new CustomEvent("landsure:start-demo"));
  }
}

export function onStartVerificationClick() {
  if (_onStartVerification) {
    _onStartVerification();
  } else {
    window.dispatchEvent(new CustomEvent("landsure:start-verification"));
  }
}

export function onOpenParcelExplorer() {
  if (_onOpenParcelExplorer) {
    _onOpenParcelExplorer();
  } else {
    window.dispatchEvent(new CustomEvent("landsure:open-explorer"));
  }
}

