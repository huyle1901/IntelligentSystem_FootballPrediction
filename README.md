# AI Football Prediction System

A full-stack machine learning application for predicting football match outcomes with a FastAPI backend, React web interface, and React Native mobile app.

## 📋 Prerequisites

### System Requirements
- **Operating System:**
  - Linux (Ubuntu 20.04+ recommended)
  - macOS (10.14+)
  - Windows 10/11 (WSL2 recommended for better compatibility)
- **Git** - Version control
- **Terminal/CLI:**
  - Linux: bash, zsh, or similar
  - macOS: Terminal, iTerm2, or similar
  - Windows: PowerShell, WSL2 Terminal, or Git Bash

### Python Stack (Conda)
- **Python** 3.10
- **pip** (latest)
- **Miniconda/Anaconda** - For Python environment management

### Python Packages (managed by conda)
| Package | Version |
|---------|---------|
| fastapi | 0.116.0 |
| uvicorn[standard] | 0.33.0 |
| requests | ≥2.32 |
| python-dotenv | ≥1.0.1 |
| pandas | ≥2.0.3 |
| numpy | ≥1.24.4 |
| scipy | ≥1.10.1 |
| scikit-learn | ≥1.3.2 |
| xgboost | ≥2.1.4 |
| mrmr-selection | ≥0.2.8 |
| invoke | ≥2.2 |

### GPU Support (Optional)
- **CUDA** 11.2
- **cuDNN** 8.1.0

### Node.js Stack (Frontend & Mobile)
| Package | Version |
|---------|---------|
| Node.js | 18+ (20+ recommended) |
| npm | 8+ (10+ recommended) |

### Node.js Packages
**Web App (Vite + React)**
| Package | Version |
|---------|---------|
| react | 19.1.1 |
| react-dom | 19.1.1 |
| vite | 7.1.3 |
| lucide-react | 0.542.0 |
| recharts | 3.2.1 |

**Mobile App (Expo + React Native)**
| Package | Version |
|---------|---------|
| react | 19.0.0 |
| react-native | 0.79.3 |
| react-native-web | 0.20.0 |
| expo | ~53.0.0 |
| @expo/metro-runtime | ~5.0.5 |

## 🚀 Quick Start with Conda

### 1. Install Miniconda (if not installed)

#### Linux

```bash
# Download Miniconda
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh

# Install
bash Miniconda3-latest-Linux-x86_64.sh

# Initialize conda
source ~/miniconda3/bin/activate
```

#### macOS

```bash
# Option 1: Using Homebrew (recommended)
brew install miniconda3

# Option 2: Using curl and bash
curl https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-x86_64.sh -o ~/miniconda.sh
bash ~/miniconda.sh
rm ~/miniconda.sh

# Option 3: Using curl for ARM64 (M1/M2/M3 Macs)
curl https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-arm64.sh -o ~/miniconda.sh
bash ~/miniconda.sh
rm ~/miniconda.sh

# Initialize conda
source ~/miniconda3/bin/activate

# After installation, verify:
conda --version
```

#### Windows


```powershell
# Option 1: Using PowerShell (64-bit)
# Download from: https://repo.anaconda.com/miniconda/Miniconda3-latest-Windows-x86_64.exe
# Then run the installer and follow the GUI

# Option 2: Using WSL2 (Linux subsystem)
# Use the Linux instructions above in WSL terminal

# Option 3: Using Chocolatey (if installed)
choco install miniconda3

# After installation, open a new PowerShell or Command Prompt and verify:
conda --version
```

### 2. Create Conda Environment

```bash
# Navigate to project root
cd YOUR_PATH/IntelligentSystem_FootballPrediction

# Create environment from YAML
conda env create -f conda/aifootball_predictions.yaml

# Activate environment
conda activate aifootball_predictions

# Verify Python version
python --version  # Should be 3.10.x
```

### 3. Run Data Pipeline (Optional - if no data exists)

```bash
# Still in conda environment
cd YOUR_PATH/IntelligentSystem_FootballPrediction

# 3.1 Acquire raw data
python scripts/data_acquisition.py \
  --leagues E0 I1 SP1 F1 D1 \
  --seasons 2526 2425 2324 \
  --raw_data_output_dir data/raw

# 3.2 Preprocess data
python scripts/data_preprocessing.py \
  --raw_data_input_dir data/raw \
  --processed_data_output_dir data/processed

# 3.3 Train models
python scripts/train_models.py \
  --processed_data_input_dir data/processed \
  --trained_models_output_dir models
```

**Note:** Data acquisition requires downloading from external sources. This may take several minutes.

### 4. Run the Application

Open **2 separate terminals** and activate conda in each:

