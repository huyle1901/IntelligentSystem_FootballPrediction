# API Service

Backend FastAPI cho app mobile, hỗ trợ 3 role:
- `user`: xem trận sắp tới, đội bóng, lịch sử đội, dự đoán O/U 2.5, thông tin cầu thủ
- `data_scientist`: dashboard metrics (accuracy, precision, recall, f1)
- `admin`: analytics top đội và top cầu thủ được truy cập

## Chạy nhanh

```bash
cd apps/api
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Biến môi trường

- `API_FOOTBALL_DATA`: API key của football-data.org (optional, nếu thiếu sẽ fallback dữ liệu local)

## Auth role (demo)

Truyền header:

- `X-Role: user`
- `X-Role: data_scientist`
- `X-Role: admin`

## Endpoint chính

- `GET /api/v1/user/leagues`
- `GET /api/v1/user/matches/upcoming?league=E0`
- `GET /api/v1/user/leagues/{league}/teams`
- `GET /api/v1/user/teams/{team_name}/overview?league=E0`
- `GET /api/v1/user/matches/{match_id}/prediction?league=E0`
- `GET /api/v1/user/teams/{team_name}/players?league=E0&team_id=64`
- `POST /api/v1/user/players/{player_name}/view?league=E0&team_name=Arsenal`
- `GET /api/v1/data-scientist/dashboard`
- `GET /api/v1/admin/analytics/top-teams`
- `GET /api/v1/admin/analytics/top-players`
