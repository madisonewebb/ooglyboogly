export type Quality = 'high' | 'low';

let probe: { webgl: boolean; quality: Quality } | null = null;

/**
 * Whether this browser can draw the 3D dice, and how richly. Without a real
 * GPU (a software renderer such as SwiftShader or llvmpipe), see-through jelly
 * and soft shadows make every frame slow, so the dice keep their gloss but
 * drop those. `?quality=high` or `?quality=low` overrides it, for testing.
 */
function detect() {
  if (probe) return probe;
  let webgl: boolean;
  let quality: Quality = 'high';
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    webgl = !!gl;
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const name = info ? String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name)) quality = 'low';
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl = false;
  }
  const forced = new URLSearchParams(location.search).get('quality');
  if (forced === 'high' || forced === 'low') quality = forced;
  probe = { webgl, quality };
  return probe;
}

/** Whether this browser can draw the 3D dice. Asked once. */
export const hasWebGL = (): boolean => detect().webgl;

export const renderQuality = (): Quality => detect().quality;
