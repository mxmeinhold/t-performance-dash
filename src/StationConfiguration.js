import React from 'react';
import classNames from 'classnames';
import Flatpickr from "react-flatpickr";
import 'react-flatpickr/node_modules/flatpickr/dist/themes/light.css';
import './ui/toggle.css';

import Select from './Select';
import { bus_lines, subway_lines, options_station } from './stations';

const ua = window.navigator.userAgent;
const iOSDevice = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
const useFlatPickr = !iOSDevice;

const dateRange = { 
  minDate: "2016-01-01",
  maxDate: "today"
};

const busDateRange = {
  minDate: "2021-01-01",
  maxDate: "2021-09-30"
};

const options_lines = (is_bus) => {
  if (is_bus) {
    return bus_lines().map((line) => {
      return {
        value: line,
        label: line.includes("/") ? `Routes ${line}` : `Route ${line}`
      }
    });
  } else {
    return subway_lines().map((line) => {
      return {
        value: line,
        label: `${line} Line`
      }
    });
  }
};

const options_station_ui = (line) => {
  return options_station(line).map((station) => {
    return {
      value: station,
      disabled: station.disabled,
      label: station.stop_name
    }
  }).sort((a, b) => a.value.order - b.value.order)
};

export default class StationConfiguration extends React.Component {
  constructor(props) {
    super(props);
    this.handleSelectDate = this.handleSelectDate.bind(this);
    this.handleSelectRawDate = this.handleSelectRawDate.bind(this);
    this.handleSwapStations = this.handleSwapStations.bind(this);
    this.clearMoreOptions = this.clearMoreOptions.bind(this);
    this.handleBusToggle = this.handleBusToggle.bind(this);

    this.state = {
      show_date_end_picker: !!this.props.current.date_end,
    };
  }
  

  componentDidUpdate(prevProps) {
    // If the date_end prop shows up because a config preset set it,
    //  then show the end date picker.
    if(this.props.current.date_end !== prevProps.current.date_end) {
      this.setState({
        show_date_end_picker: !!this.props.current.date_end,
      });
    }
  }

  handleBusToggle() {
    this.props.onConfigurationChange({
      bus_mode: !this.decode("bus_mode"),
      line: null,
      date_start: null,
      date_end: null
    }, false);
  }

  handleSelectDate(field_name) {
    return (_, dateStr, __) => {
      this.props.onConfigurationChange({
        [field_name]: dateStr
      });
    };
  }

  handleSelectRawDate(field_name) {
    return (evt) => {
      this.props.onConfigurationChange({
        [field_name]: evt.target.value
      });
    }
  }

  handleSelectOption(field) {
    return (value) => {
      this.props.onConfigurationChange({
        [field]: value,
      });
    };
  }

  handleSwapStations() {
    const fromValue = this.decode("from");
    const toValue = this.decode("to");
    this.props.onConfigurationChange({
      from: toValue,
      to: fromValue
    });
  }

  decode(property) {
    return this.props.current[property];
  }

  optionsForField(type) {
    if (type === "line") {
      return options_lines(this.decode("bus_mode"));
    }
    if (type === "from") {
      const toStation = this.decode("to");
      return options_station_ui(this.props.current.line).filter(entry => entry.value !== toStation);
    }
    if (type === "to") {
      const fromStation = this.decode("from");
      return options_station_ui(this.props.current.line).filter(({ value }) => {
        if (value === fromStation) {
          return false;
        }
        if (fromStation && fromStation.branches && value.branches) {
          return value.branches.some(entryBranch => fromStation.branches.includes(entryBranch));
        }
        return true
      });
    }
  }

  clearMoreOptions() {
    this.setState({
      show_date_end_picker: false,
    });
    this.props.onConfigurationChange({
      date_end: null,
    });
  }

  render() {
    const currentLine = this.decode("line");
    const bus_mode = this.decode("bus_mode");
    return (
      <div className={classNames('station-configuration-wrapper',
                                  bus_mode ? "Bus" : currentLine)}>
        <div className="station-configuration main-column">
          
          <div className="option option-mode">
            <span className="switch-label">Subway</span>
            <label className="option switch">
              <input type="checkbox" checked={bus_mode} onChange={this.handleBusToggle}/>
              <span className="slider"></span>
            </label>
            <span className="switch-label">Bus</span>
          </div>

          <div className="option option-line">
            <Select
              value={this.decode("line")}
              options={this.optionsForField("line")}
              onChange={this.handleSelectOption("line")}
              defaultLabel={bus_mode ? "Select a route..." : "Select a line..."}
            />
          </div>

          <div className="option-group option-stations-group">
            <div className="option option-from-station">
              <span className="from-to-label">From</span>
              <Select
                value={this.decode("from")}
                options={this.optionsForField("from")}
                onChange={this.handleSelectOption("from")}
                // Non-standard value comparator because from/to gets copied by onpopstate :/
                optionComparator={o => o.value.stop_name === this.decode("from")?.stop_name}
                defaultLabel="Select a station..."
              />
            </div>
            <div className="option option-to-station">
              <span className="from-to-label">To</span>
              <Select
                value={this.decode("to")}
                options={this.optionsForField("to")}
                onChange={this.handleSelectOption("to")}
                // Non-standard value comparator because from/to gets copied by onpopstate :/
                optionComparator={o => o.value.stop_name === this.decode("to")?.stop_name}
                defaultLabel="Select a station..."
              />
            </div>
          </div>
          <button className="swap-stations-button" onClick={this.handleSwapStations} disabled={!currentLine}>
            <div className="swap-icon" />
            <div className="swap-label">Swap</div>
          </button>
          <div className="option option-date">
            <span className="date-label">Date</span>
            <Flatpickr
              value={this.decode("date_start")} // || "" // The || "" is to prevent undefined; that makes React think it's uncontrolled
              onChange={this.handleSelectDate("date_start")}
              options={bus_mode ? busDateRange : dateRange}
              placeholder="Select date..."
              defaultValue={bus_mode ? busDateRange.maxDate : "today"}
            />
            <button
              className="more-options-button"
              style={this.state.show_date_end_picker ? { display: 'none' } : {}}
              onClick={() => this.setState({ show_date_end_picker: true })}
            >Range...</button>
            {!!this.state.show_date_end_picker && <>
              <span className="date-label end-date-label">to</span>
              <Flatpickr
                value={this.decode("date_end")}
                onChange={this.handleSelectDate("date_end")}
                options={bus_mode ? busDateRange : dateRange}
                placeholder="Select date..."
                defaultValue={this.decode("date_start")}
              />
              <button
                className="clear-button"
                style={{ visibility: this.state.show_date_end_picker ? 'visible' : 'hidden' }}
                onClick={this.clearMoreOptions}
              >🅧</button>
            </>
            }
          </div>
        </div>
      </div>
    );
  }
}