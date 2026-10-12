कौन-सी information कब लेनी चाहिए?
यहाँ तीन अलग levels रखना सबसे जरूरी है। ये RACE के लिए मेरी product recommendation हैं, universal legal requirements की सूची नहीं।

A. Registration के लिए जरूरी
Required
Personal information: Full name, verified mobile number, date of birth और operating city.
Vehicle information: Vehicle type, registration number और valid driving licence details.
Core verification documents: Driving Licence, Registration Certificate (RC), vehicle insurance, driver profile photo और vehicle photo जहाँ RACE operational verification के लिए आवश्यक रखता है।
Identity verification के लिए accepted government photo ID रखें। Aadhaar को अकेला अनिवार्य विकल्प न बनाएँ; जहाँ लागू हो, consent और alternative identification का रास्ता दें। 

Uber
+2







B. Approval या online होने से पहले जरूरी
Conditional / Activation
- Transport permit, जहाँ संबंधित vehicle और service के लिए आवश्यक हो।
- Fitness certificate, applicable transport vehicles के लिए।
- Valid PUC, applicable vehicle requirements के अनुसार।
- Owner authorization/NOC, यदि vehicle किसी दूसरे व्यक्ति के नाम पर है।
- Current address या additional verification documents, जहाँ RACE की approved verification policy में जरूरी हों।
- Emergency contact, जिसे RACE की safety policy के अनुसार first job से पहले अनिवार्य किया जा सकता है।
Permit और fitness requirements vehicle classification और applicable rules से जुड़ी हैं। इसलिए इन्हें सभी driver categories के लिए बिना शर्त mandatory नहीं दिखाना चाहिए। 

Parivahan Sewa
+2







C. बाद में पूरी की जा सकने वाली जानकारी
Later / Optional
- Email address, driving experience और languages known: profile में बाद में।
- PAN और bank/payout details: payout तथा applicable tax-compliance requirements से पहले।
- Medical fitness certificate और police verification certificate: जब applicable rules या RACE की formal verification policy इसकी मांग करे।
इन्हें initial registration में तभी block करना चाहिए जब कोई वास्तविक compliance या operational dependency हो। PAN और bank details के बिना payout शुरू नहीं होना चाहिए, यदि वे उस stage के लिए आवश्यक हैं।



2. हर screen में क्या refine करना है?









Step 1 · Personal Information
केवल जरूरी personal details सामने रखें। OTP से verify हुआ mobile number auto-filled और read-only हो। DOB eligibility check के लिए रखें, operating city जरूरी हो, और address को verification की जरूरत के हिसाब से handle करें। Email optional रहे; experience और languages बाद में भरे जा सकें।












Step 2 · Vehicle Details
Vehicle type के लिए visual selection cards रखें। Registration number और driving licence number लें। अलग से Vehicle Number और RC Number दोनों माँगना redundant हो सकता है, क्योंकि आम तौर पर vehicle registration number RC पर ही दर्ज होता है। Vehicle ownership भी पूछें, ताकि owner mismatch होने पर authorization/NOC माँगा जा सके।












Step 3 · Documents
Documents को तीन groups में रखें: Needed for review, Only when applicable, और Before first payout. हर document row में Required/Conditional/Later status, upload button, preview, replace/retake और verification status हो। Insurance provider और policy number uploaded document से extract हो सकें तो user से दोनों दोबारा type न करवाएँ।












Step 4 · Review & Submit
सभी sections की compact summary दिखाएँ, और प्रत्येक के साथ Edit action दें। जो required documents अभी missing हैं, उन्हें स्पष्ट रूप से दिखाएँ। Submit तभी enabled हो जब submission की आवश्यक शर्तें पूरी हों। Save and finish later से draft सुरक्षित रखा जा सके, यदि मौजूदा backend इसे support करता है।



3. Document upload का व्यवहार कैसा होना चाहिए?
यह हिस्सा सिर्फ visual design नहीं है। गलत या unreadable documents के कारण registration बार-बार शुरू करने की जरूरत नहीं पड़नी चाहिए। Uber की driver-document guidance भी स्पष्ट, readable documents और अलग-अलग document uploads पर जोर देती है। 

Uber



- Not uploaded: Upload document.
- Uploaded: Preview और Replace.
- Under review: स्पष्ट Pending status.
- Rejected: Rejection reason और Re-upload action.
- Expired: नया valid document माँगें।
- Conditional: केवल तब Required हो जब vehicle/service rules इसकी मांग करें।
- Payout setup pending: Registration और payout readiness अलग-अलग दिखाएँ।
एक महत्वपूर्ण distinction: Pending Verification का मतलब यह नहीं होना चाहिए कि user पूरी तरह operational है। Required checks approve होने तक driver को online होकर jobs स्वीकार नहीं करनी चाहिए।
4. Implementation से पहले दो जरूरी बातें
पहली: UI में किसी field को optional करने से पहले DriverSelfService.register() और backend validation check करो। अगर API अभी address, emergency contact या कोई अन्य value mandatory मानती है, तो केवल design में Optional लिख देने से flow टूट सकता है।
दूसरी: Vehicle category के हिसाब से document requirements configure करो। Tow-truck operator, regular car driver और अलग commercial vehicle categories के लिए एक universal document checklist रखने के बजाय applicable rules और RACE verification policy से checklist बननी चाहिए।
इस redesign का उद्देश्य चार steps को हटाना नहीं, बल्कि registration को आसान बनाना, अनावश्यक typing कम करना और approval के लिए वास्तव में जरूरी information को सही समय पर लेना है। यही approach मैं Vendor Registration में भी recommend करूँगा, लेकिन उसके business, KYC और payout requirements अलग रखूँगा।