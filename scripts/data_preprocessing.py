"""Script to preprocess football match data from multiple CSV files."""

from __future__ import annotations

import argparse
import os

import numpy as np
import pandas as pd
import scipy.cluster.hierarchy as sch
from mrmr import mrmr_classif


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Preprocess football match data from CSV files.")
    parser.add_argument("--raw_data_input_dir", required=True, type=str, help="Path to folder containing CSV files.")
    parser.add_argument("--processed_data_output_dir", required=True, type=str, help="Output folder for processed CSV files.")
    parser.add_argument("--num_features", type=int, default=20, help="Number of top features selected by mRMR.")
    parser.add_argument("--clustering_threshold", type=float, default=0.5, help="Threshold for hierarchical clustering.")
    return parser.parse_args()


def load_csv_files(input_folder: str) -> list[tuple[str, pd.DataFrame]]:
    data_files: list[tuple[str, pd.DataFrame]] = []
    for filename in os.listdir(input_folder):
        if filename.endswith(".csv"):
            file_path = os.path.join(input_folder, filename)
            data = pd.read_csv(file_path)
            data_files.append((filename, data))
    return data_files


def determine_season(date: pd.Timestamp) -> str:
    year = date.year
    return f"{year}/{year + 1}" if date.month >= 8 else f"{year - 1}/{year}"


def parse_date_column(df: pd.DataFrame) -> pd.DataFrame:
    # football-data CSV can vary between dd/mm/YYYY and dd/mm/YY
    parsed = pd.to_datetime(df["Date"], dayfirst=True, errors="coerce")
    valid_rows = parsed.notna()
    if valid_rows.sum() == 0:
        raise ValueError("Date column could not be parsed.")
    df = df.loc[valid_rows].copy()
    df["Date"] = parsed.loc[valid_rows]
    return df


def feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    df = parse_date_column(df)
    df["Season"] = df["Date"].apply(determine_season)
    df["Over2.5"] = np.where(df["FTHG"] + df["FTAG"] > 2, 1, 0)

    df["AvgHomeGoalsScored"] = df.groupby(["Season", "HomeTeam"])["FTHG"].transform("mean").round(2)
    df["AvgAwayGoalsScored"] = df.groupby(["Season", "AwayTeam"])["FTAG"].transform("mean").round(2)
    df["AvgHomeGoalsConceded"] = df.groupby(["Season", "HomeTeam"])["FTAG"].transform("mean").round(2)
    df["AvgAwayGoalsConceded"] = df.groupby(["Season", "AwayTeam"])["FTHG"].transform("mean").round(2)
    df["HomeOver2.5Perc"] = (df.groupby(["Season", "HomeTeam"])["Over2.5"].transform("mean") * 100).round(2)
    df["AwayOver2.5Perc"] = (df.groupby(["Season", "AwayTeam"])["Over2.5"].transform("mean") * 100).round(2)

    df = df.sort_values(by=["HomeTeam", "Date"])
    df["AvgLast5HomeGoalsScored"] = df.groupby(["Season", "HomeTeam"])["FTHG"].transform(lambda x: x.rolling(5, min_periods=1).mean()).round(2)
    df["AvgLast5HomeGoalsConceded"] = df.groupby(["Season", "HomeTeam"])["FTAG"].transform(lambda x: x.rolling(5, min_periods=1).mean()).round(2)
    df["Last5HomeOver2.5Count"] = df.groupby(["Season", "HomeTeam"])["Over2.5"].transform(lambda x: x.rolling(5, min_periods=1).sum()).round(2)
    df["Last5HomeOver2.5Perc"] = df.groupby(["Season", "HomeTeam"])["Over2.5"].transform(lambda x: x.rolling(5, min_periods=1).mean() * 100).round(2)

    df = df.sort_values(by=["AwayTeam", "Date"])
    df["AvgLast5AwayGoalsScored"] = df.groupby(["Season", "AwayTeam"])["FTAG"].transform(lambda x: x.rolling(5, min_periods=1).mean()).round(2)
    df["AvgLast5AwayGoalsConceded"] = df.groupby(["Season", "AwayTeam"])["FTHG"].transform(lambda x: x.rolling(5, min_periods=1).mean()).round(2)
    df["Last5AwayOver2.5Count"] = df.groupby(["Season", "AwayTeam"])["Over2.5"].transform(lambda x: x.rolling(5, min_periods=1).sum()).round(2)
    df["Last5AwayOver2.5Perc"] = df.groupby(["Season", "AwayTeam"])["Over2.5"].transform(lambda x: x.rolling(5, min_periods=1).mean() * 100).round(2)
    return df


