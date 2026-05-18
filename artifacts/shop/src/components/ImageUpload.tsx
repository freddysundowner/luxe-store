import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label = "Image" }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState("");

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json() as { url: string };
      onChange(data.url);
    } catch {
      setError("Upload failed — please try again");
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (files?.[0]) uploadFile(files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleUrlCommit = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      onChange(trimmed);
      setUrlInput("");
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {/* Drop zone / preview */}
      <div
        className={`relative border-2 border-dashed rounded-lg transition-colors cursor-pointer
          ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
          ${value ? "p-2" : "p-8"}`}
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

        {value ? (
          <div className="relative group">
            <img
              src={value}
              alt="Preview"
              className="w-full h-48 object-cover rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded">
              <div className="flex items-center gap-2 bg-background/90 px-3 py-1.5 rounded text-sm font-medium">
                <Upload className="w-4 h-4" />
                Replace
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="w-7 h-7" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Click to upload or drag & drop</p>
              <p className="text-xs mt-0.5">PNG, JPG, WebP up to 10 MB</p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* URL fallback */}
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
            Use URL
          </button>
        )}
      </div>
    </div>
  );
}
