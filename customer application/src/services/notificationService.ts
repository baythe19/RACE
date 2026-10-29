import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure lock-screen and heads-up banner presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Configure high-priority Android notification channels with lock screen visibility.
 */
export async function setupCustomerNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    // 1. MAX priority channel for urgent booking milestones (driver assigned, arrived, dropoff)
    await Notifications.setNotificationChannelAsync('booking_urgent', {
      name: '🚨 Urgent Booking Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#FFBF00',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      sound: 'default',
    });

    // 2. High priority channel for transit and completion updates
    await Notifications.setNotificationChannelAsync('trip_status', {
      name: 'Trip & Driver Status',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0066FF',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    });
  }
}

/**
 * Request notification permissions from OS.
 */
export async function requestCustomerNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    await setupCustomerNotificationChannels();
    return finalStatus === 'granted';
  } catch (e) {
    console.warn('Failed to get customer notification permissions', e);
    return false;
  }
}

/**
 * Display an immediate outer-app notification on the lock screen / status bar.
 */
export async function presentCustomerAlert(params: {
  title: string;
  body: string;
  channelId?: 'booking_urgent' | 'trip_status';
  data?: Record<string, unknown>;
}): Promise<string> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...(Platform.OS === 'android' ? { channelId: params.channelId ?? 'booking_urgent' } : {}),
        data: params.data ?? {},
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('Could not schedule customer notification', err);
    return '';
  }
}

/**
 * Outer-app alert when advance payment confirms the booking (real API path).
 */
export async function alertBookingConfirmed(bookingNumber?: string): Promise<void> {
  await presentCustomerAlert({
    title: 'Booking confirmed',
    body: bookingNumber
      ? `${bookingNumber} is confirmed. We are finding a nearby partner.`
      : 'Advance paid. We are finding a nearby partner.',
    channelId: 'trip_status',
    data: { type: 'BOOKING_CONFIRMED' },
  });
}

/**
 * High-priority outer-app lockscreen alert when driver/mechanic is assigned.
 */
export async function alertDriverAssigned(driverName?: string, etaMinutes?: number): Promise<void> {
  const etaStr = etaMinutes ? ` · ETA: ${etaMinutes} mins` : '';
  await presentCustomerAlert({
    title: '🚗 Partner Assigned & En Route!',
    body: `${driverName ?? 'Towing specialist'} is on the way to your pickup location${etaStr}.`,
    channelId: 'booking_urgent',
    data: { type: 'DRIVER_ASSIGNED' },
  });
}

/**
 * High-priority outer-app alert when partner arrives at pickup.
 */
export async function alertDriverArrivedPickup(otp?: string): Promise<void> {
  const otpStr = otp ? ` Your Trip Start OTP is ${otp}.` : '';
  await presentCustomerAlert({
    title: '📍 Driver Arrived at Pickup!',
    body: `Your partner has reached your vehicle.${otpStr} Share it to start the service.`,
    channelId: 'booking_urgent',
    data: { type: 'DRIVER_ARRIVED_PICKUP', otp },
  });
}

/**
 * Outer-app alert when transit starts.
 */
export async function alertTripStarted(): Promise<void> {
  await presentCustomerAlert({
    title: '🚀 Service In Progress',
    body: 'Vehicle is loaded and transit to destination has begun. Track live on map.',
    channelId: 'trip_status',
    data: { type: 'IN_PROGRESS' },
  });
}

/**
 * High-priority outer-app alert when vehicle arrives at dropoff location.
 */
export async function alertDriverArrivedDropoff(fare?: number): Promise<void> {
  const fareStr = fare ? ` · Total Fare: ₹${fare}` : '';
  await presentCustomerAlert({
    title: '🏁 Arrived at Destination',
    body: `Your vehicle has arrived at destination${fareStr}. Please confirm payment to receive your completion code.`,
    channelId: 'booking_urgent',
    data: { type: 'DRIVER_ARRIVED_DROPOFF', fare },
  });
}

/**
 * Outer-app alert when service is completed.
 */
export async function alertTripCompleted(): Promise<void> {
  await presentCustomerAlert({
    title: '✅ Trip Completed Successfully',
    body: 'Thank you for choosing RACE Roadside Assistance. Please take a moment to rate your experience.',
    channelId: 'trip_status',
    data: { type: 'COMPLETED' },
  });
}
