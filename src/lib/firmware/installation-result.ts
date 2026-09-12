export type InstallationResult =
  | { ok: true; installation: { id: number } }
  | { ok: false; error: string };

export async function installationResult(res: Response): Promise<InstallationResult> {
  if (res.ok) return { ok: true, installation: await res.json() };
  const body = await res.text();
  let message = "No se pudo iniciar la instalacion";
  try {
    const data: unknown = JSON.parse(body);
    if (typeof data === "object" && data !== null && "detail" in data
      && typeof data.detail === "string") message = data.detail;
  } catch {
    // Do not expose an upstream HTML error page in the installation form.
  }
  return { ok: false, error: message };
}
