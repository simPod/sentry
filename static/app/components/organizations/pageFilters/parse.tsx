import {Location} from 'history';
import moment from 'moment';

import {DEFAULT_STATS_PERIOD} from 'sentry/constants';
import {URL_PARAM} from 'sentry/constants/pageFilters';
import {IntervalPeriod} from 'sentry/types';
import {defined} from 'sentry/utils';
import {getUtcToLocalDateObject} from 'sentry/utils/dates';

import {PageFiltersState} from './types';

export type StatsPeriodType = 'h' | 'd' | 's' | 'm' | 'w';

type SingleParamValue = string | undefined | null;
type ParamValue = string[] | SingleParamValue;

const STATS_PERIOD_PATTERN = '^(\\d+)([hdmsw])?$';

/**
 * Parses a stats period into `period` and `periodLength`
 */
export function parseStatsPeriod(input: string | IntervalPeriod) {
  const result = input.match(STATS_PERIOD_PATTERN);

  if (!result) {
    return undefined;
  }

  const period = result[1];

  // default to seconds. this behaviour is based on src/sentry/utils/dates.py
  const periodLength = result[2] || 's';

  return {period, periodLength};
}

/**
 * Normalizes a stats period string
 */
function coerceStatsPeriod(input: string) {
  const result = parseStatsPeriod(input);

  return result ? `${result.period}${result.periodLength}` : undefined;
}

/**
 * Normalizes a string or string[] into a standard stats period string.
 *
 * Undefined and null inputs are returned as undefined.
 */
function getStatsPeriodValue(maybe: ParamValue) {
  if (Array.isArray(maybe)) {
    const result = maybe.find(coerceStatsPeriod);

    return result ? coerceStatsPeriod(result) : undefined;
  }

  if (typeof maybe === 'string') {
    return coerceStatsPeriod(maybe);
  }

  return undefined;
}

/**
 * We normalize potential datetime strings into the form that would be valid if
 * it was to be parsed by datetime.strptime using the format
 * %Y-%m-%dT%H:%M:%S.%f
 *
 * This format was transformed to the form that moment.js understands using [0]
 *
 * [0]: https://gist.github.com/asafge/0b13c5066d06ae9a4446
 */
function normalizeDateTimeString(input: Date | SingleParamValue) {
  if (!input) {
    return undefined;
  }

  const parsed = moment.utc(input);

  if (!parsed.isValid()) {
    return undefined;
  }

  return parsed.format('YYYY-MM-DDTHH:mm:ss.SSS');
}

/**
 * Normalizes a string or string[] into the date time string.
 *
 * Undefined and null inputs are returned as undefined.
 */
function getDateTimeString(maybe: Date | ParamValue) {
  const result = Array.isArray(maybe)
    ? maybe.find(needle => moment.utc(needle).isValid())
    : maybe;

  return normalizeDateTimeString(result);
}

/**
 * Normalize a UTC parameter
 */
function parseUtcValue(utc: boolean | SingleParamValue) {
  if (!defined(utc)) {
    return undefined;
  }

  return utc === true || utc === 'true' ? 'true' : 'false';
}

/**
 * Normalizes a string or string[] into the UTC parameter.
 *
 * Undefined and null inputs are returned as undefined.
 */
function getUtcValue(maybe: boolean | ParamValue) {
  const result = Array.isArray(maybe)
    ? maybe.find(needle => !!parseUtcValue(needle))
    : maybe;

  return parseUtcValue(result);
}

/**
 * Normalizes a string or string[] into the project list parameter
 */
function getProject(maybe: ParamValue) {
  if (!defined(maybe)) {
    return undefined;
  }

  if (Array.isArray(maybe)) {
    return maybe.map(p => parseInt(p, 10));
  }

  const projectFromQueryIdInt = parseInt(maybe, 10);
  return isNaN(projectFromQueryIdInt) ? [] : [projectFromQueryIdInt];
}

/*
 * Normalizes a string or string[] into the environment list parameter
 */
function getEnvironment(maybe: ParamValue) {
  if (!defined(maybe)) {
    return undefined;
  }

  if (Array.isArray(maybe)) {
    return maybe;
  }

  return [maybe];
}

type InputParams = {
  pageStatsPeriod?: ParamValue;
  pageStart?: ParamValue | Date;
  pageEnd?: ParamValue | Date;
  pageUtc?: ParamValue | boolean;

  start?: ParamValue | Date;
  end?: ParamValue | Date;
  period?: ParamValue;
  statsPeriod?: ParamValue;
  utc?: ParamValue | boolean;

  [others: string]: any;
};

