import { useState, useEffect } from 'react';

interface ImagePreviewProps {
  file: File | null;
  currentUrl?: string;
}

export default function ImagePreview({ file, currentUrl }: ImagePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  if (!previewUrl && !currentUrl) return null;

  return (
    <div className="mt-2">
      <div className="relative w-20 h-20 rounded-lg overflow-hidden">
        <img
          src={previewUrl || currentUrl}
          alt="Vista previa"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  );
}