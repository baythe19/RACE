Driver का पूरा flow
यह sequence तुम्हारे existing architecture में बताए गए DRIVER_EN_ROUTE → DRIVER_ARRIVED → IN_PROGRESS → COMPLETED lifecycle के अनुसार रखा गया है। Pasted text.txt


01 · Dashboard
Driver की current availability, earnings और incoming requests। अगर कोई active job है तो वह सबसे prominent होगी। Verification status केवल compact indicator हो, duplicate बड़ा card नहीं।




02 · Jobs / Available Requests
Service type, pickup और drop location, distance तथा estimated earnings जहाँ उपलब्ध हों, वहाँ दिखें। Driver Accept या Decline कर सके। एक request accept होने पर backend की पुष्टि मिलने के बाद ही active job खुले।




03 · En route to pickup
Map और route, pickup address, customer contact और Navigate action। Driver pickup पर पहुँचने के बाद Arrived at pickup दबाए।




04 · Verify customer OTP
Customer की RACE app में दिखने वाला 4-digit trip OTP enter हो। सही OTP के बाद ही service शुरू हो। गलत OTP पर स्पष्ट error आए और entered code दोबारा जाँचा जा सके।




05 · Service in progress
Towing job में destination और route प्रमुख होंगे। Customer contact, support और current job status उपलब्ध रहें। Complete job दबाने पर आवश्यक confirmation मिले।




06 · Job completed
Completion status, final fare/earnings summary और job details दिखें। Back to Home से dashboard पर लौटें। यदि दूसरी active job मौजूद है तो dashboard पर वही प्राथमिकता पाए।



Uber Driver के documented journey में भी request स्वीकार करना, rider तक navigate करना, trip शुरू करना और completion दर्ज करना अलग स्पष्ट actions हैं। Rapido Captain भी nearby orders, trip completion और earnings tracking पर केंद्रित है। 

Uber
+1



Implementation के लिए महत्वपूर्ण behavior
- Online status: Backend से current availability load करें। Screen खुलते ही बिना user intent के online state को बदलने वाली mutation न चलाएँ।
- Active job: Job स्वीकार होने पर ongoing trip का state बना रहे। Active job के दौरान bottom navigation छिपाकर focused layout रखा जा सकता है, लेकिन दूसरे screen पर जाने से ongoing job गायब नहीं होना चाहिए।
- OTP: Login वाला 6-digit OTP और customer trip वाला 4-digit OTP अलग flows हैं। इन्हें एक जैसा component मानकर गलत transition न बनाएं।
- Loading और errors: Accept, Start और Complete पर duplicate taps रोकें। API failure पर status को सफल मानकर आगे न बढ़ें।
- Real data: Image में दिखाए गए fares, distances, ETAs और earnings illustrative हैं। Implementation में API से उपलब्ध values इस्तेमाल हों; unsupported metrics invent नहीं करने हैं।
- Account verification: पहली बार या pending-verification वाले driver को login OTP के बाद सीधे dashboard पर नहीं भेजना है। उसके लिए अलग verification-status screen तुम्हारे अगले phase में design करेंगे। ये dashboard designs approved/active driver के काम करने वाले flow को दिखाते हैं।
एक अंतिम UX निर्णय भी महत्वपूर्ण है: सामान्य Dashboard, Jobs और Account पर existing 3-tab navigation consistent रखेंगे। लेकिन navigation, OTP और completion वाले active-job screens में map और primary action को जगह देने के लिए tab bar हटाना बेहतर रहेगा। इससे driver का ध्यान उसी काम पर रहेगा जो उसे उस समय पूरा करना है।