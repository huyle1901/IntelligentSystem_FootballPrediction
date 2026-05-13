# API Service

Backend FastAPI cho web app, hỗ trợ 3 role:
- `user`: xem trận sắp tới, đội bóng, lịch sử đội, dự đoán O/U 2.5, thông tin cầu thủ
- `data_scientist`: dashboard metrics (accuracy, precision, recall, f1)
- `admin`: analytics top đội và top cầu thủ được truy cập

## Chạy nhanh

```bash
cd apps/api
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Chạy bằng Docker Compose

Từ thư mục root của project:

```bash
docker compose up --build
```

Sau khi chạy:

- Web: `http://localhost:5173`
- API docs: `http://localhost:8000/docs`
- API health: `http://localhost:8000/health`
- PostgreSQL: `localhost:5432`

Docker Compose sẽ chạy 3 service:

- `postgres`: database PostgreSQL cho auth/analytics
- `api`: FastAPI backend
- `web`: React web app build bằng Vite và serve qua Nginx

## Biến môi trường

- `API_FOOTBALL_DATA`: API key của football-data.org (optional, nếu thiếu sẽ fallback dữ liệu local)
- `DATABASE_URL`: database connection string. Nếu không set thì backend dùng SQLite local. Khi chạy Docker Compose, biến này được set thành PostgreSQL:

```bash
postgresql://football:football@postgres:5432/football_ai
```

## Database

Backend hỗ trợ 2 mode:

- Local mặc định: SQLite tại `apps/api/app/db/analytics.db`
- Docker Compose: PostgreSQL service `postgres`

Database này dùng cho user demo và analytics. Dữ liệu bóng đá và model vẫn được đọc từ file local:

- `data/`
- `models/`

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
