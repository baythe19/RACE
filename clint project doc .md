# RACE Service – Admin Panel Scope (MVP)

---

# Admin Modules

## 1. Dashboard

The dashboard provides a real-time overview of platform operations.

### Features

* Total Customers
* Total Vendors
* Total Drivers
* Active Bookings
* Completed Bookings
* Total Revenue
* Pending Vendor Approvals
* Pending Driver Approvals
* Recent Activities

### Analytics

* Revenue Overview
* Booking Overview
* Customer Growth
* Service Distribution

---

## 2. Customer Management (CRUD)

### Features

* View Customers
* Edit Customer Details
* Suspend / Activate Accounts
* View Registered Vehicles
* View Booking History
* View Subscription Details

### Customer Details

* Profile Information
* Vehicles
* Bookings
* Payments
* Subscription Status

---

## 3. Vendor Management (CRUD)

### Features

* View Vendors
* Approve Vendors
* Reject Vendors
* Suspend Vendors
* Verify Documents
* View Business Information
* View Bank Details

### Vendor Verification Documents

* Aadhaar Card
* PAN Card
* GST Registration (Optional)
* MSME/Udyam Registration (Optional)
* Cancelled Cheque
* Selfie Verification

### Status

* Pending
* Approved
* Rejected
* Suspended

---

## 4. Driver Management (CRUD)

### Driver Categories

* Tow Truck Drivers
* Full-Time Drivers
* Part-Time Drivers

### Features

* Driver Approval
* Document Verification
* Performance Monitoring
* Ratings Management
* Earnings Overview
* Availability Tracking
* Suspend Driver

### Driver Documents

* Aadhaar
* PAN
* Driving Licence
* Police Verification
* Vehicle Documents
* Bank Details

### Status

* Pending
* Approved
* Rejected
* Online
* Offline
* Suspended

---

## 5. Booking Management

### Features

* View All Bookings
* Assign Vendors
* Assign Drivers
* Live Booking Tracking
* Service Status Management
* Handle Cancellations
* View Booking Timeline

### Booking Workflow

Created
→ Assigned
→ Accepted
→ En Route
→ Arrived
→ Service Started
→ Completed
→ Closed

### Booking Details

* Customer Information
* Vehicle Information
* Vendor Information
* Driver Information
* Payment Information
* Booking Timeline

---

## 6. Financial Management

### Features

* Payment Management
* Vendor Payouts
* Commission Tracking
* Refund Management
* Transaction History
* Subscription Revenue Tracking

### Dashboard

* Revenue
* Commissions
* Refunds
* Vendor Payouts
* Subscription Revenue

---

## 7. Reports & Analytics

### Revenue Reports

* Daily Revenue
* Weekly Revenue
* Monthly Revenue

### Booking Reports

* Service Wise
* Vendor Wise
* Driver Wise

### Driver Reports

* Ratings
* Earnings
* Completed Jobs

### Customer Analytics

* Active Customers
* New Registrations
* Subscription Growth

---

## 8. Subscription Management

### Customer Plans

* Basic
* Premium
* Family

### Vendor Plans

* Reduced Commission
* Priority Leads
* Featured Listing
* Performance Badge

### Features

* Active Plans
* Expiring Plans
* Plan Revenue Analytics

---

## 9. Admin Users & Roles

### Roles

* Super Admin
* Operations Admin
* Verification Admin
* Finance Admin

### Permissions

* Create
* Read
* Update
* Delete
* Approve
* Reject
* Assign

---

## 10. Settings

### Features

* Platform Configuration
* Service Configuration
* Payment Settings
* Notification Settings
* Security Settings
* Role Management

---

# Final Admin Sidebar

Dashboard

Customer Management

Vendor Management

Driver Management

Booking Management

Financial Management

Reports & Analytics

Subscription Management

Admin Users & Roles

Settings







*1. Customer App Registration*

Registration Requirements
Mobile Number
OTP Verification
Full Name
Email ID (Optional)
Gender (Optional)
Profile Photo (Optional)
Date of Birth (Optional)
Emergency Contact Number
Address
Create PIN/Password
Vehicle Registration

