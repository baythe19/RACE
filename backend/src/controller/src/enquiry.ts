import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/src/asyncHandler';
import { sendSuccess } from '../../utils/src/apiResponse';
import { getAuthUser } from '../../utils/src/request';
import { enquiryService } from '../../services/src/enquiry';

export class EnquiryController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const enquiry = await enquiryService.createEnquiry(user.id, req.body);
    return sendSuccess(res, enquiry, 201);
  });

  listMy = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const enquiries = await enquiryService.getCustomerEnquiries(user.id);
    return sendSuccess(res, enquiries);
  });

  listAll = asyncHandler(async (_req: Request, res: Response) => {
    const enquiries = await enquiryService.listAllEnquiries();
    return sendSuccess(res, enquiries);
  });
}

export const enquiryController = new EnquiryController();
