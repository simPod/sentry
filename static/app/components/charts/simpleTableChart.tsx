import {Component, Fragment} from 'react';
import styled from '@emotion/styled';
import {Location} from 'history';

import PanelTable, {PanelTableHeader} from 'sentry/components/panels/panelTable';
import space from 'sentry/styles/space';
import {Organization} from 'sentry/types';
import {TableData, TableDataRow} from 'sentry/utils/discover/discoverQuery';
import {getFieldRenderer} from 'sentry/utils/discover/fieldRenderers';
import {fieldAlignment} from 'sentry/utils/discover/fields';
import withOrganization from 'sentry/utils/withOrganization';
import {decodeColumnOrder} from 'sentry/views/eventsV2/utils';

type Props = {
  organization: Organization;
  location: Location;
  loading: boolean;
  fields: string[];
  title: string;
  metadata: TableData['meta'] | undefined;
  data: TableData['data'] | undefined;
  className?: string;
  getCustomFieldRenderer?: typeof getFieldRenderer;
};

class SimpleTableChart extends Component<Props> {
  renderRow(
    index: number,
    row: TableDataRow,
    tableMeta: NonNullable<TableData['meta']>,
    columns: ReturnType<typeof decodeColumnOrder>
  ) {
    const {location, organization, getCustomFieldRenderer} = this.props;

    return columns.map(column => {
      const fieldRenderer =
        getCustomFieldRenderer?.(column.name, tableMeta) ??
        getFieldRenderer(column.name, tableMeta);
      const rendered = fieldRenderer(row, {organization, location});
      return <TableCell key={`${index}:${column.name}`}>{rendered}</TableCell>;
    });
  }

  render() {
    const {className, loading, fields, metadata, data, title} = this.props;
    const meta = metadata ?? {};
    const columns = decodeColumnOrder(fields.map(field => ({field})));
    return (
      <Fragment>
        {title && <h4>{title}</h4>}
        <StyledPanelTable
          className={className}
          isLoading={loading}
          headers={columns.map((column, index) => {
            const align = fieldAlignment(column.name, column.type, meta);
            return (
              <HeadCell key={index} align={align}>
                {column.name}
              </HeadCell>
            );
          })}
          isEmpty={!data?.length}
          disablePadding
        >
          {data?.map((row, index) => this.renderRow(index, row, meta, columns))}
        </StyledPanelTable>
      </Fragment>
    );
  }
}

const StyledPanelTable = styled(PanelTable)`
  border-radius: 0;
  border-left: 0;
  border-right: 0;
  border-bottom: 0;

  margin: 0;
  ${/* sc-selector */ PanelTableHeader} {
    height: min-content;
  }
`;

type HeadCellProps = {
  align: string | undefined;
};
const HeadCell = styled('div')<HeadCellProps>`
  ${(p: HeadCellProps) => (p.align ? `text-align: ${p.align};` : '')}
  padding: ${space(1)} ${space(3)};
`;

const TableCell = styled('div')`
  padding: ${space(1)} ${space(3)};
`;

export default withOrganization(SimpleTableChart);
