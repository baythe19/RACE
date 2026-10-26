import { Types } from 'mongoose';
import { EnquiryModel, type IEnquiry } from '../../models/src/enquiry';
import { UserModel } from '../../models/src/user';
import { NotFoundError } from '../../utils/src/errors';
import { logger } from '../../utils/src/logger';

export interface CreateEnquiryDto {
  serviceType?: string;
  city?: string;
  notes?: string;
}

export interface EnquiryResponseDto {
  id: string;
  enquiryNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  serviceType: string;
  city?: string;
  notes?: string;
  status: string;
  createdAt: string;
}

function mapEnquiry(enquiry: IEnquiry): EnquiryResponseDto {
  return {
    id: enquiry._id.toString(),
    enquiryNumber: enquiry.enquiryNumber,
    customerId: enquiry.customerId.toString(),
    customerName: enquiry.customerName,
    customerMobile: enquiry.customerMobile,
    serviceType: enquiry.serviceType,
    city: enquiry.city,
    notes: enquiry.notes,
    status: enquiry.status,
    createdAt: enquiry.createdAt.toISOString(),
  };
}

export class EnquiryService {
  async createEnquiry(customerId: string, dto: CreateEnquiryDto): Promise<EnquiryResponseDto> {
    const user = await UserModel.findById(customerId);
    if (!user) throw new NotFoundError('Customer not found');

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await EnquiryModel.countDocuments();
    const entropy = Math.floor(1000 + Math.random() * 9000);
    const enquiryNumber = `ENQ-${dateStr}-${count + 1}-${entropy}`;

    const enquiry = await EnquiryModel.create({
      enquiryNumber,
      customerId: user._id,
      customerName: user.fullName || 'Guest Customer',
      customerMobile: user.mobileNumber || '',
      serviceType: dto.serviceType || 'full_time_driver',
      city: dto.city || user.driverProfile?.city || 'Bhubaneswar',
      notes: dto.notes,
      status: 'NEW',
      statusHistory: [
        {
          status: 'NEW',
          timestamp: new Date(),
          note: 'Customer enquiry registered from mobile app',
        },
      ],
    });

    logger.info('Customer enquiry created', {
      enquiryNumber,
      customerId,
      serviceType: enquiry.serviceType,
    });

    return mapEnquiry(enquiry);
  }

  async getCustomerEnquiries(customerId: string): Promise<EnquiryResponseDto[]> {
    const enquiries = await EnquiryModel.find({ customerId: new Types.ObjectId(customerId) })
      .sort({ createdAt: -1 })
      .exec();
    return enquiries.map(mapEnquiry);
  }

  async listAllEnquiries(limit = 50): Promise<EnquiryResponseDto[]> {
    const enquiries = await EnquiryModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    return enquiries.map(mapEnquiry);
  }
}

export const enquiryService = new EnquiryService();
