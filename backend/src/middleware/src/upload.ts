import multer from 'multer';

const MAX_BYTES = 10 * 1024 * 1024;

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.mimetype.toLowerCase())) {
      cb(new Error('Only JPG, PNG, and PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
});

export const vendorDocumentUpload = documentUpload;

/** Self-driver KYC upload — same MIME + size policy as vendor documents. */
export const driverDocumentUpload = documentUpload;
