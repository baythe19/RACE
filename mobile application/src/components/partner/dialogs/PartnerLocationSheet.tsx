import React from 'react';
import PartnerPermissionDialog from './PartnerPermissionDialog';

interface PartnerLocationSheetProps {
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export default function PartnerLocationSheet({
  visible,
  onAllow,
  onDeny,
}: PartnerLocationSheetProps) {
  return (
    <PartnerPermissionDialog
      visible={visible}
      type="location"
      onAllow={onAllow}
      onDeny={onDeny}
    />
  );
}
