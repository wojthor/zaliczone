export async function register() {
  // Node-only: Edge Runtime nie obsługuje process.emitWarning.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}
