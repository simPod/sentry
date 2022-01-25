import * as React from 'react';
import {ClassNames} from '@emotion/react';
import styled from '@emotion/styled';

import Feature from 'sentry/components/acl/feature';
import GuideAnchor from 'sentry/components/assistant/guideAnchor';
import EnvironmentPageFilter from 'sentry/components/environmentPageFilter';
import ProjectPageFilter from 'sentry/components/projectPageFilter';
import ProjectsStore from 'sentry/stores/projectsStore';
import space from 'sentry/styles/space';
import {Organization, SavedSearch} from 'sentry/types';

import IssueListDisplayOptions from './displayOptions';
import IssueListSearchBar from './searchBar';
import IssueListSortOptions from './sortOptions';
import {TagValueLoader} from './types';
import {IssueDisplayOptions} from './utils';

type IssueListSearchBarProps = React.ComponentProps<typeof IssueListSearchBar>;

type Props = {
  organization: Organization;
  savedSearch: SavedSearch;
  display: IssueDisplayOptions;
  sort: string;
  query: string;
  isSearchDisabled: boolean;
  selectedProjects: number[];

  onDisplayChange: (display: string) => void;
  onSortChange: (sort: string) => void;
  onSearch: (query: string) => void;
  onSidebarToggle: (event: React.MouseEvent) => void;
  tagValueLoader: TagValueLoader;
  tags: NonNullable<IssueListSearchBarProps['supportedTags']>;
};

class IssueListFilters extends React.Component<Props> {
  render() {
    const {
      organization,
      savedSearch,
      query,
      isSearchDisabled,
      sort,
      display,
      selectedProjects,

      onSidebarToggle,
      onSearch,
      onSortChange,
      onDisplayChange,
      tagValueLoader,
      tags,
    } = this.props;
    const isAssignedQuery = /\bassigned:/.test(query);
    const hasIssuePercentDisplay = organization.features.includes(
      'issue-percent-display'
    );
    const hasMultipleProjectsSelected =
      !selectedProjects || selectedProjects.length !== 1 || selectedProjects[0] === -1;
    const hasSessions =
      !hasMultipleProjectsSelected &&
      (ProjectsStore.getById(`${selectedProjects[0]}`)?.hasSessions ?? false);

    return (
      <Feature
        features={['organizations:selection-filters-v2']}
        organization={organization}
      >
        {({hasFeature}) => (
          <FilterContainer>
            <SearchContainer
              hasProjectEnvFilter={hasFeature}
              hasIssuePercentDisplay={hasIssuePercentDisplay}
            >
              <ClassNames>
                {({css}) => (
                  <GuideAnchor
                    target="assigned_or_suggested_query"
                    disabled={!isAssignedQuery}
                    containerClassName={css`
                      width: 100%;
                    `}
                  >
                    <IssueListSearchBar
                      organization={organization}
                      query={query || ''}
                      sort={sort}
                      onSearch={onSearch}
                      disabled={isSearchDisabled}
                      excludeEnvironment
                      supportedTags={tags}
                      tagValueLoader={tagValueLoader}
                      savedSearch={savedSearch}
                      onSidebarToggle={onSidebarToggle}
                    />
                  </GuideAnchor>
                )}
              </ClassNames>

              {hasFeature ? (
                <ProjectEnvironmentFilters>
                  <ProjectPageFilter />
                  <EnvironmentPageFilter />
                </ProjectEnvironmentFilters>
              ) : (
                <DropdownsWrapper hasIssuePercentDisplay={hasIssuePercentDisplay}>
                  {hasIssuePercentDisplay && (
                    <IssueListDisplayOptions
                      onDisplayChange={onDisplayChange}
                      display={display}
                      hasMultipleProjectsSelected={hasMultipleProjectsSelected}
                      hasSessions={hasSessions}
                    />
                  )}
                  <IssueListSortOptions
                    sort={sort}
                    query={query}
                    onSelect={onSortChange}
                  />
                </DropdownsWrapper>
              )}
            </SearchContainer>
            {hasFeature && (
              <IssueListDropdownsWrapper>
                {hasIssuePercentDisplay && (
                  <IssueListDisplayOptions
                    onDisplayChange={onDisplayChange}
                    display={display}
                    hasMultipleProjectsSelected={hasMultipleProjectsSelected}
                    hasSessions={hasSessions}
                  />
                )}
                <IssueListSortOptions sort={sort} query={query} onSelect={onSortChange} />
              </IssueListDropdownsWrapper>
            )}
          </FilterContainer>
        )}
      </Feature>
    );
  }
}

const FilterContainer = styled('div')`
  display: grid;
  gap: ${space(1)};
  margin-bottom: ${space(2)};
`;

const SearchContainer = styled('div')<{
  hasIssuePercentDisplay?: boolean;
  hasProjectEnvFilter?: boolean;
}>`
  display: inline-grid;
  gap: ${space(1)};
  width: 100%;

  ${p =>
    p.hasProjectEnvFilter
      ? `
    @media (min-width: ${p.theme.breakpoints[1]}) {
      grid-template-columns: 2fr 1fr;
    }
  `
      : `
    @media (min-width: ${p.theme.breakpoints[p.hasIssuePercentDisplay ? 1 : 0]}) {
      grid-template-columns: 1fr auto;
    }
  }`}

  @media (max-width: ${p => p.theme.breakpoints[0]}) {
    grid-template-columns: 1fr;
  }
`;

const ProjectEnvironmentFilters = styled('div')`
  display: grid;
  gap: ${space(1)};
  grid-template-columns: 1fr 1fr;
`;

const DropdownsWrapper = styled('div')<{hasIssuePercentDisplay?: boolean}>`
  display: grid;
  gap: ${space(1)};
  grid-template-columns: 1fr ${p => (p.hasIssuePercentDisplay ? '1fr' : '')};
  align-items: start;

  @media (max-width: ${p => p.theme.breakpoints[0]}) {
    grid-template-columns: 1fr;
  }
`;

const IssueListDropdownsWrapper = styled('div')`
  display: grid;
  gap: ${space(1)};
  grid-auto-columns: max-content;
  grid-auto-flow: column;
`;

export default IssueListFilters;
