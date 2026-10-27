# Gates: Wizard illustration, vehicle options, keyboard

OWNS: customer application/src/screens/onboarding/ProfileWizardScreen.tsx, customer application/src/components/onboarding/ProfileSetupChrome.tsx, customer application/src/components/onboarding/ProfileSetupHeroes.tsx, customer application/src/components/ui/AppKeyboard.tsx, customer application/app.config.js

Scope: Full-width hero without side crop, one card top on steps 1–3, overlay dropdown, keyboard collapses the hero and scrolls the field.

- [x] G1: Customer app TypeScript passes
  CHECK: npx tsc --noEmit && echo tsc_ok
  EXPECT: tsc_ok
  CWD: .
  EVIDENCE: automatic-evidence=v1; definition-sha256=8db859b868d2090366353bbfaaa8aaebab393c36d2eb60995b5c027af5ee7a88; exit=0; EXPECT=matched; output-sha256=fb8c1e822431bfe4cbbd8ed9ef59223b42b1138f1552f311b2ae027de4774183; output-bytes=7; shell=/bin/sh; cwd=/workspaces/RACE/customer application; path=03f354de2adf/41 entries

- [x] G2: Hero keeps its aspect width and the card top uses one shared slot
  CHECK: node -e "const fs=require('fs');const w=fs.readFileSync('src/screens/onboarding/ProfileWizardScreen.tsx','utf8');const h=fs.readFileSync('src/components/onboarding/ProfileSetupHeroes.tsx','utf8');const frame=h.split('function SceneFrame')[1].split('function SharedScenePaint')[0];if(frame.indexOf('xMidYMid meet')<0)process.exit(1);if(frame.indexOf('slice')>=0)process.exit(1);if(w.indexOf('heroWidth * (HERO_VIEWBOX_H / HERO_VIEWBOX_W)')<0)process.exit(1);if(w.indexOf('const heroSlot = WIZARD_HERO_SLOT * scale')<0)process.exit(1);const slot=Number((w.match(/WIZARD_HERO_SLOT = (\\d+)/)||[])[1]);const nudge=Number((w.match(/WIZARD_HERO_NUDGE = (\\d+)/)||[])[1]);if(!(slot>0&&slot<=160))process.exit(1);if(!(nudge>=0&&nudge<=12))process.exit(1);process.stdout.write('hero layout check passed\\n');"
  EXPECT: hero layout check passed
  CWD: .
  EVIDENCE: automatic-evidence=v1; definition-sha256=ee272a1c8457c5d513a8b310cc19826ef1ebf3c51263b392b1a4532a090c0ad8; exit=0; EXPECT=matched; output-sha256=b9c4a77df2f8e5aabe1c15eb687a3cf621e051d196c3cdebc762571cadd49977; output-bytes=25; shell=/bin/sh; cwd=/workspaces/RACE/customer application; path=03f354de2adf/41 entries

- [x] G3: Vehicle type has no Auto, and make/model lists end with Other
  CHECK: node -e "const fs=require('fs');const c=fs.readFileSync('src/components/onboarding/ProfileSetupChrome.tsx','utf8');const w=fs.readFileSync('src/screens/onboarding/ProfileWizardScreen.tsx','utf8');if(c.indexOf(\"id: 'auto'\")>=0)process.exit(1);for(const id of ['car','bike','truck','other']){if(c.indexOf(\"id: '\"+id+\"'\")<0)process.exit(1);}const makes=(w.split('const MAKES = ')[1]||'').split(';')[0];if(makes.indexOf('Maruti Suzuki')<0||makes.indexOf('Hyundai')<0||makes.indexOf('Honda')<0||makes.indexOf('Tata')<0||makes.indexOf('CUSTOM_OPTION')<0)process.exit(1);if(makes.indexOf('Mahindra')>=0)process.exit(1);const models=w.split('const MODELS_BY_MAKE')[1].split('const VEHICLE_TYPES')[0];for(const brand of ['Maruti Suzuki','Hyundai','Honda','Tata']){let i=models.indexOf(\"'\"+brand+\"'\");if(i<0)i=models.indexOf(brand+':');const start=models.indexOf('[',i);const row=models.slice(start+1,models.indexOf(']',start));const items=row.split(',').map(function(s){return s.trim();}).filter(Boolean);if(items.length<3||items.length>4)process.exit(1);if(items[items.length-1]!=='CUSTOM_OPTION')process.exit(1);}if(w.indexOf('label=\"Custom make\"')<0||w.indexOf('label=\"Custom model\"')<0)process.exit(1);process.stdout.write('vehicle options check passed\\n');"
  EXPECT: vehicle options check passed
  CWD: .
  EVIDENCE: automatic-evidence=v1; definition-sha256=7c22b86d4466ea710ba4656f5421ce812d2463d7fd8758aa6ac22568a5eee261; exit=0; EXPECT=matched; output-sha256=950d75264cc15797a8092e4bceefeef8efb679840348a9ad8597a7549459e6f7; output-bytes=29; shell=/bin/sh; cwd=/workspaces/RACE/customer application; path=03f354de2adf/41 entries

- [x] G4: Keyboard collapses the hero slot and can scroll the focused field
  CHECK: node -e "const fs=require('fs');const w=fs.readFileSync('src/screens/onboarding/ProfileWizardScreen.tsx','utf8');const header=w.indexOf('<AuthHeader');const scroll=w.indexOf('ref={scrollRef}');if(header<0||scroll<0||header>scroll)process.exit(1);if(w.indexOf('keyboardWillShow')<0)process.exit(1);if(w.indexOf('keyboardOpen ? keyboardHeight : 0')<0)process.exit(1);if(w.indexOf('revealFocusedField')<0)process.exit(1);if(w.indexOf('{keyboardOpen ? null : (')<0)process.exit(1);process.stdout.write('wizard keyboard chrome check passed\\n');"
  EXPECT: wizard keyboard chrome check passed
  CWD: .
  EVIDENCE: automatic-evidence=v1; definition-sha256=ffc4873b5b2610f0ea116858d3b48bf465ff755969544c3ee9d4db46cb00fbf9; exit=0; EXPECT=matched; output-sha256=6fb9f2d18de993a2dee1f1cf13d16805ccc22104e8e6ab49ad1e7691433addfa; output-bytes=36; shell=/bin/sh; cwd=/workspaces/RACE/customer application; path=03f354de2adf/41 entries

- [x] G5: Dropdown menu overlays in a modal instead of stretching the card
  CHECK: node -e "const fs=require('fs');const c=fs.readFileSync('src/components/onboarding/ProfileSetupChrome.tsx','utf8');const menu=c.split('export function ProfileDropdown')[1].split('export function GoldCta')[0];if(menu.indexOf('<Modal')<0)process.exit(1);if(menu.indexOf('position: \\'absolute\\'')<0)process.exit(1);if(menu.indexOf('marginTop:')>=0)process.exit(1);process.stdout.write('dropdown overlay check passed\\n');"
  EXPECT: dropdown overlay check passed
  CWD: .
  EVIDENCE: automatic-evidence=v1; definition-sha256=cbad44acfa3d1289f9580c8c31c75af3c46a6268a2ed80973b49c10f5f3677c2; exit=0; EXPECT=matched; output-sha256=1a5496e772efdca5e35d5980a71a537ad7d9fef31baa9d77f780739e5948aec7; output-bytes=30; shell=/bin/sh; cwd=/workspaces/RACE/customer application; path=03f354de2adf/41 entries
