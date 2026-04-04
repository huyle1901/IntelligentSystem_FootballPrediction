"""
Script to gather and merge football match data from multiple leagues and seasons.

Example:
    python scripts/data_acquisition.py --leagues E0 I1 SP1 F1 D1 --seasons 2526 2425 2324 2223 --raw_data_output_dir data/raw
"""

from __future__ import annotations

import argparse
import os
import re
from datetime import datetime

import pandas as pd


VALID_LEAGUES = ["E0", "E1", "E2", "E3", "EC", "I1", "I2", "D1", "D2", "SP1", "SP2", "F1", "F2"]


def season_code(start_year_full: int) -> str:
    return f"{start_year_full % 100:02d}{(start_year_full + 1) % 100:02d}"


def suggested_recent_seasons(window: int = 8) -> list[str]:
    now = datetime.utcnow()
    # Football season starts around August.
    current_start_year = now.year if now.month >= 8 else now.year - 1
    return [season_code(current_start_year - i) for i in range(window)]


def validate_leagues(leagues: list[str]) -> None:
    for league in leagues:
        if league not in VALID_LEAGUES:
            raise ValueError(f"Invalid league acronym: {league}. Allowed values are {', '.join(VALID_LEAGUES)}")


def is_valid_season_code(code: str) -> bool:
    if not re.fullmatch(r"\d{4}", code):
        return False
    yy_start = int(code[:2])
    yy_end = int(code[2:])
    return (yy_start + 1) % 100 == yy_end


def validate_seasons(seasons: list[str]) -> None:
    for season in seasons:
        if not is_valid_season_code(season):
            raise ValueError(
                f"Invalid season code: {season}. Expected YYZZ where ZZ=(YY+1)%100, e.g. 2526, 2425."
            )


def download_and_merge_data(leagues: list[str], seasons: list[str], raw_data_output_dir: str) -> None:
    os.makedirs(raw_data_output_dir, exist_ok=True)

    for league in leagues:
        league_dfs: list[pd.DataFrame] = []
        common_columns: set[str] | None = None
        column_order: list[str] = []

        for season in seasons:
            url = f"https://www.football-data.co.uk/mmz4281/{season}/{league}.csv"
            try:
                df = pd.read_csv(url)
                if df.empty:
                    print(f"No rows from {url}")
                    continue

                print(f"Downloaded {len(df)} rows from {url}")

                if common_columns is None:
                    common_columns = set(df.columns)
                    column_order = df.columns.tolist()
                else:
                    common_columns.intersection_update(df.columns)

                league_dfs.append(df)
            except Exception as exc:
                print(f"Failed to download data from {url}: {exc}")
                continue

        if not league_dfs or not common_columns:
            print(f"No valid data downloaded for league {league}. Skipping file generation.")
            continue

        ordered_common_columns = [col for col in column_order if col in common_columns]
        league_dfs = [df[ordered_common_columns] for df in league_dfs]
        merged_df = pd.concat(league_dfs, ignore_index=True)

        output_path = os.path.join(raw_data_output_dir, f"{league}_merged.csv")
        merged_df.to_csv(output_path, index=False)
        print(f"Saved merged data ({len(merged_df)} rows) to {output_path}")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download and merge football data from multiple leagues and seasons.")
    parser.add_argument("--leagues", nargs="+", required=True, help="List of league acronyms (e.g., E0 I1 SP1).")
    parser.add_argument(
        "--seasons",
        nargs="+",
        required=False,
        default=suggested_recent_seasons(4),
        help=(
            "List of season codes (e.g., 2526 2425 2324). "
            f"Default recent seasons: {' '.join(suggested_recent_seasons(4))}"
        ),
    )
    parser.add_argument("--raw_data_output_dir", type=str, required=True, help="Output directory for merged CSV files.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_arguments()
    validate_leagues(args.leagues)
    validate_seasons(args.seasons)
    download_and_merge_data(leagues=args.leagues, seasons=args.seasons, raw_data_output_dir=args.raw_data_output_dir)
