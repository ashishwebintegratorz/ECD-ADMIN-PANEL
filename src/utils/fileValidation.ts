export interface FileValidationOptions {
  maxSizeMB?: number; // default: 2 MB for images, 5 MB for documents
  recommendedSizeMB?: number; // default: 1 MB
  allowedTypes?: string[]; // e.g. ['image/jpeg', 'image/png', 'image/webp']
  typeDescription?: string; // e.g. 'JPG, PNG, WEBP'
}

export const validateFile = (
  file: File,
  options: FileValidationOptions = {}
): { isValid: boolean; error?: string } => {
  const {
    maxSizeMB = 2,
    recommendedSizeMB = 1,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    typeDescription = 'JPG, PNG, WEBP',
  } = options;

  const fileSizeMB = file.size / (1024 * 1024);

  // 1. Check file type
  if (allowedTypes.length > 0) {
    const isTypeValid =
      allowedTypes.some((type) => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', ''));
        }
        return file.type === type;
      }) ||
      (allowedTypes.includes('application/pdf') &&
        (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')));

    if (!isTypeValid) {
      return {
        isValid: false,
        error: `Invalid file format (${file.type || 'Unknown'}). Only ${typeDescription} files are supported.`,
      };
    }
  }

  // 2. Check file size
  if (fileSizeMB > maxSizeMB) {
    return {
      isValid: false,
      error: `Your file size is too large. Please keep under ${maxSizeMB} MB (recommended under ${recommendedSizeMB} MB).`,
    };
  }

  return { isValid: true };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