```bash
conda activate aifootball_predictions
```

#### Terminal 1 - Backend API

```bash
cd YOUR_PATH/IntelligentSystem_FootballPrediction/apps/api
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Output:**
```bash
INFO:     Will watch for changes in these directories: ['/home/quan/Documents/MasterProgram/HK252/IntelligentSystems/Assignment/IntelligentSystem_FootballPrediction/apps/api']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [61022] using WatchFiles
INFO:     Started server process [61024]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

#### Terminal 2 - Web App

```bash
cd YOUR_PATH/IntelligentSystem_FootballPrediction/apps/web
npm install  # First time only
npm run dev
```

**Output:**
```bash
  VITE v7.3.1  ready in 341 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.102:5173/
  ➜  press h + enter to show help
```

### 5. Access the Application

| Component | URL |
|-----------|-----|
| **Web App** | http://localhost:5173 |
| **API Documentation** | http://localhost:8000/docs |
| **API Health** | http://localhost:8000/health |

## 📱 Mobile App (Optional)

```bash
cd YOUR_PATH/IntelligentSystem_FootballPrediction/apps/mobile
npm install
npm run start

# Choose platform:
# Press 'a' for Android emulator
# Press 'i' for iOS simulator
# Press 'w' for web browser
```

## 🔧 Environment Management

### View Environment Info

```bash
# List all conda environments
conda env list

# View active environment
echo $CONDA_DEFAULT_ENV

# List installed packages
conda list
pip list
```

### Update Environment

```bash
cd YOUR_PATH/IntelligentSystem_FootballPrediction

# Update from YAML file (after changes)
conda env update -f conda/aifootball_predictions.yaml

# Recreate environment (clean start)
conda env remove -n aifootball_predictions
conda env create -f conda/aifootball_predictions.yaml
```

### Deactivate Environment

```bash
conda deactivate
```

## 📊 Project Structure

```
├── apps/
│   ├── api/                    # FastAPI backend
│   │   ├── app/
│   │   │   ├── main.py        # Entry point
│   │   │   ├── routers/       # API endpoints
│   │   │   └── services/      # Business logic
│   │   └── requirements.txt
│   ├── web/                    # React web app (Vite)
│   │   ├── src/
│   │   └── package.json
│   └── mobile/                 # React Native app (Expo)
├── scripts/                    # Data pipeline scripts
│   ├── data_acquisition.py
│   ├── data_preprocessing.py
│   ├── train_models.py
│   └── make_predictions.py
├── notebooks/                  # Jupyter notebooks
├── data/                       # Data directory
│   ├── raw/                   # Original data
│   ├── processed/             # Preprocessed data
│   └── final_predictions.txt
├── models/                     # Trained ML models
├── conda/
│   └── aifootball_predictions.yaml  # Conda environment
└── README.md
```

## 🔌 API Endpoints

### User Endpoints (Role: user)

```bash
# Get available leagues
curl http://localhost:8000/api/v1/user/leagues \
  -H "X-Role: user"

# Get upcoming matches
curl http://localhost:8000/api/v1/user/matches/upcoming?league=E0 \
  -H "X-Role: user"

# Get teams in league
curl http://localhost:8000/api/v1/user/leagues/E0/teams \
  -H "X-Role: user"
```

### Admin Endpoints (Role: admin)

```bash
# Get top viewed teams
curl http://localhost:8000/api/v1/admin/analytics/top-teams \
  -H "X-Role: admin"

# Get top viewed players
curl http://localhost:8000/api/v1/admin/analytics/top-players \
  -H "X-Role: admin"
```

### Data Scientist Endpoints (Role: data_scientist)

```bash
# Get model metrics dashboard
curl http://localhost:8000/api/v1/data-scientist/dashboard \
  -H "X-Role: data_scientist"
```

## 🛠️ Troubleshooting

## 📝 Development Notes

- **Python Version:** 3.10 (specified in `conda/aifootball_predictions.yaml`)
- **Framework:** FastAPI (backend), React (frontend)
- **Database:** SQLite (analytics)
- **ML Models:** XGBoost, scikit-learn
- **GPU Support:** CUDA 11.2, cuDNN 8.1.0 (optional)

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Conda Documentation](https://docs.conda.io/)

## 🤝 Contributing

1. Activate conda environment
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Commit with clear messages

```bash
conda activate aifootball_predictions
git checkout -b feature/your-feature
# ... make changes ...
git add .
git commit -m "Add feature description"
git push
```

## 📄 License

See LICENSE file for details.

## 👥 Authors

- Project Team - AI Football Prediction System
- Assignment: Intelligent Systems (HK252)

---

**Last Updated:** April 5, 2026
**Environment:** Conda with Python 3.10
