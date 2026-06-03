'use client';

import { type ReactNode, useRef } from 'react';

type ImageLightboxProps = {
  src: string;
  alt: string;
  caption?: string;
  children: ReactNode;
};

export function ImageLightbox({ src, alt, caption, children }: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openLightbox() {
    dialogRef.current?.showModal();
  }

  function closeLightbox() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button className="image-zoom-trigger" type="button" onClick={openLightbox} aria-label={`放大顯示：${alt}`}>
        {children}
      </button>
      <dialog className="image-lightbox" ref={dialogRef} onClick={closeLightbox} aria-label={alt}>
        <button className="image-lightbox-close" type="button" onClick={closeLightbox} aria-label="關閉放大圖片">
          關閉
        </button>
        <figure className="image-lightbox-frame" onClick={(event) => event.stopPropagation()}>
          <img src={src} alt={alt} />
          {(caption || alt) && <figcaption>{caption || alt}</figcaption>}
        </figure>
      </dialog>
    </>
  );
}
