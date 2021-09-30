import argparse
import pathlib
import pandas as pd
from datetime import datetime


def load_data(input_csv, routes):
    """
    Loads in the below format and makes some adjustments for processing.
    - Filter only points with actual trip data
    - Trim leading 0s from route_id
    - Select only route_ids in `routes`
    - Set scheduled/actual times to be on service_date, not 1900-01-01
    - Map direction_id (Outbound -> 0, Inbound -> 1)
    """
    """
    "service_date", "route_id", "direction",  "half_trip_id", "stop_id",  "time_point_id",  "time_point_order", "point_type",   "standard_type",  "scheduled",            "actual",               "scheduled_headway",  "headway"
    2020-01-15,     "01",       "Inbound",    46374001,       67,         "maput",                2,            "Midpoint",     "Schedule",       1900-01-01 05:08:00,    1900-01-01 05:09:07,      -5,                   NA,NA
    2020-01-15,     "01",       "Inbound",    46374001,       110,        "hhgat",                1,            "Startpoint",   "Schedule",       1900-01-01 05:05:00,    1900-01-01 05:04:34,      26,                   NA,NA
    2020-01-15,     "01",       "Inbound",    46374001,       72,         "cntsq",                3,            "Midpoint",     "Schedule",       1900-01-01 05:11:00,    1900-01-01 05:12:01,      -22,                    NA,NA
    2020-01-15,     "01",       "Inbound",    46374001,       75,         "mit",                  4,            "Midpoint",     "Schedule",       1900-01-01 05:14:00,    1900-01-01 05:14:58,      -25,                    NA,NA
    2020-01-15,     "01",       "Inbound",    46374001,       79,         "hynes",                5,            "Midpoint",     "Schedule",       1900-01-01 05:18:00,    1900-01-01 05:18:45,      32,                   NA,NA
    2020-01-15,     "01",       "Inbound",    46374001,       187,        "masta",                6,            "Midpoint",     "Schedule",       1900-01-01 05:20:00,    1900-01-01 05:21:04,      -33,                    NA,NA
    2020-01-15,     "01",       "Inbound",    46374045,       110,        "hhgat",                1,            "Startpoint",   "Headway",        1900-01-01 05:20:00,    1900-01-01 05:20:45,      NA,                   900,971
    """

    # thinking about doing this in pandas to have all the info at once
    df = pd.read_csv(input_csv, parse_dates=['service_date', 'scheduled', 'actual'])

    # We need to keep both "Headway" AND "Schedule": both can have timepoint data.
    df = df.loc[df.actual.notnull()]

    df.route_id = df.route_id.str.lstrip('0')
    if routes:
        df = df.loc[df.route_id.isin(routes)]

    OFFSET = datetime(1900, 1, 1, 0, 0, 0)
    df.scheduled = df.service_date + (df.scheduled - OFFSET)
    df.actual = df.service_date + (df.actual - OFFSET)
    df.service_date = df.service_date.dt.date

    df.direction_id = df.direction_id.map({"Outbound": 0, "Inbound": 1})

    return df


def process_events(df):
    """
    Take the tidied input data and rearrange the columns to match rapidtransit format.
    - Rename columns (trip_id, stop_sequence, event_time)
    - Remove extra columns
    - Add empty vehicle columns
    - Calculate event_type column with ARR and DEP entries
    """
    CSV_HEADER = ["service_date", "route_id", "trip_id", "direction_id", "stop_id",
                  "stop_sequence", "vehicle_id", "vehicle_label", "event_type", "event_time"]

    df = df.rename(columns={'half_trip_id': 'trip_id',
                            'time_point_order': 'stop_sequence',
                            'actual': 'event_time'})
    df.drop(columns=['time_point_id','standard_type','scheduled','scheduled_headway','headway'])
    df['vehicle_id'] = ""
    df['vehicle_label'] = ""

    df['event_type'] = df.point_type.map({"Startpoint": ["DEP"],
                                       "Midpoint": ["ARR", "DEP"],
                                       "Endpoint": ["ARR"]})
    df = df.explode('event_type')
    df = df[CSV_HEADER] # reorder

    return df


def _write_file(events, outdir):
    """
    This is a helper that will write the events to disk.
    It will be called on each "groupby" object, grouping stop_id and service_date
    """
    service_date, stop_id = events.name

    fname = pathlib.Path(outdir,
                         "Events",
                         "daily-data",
                         str(stop_id),
                         f"Year={service_date.year}",
                         f"Month={service_date.month}",
                         f"Day={service_date.day}",
                         "events.csv.gz")
    fname.parent.mkdir(parents=True, exist_ok=True)
    events.to_csv(fname, index=False, compression='gzip')


def to_disk(df, root):
    """
    For each service_date/stop_id group, we call the helper that will write it to disk.
    """
    df.groupby(['service_date', 'stop_id']).apply(lambda e: _write_file(e, root))


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument('input', metavar='INPUT_CSV')
    parser.add_argument('output', metavar='OUTPUT_DIR')
    parser.add_argument('--routes', '-r', nargs="*", type=str,
                        help="One note here: we should always be additive with our route set \
                            in case 2 lines share the same stop id: we need both in the result file.")

    args = parser.parse_args()
    input_csv = args.input
    output_dir = args.output
    routes = args.routes

    pathlib.Path(output_dir).mkdir(exist_ok=True)
    
    data = load_data(input_csv, routes)
    events = process_events(data)
    to_disk(events, output_dir)


if __name__ == "__main__":
    main()
