import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2, GripVertical, Plus, Crop, Maximize2, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ProductImage,
  type ImageDisplaySettings,
  DEFAULT_IMAGE_SETTINGS,
} from "@/components/ProductImage";

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  /**
   * Per-image fit/focal-point settings keyed by URL. Missing entries default
   * to cover/centre everywhere, so old products keep rendering as-is.
   */
  settings?: Record<string, ImageDisplaySettings>;
  onSettingsChange?: (next: Record<string, ImageDisplaySettings>) => void;
  label?: string;
  max?: number;
}

export function MultiImageUpload({
  value,
  onChange,
  settings = {},
  onSettingsChange,
  label = "Images",
  max = 10,
}: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // Which image's controls panel is expanded. `null` means all collapsed.
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const remaining = Math.max(0, max - value.length);
  const settingsEnabled = !!onSettingsChange;

  const getCfg = (url: string): ImageDisplaySettings =>
    settings[url] ?? DEFAULT_IMAGE_SETTINGS;

  const updateCfg = (url: string, patch: Partial<ImageDisplaySettings>) => {
    if (!onSettingsChange) return;
    const current = getCfg(url);
    const next = { ...settings, [url]: { ...current, ...patch } };
    onSettingsChange(next);
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setError("Only image files are allowed");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const toUpload = imageFiles.slice(0, remaining);
      const uploaded: string[] = [];
      for (const file of toUpload) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        if (!res.ok) throw new Error("Upload failed");
        const data = (await res.json()) as { url: string };
        uploaded.push(data.url);
      }
      onChange([...value, ...uploaded]);
    } catch {
      setError("Upload failed — please try again");
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (files) uploadFiles(Array.from(files));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleUrlCommit = () => {
    const trimmed = urlInput.trim();
    if (trimmed && value.length < max) {
      onChange([...value, trimmed]);
      setUrlInput("");
    }
  };

  const removeAt = (idx: number) => {
    const url = value[idx];
    onChange(value.filter((_, i) => i !== idx));
    if (settingsEnabled && url && settings[url]) {
      const next = { ...settings };
      delete next[url];
      onSettingsChange!(next);
    }
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const moveTo = (from: number, to: number) => {
    if (from === to || to < 0 || to >= value.length) return;
    const next = value.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  // ── Focal-point picker ──────────────────────────────────────────────────────
  // The user clicks/drags on the image; we translate the pointer position into
  // percentages of the image's box. Same maths Instagram/Shopify use.
  const handleFocalPick = (
    e: React.MouseEvent<HTMLDivElement>,
    url: string,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const focalX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const focalY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    updateCfg(url, { focalX: Math.round(focalX), focalY: Math.round(focalY) });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">
          {value.length}/{max} {value.length > 0 && <>— first is the cover</>}
        </span>
      </div>

      {/* Thumbnail grid */}
      {value.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {value.map((url, idx) => {
              const cfg = getCfg(url);
              const isExpanded = expandedIdx === idx;
              return (
                <div
                  key={`${url}-${idx}`}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex != null) moveTo(dragIndex, idx);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`relative group border rounded-md overflow-hidden bg-muted/40 ${
                    idx === 0 ? "border-primary/60 ring-1 ring-primary/30" : "border-border"
                  } ${dragIndex === idx ? "opacity-50" : ""} ${
                    isExpanded ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="aspect-square">
                    <ProductImage
                      src={url}
                      alt={`Image ${idx + 1}`}
                      settings={cfg}
                      className="absolute inset-0"
                      showFallback={false}
                    />
                  </div>
                  {idx === 0 && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-medium uppercase tracking-wide">
                      Cover
                    </span>
                  )}
                  {settingsEnabled && (
                    <span
                      className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                        cfg.fit === "contain"
                          ? "bg-blue-500/90 text-white"
                          : "bg-black/60 text-white"
                      }`}
                      title={cfg.fit === "contain" ? "Fit (whole image, blurred background)" : "Fill (cropped to box)"}
                    >
                      {cfg.fit === "contain" ? "Fit" : "Fill"}
                    </span>
                  )}
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => removeAt(idx)}
                      className="p-1 rounded-full bg-black/70 text-white hover:bg-destructive"
                      aria-label="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="absolute bottom-1 right-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {settingsEnabled && (
                      <button
                        type="button"
                        onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                        className="p-1 rounded bg-black/70 text-white hover:bg-primary hover:text-primary-foreground"
                        aria-label="Image display settings"
                        title="Display settings"
                      >
                        <Crop className="w-3 h-3" />
                      </button>
                    )}
                    <span className="p-1 rounded bg-black/60 text-white cursor-grab" aria-label="Drag to reorder">
                      <GripVertical className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expanded controls + live preview panel */}
          {settingsEnabled && expandedIdx != null && value[expandedIdx] && (
            <ImageSettingsPanel
              url={value[expandedIdx]}
              index={expandedIdx}
              cfg={getCfg(value[expandedIdx])}
              onChange={(patch) => updateCfg(value[expandedIdx], patch)}
              onClose={() => setExpandedIdx(null)}
              onFocalPick={(e) => handleFocalPick(e, value[expandedIdx])}
            />
          )}
        </div>
      )}

      {/* Drop zone */}
      {remaining > 0 && (
        <div
          className={`relative border-2 border-dashed rounded-lg transition-colors cursor-pointer p-6 ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg z-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          <div className="flex flex-col items-center gap-2 text-muted-foreground pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              {value.length === 0 ? <ImageIcon className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {value.length === 0 ? "Click to upload or drag & drop" : `Add more (${remaining} left)`}
              </p>
              <p className="text-xs mt-0.5">PNG, JPG, WebP up to 10 MB · multi-select supported</p>
            </div>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* URL fallback */}
      {remaining > 0 && (
        <div className="flex gap-2">
          <Input
            placeholder="Or paste an image URL…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleUrlCommit())}
            className="text-xs h-8"
          />
          {urlInput && (
            <button
              type="button"
              onClick={handleUrlCommit}
              className="text-xs px-3 h-8 rounded border border-border hover:bg-muted transition-colors shrink-0"
            >
              Add URL
            </button>
          )}
        </div>
      )}

      {value.length > 0 && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Drag thumbnails to reorder. The first image is the cover used on cards
          and the feed; all images appear in the gallery on the product page.
          {settingsEnabled && (
            <> Click the crop icon on a thumbnail to adjust how it fits and what stays in frame.</>
          )}
        </p>
      )}
    </div>
  );
}

// ── Settings panel: fit toggle + focal-point picker + 3 live previews ─────────

interface ImageSettingsPanelProps {
  url: string;
  index: number;
  cfg: ImageDisplaySettings;
  onChange: (patch: Partial<ImageDisplaySettings>) => void;
  onClose: () => void;
  onFocalPick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function ImageSettingsPanel({
  url,
  index,
  cfg,
  onChange,
  onClose,
  onFocalPick,
}: ImageSettingsPanelProps) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="border border-primary/40 bg-muted/30 rounded-lg p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">
            Image {index + 1} display settings
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Controls only affect this image. Other images keep their own settings.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-muted text-muted-foreground"
          aria-label="Close settings"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Fit toggle */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide">Fit mode</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChange({ fit: "cover" })}
              className={`flex items-center gap-2 px-3 py-2 rounded border text-xs transition-colors ${
                cfg.fit === "cover"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border hover:border-primary/40 text-muted-foreground"
              }`}
            >
              <Crop className="w-3.5 h-3.5" />
              <div className="text-left">
                <div className="font-medium">Fill</div>
                <div className="text-[10px] opacity-80">Crop to box</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onChange({ fit: "contain" })}
              className={`flex items-center gap-2 px-3 py-2 rounded border text-xs transition-colors ${
                cfg.fit === "contain"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border hover:border-primary/40 text-muted-foreground"
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <div className="text-left">
                <div className="font-medium">Fit</div>
                <div className="text-[10px] opacity-80">Whole + blurred bg</div>
              </div>
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Pick <strong>Fit</strong> when the image is small, has a different
            shape, or you want every pixel visible. Pick <strong>Fill</strong>
            for tightly framed product shots.
          </p>
        </div>

        {/* Focal-point picker */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            Focal point
            {cfg.fit === "contain" && (
              <span className="text-[10px] font-normal text-muted-foreground">
                (used when switched to Fill)
              </span>
            )}
          </Label>
          <div
            className="relative w-full aspect-square bg-zinc-900 rounded overflow-hidden cursor-crosshair select-none border border-border"
            onMouseDown={(e) => { setDragging(true); onFocalPick(e); }}
            onMouseMove={(e) => { if (dragging) onFocalPick(e); }}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
          >
            <img
              src={url}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full object-contain opacity-80 pointer-events-none"
            />
            {/* Cross-hair marker at the focal point */}
            <div
              className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${cfg.focalX}%`, top: `${cfg.focalY}%` }}
            >
              <div className="absolute inset-0 rounded-full border-2 border-white shadow-lg" />
              <div className="absolute inset-1.5 rounded-full bg-primary border border-white" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Click or drag on the image to choose what stays centred when it gets
            cropped (faces, logos, etc). Currently at {Math.round(cfg.focalX)}%, {Math.round(cfg.focalY)}%.
          </p>
        </div>
      </div>

      {/* Live previews: feed (9:16), card (4:5), detail (1:1) */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide">Live preview</Label>
        <div className="grid grid-cols-3 gap-3">
          <PreviewTile
            url={url}
            cfg={cfg}
            label="Feed (swiper)"
            aspect="aspect-[9/16]"
          />
          <PreviewTile
            url={url}
            cfg={cfg}
            label="Card (grid)"
            aspect="aspect-[4/5]"
          />
          <PreviewTile
            url={url}
            cfg={cfg}
            label="Detail page"
            aspect="aspect-square"
          />
        </div>
      </div>
    </div>
  );
}

function PreviewTile({
  url,
  cfg,
  label,
  aspect,
}: {
  url: string;
  cfg: ImageDisplaySettings;
  label: string;
  aspect: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className={`relative bg-zinc-900 rounded overflow-hidden border border-border ${aspect}`}>
        <ProductImage
          src={url}
          alt={label}
          settings={cfg}
          className="absolute inset-0"
          showFallback={false}
        />
      </div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground text-center">
        {label}
      </div>
    </div>
  );
}

// Suppress an unused-import warning when this file is built standalone — the
// Upload icon is exported for re-use by callers that want a matching glyph.
export { Upload };
