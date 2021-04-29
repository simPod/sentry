import React from 'react';

import {t} from 'app/locale';
import Input from 'app/views/settings/components/forms/controls/input';
import Field from 'app/views/settings/components/forms/field';

import StepContent from './stepContent';
import {StepTwoData} from './types';

type Props = {
  data: StepTwoData;
  onChange: (data: StepTwoData) => void;
  isActive: boolean;
};

function StepTwo({onChange, data, isActive}: Props) {
  return (
    <React.Fragment>
      {t('Enter your itunes credentials')}
      {isActive && (
        <StepContent>
          <Field
            label={t('Username')}
            inline={false}
            flexibleControlStateSize
            stacked
            required
          >
            <Input
              type="text"
              name="username"
              placeholder={t('Username')}
              onChange={e => onChange({...data, username: e.target.value})}
            />
          </Field>
          <Field
            label={t('Password')}
            inline={false}
            flexibleControlStateSize
            stacked
            required
          >
            <Input
              type="password"
              name="password"
              placeholder={t('Password')}
              onChange={e => onChange({...data, password: e.target.value})}
            />
          </Field>
        </StepContent>
      )}
    </React.Fragment>
  );
}

export default StepTwo;
