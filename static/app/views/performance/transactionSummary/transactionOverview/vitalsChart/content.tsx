import {InjectedRouter} from 'react-router';

import ChartZoom from 'sentry/components/charts/chartZoom';
import ErrorPanel from 'sentry/components/charts/errorPanel';
import LineChart from 'sentry/components/charts/lineChart';
import ReleaseSeries from 'sentry/components/charts/releaseSeries';
import TransitionChart from 'sentry/components/charts/transitionChart';
import TransparentLoadingMask from 'sentry/components/charts/transparentLoadingMask';
import Placeholder from 'sentry/components/placeholder';
import {IconWarning} from 'sentry/icons';
import {Series} from 'sentry/types/echarts';
import {axisLabelFormatter, tooltipFormatter} from 'sentry/utils/discover/charts';
import getDynamicText from 'sentry/utils/getDynamicText';
import {Theme} from 'sentry/utils/theme';
import {TransactionsListOption} from 'sentry/views/releases/detail/overview';

type Props = {
  loading: boolean;
  reloading: boolean;
  theme: Theme;
  errored: boolean;
  queryExtra: object;
  router: InjectedRouter;
  series?: Series[];
  timeFrame?: {
    start: number;
    end: number;
  };
} & Omit<React.ComponentProps<typeof ReleaseSeries>, 'children' | 'queryExtra'> &
  Pick<React.ComponentProps<typeof LineChart>, 'onLegendSelectChanged' | 'legend'>;

function Content({
  errored,
  theme,
  series: results,
  timeFrame,
  start,
  end,
  period,
  projects,
  environments,
  loading,
  reloading,
  legend,
  utc,
  queryExtra,
  router,
  onLegendSelectChanged,
}: Props) {
  if (errored) {
    return (
      <ErrorPanel>
        <IconWarning color="gray500" size="lg" />
      </ErrorPanel>
    );
  }

  const chartOptions = {
    grid: {
      left: '10px',
      right: '10px',
      top: '40px',
      bottom: '0px',
    },
    seriesOptions: {
      showSymbol: false,
    },
    tooltip: {
      trigger: 'axis' as const,
      valueFormatter: tooltipFormatter,
    },
    xAxis: timeFrame
      ? {
          min: timeFrame.start,
          max: timeFrame.end,
        }
      : undefined,
    yAxis: {
      axisLabel: {
        color: theme.chartLabel,
        // p75(measurements.fcp) coerces the axis to be time based
        formatter: (value: number) => axisLabelFormatter(value, 'p75(measurements.fcp)'),
      },
    },
  };

  const colors = (results && theme.charts.getColorPalette(results.length - 2)) || [];

  // Create a list of series based on the order of the fields,
  const series = results
    ? results.map((values, i: number) => ({
        ...values,
        color: colors[i],
      }))
    : [];

  return (
    <ChartZoom router={router} period={period} start={start} end={end} utc={utc}>
      {zoomRenderProps => (
        <ReleaseSeries
          start={start}
          end={end}
          queryExtra={{
            ...queryExtra,
            showTransactions: TransactionsListOption.SLOW_LCP,
          }}
          period={period}
          utc={utc}
          projects={projects}
          environments={environments}
        >
          {({releaseSeries}) => (
            <TransitionChart loading={loading} reloading={reloading}>
              <TransparentLoadingMask visible={reloading} />
              {getDynamicText({
                value: (
                  <LineChart
                    {...zoomRenderProps}
                    {...chartOptions}
                    legend={legend}
                    onLegendSelectChanged={onLegendSelectChanged}
                    series={[...series, ...releaseSeries]}
                  />
                ),
                fixed: <Placeholder height="200px" testId="skeleton-ui" />,
              })}
            </TransitionChart>
          )}
        </ReleaseSeries>
      )}
    </ChartZoom>
  );
}

export default Content;