Customer can add multiple vehicles:
Vehicle Type
Vehicle Number
Vehicle Brand
Vehicle Model
Vehicle Color
Fuel Type
Vehicle Photo (Optional)
QR Code Generation for each vehicle

2. Customer Home Screen Services
The home screen should display all available services.

*A. Towing Service*
Instant Towing
Scheduled Towing
Emergency Towing

*B. Driver Service*
Part-Time Driver
Full-Time Driver
Outstation Driver
Night Driver

*C. Roadside Assistance*
Flat Tyre Assistance
Battery Jump Start
Fuel Delivery
Minor Repairs

*D. Future Services*
Car Wash
Vehicle Inspection
Insurance Assistance
EV Charging Support
Ambulance Service
Corporate Fleet Support
Vehicle Pickup & Drop
Mechanic on Demand

*3. Towing Service Vendor Registration*
(Company/Business Owner)
Basic Information
Business Name
Owner Name
Mobile Number
Email ID
Business Address


*Business Documents*
Aadhaar Card
PAN Card
GST Registration (Optional)
Shop & Establishment Certificate (if applicable)
MSME/Udyam Registration (Optional)
Bank Account Details
Cancelled Cheque
Verification
Selfie Verification
Agreement Acceptance
Background Verification


*4. Towing Vehicle Driver Registration*
(Individual Tow Truck Driver)
Personal Details
Full Name
Mobile Number
Date of Birth
Address
Emergency Contact

*Documents Required*

Aadhaar Card
PAN Card
Driving Licence (Commercial)
Driver Photo
Police Verification Certificate
Medical Fitness Certificate (Optional)
Bank Details
Account Holder Name
Account Number
IFSC Code
Tow Vehicle Details
Vehicle Registration Number (RC)
Vehicle Type
Vehicle Photos
Commercial Permit
Vehicle Insurance
Fitness Certificate
Pollution Certificate (PUC)

*5. Full-Time Driver Registration*
Personal Information
Full Name
Mobile Number
Address
Date of Birth
Emergency Contact

*Mandatory Documents*
Aadhaar Card
PAN Card
Driving Licence
Passport Size Photo
Police Verification Certificate
Experience Details
Years of Driving Experience
Vehicle Categories Driven
Previous Employer Details
Languages Known
Bank Details
Bank Account Information
Optional
Medical Certificate
Reference Contact

*6. Part-Time Driver Registration*
Personal Information
Full Name
Mobile Number
Address
Emergency Contact


*Documents*

Aadhaar Card
PAN Card
Driving Licence
Driver Photo
Police Verification Certificate
Availability
Hourly Availability
Daily Availability
Night Shift Availability
Weekend Availability
Experience
Driving Experience
Vehicle Categories
Bank Details
Account Number
IFSC Code 

*7. Subscription Module*

Customer Subscription
Towing Plans
Basic
Premium
Family
Driver Service Plans
Monthly Driver Package
Corporate Package
Vendor Subscription
Benefits
Reduced Commission
Priority Leads
Featured Listing
Performance Badge

*8. QR Emergency Vehicle Module*
Each registered vehicle receives a unique QR code.
When scanned:
Contact Vehicle Owner
Notify Emergency Contacts
Request Towing Service
Share Emergency Location
Access Emergency Assistance

*9. Admin Panel*
Customer Management
View/Edit Customers
Suspend Accounts
Vendor Management
Approve/Reject Vendors
Verify Documents
Driver Management
Driver Approval
Performance Monitoring
Booking Management
Assign Services
Track Live Status
Handle Cancellations
Financial Management
Payments
Commissions
Refunds
Subscription Revenue
Reports
Revenue Reports
Booking Reports
Driver Performance Reports
Customer Analytics

*10. Future Expansion Modules*
You can add these later without changing the core app structure:
Mechanic Partner Registration
Ambulance Partner Registration
EV Charging Partner Registration
Car Wash Partner Registration
Insurance Partner Registration
Fleet Management Services
Corporate Accounts
Referral & Rewards Program
Loyalty Points System
AI Chatbot Support
Multi-language Support (English, Hindi, Odia)

*Recommended Launch Structure (MVP)*

*Phase 1 (Launch)*
✅ Cus