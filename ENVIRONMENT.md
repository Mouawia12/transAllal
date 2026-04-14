# دليل متغيرات البيئة - Trans Allal

## متطلبات التشغيل الأولية

### 1. قاعدة البيانات (MySQL)
تأكد من تشغيل MySQL على المنفذ 3306 وإنشاء قاعدة البيانات:
```sql
CREATE DATABASE `trans-allal-db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mouawia'@'localhost' IDENTIFIED BY 'mouawia';
GRANT ALL PRIVILEGES ON `trans-allal-db`.* TO 'mouawia'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Redis (اختياري في التطوير)
```bash
redis-server
```
---

## Backend — `backend-trans-allal/.env`

```env
PORT=3000
APP_NAME=Trans Allal API
APP_ENV=development
APP_URL=http://localhost:3000
API_PREFIX=api/v1

# قاعدة البيانات
DATABASE_URL=mysql://mouawia:mouawia@localhost:3306/trans-allal-db

# JWT - غيّر هذه في الإنتاج!
JWT_SECRET=trans_allal_jwt_secret_key_32chars_min
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=trans_allal_refresh_secret_key_32ch
JWT_REFRESH_EXPIRES_IN=7d

# Redis (اختياري)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:19006
WS_PORT=3000

# بيانات التجربة - تُنشأ تلقائياً عند أول تشغيل إذا كانت قاعدة البيانات فارغة
DEV_COMPANY_NAME=Trans Allal Demo Logistics
DEV_SUPER_ADMIN_EMAIL=superadmin@transallal.local
DEV_SUPER_ADMIN_PASSWORD=SuperAdmin123!
DEV_COMPANY_ADMIN_EMAIL=admin@transallal.local
DEV_COMPANY_ADMIN_PASSWORD=CompanyAdmin123!
```

---

## Dashboard — `dashboard-trans-allal/.env.local`

```env
NEXT_PUBLIC_APP_NAME=Trans Allal Dashboard
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_MAP_PROVIDER=mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=        ← ضع توكن Mapbox هنا (pk.xxx...)
NEXT_PUBLIC_AUTH_STORAGE_KEY=trans-allal-dashboard-token
```

### للحصول على توكن Mapbox:
1. اذهب إلى https://mapbox.com وأنشئ حساباً مجانياً
2. من لوحة التحكم → Tokens → Create a token
3. اختر scope: `styles:read`, `tiles:read`
4. انسخ التوكن الذي يبدأ بـ `pk.`

> بدون توكن Mapbox: الخريطة لن تظهر لكن باقي التطبيق يعمل بشكل طبيعي.

---

## Mobile App — `app-trans-allal/.env`

```env
EXPO_PUBLIC_APP_NAME=Trans Allal Driver
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_WS_URL=ws://localhost:3000
EXPO_PUBLIC_MAP_PROVIDER=mapbox
EXPO_PUBLIC_MAPBOX_TOKEN=        ← ضع توكن Mapbox هنا
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_AUTH_STORAGE_KEY=trans-allal-driver-token
```

> **ملاحظة للموبايل على جهاز فعلي:** استبدل `localhost` بعنوان IP جهازك:
> - macOS: `ipconfig getifaddr en0`
> - Linux: `hostname -I`
> مثال: `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3000/api/v1`

---

## خطوات التشغيل

### Backend
```bash
cd backend-trans-allal
npm install
npm run start:dev
```
عند أول تشغيل مع قاعدة بيانات فارغة، يُنشئ النظام تلقائياً:
- شركة تجريبية
- مستخدم SUPER_ADMIN: `superadmin@transallal.local` / `SuperAdmin123!`
- مستخدم COMPANY_ADMIN: `admin@transallal.local` / `CompanyAdmin123!`

### Dashboard
```bash
cd dashboard-trans-allal
npm install
npm run dev
```
يفتح على: http://localhost:3001

### Mobile App
```bash
cd app-trans-allal
npm install
npx expo start
```
- اضغط `i` للـ iOS simulator
- اضغط `a` للـ Android emulator
- أو امسح QR code بتطبيق Expo Go

---

## المنافذ المستخدمة

| خدمة | المنفذ |
|------|--------|
| Backend API | 3000 |
| Backend WebSocket | 3000 (نفس الخادم، namespace: `/tracking`) |
| Dashboard | 3001 |
| Mobile (Expo) | 8081 |
| MySQL | 3306 |
| Redis | 6379 |