def drop_useless_columns(df: pd.DataFrame, columns_to_drop: list[str]) -> pd.DataFrame:
    for column in columns_to_drop:
        if column in df.columns:
            df.drop(column, axis=1, inplace=True)
    return df


def feature_selection(df: pd.DataFrame, target_column: str = "Over2.5", num_features: int = 20, clustering_threshold: float = 0.5) -> list[str]:
    try:
        numerical_columns = df.drop(["Date"], axis=1).select_dtypes(exclude="object").columns.tolist()
        X = df[numerical_columns].drop([target_column], axis=1)
        y = df[target_column]

        selected_features = mrmr_classif(X=X, y=y, K=num_features)

        corr_matrix = df[selected_features].corr(method="spearman")
        dist = sch.distance.pdist(corr_matrix, metric="euclidean")
        linkage = sch.linkage(dist, method="average")
        cluster_ids = sch.fcluster(linkage, clustering_threshold, criterion="distance")

        selected_features_clustered = []
        for cluster_id in pd.Series(cluster_ids).unique():
            cluster_features = corr_matrix.columns[pd.Series(cluster_ids) == cluster_id]
            highest_variance_feature = cluster_features[np.argmax(df[cluster_features].var())]
            selected_features_clustered.append(highest_variance_feature)

        return selected_features_clustered
    except Exception as exc:
        print(f"Error during feature selection: {exc}")
        return []


def handle_missing_values(df: pd.DataFrame, missing_threshold: int = 10) -> pd.DataFrame:
    missing_values_count = df.isnull().sum()
    columns_to_drop = missing_values_count[missing_values_count > missing_threshold].index
    df = df.drop(columns=columns_to_drop)
    df = df.dropna()
    return df


def save_preprocessed_data(df: pd.DataFrame, output_folder: str, filename: str) -> None:
    output_file_path = os.path.join(output_folder, f"{os.path.splitext(filename)[0]}_preprocessed.csv")
    df.to_csv(output_file_path, index=False)
    print(f"Preprocessed file saved as {output_file_path}")


def preprocess_and_save_csv(input_folder: str, output_folder: str, num_features: int, missing_threshold: int = 10, clustering_threshold: float = 0.5) -> None:
    data_files = load_csv_files(input_folder)

    for filename, df in data_files:
        print(f"Processing {filename}...")
        df = feature_engineering(df)
        df = drop_useless_columns(df, ["FTHG", "FTAG", "HTHG", "HTAG"])
        df = handle_missing_values(df, missing_threshold=missing_threshold)
        selected_features = feature_selection(df, num_features=num_features, clustering_threshold=clustering_threshold)

        categorical_columns = df.select_dtypes(include="object").columns.tolist()
        df_selected = df[["Date"] + categorical_columns + selected_features + ["Over2.5"]]
        save_preprocessed_data(df_selected, output_folder, filename)


if __name__ == "__main__":
    args = parse_arguments()

    if not os.path.exists(args.raw_data_input_dir):
        raise FileNotFoundError(f"Input directory {args.raw_data_input_dir} does not exist.")

    os.makedirs(args.processed_data_output_dir, exist_ok=True)
    preprocess_and_save_csv(
        args.raw_data_input_dir,
        args.processed_data_output_dir,
        args.num_features,
        missing_threshold=10,
        clustering_threshold=args.clustering_threshold,
    )
