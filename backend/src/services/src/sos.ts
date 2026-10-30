import { randomUUID } from 'crypto';

import { env } from '../../config/env';
import { userRepository } from './userRepository';
import { vehicleRepository } from './vehicleRepository';
import { notificationService } from './notification';
import type { AppConfigDto, SosAlertDto, SosResponseDto } from './sosValidator';

export class SosService {
  getAppConfig(): AppConfigDto {
    return {
      supportPhone: env.SOS_SUPPORT_PHONE,
      emergencyPhone: env.SOS_EMERGENCY_PHONE,
      avgArrivalMinutes: env.SOS_AVG_ARRIVAL_MINUTES,
      trustIndicators: [
        { label: 'Avg. Arrival', value: `${env.SOS_AVG_ARRIVAL_MINUTES} min` },
        { label: 'Live Support', value: '24/7' },
        { label: 'Trusted Professionals', value: 'Verified' },
      ],
    };
  }

  async triggerAlert(userId: string, dto: SosAlertDto): Promise<SosResponseDto> {
    const user = await userRepository.findById(userId);
    const alertId = randomUUID();

    let vehicleInfo = '';
    if (dto.vehicleId) {
      const vehicle = await vehicleRepository.findByIdForCustomer(dto.vehicleId, userId);
      if (vehicle) {
        vehicleInfo = ` for ${vehicle.brand} ${vehicle.vehicleModel} (${vehicle.vehicleNumber})`;
      }
    }

    const locationText = dto.address ?? 'Location shared via GPS';
    const notifiedContacts: string[] = [];

    if (dto.action === 'notify_contacts' && user?.emergencyContact) {
      notifiedContacts.push(user.emergencyContact.name);
    }

    const actionMessages: Record<SosAlertDto['action'], string> = {
      sos: `Emergency SOS alert sent${vehicleInfo}. Our team will contact you shortly.`,
      towing: `Towing request initiated${vehicleInfo} from emergency screen.`,
      ambulance: 'Ambulance assistance request registered.',
      share_location: `Location shared: ${locationText}`,
      notify_contacts: `Alert sent to ${notifiedContacts.join(', ') || 'emergency contacts'}.`,
    };

    await notificationService.createForUser(userId, {
      type: 'SOS_ALERT',
      title: 'Emergency Alert',
      message: actionMessages[dto.action],
      metadata: { alertId, action: dto.action },
    });

    return {
      alertId,
      action: dto.action,
      message: actionMessages[dto.action],
      emergencyNumber: env.SOS_EMERGENCY_PHONE,
      notifiedContacts: notifiedContacts.length > 0 ? notifiedContacts : undefined,
    };
  }

  async getEmergencyContext(userId: string, vehicleId?: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      return null;
    }

    let vehicle = null;
    if (vehicleId) {
      vehicle = await vehicleRepository.findByIdForCustomer(vehicleId, userId);
    } else {
      const vehicles = await vehicleRepository.findByCustomer(userId);
      vehicle = vehicles[0] ?? null;
    }

    return {
      owner: {
        name: user.fullName,
        phone: user.mobileNumber,
      },
      emergencyContact: user.emergencyContact,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            label: `${vehicle.brand} ${vehicle.vehicleModel}`,
            number: vehicle.vehicleNumber,
            color: vehicle.color,
            fuelType: vehicle.fuelType,
          }
        : null,
      emergencyNumber: user.emergencyContact?.mobileNumber?.replace(/\D/g, '').slice(-10) ?? '',
    };
  }
}

export const sosService = new SosService();
