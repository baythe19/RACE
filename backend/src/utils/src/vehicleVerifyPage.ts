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
  const ownerLabel = data.ownerName ? `Call ${data.ownerName}` : 'Call vehicle owner';
  const emergencyLabel = data.emergencyName
    ? `Call ${data.emergencyName}${data.emergencyRelationship ? ` · ${data.emergencyRelationship}` : ''}`
    : 'Call emergency contact';

  const chipHtml = chips
    .map(chip => `<span class="chip">${escapeHtml(chip)}</span>`)
    .join('');

  const ownerBlock = ownerTel
    ? `<a class="btn btn-primary" href="${ownerTel}">${escapeHtml(ownerLabel)}</a>
       ${ownerWa ? `<a class="btn btn-secondary" href="${ownerWa}">WhatsApp owner</a>` : ''}`
    : `<p class="hint">Owner contact is not on file. Use emergency numbers below.</p>`;

  const emergencyBlock = emergencyTel
    ? `<a class="btn btn-secondary" href="${emergencyTel}">${escapeHtml(emergencyLabel)}</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#FFF7ED" />
  <meta name="referrer" content="no-referrer" />
  <title>RACE · Help for ${escapeHtml(plate)}</title>
  ${emergencyPageStyles()}
</head>
<body>
  <main class="page">
    <header class="top">
      <div class="brand-mark">RACE</div>
      <p class="brand-tag">Verified emergency sticker</p>
    </header>

    <section class="card hero">
      <p class="eyebrow">Vehicle needs help</p>
      <div class="plate">${escapeHtml(plate)}</div>
      <h1 class="title">${escapeHtml(vehicleLine || 'Registered vehicle')}</h1>
      ${chipHtml ? `<div class="chips">${chipHtml}</div>` : ''}
      <p class="lede">Tap to reach the registered owner or their emergency contact. If someone is in immediate danger, call <strong>112</strong>.</p>
    </section>

    <section class="card actions">
      <h2 class="section-title">Reach someone now</h2>
      ${ownerBlock}
      ${emergencyBlock}
      <a class="btn btn-danger" href="tel:112">Call 112 · national emergency</a>
      <button class="btn btn-ghost" type="button" id="shareBtn">Share this page</button>
    </section>

    <p class="foot">Phone numbers stay on this device until you tap Call or WhatsApp. RACE roadside assistance.</p>
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
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#FFF7ED" />
  <meta name="referrer" content="no-referrer" />
  <title>RACE · QR not linked</title>
  ${emergencyPageStyles()}
</head>
<body>
  <main class="page">
    <header class="top">
      <div class="brand-mark">RACE</div>
      <p class="brand-tag">Emergency scan</p>
    </header>

    <section class="card hero">
      <div class="status-icon" aria-hidden="true">!</div>
      <p class="eyebrow eyebrow-warn">QR not linked</p>
      <h1 class="title">This sticker is not active on RACE.</h1>
      <p class="lede">It may be a demo, removed, or not registered yet. If someone needs urgent help at this vehicle, call emergency services now.</p>
    </section>

    <section class="card actions">
      <a class="btn btn-danger" href="tel:112">Call 112 · national emergency</a>
      <p class="hint">To register a vehicle sticker, open the RACE app → Profile → My Vehicles.</p>
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
        btn.textContent = 'Link copied';
        setTimeout(function () { btn.textContent = 'Share this page'; }, 1600);
      });
      return;
    }
    window.location.href = 'sms:?body=' + encodeURIComponent(payload.text + ' ' + payload.url);
  });
})();
</script>`;
}

function emergencyPageStyles(): string {
  return `<style>
    :root {
      color-scheme: light;
      --bg: #FFF7ED;
      --card: #FFFFFF;
      --text: #111827;
      --muted: #6B7280;
      --border: #E5E7EB;
      --gold: #F59E0B;
      --gold-soft: #FEF3C7;
      --danger: #DC2626;
      --danger-soft: #FEE2E2;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: linear-gradient(180deg, var(--bg) 0%, #FFFFFF 48%);
      color: var(--text);
      padding: 20px 16px 40px;
    }
    .page { max-width: 440px; margin: 0 auto; }
    .top { margin-bottom: 18px; }
    .brand-mark {
      font-weight: 800;
      letter-spacing: 0.16em;
      font-size: 14px;
      color: var(--gold);
    }
    .brand-tag { margin: 4px 0 0; font-size: 13px; color: var(--muted); }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 20px 18px;
      box-shadow: 0 8px 30px rgba(17, 24, 39, 0.06);
      margin-bottom: 14px;
    }
    .eyebrow {
      margin: 0 0 10px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--gold);
    }
    .eyebrow-warn { color: var(--danger); }
    .status-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: var(--danger-soft);
      color: var(--danger);
      font-weight: 800;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    .plate {
      display: inline-block;
      background: var(--gold-soft);
      border: 1px solid #FDE68A;
      color: var(--text);
      font-weight: 800;
      font-size: 20px;
      letter-spacing: 0.1em;
      padding: 10px 14px;
      border-radius: 12px;
      margin-bottom: 12px;
    }
    .title { margin: 0 0 10px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.25; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .chip {
      background: #F9FAFB;
      border: 1px solid var(--border);
      color: #374151;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 10px;
      border-radius: 999px;
      text-transform: capitalize;
    }
    .lede { margin: 0; color: var(--muted); line-height: 1.55; font-size: 14px; }
    .section-title { margin: 0 0 12px; font-size: 15px; font-weight: 800; }
    .actions { display: grid; gap: 10px; }
    .btn {
      display: block;
      width: 100%;
      text-align: center;
      text-decoration: none;
      font-weight: 800;
      font-size: 15px;
      padding: 15px 16px;
      border-radius: 14px;
      border: 0;
      cursor: pointer;
      font-family: inherit;
    }
    .btn-primary { background: var(--gold); color: #111827; }
    .btn-secondary { background: #FFFFFF; color: var(--text); border: 1px solid var(--border); }
    .btn-danger { background: var(--danger); color: #FFFFFF; }
    .btn-ghost { background: #F9FAFB; color: var(--text); border: 1px solid var(--border); }
    .hint { margin: 0; font-size: 13px; color: var(--muted); line-height: 1.5; }
    .foot { margin: 8px 4px 0; font-size: 11px; color: var(--muted); text-align: center; line-height: 1.5; }
  </style>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
