import type { Request, Response } from 'express';

import { asyncHandler } from '../../../utils/src/asyncHandler';
import { adminDocumentsService } from '../../../services/src/admin/adminDocuments';
import { routeParam } from '../../../services/src/admin/routeParam';

export const adminDocumentsController = {
  getVendorDocument: asyncHandler(async (req: Request, res: Response) => {
    const file = await adminDocumentsService.getVendorDocument(
      routeParam(req.params.vendorId),
      routeParam(req.params.docKey),
    );
    res
      .status(200)
      .setHeader('Content-Type', file.mimeType)
      .setHeader('Content-Disposition', 'inline; filename="' + file.filename + '"')
      .setHeader('Cache-Control', 'private, no-store')
      .send(file.buffer);
  }),

  getDriverDocument: asyncHandler(async (req: Request, res: Response) => {
    const file = await adminDocumentsService.getDriverDocument(
      routeParam(req.params.driverId),
      routeParam(req.params.docKey),
    );
    res
      .status(200)
      .setHeader('Content-Type', file.mimeType)
      .setHeader('Content-Disposition', 'inline; filename="' + file.filename + '"')
      .setHeader('Cache-Control', 'private, no-store')
      .send(file.buffer);
  }),
};
