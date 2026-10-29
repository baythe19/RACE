export interface VehicleEmergencyPageData {
  vehicleNumber: string;
  brand: string;
  model: string;
  vehicleType: string;
  fuelType: string;
  color?: string;
  ownerName?: string;
  ownerMobile?: string;
  emergencyName?: string;
  emergencyMobile?: string;
  emergencyRelationship?: string;
}

function digitsOnly(value?: string): string {
  return (value ?? '').replace(/\D/g, '');
}

function telHref(mobile?: string): string {
  const digits = digitsOnly(mobile);
  if (!digits) return '';
  if (digits.startsWith('91') && digits.length >= 12) return `tel:+${digits}`;
  if (digits.length === 10) return `tel:+91${digits}`;
  return `tel:${digits}`;
}

function waHref(mobile?: string, plate?: string): string {
  const digits = digitsOnly(mobile);
  if (!digits) return '';
  const number = digits.startsWith('91') ? digits : `91${digits}`;
  const text = encodeURIComponent(
    `I found your vehicle ${plate ?? ''} and need to reach you. Opened from a RACE emergency QR.`,
  );
  return `https://wa.me/${number}?text=${text}`;
}

export function renderVehicleEmergencyPage(data: VehicleEmergencyPageData): string {
  const plate = data.vehicleNumber;
  const vehicleLine = [data.brand, data.model].filter(Boolean).join(' ');
  const chips = [data.vehicleType, data.fuelType, data.color].filter(Boolean) as string[];
  const ownerTel = telHref(data.ownerMobile);
  const emergencyTel = telHref(data.emergencyMobile);
  const ownerWa = waHref(data.ownerMobile, plate);
  const ownerLabel = data.ownerName ? `Call ${data.ownerName}` : 'Call owner';
  const emergencyLabel = data.emergencyName
    ? `Call ${data.emergencyName}${data.emergencyRelationship ? ` (${data.emergencyRelationship})` : ''}`
    : 'Call emergency contact';

  const chipHtml = chips
    .map(chip => `<span class="chip">${escapeHtml(chip)}</span>`)
    .join('');

  const ownerBlock = ownerTel
    ? `<a class="btn btn-red" href="${ownerTel}">${escapeHtml(ownerLabel)}</a>
       ${ownerWa ? `<a class="btn btn-ghost" href="${ownerWa}">WhatsApp owner</a>` : ''}`
    : `<a class="btn btn-red" href="tel:112">Call 112 · emergency</a>`;

  const emergencyBlock = emergencyTel
    ? `<a class="btn btn-gold" href="${emergencyTel}">${escapeHtml(emergencyLabel)}</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#16161E" />
  <title>RACE · Help for ${escapeHtml(plate)}</title>
  ${emergencyPageStyles()}
</head>
<body>
  <main class="wrap">
    <header class="brand">
      <span class="logo">RACE</span>
      <span class="brand-sub">Roadside help</span>
    </header>

    <p class="kicker">This vehicle needs help</p>
    <div class="plate">${escapeHtml(plate)}</div>
    <h1 class="vehicle">${escapeHtml(vehicleLine || 'Registered vehicle')}</h1>
    ${chipHtml ? `<div class="chips">${chipHtml}</div>` : ''}

    <p class="lede">One tap to reach the owner. If no one answers, call 112.</p>

    <section class="actions">
      ${ownerBlock}
      ${emergencyBlock}
      <a class="btn btn-gold" href="tel:112">Call 112</a>
      <button class="btn btn-ghost" type="button" id="shareBtn">Share this page</button>
    </section>

    <p class="foot">RACE emergency sticker · numbers stay private until you tap Call</p>
  </main>
  ${shareScript(plate, vehicleLine)}
</body>
</html>`;
}

export function renderVehicleNotFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#16161E" />
  <title>RACE · Vehicle not found</title>
  ${emergencyPageStyles()}
</head>
<body>
  <main class="wrap">
    <header class="brand">
      <span class="logo">RACE</span>
      <span class="brand-sub">Roadside help</span>
    </header>
    <p class="kicker">QR not recognised</p>
    <h1 class="vehicle">This sticker is not linked to a live vehicle.</h1>
    <p class="lede">It may have been removed, or this is a preview. If someone is in danger, call 112 now.</p>
    <section class="actions">
      <a class="btn btn-red" href="tel:112">Call 112</a>
    </section>
  </main>
</body>
</html>`;
}

function shareScript(plate: string, vehicleLine: string): string {
  const text = `Need help with ${plate}${vehicleLine ? ` (${vehicleLine})` : ''}. Opened from a RACE emergency QR.`;
  return `<script>
(function () {
  var btn = document.getElementById('shareBtn');
  if (!btn) return;
  var payload = { title: 'RACE emergency', text: ${JSON.stringify(text)}, url: location.href };
  btn.addEventListener('click', function () {
    if (navigator.share) {
      navigator.share(payload).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload.text + ' ' + payload.url).then(function () {
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = 'Share this page'; }, 1600);
      });
      return;
    }
    window.location.href = 'sms:?body=' + encodeURIComponent(payload.text);
  });
})();
</script>`;
}

function emergencyPageStyles(): string {
  return `<style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: #16161E;
      color: #F9FAFB;
      padding: 20px 20px 32px;
    }
    .wrap { max-width: 420px; margin: 0 auto; }
    .brand { display: flex; align-items: baseline; gap: 10px; margin-bottom: 22px; }
    .logo { font-weight: 800; letter-spacing: 0.18em; font-size: 13px; color: #F5A623; }
    .brand-sub { font-size: 12px; color: #9CA3AF; }
    .kicker {
      margin: 0 0 10px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #E23744;
    }
    .plate {
      display: inline-block;
      background: #F5A623;
      color: #16161E;
      font-weight: 800;
      font-size: 22px;
      letter-spacing: 0.12em;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 14px;
    }
    .vehicle { margin: 0 0 10px; font-size: 22px; font-weight: 800; letter-spacing: -0.03em; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .chip {
      background: #1F2030;
      border: 1px solid #2A2B3A;
      color: #D1D5DB;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 10px;
      border-radius: 999px;
      text-transform: capitalize;
    }
    .lede { margin: 0 0 20px; color: #9CA3AF; line-height: 1.5; font-size: 14px; }
    .actions { display: grid; gap: 10px; }
    .btn {
      display: block;
      width: 100%;
      text-align: center;
      text-decoration: none;
      font-weight: 800;
      font-size: 16px;
      padding: 16px 18px;
      border-radius: 14px;
      border: 0;
      cursor: pointer;
      font-family: inherit;
    }
    .btn-red { background: #E23744; color: #fff; }
    .btn-gold { background: #F5A623; color: #16161E; }
    .btn-ghost { background: #1F2030; color: #F9FAFB; border: 1px solid #2A2B3A; }
    .foot { margin: 22px 0 0; font-size: 11px; color: #6B7280; text-align: center; line-height: 1.5; }
  </style>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
