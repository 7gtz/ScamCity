"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type UniformValue = number | readonly [number, number] | readonly [number, number, number];
export type Uniforms = Record<string, UniformValue>;

const VERTEX = "attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}";

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("[shader]", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

type Props = {
  /** GLSL ES 1.0 fragment shader. Receives uRes (px) and uTime (s) automatically. */
  fragment: string;
  /** Extra uniforms, read every frame (so they can follow live values such as audio level). */
  uniforms?: (time: number) => Uniforms;
  className?: string;
  /** Render scale relative to CSS pixels × capped DPR. Soft shaders can run below 1. */
  resolution?: number;
  maxDpr?: number;
};

/**
 * Minimal WebGL1 full-screen-triangle renderer — no library.
 *
 * - Renders only while on screen and while the tab is visible.
 * - Caps device pixel ratio and supports sub-resolution rendering.
 * - Reduced motion: draws one still frame (and redraws on resize).
 * - No WebGL / compile failure / context loss: the canvas is removed or
 *   hidden, so the parent's CSS background is the fallback. (A lost context
 *   left on screen paints as a flat grey sheet.)
 * - Each mount creates its own <canvas> and releases its GL context on
 *   unmount (browsers cap live contexts). Reusing one element would hand a
 *   remount — React Strict Mode, Fast Refresh — the context it just lost.
 */
export function ShaderCanvas({ fragment, uniforms, className, resolution = 1, maxDpr = 1.5 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef(uniforms);
  useEffect(() => {
    uniformsRef.current = uniforms;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = document.createElement("canvas");
    canvas.className = "block size-full";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);

    const gl = canvas.getContext("webgl", {
      antialias: false,
      depth: false,
      stencil: false,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    if (!gl) {
      canvas.remove();
      return;
    }
    const release = () => {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    if (!vs || !fs || !program) {
      release();
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("[shader] link failed", gl.getProgramInfoLog(program));
      release();
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const locations = new Map<string, WebGLUniformLocation | null>();
    const set = (name: string, value: UniformValue) => {
      if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
      const loc = locations.get(name);
      if (!loc) return;
      if (typeof value === "number") gl.uniform1f(loc, value);
      else if (value.length === 2) gl.uniform2f(loc, value[0], value[1]);
      else gl.uniform3f(loc, value[0], value[1], value[2]);
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let visible = true;
    let lost = false;
    let raf = 0;

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, maxDpr) * resolution;
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = () => {
      if (lost) return;
      resize();
      const time = reduced ? 12 : (performance.now() - start) / 1000;
      set("uRes", [canvas.width, canvas.height]);
      set("uTime", time);
      const extra = uniformsRef.current?.(time);
      if (extra) for (const [name, value] of Object.entries(extra)) set(name, value);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (visible && !document.hidden) draw();
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    }, { rootMargin: "120px" });
    io.observe(canvas);
    const ro = new ResizeObserver(() => reduced && draw());
    ro.observe(canvas);
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      canvas.style.visibility = "hidden";
    };
    canvas.addEventListener("webglcontextlost", onLost);

    if (reduced) draw();
    else loop();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      release();
    };
  }, [fragment, resolution, maxDpr]);

  return <div ref={hostRef} aria-hidden className={cn("block size-full", className)} />;
}
