import {useState} from 'react';
import styled from '@emotion/styled';

import {PanelItem} from 'sentry/components/panels';
import space from 'sentry/styles/space';
import {CustomRepo, CustomRepoType} from 'sentry/types/debugFiles';

import CustomRepositoryActions from './actions';
import Details from './details';
import Status from './status';
import {customRepoTypeLabel} from './utils';

type Props = {
  repository: CustomRepo;
  onDelete: (repositoryId: string) => void;
  onEdit: (repositoryId: string) => void;
  hasFeature: boolean;
  hasAccess: boolean;
};

function Repository({repository, onDelete, onEdit, hasFeature, hasAccess}: Props) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const {id, name, type} = repository;

  return (
    <StyledPanelItem>
      <Name>{name}</Name>
      <TypeAndStatus>
        {customRepoTypeLabel[type]}
        {repository.type === CustomRepoType.APP_STORE_CONNECT && (
          <Status details={repository.details} onEditRepository={() => onEdit(id)} />
        )}
      </TypeAndStatus>
      <CustomRepositoryActions
        repositoryName={name}
        repositoryType={type}
        hasFeature={hasFeature}
        hasAccess={hasAccess}
        onDelete={() => onDelete(id)}
        onEdit={() => onEdit(id)}
        showDetails={repository.type === CustomRepoType.APP_STORE_CONNECT}
        isDetailsDisabled={
          repository.type === CustomRepoType.APP_STORE_CONNECT &&
          repository.details === undefined
        }
        isDetailsExpanded={isDetailsExpanded}
        onToggleDetails={() => setIsDetailsExpanded(!isDetailsExpanded)}
      />
      {repository.type === CustomRepoType.APP_STORE_CONNECT && isDetailsExpanded && (
        <Details details={repository.details} />
      )}
    </StyledPanelItem>
  );
}

export default Repository;

const StyledPanelItem = styled(PanelItem)`
  display: grid;
  grid-template-columns: 1fr;
  row-gap: ${space(1)};

  @media (min-width: ${p => p.theme.breakpoints[0]}) {
    grid-template-columns: 1fr max-content;
    grid-template-rows: repeat(2, max-content);
  }
`;

const Name = styled('div')`
  @media (min-width: ${p => p.theme.breakpoints[0]}) {
    grid-row: 1 / 2;
  }
`;

const TypeAndStatus = styled('div')`
  color: ${p => p.theme.gray400};
  font-size: ${p => p.theme.fontSizeMedium};
  display: grid;
  gap: ${space(1.5)};
  align-items: center;

  @media (min-width: ${p => p.theme.breakpoints[0]}) {
    grid-template-columns: max-content minmax(200px, max-content);
    grid-row: 2 / 3;
    gap: ${space(1)};
  }
`;
