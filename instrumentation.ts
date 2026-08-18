export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const original = process.emitWarning.bind(process);
  process.emitWarning = ((warning: unknown, ...args: unknown[]) => {
    const message =
      typeof warning === "string"
        ? warning
        : warning instanceof Error
          ? warning.message
          : String(warning ?? "");
    const code =
      typeof warning === "object" && warning && "code" in warning
        ? String((warning as { code?: string }).code)
        : typeof args[0] === "string"
          ? args[0]
          : typeof args[1] === "string"
            ? args[1]
            : "";
    if (code === "DEP0108" || message.includes("zlib.bytesRead")) return;
    return (original as (warning: unknown, ...args: unknown[]) => void)(warning, ...args);
  }) as typeof process.emitWarning;
}
