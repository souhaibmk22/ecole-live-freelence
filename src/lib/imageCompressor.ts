/**
 * Utilitaire de compression et d'optimisation d'images côté client
 * Réduit les photos de 5-10 Mo à ~200-400 Ko tout en préservant la netteté des cahiers et devoirs.
 */

export async function compressImageFile(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.8
): Promise<File> {
  // Si ce n'est pas une image ou si c'est un GIF/SVG, ne pas toucher
  if (!file.type.startsWith("image/") || file.type.includes("gif") || file.type.includes("svg")) {
    return file;
  }

  // Si le fichier fait déjà moins de 350 Ko, compression inutile
  if (file.size < 350 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let { width, height } = img;

        // Calcul des proportions max
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        // Lissage haute qualité pour le texte manuscrit
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const compressedFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], compressedFileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            // Si le résultat compressé est plus petit, on l'utilise
            if (compressedFile.size < file.size) {
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
}
