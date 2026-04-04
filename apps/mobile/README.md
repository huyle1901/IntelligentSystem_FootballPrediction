# Mobile App (Expo)

App mobile co ban cho 3 role:
- `user`: tran sap dien ra, doi theo giai, lich su/lich sap toi, du doan O/U 2.5, danh sach cau thu
- `data_scientist`: dashboard metrics model
- `admin`: top doi/cau thu duoc truy cap

## Chay nhanh

```bash
cd apps/mobile
npm install
set EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1
npm run start
```

Goi y URL backend:
- Android emulator: `http://10.0.2.2:8000/api/v1`
- iOS simulator: `http://localhost:8000/api/v1`
- Device that/phone that: dung IP LAN cua may chay API, vd `http://192.168.1.50:8000/api/v1`
