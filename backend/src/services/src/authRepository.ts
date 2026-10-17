import { OtpLogModel, type IOtpLog } from '../../models/src/otpLog';

export class AuthRepository {
  async countRecentOtpSends(mobileNumber: string, since: Date): Promise<number> {
    return OtpLogModel.countDocuments({
      mobileNumber,
      createdAt: { $gte: since },
    }).exec();
  }

  async invalidatePendingOtps(mobileNumber: string): Promise<void> {
    const now = new Date();
    await OtpLogModel.updateMany(
      {
        mobileNumber,
        mobileVerified: false,
      },
      {
        $set: {
          mobileVerified: true,
          mobileOtpExpiry: now,
        },
      },
    ).exec();
  }

  async createOtpLog(data: Partial<IOtpLog>): Promise<IOtpLog> {
    return OtpLogModel.create(data);
  }

  async findLatestValidOtpLog(mobileNumber: string): Promise<IOtpLog | null> {
    const now = new Date();
    return OtpLogModel.findOne({
      mobileNumber,
      mobileVerified: false,
      mobileOtpExpiry: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findRecentlyVerifiedOtpLog(
    mobileNumber: string,
    otp: string,
    withinMs: number,
  ): Promise<IOtpLog | null> {
    const since = new Date(Date.now() - withinMs);
    /**
     * Idempotent re-verify within the expiry window.
     * VOC P0.8 fix: the previous `$or: [{mobileOtp: otp}, {mcVerificationId: $exists}]`
     * accepted ANY submitted code when a recently-verified MessageCentral log
     * existed — an OTP-replay hole (arbitrary code → new token session).
     * Replay credit is now given only when the OtpLog carries proof bound to
     * THIS submission: the stored MC verificationIdHash must equal the hash of
     * the submitted code, or a hashed hanu/local OTP must match.
     */
    return OtpLogModel.findOne({
      mobileNumber,
      mobileVerified: true,
      createdAt: { $gte: since },
      $or: [{ mobileOtp: otp }, { mcVerificationIdHash: otp }],
    })
      .sort({ createdAt: -1 })
      .exec();
  }

}

export const authRepository = new AuthRepository();
