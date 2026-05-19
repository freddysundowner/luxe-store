import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2, GripVertical, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  max?: number;
}

export function MultiImageUpload({ value, onChange, label = "Images", max = 10 }: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const remaining = Math.max(0, max - value.length);

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
    onChange(value.filter((_, i) => i !== idx));
  };

  const moveTo = (from: number, to: number) => {
    if (from === to || to < 0 || to >= value.length) return;
    const next = value.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {value.map((url, idx) => (
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
              } ${dragIndex === idx ? "opacity-50" : ""}`}
            >
              <img
                src={url}
                alt={`Image ${idx + 1}`}
                className="w-full aspect-square object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
              />
              {idx === 0 && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-medium uppercase tracking-wide">
                  Cover
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
              <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="p-1 rounded bg-black/60 text-white cursor-grab" aria-label="Drag to reorder">
                  <GripVertical className="w-3 h-3" />
                </span>
                <div className="flex gap-1">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => moveTo(idx, idx - 1)}
                      className="px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px]"
                      aria-label="Move left"
                    >
                      ◀
                    </button>
                  )}
                  {idx < value.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveTo(idx, idx + 1)}
                      className="px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px]"
                      aria-label="Move right"
                    >
                      ▶
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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
        <p className="text-[11px] text-muted-foreground">
          Drag thumbnails to reorder. The first image is shown on cards and on the feed; all images appear in the gallery on the product page.
        </p>
      )}
    </div>
  );
}
