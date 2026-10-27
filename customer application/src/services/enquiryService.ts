import { api } from './api';
import type { ApiSuccessResponse } from '../types/auth';

export interface CreateEnquiryRequest {
  serviceType: string;
  city?: string;
  notes?: string;
}

export interface EnquiryDto {
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

export async function createEnquiry(payload: CreateEnquiryRequest): Promise<EnquiryDto> {
  const { data } = await api.post<ApiSuccessResponse<EnquiryDto>>('/api/v1/enquiries', payload);
  return data.data;
}

export async function getMyEnquiries(): Promise<EnquiryDto[]> {
  const { data } = await api.get<ApiSuccessResponse<EnquiryDto[]>>('/api/v1/enquiries/my');
  return data.data;
}
