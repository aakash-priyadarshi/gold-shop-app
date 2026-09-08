"use client";

import { OfferEmailRenderer, type EmailDesignRenderOptions, type OfferEmailBlock } from "@gold-shop/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/providers/translation-provider";

const renderer = new OfferEmailRenderer();
export const EMAIL_CANVAS_DEBOUNCE_MS = 150;

type Props = {
  blocks: OfferEmailBlock[];
  options: EmailDesignRenderOptions;
  selectedId?: string;
  mobile: boolean;
  imagesOff: boolean;
  onSelect: (id: string) => void;
};

function renderSrcDoc(
  blocks: OfferEmailBlock[],
  options: EmailDesignRenderOptions,
  imagesOff: boolean,
) {
  return renderer.render(blocks, {
    ...options, editor: true, imagesOff, disableAnimations: true,
  }).html.replace(
    "<head>",
    '<head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src https:; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">',
  );
}

/** Parent listeners provide editing; the generated email itself cannot execute scripts. */
export function EmailCanvas({ blocks, options, selectedId, mobile, imagesOff, onSelect }: Props) {
  const t = useT();
  const frame = useRef<HTMLIFrameElement>(null);
  const current = useRef({ blocks, onSelect, selectedId });
  current.current = { blocks, onSelect, selectedId };
  const nextHtml = useMemo(
    () => renderSrcDoc(blocks, options, imagesOff),
    [blocks, imagesOff, options],
  );
  const [html, setHtml] = useState(nextHtml);

  useEffect(() => {
    if (nextHtml === html) return;
    const timer = window.setTimeout(() => setHtml(nextHtml), EMAIL_CANVAS_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [html, nextHtml]);

  const selectOutline = () => {
    frame.current?.contentDocument?.querySelectorAll<HTMLElement>("[data-email-block]").forEach((element) => {
      const block = current.current.blocks[Number(element.dataset.emailBlock)];
      element.style.outline = block?.id === current.current.selectedId ? "2px solid #b7791f" : "none";
    });
  };
  useEffect(selectOutline, [selectedId, html]);
  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;
    let cleanup: (() => void) | undefined;
    const loaded = () => {
      cleanup?.();
      const doc = iframe.contentDocument;
      if (!doc?.body) return;
      const resize = () => { iframe.style.height = `${Math.max(500, Math.ceil(doc.body.getBoundingClientRect().height))}px`; };
      const click = (event: MouseEvent) => {
        event.preventDefault();
        const element = (event.target as HTMLElement).closest<HTMLElement>("[data-email-block]");
        const id = element && current.current.blocks[Number(element.dataset.emailBlock)]?.id;
        if (id) current.current.onSelect(id);
      };
      doc.addEventListener("click", click);
      // ResizeObserver also catches GIF/poster dimensions when they finish loading.
      const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
      observer?.observe(doc.body);
      resize();
      selectOutline();
      cleanup = () => { observer?.disconnect(); doc.removeEventListener("click", click); };
    };
    iframe.addEventListener("load", loaded);
    loaded();
    return () => { cleanup?.(); iframe.removeEventListener("load", loaded); };
  }, [html]);

  return <iframe ref={frame} title={t("Live email preview")} sandbox="allow-same-origin"
    referrerPolicy="no-referrer" srcDoc={html} tabIndex={-1}
    className="mx-auto block min-h-[500px] border-0 bg-white shadow-sm"
    style={{ width: mobile ? 375 : 680, maxWidth: "100%" }} />;
}