type ParsedParams = {
  start?: string;
  end?: string;
  statsPeriod?: string | null;
  utc?: string;
  [others: string]: Location['query'][string];
};

type DateTimeNormalizeOptions = {
  /**
   * When set to true allows the statsPeriod to result as `null`.
   *
   * @default false
   */
  allowEmptyPeriod?: boolean;
  /**
   * Include this default statsPeriod in the resulting parsed parameters when
   * no stats period is provided (or if it is an invalid stats period)
   */
  defaultStatsPeriod?: string | null;
  /**
   * Parse absolute date time (`start` / `end`) from the input parameters. When
   * set to false the start and end will always be `null`.
   *
   * @default true
   */
  allowAbsoluteDatetime?: boolean;
  /**
   * The page specific version of allowAbsolutePageDatetime
   *
   * @default false
   */
  allowAbsolutePageDatetime?: boolean;
};

/**
 * Normalizes the DateTime components of the page filters.
 *
 * NOTE: This has some additional functionality for handling `page*` filters
 *       that will override the standard `start`/`end`/`statsPeriod` filters.
 *
 * NOTE: This does *NOT* normalize the `project` or `environment` components of
 *       the page filter parameters. See `getStateFromQuery` for normalization
 *       of the project and environment parameters.
 */
export function normalizeDateTimeParams(
  params: InputParams,
  options: DateTimeNormalizeOptions = {}
): ParsedParams {
  const {
    allowEmptyPeriod = false,
    allowAbsoluteDatetime = true,
    allowAbsolutePageDatetime = false,
    defaultStatsPeriod = DEFAULT_STATS_PERIOD,
  } = options;

  const {
    pageStatsPeriod,
    pageStart,
    pageEnd,
    pageUtc,
    start,
    end,
    period,
    statsPeriod,
    utc,
    ...otherParams
  } = params;

  // `statsPeriod` takes precedence for now. `period` is legacy.
  let coercedPeriod =
    getStatsPeriodValue(pageStatsPeriod) ||
    getStatsPeriodValue(statsPeriod) ||
    getStatsPeriodValue(period) ||
    null;

  const dateTimeStart = allowAbsoluteDatetime
    ? allowAbsolutePageDatetime
      ? getDateTimeString(pageStart) ?? getDateTimeString(start)
      : getDateTimeString(start)
    : null;
  const dateTimeEnd = allowAbsoluteDatetime
    ? allowAbsolutePageDatetime
      ? getDateTimeString(pageEnd) ?? getDateTimeString(end)
      : getDateTimeString(end)
    : null;

  if ((!dateTimeStart || !dateTimeEnd) && !coercedPeriod && !allowEmptyPeriod) {
    coercedPeriod = defaultStatsPeriod;
  }

  const object = {
    statsPeriod: coercedPeriod,
    start: coercedPeriod ? null : dateTimeStart ?? null,
    end: coercedPeriod ? null : dateTimeEnd ?? null,
    // coerce utc into a string (it can be both: a string representation from
    // router, or a boolean from time range picker)
    utc: getUtcValue(pageUtc ?? utc),
    ...otherParams,
  };

  // Filter null values
  const paramEntries = Object.entries(object).filter(([_, value]) => defined(value));

  return Object.fromEntries(paramEntries);
}

/**
 * Parses and normalizes all page filter relevant parameters from a location
 * query.
 *
 * This includes the following operations
 *
 *  - Normalizes `project` and `environment` into a consistent list object.
 *  - Normalizes date time filter parameters (using normalizeDateTimeParams).
 *  - Parses `start` and `end` into Date objects.
 */
export function getStateFromQuery(
  query: Location['query'],
  normalizeOptions: DateTimeNormalizeOptions = {}
) {
  const {allowAbsoluteDatetime} = normalizeOptions;

  const project = getProject(query[URL_PARAM.PROJECT]) ?? null;
  const environment = getEnvironment(query[URL_PARAM.ENVIRONMENT]) ?? null;

  const dateTimeParams = normalizeDateTimeParams(query, normalizeOptions);

  const hasAbsolute =
    allowAbsoluteDatetime && !!dateTimeParams.start && !!dateTimeParams.end;

  const start = hasAbsolute ? getUtcToLocalDateObject(dateTimeParams.start) : null;
  const end = hasAbsolute ? getUtcToLocalDateObject(dateTimeParams.end) : null;
  const period = dateTimeParams.statsPeriod;
  const utc = dateTimeParams.utc;

  const state: PageFiltersState = {
    project,
    environment,
    period: period || null,
    start: start || null,
    end: end || null,
    utc: typeof utc !== 'undefined' ? utc === 'true' : null,
  };

  return state;
}
