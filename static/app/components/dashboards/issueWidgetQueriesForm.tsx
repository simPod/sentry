import * as React from 'react';
import styled from '@emotion/styled';

import SearchBar from 'app/components/events/searchBar';
import {MAX_QUERY_LENGTH} from 'app/constants';
import {t} from 'app/locale';
import space from 'app/styles/space';
import {GlobalSelection, Organization, TagCollection} from 'app/types';
import withIssueTags from 'app/utils/withIssueTags';
import {Widget, WidgetQuery} from 'app/views/dashboardsV2/types';
import IssueListSearchBar from 'app/views/issueList/searchBar';
import Field from 'app/views/settings/components/forms/field';

type Props = {
  organization: Organization;
  selection: GlobalSelection;
  displayType: Widget['displayType'];
  query: IssueWidgetQuery;
  error?: Record<string, any>;
  onChange: (widgetQuery: WidgetQuery) => void;
  canAddSearchConditions: boolean;
  handleAddSearchConditions: () => void;
  handleDeleteQuery: (queryIndex: number) => void;
  tags: TagCollection;
};

/**
 * Contain widget queries interactions and signal changes via the onChange
 * callback. This component's state should live in the parent.
 */
class IssueWidgetQueriesForm extends React.Component<Props> {
  // Handle scalar field values changing.
  handleFieldChange = (field: string) => {
    const {query, onChange} = this.props;
    const widgetQuery = query;

    return function handleChange(value: string) {
      const newQuery = {...widgetQuery, [field]: value};
      onChange(newQuery);
    };
  };

  getFirstQueryError() {
    const {error} = this.props;

    if (!error) {
      return undefined;
    }

    return error;
  }

  render() {
    const {organization, selection, error, query, tags} = this.props;

    return (
      <QueryWrapper>
        <Field
          label={t('Query')}
          inline={false}
          style={{paddingBottom: `8px`}}
          flexibleControlStateSize
          stacked
          error={error?.conditions}
        >
          <SearchConditionsWrapper>
            <IssueListSearchBar
              organization={organization}
              query={query.conditions || ''}
              sort=""
              onSearch={this.handleFieldChange('conditions')}
              excludeEnvironment
              supportedTags={tags}
              tagValueLoader={tagValueLoader}
              savedSearch={savedSearch}
              onSidebarToggle={onSidebarToggle}
            />
            <StyledSearchBar
              searchSource="widget_builder"
              organization={organization}
              projectIds={selection.projects}
              query={widgetQuery.conditions}
              fields={[]}
              onSearch={this.handleFieldChange(queryIndex, 'conditions')}
              onBlur={this.handleFieldChange(queryIndex, 'conditions')}
              useFormWrapper={false}
              maxQueryLength={MAX_QUERY_LENGTH}
            />
          </SearchConditionsWrapper>
        </Field>
      </QueryWrapper>
    );
  }
}

const QueryWrapper = styled('div')`
  position: relative;
`;

export const SearchConditionsWrapper = styled('div')`
  display: flex;
  align-items: center;

  > * + * {
    margin-left: ${space(1)};
  }
`;

const StyledSearchBar = styled(SearchBar)`
  flex-grow: 1;
`;

export default withIssueTags(IssueWidgetQueriesForm);
