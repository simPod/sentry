import React from 'react';
import styled from '@emotion/styled';

import {t} from 'app/locale';
import SelectField from 'app/views/settings/components/forms/selectField';

import StepContent from './stepContent';
import {App, StepFourData} from './types';

type Props = {
  apps: App[];
  data: StepFourData;
  onChange: (data: StepFourData) => void;
  isActive: boolean;
};

function StepFour({apps, onChange, data, isActive}: Props) {
  return (
    <React.Fragment>
      {t('Choose your app')}
      {isActive && (
        <StepContent>
          <StyledSelectField
            name="app"
            choices={apps.map(app => [app.appId, app.name])}
            placeholder={t('Select app')}
            onChange={appId => {
              const selectedApp = apps.find(app => app.appId === appId);
              onChange({...data, app: selectedApp});
            }}
            value={data.app?.appId ?? ''}
            inline={false}
            flexibleControlStateSize
            stacked
          />
        </StepContent>
      )}
    </React.Fragment>
  );
}

export default StepFour;

const StyledSelectField = styled(SelectField)`
  padding-right: 0;
`;
