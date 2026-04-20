export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { assertProductionRuntimeReady } = await import("@/lib/server/runtime-config");
  await assertProductionRuntimeReady();
}
