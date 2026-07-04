"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { uploadCoverPhotoAction, removeCoverPhotoAction } from "@/lib/actions/cover-photo-actions";

export function CoverPhotoUpload({
  projectId,
  chapterId = null,
  initialUrl,
  aspectRatio = "21 / 9",
  label = "Add a photo",
}: {
  projectId: string;
  chapterId?: string | null;
  initialUrl: string | null;
  aspectRatio?: string;
  label?: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [hover, setHover] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("projectId", projectId);
    if (chapterId) formData.set("chapterId", chapterId);
    formData.set("file", file);
    startTransition(async () => {
      try {
        const result = await uploadCoverPhotoAction(formData);
        setUrl(result.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      try {
        await removeCoverPhotoAction({ projectId, chapterId });
        setUrl(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't remove photo");
      }
    });
  }

  const borderColor = isDark ? "rgba(200,168,107,0.18)" : "rgba(0,0,0,0.09)";

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio,
        borderRadius: "10px",
        overflow: "hidden",
        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        border: `1px solid ${borderColor}`,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {(hover || pending) && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.42)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              {pending ? (
                <Loader2 size={20} color="#f0ebe0" className="animate-spin" />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    style={overlayButtonStyle}
                  >
                    <ImagePlus size={13} />
                    Change
                  </button>
                  <button type="button" onClick={handleRemove} style={overlayButtonStyle}>
                    <X size={13} />
                    Remove
                  </button>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            background: "transparent",
            border: "none",
            cursor: pending ? "default" : "pointer",
            color: isDark ? "rgba(200,168,107,0.45)" : "rgba(0,0,0,0.35)",
            fontFamily: "'Literata', Georgia, serif",
            fontSize: "13px",
          }}
        >
          {pending ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          {label}
        </button>
      )}

      {error && (
        <p
          style={{
            position: "absolute",
            bottom: "6px",
            left: "8px",
            right: "8px",
            margin: 0,
            fontSize: "11px",
            fontFamily: "'Barlow Condensed', sans-serif",
            color: "#f87171",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

const overlayButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#f0ebe0",
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: "999px",
  padding: "5px 12px",
  cursor: "pointer",
};
