import { Request, Response, Router } from 'express';

import { authMiddleware } from '../../middleware/src/auth';
import { asyncHandler } from '../../utils/src/asyncHandler';
import { AppError } from '../../utils/src/errors';
import { getAuthUser } from '../../utils/src/request';
import { storageService } from '../../storage/src/index';
import { UserModel } from '../../models/src/user';

const router = Router();

/**
 * BUG-02 / VOC P0.4 — authenticated document access.
 *
 * KYC files used to be reachable without any identity:
 *  - local uploads were served by the open `app.use('/uploads', express.static)`
 *  - GCS objects got plain public `storage.googleapis.com/...` URLs.
 *
 * This proxy endpoint hands a file out ONLY when the caller is one of:
 *  - the driver who owns the document,
 *  - the vendor who owns that driver (or the vendor's own vendor document),
 *  - an admin reviewing it.
 * The `/uploads` static route is removed in app.ts — everything goes through
 * this gate now.
 */

const LOCAL_UPLOADS_PREFIX = '/uploads/';

function isLocalUploadUrl(url: string): boolean {
  return url.includes(LOCAL_UPLOADS_PREFIX);
}

function localRelativePath(url: string): string {
  const idx = url.indexOf(LOCAL_UPLOADS_PREFIX);
  return url.slice(idx + LOCAL_UPLOADS_PREFIX.length);
}

async function callerOwnsDocument(
  caller: { id: string; role: string },
  ownerUserId: string,
): Promise<boolean> {
  if (caller.role === 'admin') return true;
  if (caller.id === ownerUserId) return true;
  if (caller.role === 'vendor') {
    // Vendor may view documents of drivers in their fleet.
    const linked = await UserModel.countDocuments({
      _id: ownerUserId,
      role: 'driver',
      'driverProfile.vendorUserId': caller.id,
    }).exec();
    if (linked > 0) return true;

    // Or their own vendor profile documents.
    const vendorUser = await UserModel.findById(ownerUserId).select('role').lean().exec();
    return vendorUser?.role === 'vendor' && ownerUserId === caller.id;
  }
  return false;
}

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const caller = getAuthUser(req);
    const url = String(req.query.url ?? '');
    if (!url) throw new AppError('Document url is required', 400);

    const ownerParam = String(req.query.ownerId ?? caller.id);
    const owner = await UserModel.findById(ownerParam).select('role').lean().exec();
    if (!owner) throw new AppError('Document owner not found', 404);

    // Vendor-scoped documents (Vendordocument model) are also addressed by their
    // owning vendor user; driver KYC by the driver user id.
    const allowed = await callerOwnsDocument(caller, ownerParam);
    if (!allowed) throw new AppError('You do not have access to this document', 403);

    if (isLocalUploadUrl(url)) {
      // Local fallback: stream through the gate, never a static path.
      const rel = localRelativePath(url);
      // Path traversal guard.
      if (rel.includes('..')) throw new AppError('Invalid document path', 400);
      const stream = storageService.getLocalFileStream(rel);
      res.setHeader('Content-Type', 'application/octet-stream');
      stream.pipe(res);
      return;
    }

    // Remote (GCS) URL: allowed only for authorised callers. Proxy with a
    // server-side fetch so the raw object URL/ACL never has to be public.
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new AppError('Invalid document URL format', 400);
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new AppError('Only HTTP/HTTPS document URLs are supported', 400);
    }

    const host = parsedUrl.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '169.254.169.254' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      throw new AppError('Requests to internal network hosts are forbidden', 403);
    }

    const allowedDomains = [
      'storage.googleapis.com',
      'storage.cloud.google.com',
      'amazonaws.com',
      'render.com',
      'onrender.com',
      'raceservice.in',
    ];
    if (!allowedDomains.some((d) => host === d || host.endsWith(`.${d}`))) {
      throw new AppError('Untrusted remote document host', 403);
    }

    const res2 = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res2.ok) throw new AppError('Document not reachable', 404);
    res.setHeader('Content-Type', res2.headers.get('content-type') ?? 'application/octet-stream');
    const buffer = Buffer.from(await res2.arrayBuffer());
    res.send(buffer);
  }),
);

export default router;
