"""Train models to predict Over2.5 football outcomes."""

from __future__ import annotations

import argparse
import os
import pickle
import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier, VotingClassifier
from sklearn.exceptions import ConvergenceWarning
from sklearn.experimental import enable_halving_search_cv  # noqa: F401
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, make_scorer, precision_score, roc_auc_score
from sklearn.model_selection import HalvingGridSearchCV, KFold, cross_val_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from xgboost import XGBClassifier

warnings.filterwarnings("ignore", category=ConvergenceWarning)
warnings.filterwarnings("ignore", category=FutureWarning)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train models to predict Over2.5 football outcomes.")
    parser.add_argument("--processed_data_input_dir", type=str, required=True, help="Folder containing processed CSV files.")
    parser.add_argument("--trained_models_output_dir", type=str, required=True, help="Folder where trained models are saved.")
    parser.add_argument(
        "--metric_choice",
        type=str,
        choices=["accuracy", "precision", "f1", "roc_auc"],
        default="accuracy",
        help="Metric for model selection.",
    )
    parser.add_argument("--n_splits", type=int, default=5, help="KFold splits for cross-validation.")
    parser.add_argument("--voting", type=str, choices=["soft", "hard"], default="soft", help="Voting strategy.")
    return parser.parse_args()


def load_data(processed_data_input_dir: str) -> dict[str, pd.DataFrame]:
    data: dict[str, pd.DataFrame] = {}
    for file_name in os.listdir(processed_data_input_dir):
        if not file_name.endswith(".csv"):
            continue
        league_name = file_name.split("_")[0]
        file_path = os.path.join(processed_data_input_dir, file_name)
        data[league_name] = pd.read_csv(file_path)
    return data


def prepare_data(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    y = df["Over2.5"].values
    numerical_columns = df.select_dtypes(include=["number"]).columns
    X = df[numerical_columns].drop(columns=["Over2.5"]).values
    return X, y


def get_scorer(metric_choice: str):
    if metric_choice == "accuracy":
        return make_scorer(accuracy_score)
    if metric_choice == "precision":
        return make_scorer(precision_score)
    if metric_choice == "f1":
        return make_scorer(f1_score)
    if metric_choice == "roc_auc":
        return make_scorer(roc_auc_score, greater_is_better=True, needs_proba=True)
    return make_scorer(accuracy_score)


def train_and_save_models(
    X: np.ndarray,
    y: np.ndarray,
    trained_models_output_dir: str,
    league_name: str,
    metric_choice: str,
    voting: str = "soft",
    n_splits: int = 5,
) -> None:
    scorer = get_scorer(metric_choice)
    cv = KFold(n_splits=n_splits, shuffle=True, random_state=42)

    models: dict[str, tuple[object, dict]] = {
        "Logistic Regression": (
            LogisticRegression(random_state=42),
            {
                "C": [0.01, 0.1, 1, 10],
                "penalty": ["l1", "l2"],
                "solver": ["liblinear", "saga"],
                "max_iter": [2000, 3000],
            },
        ),
        "KNN": (
            KNeighborsClassifier(),
            {
                "n_neighbors": [3, 5, 7, 9],
                "weights": ["uniform", "distance"],
                "metric": ["euclidean", "manhattan"],
            },
        ),
        "SVM": (
            SVC(probability=True),
            {"C": [0.1, 1, 10], "kernel": ["linear", "rbf", "poly"], "degree": [2, 3, 4, 5]},
        ),
        "Random Forest": (
            RandomForestClassifier(random_state=42),
            {"n_estimators": [50, 100, 200], "max_depth": [3, 5, 7, 9], "bootstrap": [True]},
        ),
        "XGBoost": (
            XGBClassifier(tree_method="hist", eval_metric="logloss"),
            {"n_estimators": [50, 100, 150, 200], "max_depth": [3, 5, 7, 9], "learning_rate": [0.01, 0.1, 0.2]},
        ),
        "HistGradientBoosting": (
            HistGradientBoostingClassifier(random_state=42),
            {
                "learning_rate": [0.01, 0.1, 0.2],
                "max_iter": [100, 200, 300],
                "max_depth": [3, 5, 7],
                "l2_regularization": [0.0, 0.1, 0.5],
                "early_stopping": [True],
            },
        ),
    }

    best_estimators: dict[str, object] = {}

    for model_name, (model, param_grid) in models.items():
        print(f"Evaluating {model_name}...")
        try:
            grid_search = HalvingGridSearchCV(
                estimator=model,
                param_grid=param_grid,
                cv=cv,
                scoring=scorer,
                verbose=0,
                n_jobs=1,
                error_score="raise",
            )
            grid_search.fit(X, y)
            cv_score = cross_val_score(grid_search.best_estimator_, X, y, cv=cv, scoring=scorer)
            best_estimators[model_name] = grid_search.best_estimator_
            print(f"{model_name} - {scorer._score_func.__name__}: {np.mean(cv_score):.4f} ± {np.std(cv_score):.4f}")
            print(f"Best parameters for {model_name}: {grid_search.best_params_}")
        except Exception as exc:
            print(f"Skipping {model_name} due to error: {exc}")

    if len(best_estimators) < 2:
        raise RuntimeError(f"Not enough trained estimators for league {league_name}.")

    estimators = []
    alias_map = {
        "Logistic Regression": "lr",
        "KNN": "knn",
        "SVM": "svm",
        "Random Forest": "rf",
        "XGBoost": "xgb",
        "HistGradientBoosting": "hgb",
    }
    for name, estimator in best_estimators.items():
        estimators.append((alias_map[name], estimator))

    print("Training Voting Classifier ensemble...")
    voting_clf = VotingClassifier(estimators=estimators, voting=voting)
    voting_clf.fit(X, y)
    cv_scores = cross_val_score(voting_clf, X, y, cv=cv, scoring=scorer)
    print(f"Voting Classifier - {scorer._score_func.__name__}: {np.mean(cv_scores):.4f} ± {np.std(cv_scores):.4f}")

    os.makedirs(trained_models_output_dir, exist_ok=True)
    model_filename = os.path.join(trained_models_output_dir, f"{league_name}_voting_classifier.pkl")
    with open(model_filename, "wb") as file:
        pickle.dump(voting_clf, file)
    print(f"Model saved to {model_filename}")


def main() -> None:
    try:
        args = parse_arguments()
        data = load_data(args.processed_data_input_dir)
        os.makedirs(args.trained_models_output_dir, exist_ok=True)

        for league_name, df in data.items():
            print(f"Processing league: {league_name}")
            X, y = prepare_data(df)
            train_and_save_models(
                X,
                y,
                args.trained_models_output_dir,
                league_name,
                args.metric_choice,
                args.voting,
                args.n_splits,
            )
    except Exception as exc:
        raise RuntimeError(f"An error occurred while training models: {exc}") from exc


if __name__ == "__main__":
    main()
