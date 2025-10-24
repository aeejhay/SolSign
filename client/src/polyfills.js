// Polyfills for TensorFlow.js compatibility
if (typeof global === 'undefined') {
  window.global = window;
}

if (typeof process === 'undefined') {
  window.process = {
    env: {},
    browser: true,
    version: '',
    versions: {},
    platform: 'browser'
  };
}

// Fix Module.arguments issue more comprehensively
if (typeof Module === 'undefined') {
  window.Module = {
    arguments: []
  };
} else {
  if (!Module.arguments) {
    Module.arguments = [];
  }
}

// Additional polyfills for TensorFlow.js
if (typeof arguments_ === 'undefined') {
  window.arguments_ = [];
}

// Fix for Emscripten compatibility
if (typeof ENVIRONMENT_IS_NODE === 'undefined') {
  window.ENVIRONMENT_IS_NODE = false;
}

if (typeof ENVIRONMENT_IS_WEB === 'undefined') {
  window.ENVIRONMENT_IS_WEB = true;
}

// TensorFlow.js backend initialization
if (typeof window !== 'undefined') {
  // Ensure TensorFlow.js can find its backend
  window.TFJS_BACKEND = 'cpu';
}
