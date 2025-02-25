import * as React from 'react';
import styled from '@emotion/styled';

import ListItem from 'sentry/components/list/listItem';
import space from 'sentry/styles/space';

type Props = {
  title: React.ReactNode;
  children: React.ReactElement;
  subtitle?: React.ReactNode;
  className?: string;
};

const Item = styled(({title, subtitle, children, className}: Props) => (
  <ListItem className={className}>
    {title}
    {subtitle && <small>{subtitle}</small>}
    <div>{children}</div>
  </ListItem>
))`
  display: grid;
  gap: ${space(1.5)};
`;

export default Item;
