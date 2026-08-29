import { useRef, useState, type DragEvent } from "react";
import { UploadIcon } from "./icons";
import { useLanguage } from "@/i18n/languageContext";

type DropzoneProps = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
};

// Reading webkitdirectory-tagged input entries as a flat FileList already
// gives us every file inside the chosen folder — no manual tree-walk needed.
export function Dropzone({ onFiles, disabled = false }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (disabled) return;
    onFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors ${
        disabled
          ? "cursor-not-allowed border-line opacity-60"
          : isDragActive
            ? "border-accent bg-accent/5"
            : "border-line bg-card"
      }`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
        <UploadIcon className="h-5 w-5" />
      </span>
      <p className="text-sm text-primary">
        {t(
          "Drag & drop photos or videos here, or",
          "اسحب الصور أو الفيديوهات وأفلتها هنا، أو"
        )}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="tracking-nav text-xs font-medium uppercase text-accent underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("Choose files", "اختر ملفات")}
        </button>
        <span className="text-xs text-secondary">{t("or", "أو")}</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => folderInputRef.current?.click()}
          className="tracking-nav text-xs font-medium uppercase text-accent underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("Choose folder", "اختر مجلداً")}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // Declared in types/react-augment.d.ts. Must be the string "true": an
        // empty value leaves the dialog in plain file mode, which offers
        // "Open" on a folder instead of selecting it.
        webkitdirectory="true"
        directory="true"
        mozdirectory="true"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}


