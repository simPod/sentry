import * as React from 'react';
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  List,
  ListRowProps,
  ScrollbarPresenceParams,
} from 'react-virtualized';
import styled from '@emotion/styled';
import isEqual from 'lodash/isEqual';

import {BreadcrumbsWithDetails} from 'app/types/breadcrumbs';

import Breadcrumb from './breadcrumb';
import ListHeader from './listHeader';
import {aroundContentStyle} from './styles';

const LIST_MAX_HEIGHT = 400;

type Props = {
  onSwitchTimeFormat: () => void;
  breadcrumbs: BreadcrumbsWithDetails;
  relativeTime: string;
} & Omit<React.ComponentProps<typeof Breadcrumb>, 'breadcrumb' | 'isLastItem' | 'column'>;

const cache = new CellMeasurerCache({
  fixedWidth: true,
  minHeight: 42,
});

type State = {
  scrollToIndex?: number;
  scrollbarSize?: number;
};

class ListContainer extends React.Component<Props, State> {
  state: State = {
    scrollToIndex: this.props.breadcrumbs.length - 1,
  };

  componentDidMount() {
    this.updateGrid();
  }

  componentDidUpdate(prevProps: Props) {
    this.updateGrid();

    if (
      !isEqual(prevProps.breadcrumbs, this.props.breadcrumbs) &&
      !this.state.scrollToIndex
    ) {
      this.setScrollToIndex(undefined);
    }
  }

  listRef: List | null = null;

  updateGrid = () => {
    if (this.listRef) {
      cache.clearAll();
      this.listRef.forceUpdateGrid();
    }
  };

  setScrollToIndex(scrollToIndex: State['scrollToIndex']) {
    this.setState({scrollToIndex});
  }

  setScrollbarSize = ({size}: ScrollbarPresenceParams) => {
    this.setState({scrollbarSize: size});
  };

  renderBreadcrumb(
    breadcrumb: BreadcrumbsWithDetails[0],
    height: string | number | undefined,
    isLastItem = false
  ) {
    const {event, orgId, searchTerm, relativeTime, displayRelativeTime} = this.props;
    return (
      <Breadcrumb
        orgId={orgId}
        searchTerm={searchTerm}
        breadcrumb={breadcrumb}
        event={event}
        relativeTime={relativeTime}
        displayRelativeTime={displayRelativeTime}
        isLastItem={isLastItem}
        height={height ? String(height) : undefined}
      />
    );
  }

  renderRow = ({index, key, parent, style}: ListRowProps) => {
    const {breadcrumbs} = this.props;
    const breadcrumb = breadcrumbs[index];
    const isLastItem = breadcrumbs[breadcrumbs.length - 1].id === breadcrumb.id;
    const {height} = style;
    return (
      <CellMeasurer
        cache={cache}
        columnIndex={0}
        key={key}
        parent={parent}
        rowIndex={index}
      >
        {({measure}) =>
          isLastItem ? (
            <Row style={style} onLoad={measure} data-test-id="last-crumb">
              {this.renderBreadcrumb(breadcrumb, height, isLastItem)}
            </Row>
          ) : (
            <Row style={style} onLoad={measure} data-test-id="crumb">
              {this.renderBreadcrumb(breadcrumb, height)}
            </Row>
          )
        }
      </CellMeasurer>
    );
  };

  render() {
    const {breadcrumbs, displayRelativeTime, onSwitchTimeFormat} = this.props;
    const {scrollToIndex, scrollbarSize} = this.state;

    // onResize is required in case the user rotates the device.
    return (
      <Wrapper>
        <AutoSizer disableHeight onResize={this.updateGrid}>
          {({width}) => (
            <React.Fragment>
              <RowSticky width={width} scrollbarSize={scrollbarSize}>
                <ListHeader
                  displayRelativeTime={!!displayRelativeTime}
                  onSwitchTimeFormat={onSwitchTimeFormat}
                />
              </RowSticky>
              <StyledList
                ref={(el: List | null) => {
                  this.listRef = el;
                }}
                deferredMeasurementCache={cache}
                height={LIST_MAX_HEIGHT}
                overscanRowCount={5}
                rowCount={breadcrumbs.length}
                rowHeight={cache.rowHeight}
                rowRenderer={this.renderRow}
                width={width}
                onScrollbarPresenceChange={this.setScrollbarSize}
                // when the component mounts, it scrolls to the last item
                scrollToIndex={scrollToIndex}
                scrollToAlignment={scrollToIndex ? 'end' : undefined}
              />
            </React.Fragment>
          )}
        </AutoSizer>
      </Wrapper>
    );
  }
}

export default ListContainer;

const Wrapper = styled('div')`
  overflow: hidden;
  ${aroundContentStyle}
`;

// XXX(ts): Emotion11 has some trouble with List's defaultProps
//
// It gives the list have a dynamic height; otherwise, in the case of filtered
// options, a list will be displayed with an empty space
const StyledList = styled(List as any)<React.ComponentProps<typeof List>>`
  height: auto !important;
  max-height: ${p => p.height}px;
  overflow-y: auto !important;
  outline: none;
`;

const Row = styled('div')<{width?: number}>`
  display: grid;
  grid-template-columns: 45px minmax(55px, 1fr) 6fr 86px 67px;
  @media (min-width: ${p => p.theme.breakpoints[0]}) {
    grid-template-columns: 63px minmax(132px, 1fr) 6fr 75px 85px;
  }
  ${p => p.width && `width: ${p.width}px;`}
`;

const RowSticky = styled(Row)<{scrollbarSize?: number}>`
  ${p =>
    p.scrollbarSize &&
    `padding-right: ${p.scrollbarSize};
     grid-template-columns: 45px minmax(55px, 1fr) 6fr 86px calc(67px + ${p.scrollbarSize}px);
     @media (min-width: ${p.theme.breakpoints[0]}) {
      grid-template-columns: 63px minmax(132px, 1fr) 6fr 75px calc(85px + ${p.scrollbarSize}px);
    }
  `}
`;
